import joblib
import pandas as pd
import numpy as np
import shap
from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import io
import time
import random
import sys
from pathlib import Path

# Load environment variables
try:
    from dotenv import load_dotenv
    env_path = Path(__file__).parent / '.env'
    if env_path.exists():
        load_dotenv(env_path)
    else:
        root_env = Path(__file__).parent.parent / '.env'
        if root_env.exists():
            load_dotenv(root_env)
except ImportError:
    pass

# Add XAIagent_code to path
XAI_AGENT_DIR = Path(__file__).parent / "XAIagent_code"
sys.path.insert(0, str(XAI_AGENT_DIR))

# Import orchestrator
try:
    from orchestrator import CVDAgentOrchestrator
    XAI_AGENT_AVAILABLE = True
except ImportError as e:
    print(f"Warning: XAI Agent System not available: {e}")
    XAI_AGENT_AVAILABLE = False

app = Flask(__name__)
CORS(app)

xai_orchestrator = None
MODEL_DIR = os.path.join(os.path.dirname(__file__), 'models')

try:
    loaded_explainer = joblib.load(os.path.join(MODEL_DIR, "RF_explainer_allCVD.bz2"))
    loaded_imputer = joblib.load(os.path.join(MODEL_DIR, "RF_imputer_allCVD.pkl"))
    loaded_scaler = joblib.load(os.path.join(MODEL_DIR, "RF_scaler_allCVD.pkl"))
except FileNotFoundError:
    print("CRITICAL ERROR: Model files not found.")

FEATURE_ORDER = [
    "anchor_age", "White Blood Cells", "Urea Nitrogen", "Neutrophils", "BMI",
    "Monocytes", "Glucose", "systolic", "MCH", "Calcium, Total", "Lymphocytes",
    "Creatinine", "Sodium", "diastolic", "PT", "imatinib_dose", "dasatinib_dose",
    "gender_encoded", "nilotinib_dose", "ponatinib_dose", "ruxolitinib_dose"
]

# --- Helper Functions ---

def parse_risk_score(score_input):
    """
    Gelen risk skorunu güvenli bir şekilde 0-1 aralığında float'a çevirir.
    String ("92.3%"), Int (92) veya Float (0.92) gelebilir.
    """
    try:
        val = 0.0
        if score_input is None:
            return 0.0
            
        if isinstance(score_input, (int, float)):
            val = float(score_input)
        elif isinstance(score_input, str):
            # Yüzde işaretini ve boşlukları temizle
            clean = score_input.replace('%', '').strip()
            if clean:
                val = float(clean)
        
        # Eğer değer > 1 ise (örn: 92.33), yüzde demektir -> 0.9233 yap
        if val > 1.0:
            val /= 100.0
            
        return val
    except Exception as e:
        print(f"Risk parse error for '{score_input}': {e}")
        return 0.0

def get_orchestrator():
    global xai_orchestrator
    if xai_orchestrator is None and XAI_AGENT_AVAILABLE:
        try:
            api_key = os.getenv("OPENAI_API_KEY")
            xai_orchestrator = CVDAgentOrchestrator(openai_api_key=api_key, use_rag=True, use_pubmed=True)
            print("✓ XAI Orchestrator initialized")
        except Exception as e:
            print(f"Error initializing Orchestrator: {e}")
            return None
    return xai_orchestrator

def analyze_message_intent(message: str) -> str:
    msg = message.lower()
    # 1. Araştırma / Dış Kaynak
    if any(kw in msg for kw in ['pubmed', 'search', 'find', 'literature', 'article', 'study', 'journal', 'guideline']):
        return 'knowledge'
    # 2. Karşılaştırma
    if any(kw in msg for kw in ['compare', 'difference', 'versus', 'vs', 'between', 'change', 'better', 'worse']):
        return 'knowledge' # Genellikle knowledge veya explanation bakar, ama compare için explanation'a yönlendireceğiz aşağıda
    # 3. Açıklama
    if any(kw in msg for kw in ['explain', 'why', 'how', 'meaning', 'interpret', 'contribution', 'shap']):
        return 'explanation'
    # 4. Müdahale
    if any(kw in msg for kw in ['recommend', 'suggest', 'plan', 'advice', 'treatment', 'manage']):
        return 'intervention'
    
    return 'knowledge'

