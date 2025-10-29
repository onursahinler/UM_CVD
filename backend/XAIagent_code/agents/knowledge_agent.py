"""
Knowledge Agent - Answers questions about features, CML, and CVD
"""
import sys
from pathlib import Path
from typing import Dict, Any, List
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


class KnowledgeAgent:
    """
    Agent responsible for answering questions about features, medical concepts,
    and providing educational information about CML and CVD
    """

    def __init__(self, api_key: str = None):
        """
        Initialize the knowledge agent

        Args:
            api_key: OpenAI API key (defaults to config)
        """
        if OpenAI is None:
            raise ImportError("OpenAI library not installed")

        self.api_key = api_key or OPENAI_API_KEY
        if not self.api_key:
            raise ValueError("OpenAI API key not provided")

        self.client = OpenAI(api_key=self.api_key)
        self.model = OPENAI_MODEL

        # Build knowledge base context
        self.knowledge_base = self._build_knowledge_base()

    def _build_knowledge_base(self) -> str:
        """
        Build a knowledge base context from feature information

        Returns:
            Formatted knowledge base string
        """
        kb = "Medical Feature Knowledge Base:\n\n"
        for feature, info in FEATURE_INFO.items():
            kb += f"{info['name']} ({feature}):\n"
            kb += f"  - Normal Range: {info['normal_range']} {info['unit']}\n"
            kb += f"  - Description: {info['description']}\n\n"

        kb += "\nClinical Context:\n"
        kb += "- CML (Chronic Myeloid Leukemia): A blood cancer affecting white blood cells\n"
        kb += "- TKI (Tyrosine Kinase Inhibitors): Primary treatment for CML\n"
        kb += "- CVD (Cardiovascular Disease): Heart and blood vessel diseases\n"
        kb += "- CML patients on TKI therapy have increased CVD risk\n"

        return kb

    def answer_question(self, question: str, context: Dict[str, Any] = None) -> str:
        """
        Answer a general question about features, CML, or CVD

        Args:
            question: User's question
            context: Optional context (e.g., patient data, prediction results)

        Returns:
            Answer string
        """
        system_prompt = f"""You are a medical knowledge assistant specializing in:
- Chronic Myeloid Leukemia (CML)
- Cardiovascular Disease (CVD)
- Laboratory values and their clinical significance
- TKI medications for CML

Use this knowledge base to answer questions:
{self.knowledge_base}

Provide accurate, evidence-based answers. If you're not certain, say so."""

        # Build user prompt with context if provided
        user_prompt = question
        if context:
            user_prompt = f"Context:\n{json.dumps(context, indent=2)}\n\nQuestion: {question}"

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.3,
                max_tokens=500
            )

            return response.choices[0].message.content

        except Exception as e:
            return f"Error answering question: {e}"

    def explain_feature_importance(self, feature_name: str) -> str:
        """
        Explain why a feature is important for CVD risk

        Args:
            feature_name: Name of the feature

        Returns:
            Explanation of feature importance
        """
        feature_info = FEATURE_INFO.get(feature_name, {})

        prompt = f"""Explain why {feature_info.get('name', feature_name)} is important for cardiovascular disease risk in CML patients.

Feature Information:
- Normal Range: {feature_info.get('normal_range', 'N/A')} {feature_info.get('unit', '')}
- Description: {feature_info.get('description', 'N/A')}

Cover:
1. What this measurement tells us about health
2. How abnormal values contribute to CVD risk
3. Why this is particularly relevant for CML patients
4. What values would be concerning"""

        return self.answer_question(prompt)

    def compare_features(self, feature1: str, feature2: str) -> str:
        """
        Compare two features and explain their relationship

        Args:
            feature1: First feature name
            feature2: Second feature name

        Returns:
            Comparison explanation
        """
        info1 = FEATURE_INFO.get(feature1, {})
        info2 = FEATURE_INFO.get(feature2, {})

        prompt = f"""Compare these two medical measurements and explain their relationship:

Feature 1: {info1.get('name', feature1)}
- Normal Range: {info1.get('normal_range', 'N/A')} {info1.get('unit', '')}
- Description: {info1.get('description', 'N/A')}

Feature 2: {info2.get('name', feature2)}
- Normal Range: {info2.get('normal_range', 'N/A')} {info2.get('unit', '')}
- Description: {info2.get('description', 'N/A')}

Explain:
1. How these measurements relate to each other
2. Do they indicate similar or different health aspects?
3. How do they collectively contribute to CVD risk?
4. Are there typical patterns when both are abnormal?"""

        return self.answer_question(prompt)

    def get_feature_recommendations(self, feature_name: str, current_value: float) -> str:
        """
        Get recommendations for improving a specific feature value

        Args:
            feature_name: Name of the feature
            current_value: Current value

        Returns:
            Recommendations
        """
        feature_info = FEATURE_INFO.get(feature_name, {})
        name = feature_info.get('name', feature_name)
        unit = feature_info.get('unit', '')
        normal_range = feature_info.get('normal_range', 'N/A')

        prompt = f"""A CML patient has this measurement:

{name}: {current_value} {unit}
Normal Range: {normal_range}

Provide:
1. Is this value within normal range?
2. If abnormal, what are evidence-based recommendations to improve it?
3. Lifestyle modifications
4. When to consult with healthcare provider
5. Any CML-specific considerations

Keep recommendations practical and evidence-based."""

        return self.answer_question(prompt)

    def explain_tki_medications(self) -> str:
        """
        Explain TKI medications used in CML treatment

        Returns:
            Explanation of TKI medications
        """
        prompt = """Explain the TKI (Tyrosine Kinase Inhibitor) medications used for CML treatment:

Medications in our model:
1. Imatinib (Gleevec)
2. Dasatinib (Sprycel)
3. Nilotinib (Tasigna)
4. Ponatinib (Iclusig)
5. Ruxolitinib (JAK inhibitor)

For each, briefly explain:
- Mechanism of action
- Typical dosing
- Known cardiovascular effects
- Why CVD monitoring is important

Keep it concise but clinically relevant."""

        return self.answer_question(prompt)

    def get_risk_factor_education(self, risk_factors: List[str]) -> str:
        """
        Provide educational information about specific risk factors

        Args:
            risk_factors: List of feature names that are risk factors

        Returns:
            Educational content
        """
        factors_info = []
        for factor in risk_factors[:5]:  # Limit to top 5
            info = FEATURE_INFO.get(factor, {})
            factors_info.append({
                "name": info.get('name', factor),
                "normal_range": info.get('normal_range', 'N/A'),
                "description": info.get('description', 'N/A')
            })

        prompt = f"""Provide patient education about these CVD risk factors:

{json.dumps(factors_info, indent=2)}

For each factor, explain:
1. What it measures in simple terms
2. Why it affects heart health
3. Simple ways to improve it
4. Warning signs to watch for

Use patient-friendly language suitable for health literacy."""

        return self.answer_question(prompt)

    def get_all_features_info(self) -> Dict[str, Dict[str, str]]:
        """
        Get information about all features in the model

        Returns:
            Dictionary of all feature information
        """
        return FEATURE_INFO


if __name__ == "__main__":
    # Test requires API key
    import os
    if not os.getenv("OPENAI_API_KEY"):
        print("Set OPENAI_API_KEY environment variable to test")
    else:
        agent = KnowledgeAgent()

        # Test question
        answer = agent.answer_question("What is the normal range for BMI and why does it matter for CVD?")
        print("Answer:", answer)

        # Test feature explanation
        explanation = agent.explain_feature_importance("systolic")
        print("\nFeature Importance:", explanation)
