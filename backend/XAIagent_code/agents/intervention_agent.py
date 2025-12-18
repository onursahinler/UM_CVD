"""
Intervention Agent - Suggests actionable interventions to reduce CVD risk
Enhanced with RAG (Retrieval-Augmented Generation) from clinical guidelines
"""
import sys
from pathlib import Path
from typing import Dict, Any, List, Optional
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


class InterventionAgent:
    """
    Agent responsible for suggesting evidence-based interventions to reduce CVD risk
    based on prediction results and SHAP values
    """

    def __init__(self, api_key: str = None, use_rag: bool = True):
        """
        Initialize the intervention agent

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
                print("✓ Intervention Agent: RAG service initialized")
            except Exception as e:
                print(f"Warning: Could not initialize RAG service: {e}")
                self.use_rag = False

    def suggest_interventions(self, prediction_result: Dict[str, Any],
                            top_n: int = 5,
                            intervention_type: str = "all") -> str:
        """
        Suggest interventions based on prediction results

        Args:
            prediction_result: Result from PredictionAgent.predict()
            top_n: Number of top risk factors to address
            intervention_type: "lifestyle", "medical", or "all"

        Returns:
            Intervention recommendations
        """
        risk_score = prediction_result["risk_score"]
        risk_level = prediction_result["risk_level"]
        shap_values = prediction_result["shap_values"]
        feature_values = prediction_result["feature_values"]

        # Get top risk-increasing factors (positive SHAP)
        risk_factors = [(k, v) for k, v in shap_values.items() if v > 0][:top_n]

        # Build detailed factor information
        factors_detail = []
        for feature, shap_val in risk_factors:
            feature_info = FEATURE_INFO.get(feature, {})
            factors_detail.append({
                "name": feature_info.get("name", feature),
                "current_value": feature_values.get(feature, "N/A"),
                "unit": feature_info.get("unit", ""),
                "normal_range": feature_info.get("normal_range", "N/A"),
                "shap_impact": shap_val,
                "description": feature_info.get("description", "")
            })

        # Retrieve relevant intervention guidelines
        guideline_context = ""
        references = []
        if self.use_rag and self.rag_service:
            try:
                # Search for intervention recommendations
                query = f"CML cardiovascular risk reduction interventions {risk_level} risk TKI therapy recommendations"
                rag_results = self.rag_service.retrieve(query, n_results=3)
                if rag_results:
                    guideline_context = "\n\nRelevant clinical guideline recommendations:\n"
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

        intervention_focus = {
            "lifestyle": "Focus on lifestyle modifications (diet, exercise, stress management)",
            "medical": "Focus on medical interventions (medications, clinical monitoring)",
            "all": "Include both lifestyle and medical interventions"
        }

        prompt = f"""You are a clinical decision support AI for CML patients at risk for CVD.
{guideline_context}

Patient Risk Profile:
- CVD Risk Score: {risk_score:.1%} ({risk_level} risk)

Top Modifiable Risk Factors:
{json.dumps(factors_detail, indent=2)}

{intervention_focus.get(intervention_type, intervention_focus['all'])}

Provide a comprehensive intervention plan:

1. IMMEDIATE ACTIONS (within 1 week)
   - What needs urgent attention
   - When to contact healthcare provider

2. SHORT-TERM GOALS (1-3 months)
   - Specific, measurable targets for each risk factor
   - Lifestyle modifications
   - Medication adjustments to discuss with doctor

3. LONG-TERM MANAGEMENT (3-12 months)
   - Sustainable habits
   - Monitoring schedule
   - Follow-up recommendations

4. CML-SPECIFIC CONSIDERATIONS
   - Interactions with TKI therapy
   - Special precautions for CML patients

Make recommendations:
- Evidence-based and aligned with clinical guidelines
- Specific and actionable
- Prioritized by impact
- Realistic for patient adherence
- Reference guideline sources when applicable

Note: This is clinical decision support. All recommendations should be reviewed by the patient's healthcare team.
{guideline_context}"""

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a clinical decision support AI providing evidence-based CVD risk reduction strategies for CML patients based on clinical guidelines."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=1200
            )

            interventions = response.choices[0].message.content

            # Add references if available
            if references:
                interventions += "\n\n--- References ---\n"
                for i, ref in enumerate(references, 1):
                    interventions += f"{i}. Clinical Guideline: {ref['source']}, Page {ref['page']}\n"

            return interventions

        except Exception as e:
            return f"Error generating interventions: {e}"

    def suggest_what_if_scenarios(self, prediction_result: Dict[str, Any]) -> str:
        """
        Suggest what-if scenarios to explore (e.g., "What if BMI was reduced by 10%?")

        Args:
            prediction_result: Result from PredictionAgent.predict()

        Returns:
            Suggested scenarios to explore
        """
        shap_values = prediction_result["shap_values"]
        feature_values = prediction_result["feature_values"]

        # Get top modifiable risk factors
        # Exclude age and gender as they're not modifiable
        non_modifiable = ["anchor_age", "gender_encoded"]
        modifiable_factors = [(k, v) for k, v in shap_values.items()
                             if v > 0 and k not in non_modifiable][:5]

        factors_info = []
        for feature, shap_val in modifiable_factors:
            feature_info = FEATURE_INFO.get(feature, {})
            current = feature_values.get(feature, 0)
            factors_info.append({
                "name": feature_info.get("name", feature),
                "feature_key": feature,
                "current_value": current,
                "unit": feature_info.get("unit", ""),
                "shap_impact": shap_val
            })

        prompt = f"""Based on these modifiable risk factors for a CML patient:

