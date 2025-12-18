"""
Agent Orchestrator - Coordinates multiple specialized agents for CVD risk assessment
Smart Routing Logic Included
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
    Orchestrator that coordinates multiple specialized agents.
    Acts as the central 'brain' to route user queries to the correct specialist.
    """

    def __init__(self, openai_api_key: Optional[str] = None, use_rag: bool = True, use_pubmed: bool = True):
        """
        Initialize the orchestrator and all agents
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
                self.explanation_agent = ExplanationAgent(api_key=openai_api_key, use_rag=use_rag)
                print("✓ Explanation Agent initialized (with RAG)" if use_rag else "✓ Explanation Agent initialized")

                self.knowledge_agent = KnowledgeAgent(api_key=openai_api_key, use_rag=use_rag, use_pubmed=use_pubmed)
                print("✓ Knowledge Agent initialized (with RAG and PubMed)" if (use_rag and use_pubmed) else "✓ Knowledge Agent initialized")

                self.intervention_agent = InterventionAgent(api_key=openai_api_key, use_rag=use_rag)
                print("✓ Intervention Agent initialized (with RAG)" if use_rag else "✓ Intervention Agent initialized")
            except Exception as e:
                print(f"Warning: Could not initialize LLM agents: {e}")
                print("Prediction-only mode enabled. Set OPENAI_API_KEY for full functionality.")
        else:
            print("Warning: No OpenAI API key provided. Only prediction agent available.")
            print("Set OPENAI_API_KEY environment variable for full functionality.")

        # Load prediction model
        self.prediction_agent.load_model()
        print("✓ XAI Model loaded\n")

        # Context Cache
        self.current_prediction = None
        self.current_patient_data = None
        self.updated_scenarios = []

    def _analyze_intent(self, message: str) -> str:
        """
        Private method to determine the user's intent based on keywords.
        Prioritizes specific clinical questions over generic intervention requests.
        """
        msg = message.lower()

        # PRIORITY 1: Specific Clinical/Treatment Questions -> Knowledge Agent
        # Even if it says "treatment", words like "discontinue", "eligible", "TFR" imply a specific medical question.
        clinical_keywords = [
            'tfr', 'treatment-free', 'discontinue', 'stop', 'quit', 'eligible', 
            'criteria', 'monitor', 'schedule', 'side effect', 'adverse', 'protocol'
        ]
        if any(kw in msg for kw in clinical_keywords):
            return 'knowledge'

        # PRIORITY 2: Research/Literature -> Knowledge Agent
        research_keywords = ['pubmed', 'search', 'find', 'literature', 'article', 'study', 'journal', 'guideline']
        if any(kw in msg for kw in research_keywords):
            return 'knowledge'

        # PRIORITY 3: Comparison -> Explanation Agent
        compare_keywords = ['compare', 'difference', 'versus', 'vs', 'between', 'change', 'better', 'worse', 'impact', 'what-if']
        if any(kw in msg for kw in compare_keywords):
            return 'explanation'

        # PRIORITY 4: Explanation -> Explanation Agent
        explain_keywords = ['explain', 'why', 'how', 'meaning', 'interpret', 'contribution', 'shap']
        if any(kw in msg for kw in explain_keywords):
            return 'explanation'

        # PRIORITY 5: General Intervention Plan -> Intervention Agent
        # Only triggers if explicitly asking for a plan/recommendation
        plan_keywords = ['recommend', 'suggest', 'plan', 'advice', 'manage', 'strategy', 'action plan']
        if any(kw in msg for kw in plan_keywords):
            return 'intervention'

        # Default fallback
        return 'knowledge'

    def route_request(self, user_message: str, context_data: Dict[str, Any] = None) -> str:
        """
        The main entry point for chat interactions.
        Dynamically configures agents based on frontend settings.
        """
        # 1. Context ve Ayarları Yükle
        if context_data:
            self.current_patient_data = context_data.get('patient_data', self.current_patient_data)
            if 'prediction' in context_data:
                self.current_prediction = context_data['prediction']
            if 'updated_scenarios' in context_data:
                self.updated_scenarios = context_data['updated_scenarios']
            
            # --- KRİTİK DEĞİŞİKLİK: BUTON AYARLARINI UYGULA ---
            # App.py'dan gelen buton bilgisini alıyoruz
            # Eğer context'te yoksa varsayılan False/True kullanmıyoruz, ne geldiyse o.
            frontend_pubmed_setting = context_data.get('use_pubmed')
            frontend_guideline_setting = context_data.get('use_guidelines')

            # Şimdi bu ayarları Knowledge Agent'a zorla uyguluyoruz
            if self.knowledge_agent:
                # Eğer frontend_pubmed_setting None değilse (yani frontend bir şey gönderdiyse) uygula
                if frontend_pubmed_setting is not None:
                    self.knowledge_agent.use_pubmed = frontend_pubmed_setting
                
                if frontend_guideline_setting is not None:
                    self.knowledge_agent.use_rag = frontend_guideline_setting

            # Diğer agentların RAG ayarlarını da güncelle
            if self.explanation_agent and frontend_guideline_setting is not None:
                self.explanation_agent.use_rag = frontend_guideline_setting
            
            if self.intervention_agent and frontend_guideline_setting is not None:
                self.intervention_agent.use_rag = frontend_guideline_setting
            
            print(f"DEBUG: Agent Settings Updated -> PubMed: {self.knowledge_agent.use_pubmed}, Guidelines: {frontend_guideline_setting}")


        # 2. Niyet Analizi (Intent Analysis)
        intent = self._analyze_intent(user_message)
        print(f"DEBUG: Detected Intent: {intent}")

        # 3. Yönlendirme (Routing)
        response_text = "I'm not sure how to handle that request."

        # --- ROUTE: EXPLANATION ---
        if intent == 'explanation' and self.explanation_agent:
            is_comparison = any(k in user_message.lower() for k in ['compare', 'difference', 'what-if', 'vs'])
            
            if is_comparison and self.updated_scenarios:
                latest_scenario = self.updated_scenarios[-1]
                response_text = self.explanation_agent.compare_predictions(
                    self.current_prediction,
                    latest_scenario,
                    label1="Original Analysis",
                    label2="New Scenario",
                    user_question=user_message
                )
            else:
                response_text = self.explanation_agent.explain_prediction(
                    self.current_prediction,
                    detail_level="moderate"
                )

        # --- ROUTE: INTERVENTION ---
        elif intent == 'intervention' and self.intervention_agent:
            msg_lower = user_message.lower()
            is_specific_question = "?" in user_message or any(q in msg_lower for q in ["how", "is he", "can he", "what is", "when"])
            
            if is_specific_question and self.knowledge_agent:
                print("DEBUG: Intervention intent detected but routed to Knowledge Agent due to question format.")
                context_for_rag = {"patient_data": self.current_patient_data, "prediction": self.current_prediction}
                response_text = self.knowledge_agent.answer_question(user_message, context=context_for_rag)
            else:
                response_text = self.intervention_agent.suggest_interventions(self.current_prediction)

        # --- ROUTE: KNOWLEDGE (Default) ---
        elif self.knowledge_agent:
            context_for_rag = {"patient_data": self.current_patient_data, "prediction": self.current_prediction}
            # Knowledge agent'a sorarken zaten yukarıda ayarları (use_pubmed) güncellediğimiz için
            # burada tekrar parametre geçmeye gerek yok, kendi içindeki ayarı kullanacak.
            response_text = self.knowledge_agent.answer_question(user_message, context=context_for_rag)
        
        else:
            response_text = "The AI agents are not fully initialized. Please check your API key."

        return response_text

    # --- Utility Methods (Kept from original file) ---

    def analyze_patient(self, patient_data: Dict[str, float], detail_level: str = "moderate") -> Dict[str, Any]:
        """Complete patient analysis workflow"""
        print("Analyzing patient...")
        prediction = self.prediction_agent.predict(patient_data)
        self.current_prediction = prediction
        self.current_patient_data = patient_data

        explanation = None
        if self.explanation_agent:
            explanation = self.explanation_agent.explain_prediction(prediction, detail_level)

        interventions = None
        if self.intervention_agent:
            interventions = self.intervention_agent.suggest_interventions(prediction)
        
        top_risk = self.prediction_agent.get_top_risk_factors(prediction, n=5)
        protective_factors = self.prediction_agent.get_protective_factors(prediction, n=3)

        return {
            "prediction": prediction,
            "explanation": explanation,
            "interventions": interventions,
            "top_risk_factors": top_risk,
            "protective_factors": protective_factors
        }

    def ask_question(self, question: str) -> str:
        """Ask a question directly (bypassing route_request if needed)"""
        if not self.knowledge_agent:
            return "Knowledge agent not available."
        
        context = {
            "prediction": self.current_prediction,
            "patient_data": self.current_patient_data
        } if self.current_prediction else None
        
        return self.knowledge_agent.answer_question(question, context)

    def explain_feature(self, feature_name: str) -> str:
        """Get detailed explanation of a feature"""
        if not self.knowledge_agent:
            return "Knowledge agent not available."
        return self.knowledge_agent.explain_feature_importance(feature_name)

    def generate_action_plan(self, timeframe: str = "3months") -> str:
        """Generate action plan"""
        if not self.intervention_agent or not self.current_prediction:
            return "Intervention agent not available or no patient analyzed."
        return self.intervention_agent.generate_action_plan(self.current_prediction, timeframe)

    def compare_scenarios(self, scenario1_data: Dict[str, float], scenario2_data: Dict[str, float],
                         label1: str = "Current", label2: str = "Proposed") -> Dict[str, Any]:
        """Compare two scenarios"""
        pred1 = self.prediction_agent.predict(scenario1_data)
        pred2 = self.prediction_agent.predict(scenario2_data)
        
        risk_change = pred2["risk_score"] - pred1["risk_score"]
        risk_change_pct = (risk_change / pred1["risk_score"]) * 100 if pred1["risk_score"] != 0 else 0

        comparison_explanation = None
        if self.explanation_agent:
            comparison_explanation = self.explanation_agent.compare_predictions(pred1, pred2, label1, label2)

        return {
            "risk_change": risk_change,
            "risk_change_percent": risk_change_pct,
            "comparison_explanation": comparison_explanation
        }

    def get_whatif_suggestions(self) -> str:
        """Get suggested what-if scenarios"""
        if not self.intervention_agent or not self.current_prediction:
            return "Intervention agent not available or no patient analyzed."
        return self.intervention_agent.suggest_what_if_scenarios(self.current_prediction)

    def save_analysis(self, filepath: str):
        """Save current analysis to a file"""
        if not self.current_prediction:
            print("No analysis to save.")
            return
        output = {"patient_data": self.current_patient_data, "prediction": self.current_prediction}
        with open(filepath, 'w') as f:
            json.dump(output, f, indent=2)
        print(f"Analysis saved to {filepath}")

    def load_patient_from_file(self, filepath: str) -> Dict[str, float]:
        """Load patient data from JSON file"""
        with open(filepath, 'r') as f:
            data = json.load(f)
        return data[0] if isinstance(data, list) else data

    def interactive_session(self):
        """Start an interactive session with the agent system"""
        print("\n" + "="*60 + "\nCVD Risk Assessment Agent System\n" + "="*60)
        print("Type 'quit' to exit.")

        while True:
            try:
                command = input("\n> ").strip()
                if command == "quit": break
                
                # Simple routing for CLI
                if command.startswith("analyze "):
                    filepath = command.split(" ", 1)[1]
                    data = self.load_patient_from_file(filepath)
                    res = self.analyze_patient(data)
                    print(f"Risk: {res['prediction']['risk_score']:.1%}")
                elif command.startswith("ask "):
                    print(self.route_request(command.split(" ", 1)[1]))
                else:
                    print(self.route_request(command)) # Send everything else to router
                    
            except Exception as e:
                print(f"Error: {e}")

if __name__ == "__main__":
    import os
    api_key = os.getenv("OPENAI_API_KEY")
    orchestrator = CVDAgentOrchestrator(openai_api_key=api_key)
    # orchestrator.interactive_session() # Uncomment to run in CLI mode