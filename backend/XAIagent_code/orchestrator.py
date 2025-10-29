"""
Agent Orchestrator - Coordinates multiple specialized agents for CVD risk assessment
"""
from typing import Dict, Any, Optional
import json
from pathlib import Path

from agents.prediction_agent import PredictionAgent
from agents.explanation_agent import ExplanationAgent
from agents.knowledge_agent import KnowledgeAgent
from agents.intervention_agent import InterventionAgent


class CVDAgentOrchestrator:
    """
    Orchestrator that coordinates multiple specialized agents:
    - PredictionAgent: Makes predictions and computes SHAP values
    - ExplanationAgent: Explains predictions in natural language
    - KnowledgeAgent: Answers questions about features and medical concepts
    - InterventionAgent: Suggests actionable interventions
    """

    def __init__(self, openai_api_key: Optional[str] = None):
        """
        Initialize the orchestrator and all agents

        Args:
            openai_api_key: OpenAI API key for LLM-based agents
        """
        print("Initializing CVD Agent System...")

        # Initialize prediction agent (no API key needed)
        self.prediction_agent = PredictionAgent()
        print("✓ Prediction Agent initialized")

        # Initialize LLM-based agents (require API key)
        self.openai_api_key = openai_api_key
        self.explanation_agent = None
        self.knowledge_agent = None
        self.intervention_agent = None

        if openai_api_key:
            try:
                self.explanation_agent = ExplanationAgent(api_key=openai_api_key)
                print("✓ Explanation Agent initialized")

                self.knowledge_agent = KnowledgeAgent(api_key=openai_api_key)
                print("✓ Knowledge Agent initialized")

                self.intervention_agent = InterventionAgent(api_key=openai_api_key)
                print("✓ Intervention Agent initialized")
            except Exception as e:
                print(f"Warning: Could not initialize LLM agents: {e}")
                print("Prediction-only mode enabled. Set OPENAI_API_KEY for full functionality.")
        else:
            print("Warning: No OpenAI API key provided. Only prediction agent available.")
            print("Set OPENAI_API_KEY environment variable for full functionality.")

        # Load prediction model
        self.prediction_agent.load_model()
        print("✓ XAI Model loaded\n")

        # Cache for current patient's prediction
        self.current_prediction = None
        self.current_patient_data = None
        # Cache for updated scenarios (what-if results)
        self.updated_scenarios = []

    def analyze_patient(self, patient_data: Dict[str, float],
                       detail_level: str = "moderate") -> Dict[str, Any]:
        """
        Complete patient analysis workflow

        Args:
            patient_data: Patient feature dictionary
            detail_level: "brief", "moderate", or "detailed"

        Returns:
            Comprehensive analysis including prediction, explanation, and interventions
        """
        print("Analyzing patient...")

        # Step 1: Make prediction
        prediction = self.prediction_agent.predict(patient_data)
        self.current_prediction = prediction
        self.current_patient_data = patient_data

        print(f"✓ Prediction complete: {prediction['risk_score']:.1%} ({prediction['risk_level']} risk)")

        # Step 2: Generate explanation (if available)
        explanation = None
        if self.explanation_agent:
            explanation = self.explanation_agent.explain_prediction(prediction, detail_level)
            print("✓ Explanation generated")

        # Step 3: Suggest interventions (if available)
        interventions = None
        if self.intervention_agent:
            interventions = self.intervention_agent.suggest_interventions(prediction)
            print("✓ Interventions suggested")

        # Step 4: Get top risk and protective factors
        top_risk_factors = self.prediction_agent.get_top_risk_factors(prediction, n=5)
        protective_factors = self.prediction_agent.get_protective_factors(prediction, n=3)

        return {
            "prediction": prediction,
            "explanation": explanation,
            "interventions": interventions,
            "top_risk_factors": top_risk_factors,
            "protective_factors": protective_factors
        }

    def ask_question(self, question: str) -> str:
        """
        Ask a question to the knowledge agent

        Args:
            question: User's question

        Returns:
            Answer from knowledge agent
        """
        if not self.knowledge_agent:
            return "Knowledge agent not available. Please provide OpenAI API key."

        # Include current patient context if available
        context = {
            "prediction": self.current_prediction,
            "patient_data": self.current_patient_data
        } if self.current_prediction else None

        return self.knowledge_agent.answer_question(question, context)

    def explain_feature(self, feature_name: str) -> str:
        """
        Get detailed explanation of a feature

        Args:
            feature_name: Name of the feature to explain

        Returns:
            Feature explanation
        """
        if not self.knowledge_agent:
            return "Knowledge agent not available. Please provide OpenAI API key."

        return self.knowledge_agent.explain_feature_importance(feature_name)

    def generate_action_plan(self, timeframe: str = "3months") -> str:
        """
        Generate action plan for the current patient

        Args:
            timeframe: "1month", "3months", or "6months"

        Returns:
            Action plan
        """
        if not self.intervention_agent:
            return "Intervention agent not available. Please provide OpenAI API key."

        if not self.current_prediction:
            return "No patient analyzed yet. Run analyze_patient() first."

        return self.intervention_agent.generate_action_plan(self.current_prediction, timeframe)

    def compare_scenarios(self, scenario1_data: Dict[str, float],
                         scenario2_data: Dict[str, float],
                         label1: str = "Current",
                         label2: str = "Proposed") -> Dict[str, Any]:
        """
        Compare two scenarios (e.g., before/after intervention)

        Args:
            scenario1_data: First scenario patient data
            scenario2_data: Second scenario patient data
            label1: Label for first scenario
            label2: Label for second scenario

        Returns:
            Comparison results
        """
        print(f"Comparing scenarios: {label1} vs {label2}...")

        # Get predictions for both scenarios
        pred1 = self.prediction_agent.predict(scenario1_data)
        pred2 = self.prediction_agent.predict(scenario2_data)

        risk_change = pred2["risk_score"] - pred1["risk_score"]
        risk_change_pct = (risk_change / pred1["risk_score"]) * 100

        print(f"✓ Risk change: {risk_change:+.1%} ({risk_change_pct:+.1f}%)")

        # Generate comparison explanation
        comparison_explanation = None
        if self.explanation_agent:
            comparison_explanation = self.explanation_agent.compare_predictions(
                pred1, pred2, label1, label2
            )

        return {
            "scenario1": {
                "label": label1,
                "prediction": pred1
            },
            "scenario2": {
                "label": label2,
                "prediction": pred2
            },
            "risk_change": risk_change,
            "risk_change_percent": risk_change_pct,
            "comparison_explanation": comparison_explanation
        }

    def get_whatif_suggestions(self) -> str:
        """
        Get suggested what-if scenarios to explore

        Returns:
            Suggested scenarios
        """
        if not self.intervention_agent:
            return "Intervention agent not available. Please provide OpenAI API key."

        if not self.current_prediction:
            return "No patient analyzed yet. Run analyze_patient() first."

        return self.intervention_agent.suggest_what_if_scenarios(self.current_prediction)

    def save_analysis(self, filepath: str):
        """
        Save current analysis to a file

        Args:
            filepath: Path to save JSON file
        """
        if not self.current_prediction:
            print("No analysis to save. Run analyze_patient() first.")
            return

        output = {
            "patient_data": self.current_patient_data,
            "prediction": self.current_prediction
        }

        with open(filepath, 'w') as f:
            json.dump(output, f, indent=2)

        print(f"Analysis saved to {filepath}")

    def load_patient_from_file(self, filepath: str) -> Dict[str, float]:
        """
        Load patient data from JSON file

        Args:
            filepath: Path to JSON file

        Returns:
            Patient data dictionary
        """
        with open(filepath, 'r') as f:
            data = json.load(f)

        # Handle both array format [{}] and single object {}
        if isinstance(data, list):
            return data[0]
        return data

    def interactive_session(self):
        """
        Start an interactive session with the agent system
        """
        print("\n" + "="*60)
        print("CVD Risk Assessment Agent System")
        print("="*60)
        print("\nCommands:")
        print("  analyze <filepath>   - Analyze patient from JSON file")
        print("  ask <question>       - Ask a question")
        print("  explain <feature>    - Explain a feature")
        print("  plan <timeframe>     - Generate action plan (1month/3months/6months)")
        print("  whatif               - Get what-if scenario suggestions")
        print("  compare <file1> <file2> - Compare two scenarios")
        print("  save <filepath>      - Save current analysis")
        print("  quit                 - Exit")
        print("="*60 + "\n")

        while True:
            try:
                command = input("\n> ").strip()

                if command == "quit":
                    print("Goodbye!")
                    break

                elif command.startswith("analyze "):
                    filepath = command.split(" ", 1)[1]
                    patient_data = self.load_patient_from_file(filepath)
                    result = self.analyze_patient(patient_data)

                    print(f"\nRisk Score: {result['prediction']['risk_score']:.1%}")
                    print(f"Risk Level: {result['prediction']['risk_level']}")

                    if result['explanation']:
                        print(f"\nExplanation:\n{result['explanation']}")

                    print(f"\nTop Risk Factors:")
                    for feature, shap in result['top_risk_factors'].items():
                        print(f"  - {feature}: {shap:.4f}")

                elif command.startswith("ask "):
                    question = command.split(" ", 1)[1]
                    answer = self.ask_question(question)
                    print(f"\nAnswer:\n{answer}")

                elif command.startswith("explain "):
                    feature = command.split(" ", 1)[1]
                    explanation = self.explain_feature(feature)
                    print(f"\nExplanation:\n{explanation}")

                elif command.startswith("plan "):
                    timeframe = command.split(" ", 1)[1]
                    plan = self.generate_action_plan(timeframe)
                    print(f"\nAction Plan:\n{plan}")

                elif command == "whatif":
                    suggestions = self.get_whatif_suggestions()
                    print(f"\nWhat-If Scenarios:\n{suggestions}")

                elif command.startswith("save "):
                    filepath = command.split(" ", 1)[1]
                    self.save_analysis(filepath)

                else:
                    print("Unknown command. Type 'quit' to exit.")

            except KeyboardInterrupt:
                print("\nGoodbye!")
                break
            except Exception as e:
                print(f"Error: {e}")


if __name__ == "__main__":
    import os

    # Initialize orchestrator
    api_key = os.getenv("OPENAI_API_KEY")
    orchestrator = CVDAgentOrchestrator(openai_api_key=api_key)

    # Start interactive session
    orchestrator.interactive_session()