{json.dumps(factors_info, indent=2)}

Suggest 5 realistic "what-if" scenarios to explore, such as:
- What if BMI was reduced to normal range?
- What if blood pressure was controlled?
- What if glucose levels improved?

For each scenario:
1. Specific target value (realistic and achievable)
2. Expected timeline to achieve it
3. Primary intervention method
4. Why this scenario is worth exploring

Format as a numbered list with clear, actionable scenarios."""

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a clinical decision support AI helping identify impactful what-if scenarios for CVD risk reduction."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.4,
                max_tokens=800
            )

            return response.choices[0].message.content

        except Exception as e:
            return f"Error generating scenarios: {e}"

    def prioritize_interventions(self, prediction_result: Dict[str, Any]) -> Dict[str, List[Dict[str, Any]]]:
        """
        Prioritize interventions by potential impact and feasibility

        Args:
            prediction_result: Result from PredictionAgent.predict()

        Returns:
            Dictionary with priority levels (high, medium, low) and interventions
        """
        shap_values = prediction_result["shap_values"]
        feature_values = prediction_result["feature_values"]

        non_modifiable = ["anchor_age", "gender_encoded"]
        
        # Simple rule-based prioritization
        priorities = {
            "high": [],
            "medium": [],
            "low": []
        }

        for feature, shap_val in shap_values.items():
            if shap_val <= 0:  # Skip protective factors
                continue
            
            if feature in non_modifiable:
                continue

            feature_info = FEATURE_INFO.get(feature, {})
            current_value = feature_values.get(feature, 0)

            intervention = {
                "feature": feature_info.get("name", feature),
                "shap_impact": shap_val,
                "current_value": current_value,
                "unit": feature_info.get("unit", "")
            }

            # High priority: SHAP > 0.1 (very impactful)
            if abs(shap_val) > 0.1:
                priorities["high"].append(intervention)
            # Medium priority: SHAP 0.05-0.1
            elif abs(shap_val) > 0.05:
                priorities["medium"].append(intervention)
            # Low priority: SHAP < 0.05
            else:
                priorities["low"].append(intervention)

        # Sort each priority level by impact
        for level in priorities:
            priorities[level] = sorted(priorities[level],
                                      key=lambda x: abs(x["shap_impact"]),
                                      reverse=True)

        return priorities

    def generate_action_plan(self, prediction_result: Dict[str, Any],
                           timeframe: str = "3months") -> str:
        """
        Generate a detailed action plan for a specific timeframe

        Args:
            prediction_result: Result from PredictionAgent.predict()
            timeframe: "1month", "3months", or "6months"

        Returns:
            Detailed action plan
        """
        priorities = self.prioritize_interventions(prediction_result)
        risk_score = prediction_result["risk_score"]

        timeframe_config = {
            "1month": {"duration": "1 month", "focus": "immediate changes", "max_goals": 2},
            "3months": {"duration": "3 months", "focus": "sustainable habits", "max_goals": 3},
            "6months": {"duration": "6 months", "focus": "comprehensive transformation", "max_goals": 5}
        }

        config = timeframe_config.get(timeframe, timeframe_config["3months"])

        prompt = f"""Create a {config['duration']} action plan for a CML patient with {risk_score:.1%} CVD risk.

High Priority Interventions:
{json.dumps(priorities['high'][:3], indent=2)}

Medium Priority Interventions:
{json.dumps(priorities['medium'][:2], indent=2)}

Create an action plan with:

1. GOALS (max {config['max_goals']} SMART goals)
   - Specific, Measurable, Achievable, Relevant, Time-bound
   - Focus on {config['focus']}

2. WEEKLY ACTIONS
   - Week-by-week breakdown
   - Specific tasks each week

3. TRACKING METRICS
   - What to measure
   - How often
   - Target values

4. SUPPORT NEEDED
   - Healthcare provider consultations
   - Lifestyle support
   - Resources

5. SUCCESS CRITERIA
   - How to know if the plan is working
   - When to adjust the plan

Make it practical, patient-centered, and evidence-based."""

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a health coach AI creating personalized CVD risk reduction plans for CML patients."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.4,
                max_tokens=1500
            )

            return response.choices[0].message.content

        except Exception as e:
            return f"Error generating action plan: {e}"


if __name__ == "__main__":
    # Test requires API key
    import os
    if not os.getenv("OPENAI_API_KEY"):
        print("Set OPENAI_API_KEY environment variable to test")
    else:
        agent = InterventionAgent()

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

        interventions = agent.suggest_interventions(test_result)
        print("Interventions:")
        print(interventions)
