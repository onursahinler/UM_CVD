"""
Explanation Agent - Converts SHAP values to natural language explanations
Enhanced with RAG (Retrieval-Augmented Generation) from clinical guidelines
"""
import sys
from pathlib import Path
from typing import Dict, Any, Optional
import json

# OpenAI import
try:
    from openai import OpenAI
except ImportError:
    print("Warning: OpenAI library not installed. Run: pip install openai")
    OpenAI = None

# Add parent directory to path for config import
sys.path.append(str(Path(__file__).parent.parent))
from config import OPENAI_API_KEY, OPENAI_MODEL, FEATURE_INFO

# RAG imports
try:
    from knowledge_base.rag_service import RAGService
    RAG_AVAILABLE = True
except ImportError:
    RAG_AVAILABLE = False
    print("Warning: RAG service not available")


class ExplanationAgent:
    """
    Agent responsible for converting SHAP values into understandable natural language explanations
    """

    def __init__(self, api_key: str = None, use_rag: bool = True):
        """
        Initialize the explanation agent

        Args:
            api_key: OpenAI API key (defaults to config)
            use_rag: Whether to use RAG system for clinical guidelines
        """
        if OpenAI is None:
            raise ImportError("OpenAI library not installed")

        self.api_key = api_key or OPENAI_API_KEY
        if not self.api_key:
            raise ValueError("OpenAI API key not provided")

        self.client = OpenAI(api_key=self.api_key)
        self.model = OPENAI_MODEL

        # Initialize RAG service
        self.rag_service = None
        self.use_rag = use_rag and RAG_AVAILABLE
        if self.use_rag:
            try:
                self.rag_service = RAGService(use_openai_embeddings=True)
                print("✓ Explanation Agent: RAG service initialized")
            except Exception as e:
                print(f"Warning: Could not initialize RAG service: {e}")
                self.use_rag = False

    def explain_prediction(self, prediction_result: Dict[str, Any], detail_level: str = "moderate") -> str:
        """
        Generate a natural language explanation of the CVD risk prediction
        Enhanced with RAG retrieval from clinical guidelines

        Args:
            prediction_result: Result dictionary from PredictionAgent.predict()
            detail_level: "brief", "moderate", or "detailed"

        Returns:
            Natural language explanation string with references
        """
        # Prepare context for the LLM
        risk_score = prediction_result["risk_score"]
        risk_level = prediction_result["risk_level"]
        shap_values = prediction_result["shap_values"]
        feature_values = prediction_result["feature_values"]

        # Get top 5 most impactful features (positive and negative)
        top_features = list(shap_values.items())[:5]

        # Create feature summary with actual values and normal ranges
        feature_summary = []
        for feature, shap_val in top_features:
            feature_info = FEATURE_INFO.get(feature, {})
            actual_value = feature_values.get(feature, "N/A")
            normal_range = feature_info.get("normal_range", "N/A")
            unit = feature_info.get("unit", "")
            name = feature_info.get("name", feature)

            feature_summary.append({
                "name": name,
                "value": actual_value,
                "unit": unit,
                "normal_range": normal_range,
                "shap_value": shap_val,
                "impact": "increases risk" if shap_val > 0 else "decreases risk"
            })

        # Retrieve relevant clinical guideline information
        guideline_context = ""
        references = []
        if self.use_rag and self.rag_service:
            try:
                # Search for information about CVD risk factors in CML patients
                query = f"CML cardiovascular risk factors {risk_level} risk TKI therapy"
                rag_results = self.rag_service.retrieve(query, n_results=3)
                if rag_results:
                    guideline_context = "\n\nRelevant clinical guideline information:\n"
                    for i, result in enumerate(rag_results, 1):
                        guideline_context += f"\n[{i}] {result['text'][:400]}...\n"
                        guideline_context += f"   Source: {result['source']}, Page: {result['page']}\n"
                        references.append({
                            'type': 'guideline',
                            'source': result['source'],
                            'page': result['page']
                        })
            except Exception as e:
                print(f"Error retrieving from RAG: {e}")

        # Create prompt based on detail level
        prompts = {
            "brief": f"""You are a medical AI assistant. Explain this CVD risk prediction in 2-3 sentences.

Patient CVD Risk: {risk_score:.1%} ({risk_level} risk)

Key Factors:
{json.dumps(feature_summary, indent=2)}

Keep it simple and focus only on the most important factor.""",

            "moderate": f"""You are a medical AI assistant. Explain this CVD risk prediction for CML patients.

Patient CVD Risk: {risk_score:.1%} ({risk_level} risk)

Key Contributing Factors:
{json.dumps(feature_summary, indent=2)}
{guideline_context}

Provide:
1. Overall risk assessment based on clinical guidelines
2. Top 2-3 factors increasing risk with reference to guidelines
3. Any protective factors
4. Clinical significance for CML patients on TKI therapy
5. Keep explanation clear for healthcare providers
6. Cite guideline sources when referencing specific recommendations.""",

            "detailed": f"""You are a medical AI assistant specializing in CML and cardiovascular disease.

Patient CVD Risk: {risk_score:.1%} ({risk_level} risk)

Contributing Factors (SHAP analysis):
{json.dumps(feature_summary, indent=2)}

Provide a comprehensive explanation:
1. Overall risk assessment and what it means
2. Detailed analysis of each major risk factor
3. How each factor contributes to CVD risk
4. Any protective factors present
5. Clinical context for CML patients

Use medical terminology but remain clear."""
        }

        prompt = prompts.get(detail_level, prompts["moderate"])

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a medical AI assistant specializing in cardiovascular disease risk for CML patients. Provide clear, evidence-based explanations using clinical guidelines."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,  # Lower temperature for more consistent medical explanations
                max_tokens=500 if detail_level == "brief" else (800 if detail_level == "moderate" else 1200)
            )

            explanation = response.choices[0].message.content

            # Add references if available
            if references:
                explanation += "\n\n--- References ---\n"
                for i, ref in enumerate(references, 1):
                    explanation += f"{i}. Clinical Guideline: {ref['source']}, Page {ref['page']}\n"

            return explanation

        except Exception as e:
            return f"Error generating explanation: {e}"

    def explain_feature(self, feature_name: str, shap_value: float, feature_value: float) -> str:
        """
        Explain how a specific feature contributes to the prediction

        Args:
            feature_name: Name of the feature
            shap_value: SHAP value for this feature
            feature_value: Actual value of the feature

        Returns:
            Natural language explanation
        """
        feature_info = FEATURE_INFO.get(feature_name, {})
        name = feature_info.get("name", feature_name)
        unit = feature_info.get("unit", "")
        normal_range = feature_info.get("normal_range", "N/A")
        description = feature_info.get("description", "")

        prompt = f"""Explain how this lab value/measurement affects CVD risk for a CML patient:

Feature: {name}
Patient's Value: {feature_value} {unit}
Normal Range: {normal_range}
SHAP Impact: {shap_value:.4f} ({'increases risk' if shap_value > 0 else 'decreases risk'})
Description: {description}

Provide a 2-3 sentence explanation of:
1. Whether the value is normal or abnormal
2. How it specifically affects CVD risk
3. Why this matters for CML patients (if relevant)"""

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a medical AI assistant. Explain lab values and their impact on CVD risk clearly."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=200
            )

            return response.choices[0].message.content

        except Exception as e:
            return f"Error explaining feature: {e}"

    def compare_predictions(self, result1: Dict[str, Any], result2: Dict[str, Any],
                          label1: str = "Scenario 1", label2: str = "Scenario 2") -> str:
        """
        Compare two predictions and explain the differences

        Args:
            result1: First prediction result
            result2: Second prediction result
            label1: Label for first scenario
            label2: Label for second scenario

        Returns:
            Comparison explanation
        """
        risk_diff = result2["risk_score"] - result1["risk_score"]
        risk_change = "increased" if risk_diff > 0 else "decreased"

        prompt = f"""Compare these two CVD risk predictions:

{label1}:
- Risk Score: {result1['risk_score']:.1%} ({result1['risk_level']})
- Top Factors: {list(result1['shap_values'].items())[:3]}

{label2}:
- Risk Score: {result2['risk_score']:.1%} ({result2['risk_level']})
- Top Factors: {list(result2['shap_values'].items())[:3]}

Risk Change: {risk_change} by {abs(risk_diff):.1%}

Explain:
1. What changed between scenarios
2. Why risk {risk_change}
3. Which factors had the biggest impact
4. Clinical significance of this change"""

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a medical AI assistant comparing CVD risk scenarios."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=600
            )

            return response.choices[0].message.content

        except Exception as e:
            return f"Error comparing predictions: {e}"


if __name__ == "__main__":
    # Test requires API key
    import os
    if not os.getenv("OPENAI_API_KEY"):
        print("Set OPENAI_API_KEY environment variable to test")
    else:
        agent = ExplanationAgent()

        # Mock prediction result
        test_result = {
            "risk_score": 0.75,
            "risk_level": "High",
            "shap_values": {
                "BMI": 0.15,
                "systolic": 0.12,
                "Glucose": 0.08,
                "anchor_age": 0.05,
                "Lymphocytes": -0.03
            },
            "feature_values": {
                "BMI": 39.1,
                "systolic": 148,
                "Glucose": 87,
                "anchor_age": 56,
                "Lymphocytes": 7.0
            }
        }

        explanation = agent.explain_prediction(test_result, detail_level="moderate")
        print("Explanation:")
        print(explanation)
