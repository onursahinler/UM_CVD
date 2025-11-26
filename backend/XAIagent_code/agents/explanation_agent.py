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
                
    def _calculate_changes(self, result1: Dict, result2: Dict) -> Dict:
        """
        Helper function: Mathematically calculates the difference between two scenarios.
        """
        changes = {
            "risk_change": 0.0,
            "feature_changes": [],
            "shap_impacts": []
        }
        
        try:
            # 1. Risk Score Difference
            r1 = float(result1.get("risk_score", 0))
            r2 = float(result2.get("risk_score", 0))
            changes["risk_change"] = r2 - r1 
            changes["r1"] = r1
            changes["r2"] = r2

            # 2. Input Feature Changes
            f1 = result1.get("feature_values", {})
            f2 = result2.get("feature_values", {})
            all_keys = set(f1.keys()) | set(f2.keys())
            
            for k in all_keys:
                val1 = f1.get(k)
                val2 = f2.get(k)
                if isinstance(val1, (int, float)) and isinstance(val2, (int, float)):
                    if abs(val1 - val2) > 0.01:
                        feat_info = FEATURE_INFO.get(k, {})
                        unit = feat_info.get('unit', '')
                        name = feat_info.get('name', k)
                        changes["feature_changes"].append({
                            "feature": name,
                            "key": k,
                            "from": val1,
                            "to": val2,
                            "unit": unit
                        })

            # 3. SHAP Value Changes
            s1 = result1.get("shap_values", {})
            s2 = result2.get("shap_values", {})
            for k in all_keys:
                shap1 = float(s1.get(k, 0))
                shap2 = float(s2.get(k, 0))
                diff = shap2 - shap1
                if abs(diff) > 0.005: 
                    feat_info = FEATURE_INFO.get(k, {})
                    name = feat_info.get('name', k)
                    changes["shap_impacts"].append({
                        "feature": name,
                        "impact_change": diff
                    })
            changes["shap_impacts"].sort(key=lambda x: abs(x["impact_change"]), reverse=True)
            
        except Exception as e:
            print(f"Error calculating changes: {e}")
            
        return changes

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
                          label1: str = "Original", label2: str = "New",
                          user_question: str = "Compare these results.") -> str: # <-- YENİ PARAMETRE
        """
        Compare two predictions and explain the differences using mathematical deltas.
        """
        # 1. Calculate mathematical differences first
        analysis = self._calculate_changes(result1, result2)
        
        # 2. Prepare text summaries for the prompt
        risk_direction = "increased" if analysis["risk_change"] > 0 else "decreased"
        point_diff = abs(analysis["risk_change"]) * 100
        
        # Describe what the user changed (Inputs)
        if analysis["feature_changes"]:
            changes_text = "User Modifications:\n"
            for ch in analysis["feature_changes"]:
                changes_text += f"- {ch['feature']}: Changed from {ch['from']} {ch['unit']} to {ch['to']} {ch['unit']}\n"
        else:
            changes_text = "No specific input features were modified (result might differ due to model variability)."

        # Describe why the score changed (SHAP Impact)
        impact_text = "Impact Analysis:\n"
        for imp in analysis["shap_impacts"][:3]:
            direction = "increased risk" if imp['impact_change'] > 0 else "lowered risk"
            impact_text += f"- {imp['feature']}: This change {direction} significantly.\n"

        # RAG Retrieval
        guideline_text = ""
        references = []
        
        if self.use_rag and self.rag_service and analysis["feature_changes"]:
            try:
                changed_feat = analysis["feature_changes"][0]['feature']
                query = f"{changed_feat} impact on cardiovascular risk CML guidelines"
                results = self.rag_service.retrieve(query, n_results=2)
                if results:
                    guideline_text = "\n=== Clinical Context from Guidelines ===\n"
                    for i, res in enumerate(results):
                        guideline_text += f"{res['text'][:300]}...\n"
                        references.append(f"Guideline: {res['source']} (Page {res['page']})")
            except Exception as e:
                print(f"Comparison RAG Error: {e}")

        system_prompt = f"""You are a medical AI explaining a 'What-If' scenario comparison.
        
        COMPARISON DATA:
        1. {label1} Risk: {analysis['r1']:.1%}
        2. {label2} Risk: {analysis['r2']:.1%}
        
        RESULT: The risk has {risk_direction} by {point_diff:.1f} percentage points.
        
        {changes_text}
        
        {impact_text}
        
        {guideline_text}
        
        INSTRUCTIONS:
        1. Address the user's specific question directly.
        2. Use the comparison data provided above to support your answer.
        3. If the user asks "Why", explain the feature changes and SHAP impacts.
        4. Be concise and encouraging.
        """

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_question} # <-- ARTIK SENİN SORUNU GÖNDERİYORUZ
                ],
                temperature=0.3
            )
            
            explanation = response.choices[0].message.content
            
            if references:
                explanation += "\n\n**References:**\n" + "\n".join([f"- 📄 {ref}" for ref in references])

            return explanation

        except Exception as e:
            return f"Error comparing scenarios: {e}"


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