# --- Endpoints ---

@app.route('/api/predict', methods=['POST'])
def predict():
    try:
        time.sleep(random.uniform(1.0, 2.0))
        input_json = request.get_json()
        input_data_list = [input_json.get(f) for f in FEATURE_ORDER]
        input_df = pd.DataFrame([input_data_list], columns=FEATURE_ORDER)

        imputed_array = loaded_imputer.transform(input_df.values)
        imputed_df = pd.DataFrame(imputed_array, columns=FEATURE_ORDER)
        scaled_array = loaded_scaler.transform(imputed_df)
        scaled_df = pd.DataFrame(scaled_array, columns=FEATURE_ORDER)

        explanation = loaded_explainer(scaled_df)
        shap_values = explanation.values[0, :, 1]
        base_value = explanation.base_values[0, 1]
        prediction_probability = base_value + shap_values.sum()

        f = io.StringIO()
        shap.save_html(f, shap.force_plot(base_value, shap_values, features=imputed_df.iloc[0], show=False, matplotlib=False))
        
        return jsonify({
            "status": "success",
            "prediction": float(prediction_probability),
            "base_value": float(base_value),
            "shap_values": shap_values.tolist(),     
            "feature_names": FEATURE_ORDER,          
            "feature_values": imputed_df.iloc[0].values.tolist(),        
            "shap_html": f.getvalue()
        })
    except Exception as e:
        print(f"Prediction Error: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/predict-simple', methods=['POST'])
def predict_simple():
    try:
        input_json = request.get_json()
        input_data_list = [input_json.get(f) for f in FEATURE_ORDER]
        imputed_array = loaded_imputer.transform(pd.DataFrame([input_data_list], columns=FEATURE_ORDER).values)
        scaled_array = loaded_scaler.transform(pd.DataFrame(imputed_array, columns=FEATURE_ORDER))
        explanation = loaded_explainer(pd.DataFrame(scaled_array, columns=FEATURE_ORDER))
        prediction_probability = explanation.base_values[0, 1] + explanation.values[0, :, 1].sum()
        return jsonify({"status": "success", "prediction": float(prediction_probability)})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/chat', methods=['POST'])
def chat():
    try:
        data = request.get_json()
        user_message = data.get('message', '')
        frontend_context = data.get('context', {})
        
        orchestrator = get_orchestrator()
        
        if orchestrator and XAI_AGENT_AVAILABLE:
            # 1. Ayarlar ve Zorlama (Override)
            use_guidelines = frontend_context.get('useGuidelineSources', True)
            use_pubmed = frontend_context.get('usePubmedSources', True)
            msg_lower = user_message.lower()
            
            if any(kw in msg_lower for kw in ['pubmed', 'search', 'find article', 'study', 'literature']):
                use_pubmed = True
            if any(kw in msg_lower for kw in ['guideline', 'recommendation', 'eln', 'standard']):
                use_guidelines = True

            # 2. SHAP Değerlerini İşle
            raw_shap = frontend_context.get('shapValues', {})
            shap_dict = {}
            if isinstance(raw_shap, list):
                for item in raw_shap:
                    name = item.get('name') or item.get('feature')
                    val = item.get('shap') or item.get('value')
                    if name and val is not None:
                        shap_dict[name] = float(val)
            elif isinstance(raw_shap, dict):
                shap_dict = {k: float(v) for k, v in raw_shap.items()}

            # 3. Mevcut Tahmin (Current Prediction)
            risk_val = parse_risk_score(frontend_context.get('riskScore'))
            
            current_prediction = {
                "risk_score": risk_val,
                "risk_level": "High" if risk_val > 0.7 else ("Moderate" if risk_val > 0.3 else "Low"),
                "feature_values": frontend_context.get('patientData', {}),
                "shap_values": shap_dict
            }
            
            # Orchestrator güncelle
            orchestrator.current_prediction = current_prediction
            orchestrator.current_patient_data = frontend_context.get('patientData', {})

            # 4. What-If Senaryoları (Updated Results) - GÜVENLİ PARSING
            raw_updated_results = frontend_context.get('updatedResults', [])
            formatted_scenarios = []
            
            if raw_updated_results:
                for scen in raw_updated_results:
                    try:
                        # Risk skorunu güvenli fonksiyonla çevir
                        scen_risk = parse_risk_score(scen.get('riskScore'))
                        
                        # SHAP değerleri
                        s_dict = {}
                        feats_shap = scen.get('featuresWithShap', [])
                        if isinstance(feats_shap, list):
                            for item in feats_shap:
                                s_dict[item.get('name')] = float(item.get('shap', 0))
                        
                        clean_scenario = {
                            "risk_score": scen_risk,
                            "feature_values": scen.get('patientData', {}),
                            "shap_values": s_dict,
                            "risk_level": "High" if scen_risk > 0.7 else ("Moderate" if scen_risk > 0.3 else "Low")
                        }
                        formatted_scenarios.append(clean_scenario)
                    except Exception as e:
                        print(f"Error formatting scenario: {e}")

                orchestrator.updated_scenarios = formatted_scenarios

            # 5. Agent Context
            agent_context = {
                "use_guideline_sources": use_guidelines,
                "use_pubmed_sources": use_pubmed,
                "patient_data": frontend_context.get('patientData', {}),
                "risk_score": frontend_context.get('riskScore', 'N/A'),
                "prediction": current_prediction,
                "updated_scenarios_count": len(formatted_scenarios)
            }

            # 6. Yönlendirme (Routing)
            intent = analyze_message_intent(user_message)
            response_text = ""
            is_comparison = any(k in msg_lower for k in ['compare', 'difference', 'what-if', 'change', 'impact'])

            # Senaryo varsa ve karşılaştırma isteniyorsa -> Explanation Agent
            if is_comparison and formatted_scenarios and orchestrator.explanation_agent:
                original_rag = orchestrator.explanation_agent.use_rag
                orchestrator.explanation_agent.use_rag = use_guidelines
                
                latest = formatted_scenarios[-1]
                response_text = orchestrator.explanation_agent.compare_predictions(
                    orchestrator.current_prediction,
                    latest,
                    label1="Original Analysis",
                    label2="New What-If Scenario",
                    user_question=user_message
                )
                orchestrator.explanation_agent.use_rag = original_rag
            
            elif intent == 'explanation' and orchestrator.explanation_agent:
                original_rag = orchestrator.explanation_agent.use_rag
                orchestrator.explanation_agent.use_rag = use_guidelines
                response_text = orchestrator.explanation_agent.explain_prediction(
                    orchestrator.current_prediction,
                    detail_level="moderate"
                )
                orchestrator.explanation_agent.use_rag = original_rag
            
            elif intent == 'intervention' and orchestrator.intervention_agent:
                original_rag = orchestrator.intervention_agent.use_rag
                orchestrator.intervention_agent.use_rag = use_guidelines 
                response_text = orchestrator.intervention_agent.suggest_interventions(
                    orchestrator.current_prediction
                )
                orchestrator.intervention_agent.use_rag = original_rag
            
            else:
                # Knowledge Agent
                if orchestrator.knowledge_agent:
                    original_rag = orchestrator.knowledge_agent.use_rag
                    original_pubmed = orchestrator.knowledge_agent.use_pubmed
                    orchestrator.knowledge_agent.use_rag = use_guidelines
                    orchestrator.knowledge_agent.use_pubmed = use_pubmed

                    response_text = orchestrator.knowledge_agent.answer_question(
                        user_message, 
                        context=agent_context
                    )

                    orchestrator.knowledge_agent.use_rag = original_rag
                    orchestrator.knowledge_agent.use_pubmed = original_pubmed
                else:
                    response_text = "Knowledge Agent unavailable."

            return jsonify({"status": "success", "response": response_text})

        else:
            return jsonify({"status": "success", "response": f"System in basic mode. Risk: {frontend_context.get('riskScore', 'N/A')}%."})

    except Exception as e:
        print(f"Chat Error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"status": "error", "message": "An error occurred."}), 500

if __name__ == '__main__':
    app.run(host="0.0.0.0", port=5000, debug=True)