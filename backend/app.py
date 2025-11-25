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

# Load environment variables from .env file if it exists
try:
    from dotenv import load_dotenv
    # Load .env file from backend directory
    env_path = Path(__file__).parent / '.env'
    if env_path.exists():
        load_dotenv(env_path)
        print(f"Loaded environment variables from {env_path}")
    else:
        # Also try project root
        root_env = Path(__file__).parent.parent / '.env'
        if root_env.exists():
            load_dotenv(root_env)
            print(f"Loaded environment variables from {root_env}")
except ImportError:
    # python-dotenv not installed, skip .env loading
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

# --- 1. Uygulamayı Başlat ve CORS'u Aktif Et ---
# (CORS, Next.js'in (localhost:3000) bu API (localhost:5000) ile konuşmasına izin verir)
app = Flask(__name__)
CORS(app)

# Initialize XAI Agent Orchestrator (lazy loading on first chat request)
xai_orchestrator = None

# --- 2. Modelleri ve Gerekli Bilgileri Yükle ---
# (Modeller sadece sunucu başladığında 1 kez yüklenir, bu çok verimlidir)
MODEL_DIR = os.path.join(os.path.dirname(__file__), 'models')

try:
    loaded_explainer = joblib.load(os.path.join(MODEL_DIR, "RF_explainer_allCVD.bz2"))
    loaded_imputer = joblib.load(os.path.join(MODEL_DIR, "RF_imputer_allCVD.pkl"))
    loaded_scaler = joblib.load(os.path.join(MODEL_DIR, "RF_scaler_allCVD.pkl"))
except FileNotFoundError:
    print("HATA: Model dosyaları 'models/' klasöründe bulunamadı.")
    # Gerçek bir uygulamada burada sunucuyu durdurabilirsiniz.
    exit()


# --- 3. ÖZELLİK SIRALAMASI (ÇOK ÖNEMLİ) ---
# Paylaştığınız JSON dosyasına göre bu sırayı TAHMİN EDİYORUM.
# Lütfen hocanızdan DOĞRU SIRAYI teyit edin. Modelin beklediği sıra budur.
FEATURE_ORDER = [
    "anchor_age", "White Blood Cells", "Urea Nitrogen", "Neutrophils", "BMI",
    "Monocytes", "Glucose", "systolic", "MCH", "Calcium, Total", "Lymphocytes",
    "Creatinine", "Sodium", "diastolic", "PT", "imatinib_dose", "dasatinib_dose",
    "gender_encoded", "nilotinib_dose", "ponatinib_dose", "ruxolitinib_dose"
]

# --- 4. Tahmin Endpoint'ini Oluştur ---
@app.route('/api/predict', methods=['POST'])
def predict():
    try:
        # 0. Simulated processing time (3-4 seconds)
        processing_time = random.uniform(3.0, 4.0)
        print(f"Processing request... (simulated time: {processing_time:.1f}s)")
        time.sleep(processing_time)
        
        # 1. ... (Veri alma - DEĞİŞİKLİK YOK) ...
        input_json = request.get_json()

        # 2. ... (DataFrame oluşturma - DEĞİŞİKLİK YOK) ...
        input_data_list = []
        for feature in FEATURE_ORDER:
            input_data_list.append(input_json.get(feature, None)) 
        input_df = pd.DataFrame([input_data_list], columns=FEATURE_ORDER)

        # 3. ... (Veri Ön İşleme - DEĞİŞİKLİK YOK) ...
        imputed_array = loaded_imputer.transform(input_df.values)
        imputed_df = pd.DataFrame(imputed_array, columns=FEATURE_ORDER)
        scaled_array = loaded_scaler.transform(imputed_df)
        scaled_df = pd.DataFrame(scaled_array, columns=FEATURE_ORDER)

        # 4. Tahmin ve SHAP Değerlerini Hesapla
        explanation = loaded_explainer(scaled_df)

        shap_values = explanation.values[0, :, 1]
        base_value = explanation.base_values[0, 1]
        prediction_probability = base_value + shap_values.sum()

        # --- YENİ BÖLÜM: TAM SHAP HTML OLUŞTURMA ---
        # 'imputed_df.iloc[0]' -> plot'ta gösterilecek ham değerler
        force_plot = shap.force_plot(
            base_value,
            shap_values,
            features=imputed_df.iloc[0], 
            show=False,
            matplotlib=False
        )

        # HTML'i diske kaydetmek yerine, hafızada bir dosyaya (StringIO) kaydet
        f = io.StringIO()
        shap.save_html(f, force_plot)
        # Hafızadaki dosyanın içeriğini string olarak al
        shap_html = f.getvalue()
        # -------------------------------------

        feature_values = imputed_df.iloc[0].values.tolist()

        # 5. Frontend'e göndermek için JSON yanıtı hazırla
        response = {
            "status": "success",
            "prediction": float(prediction_probability),
            "base_value": float(base_value),
            # Artık bunlara frontend'de ihtiyacımız yok ama gönderebiliriz
            "shap_values": shap_values.tolist(),     
            "feature_names": FEATURE_ORDER,          
            "feature_values": feature_values,        
            "shap_html": shap_html                   # <-- YENİ: Bu artık TAM BİR HTML DOSYASI
        }
        return jsonify(response)

    except Exception as e:
        print(f"HATA OLUŞTU: {e}") 
        import traceback
        traceback.print_exc() 
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

# --- 4.1. Basit Tahmin Endpoint'ini Oluştur ---
@app.route('/api/predict-simple', methods=['POST'])
def predict_simple():
    try:
        # 0. Simulated processing time (3-4 seconds)
        processing_time = random.uniform(3.0, 4.0)
        print(f"Processing simple prediction request... (simulated time: {processing_time:.1f}s)")
        time.sleep(processing_time)
        
        # 1. Veri alma
        input_json = request.get_json()

        # 2. DataFrame oluşturma
        input_data_list = []
        for feature in FEATURE_ORDER:
            input_data_list.append(input_json.get(feature, None)) 
        input_df = pd.DataFrame([input_data_list], columns=FEATURE_ORDER)

        # 3. Veri Ön İşleme
        imputed_array = loaded_imputer.transform(input_df.values)
        imputed_df = pd.DataFrame(imputed_array, columns=FEATURE_ORDER)
        scaled_array = loaded_scaler.transform(imputed_df)
        scaled_df = pd.DataFrame(scaled_array, columns=FEATURE_ORDER)

        # 4. Sadece Tahmin (SHAP hesaplama yok)
        explanation = loaded_explainer(scaled_df)
        prediction_probability = explanation.base_values[0, 1] + explanation.values[0, :, 1].sum()

        # 5. Basit JSON yanıtı
        response = {
            "status": "success",
            "prediction": float(prediction_probability)
        }
        return jsonify(response)

    except Exception as e:
        print(f"HATA OLUŞTU (Simple): {e}") 
        import traceback
        traceback.print_exc() 
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

# --- 4.5. Chatbot Endpoint with XAI Agent Integration ---
def get_orchestrator():
    """Initialize orchestrator lazily on first use"""
    global xai_orchestrator
    if xai_orchestrator is None and XAI_AGENT_AVAILABLE:
        try:
            api_key = os.getenv("OPENAI_API_KEY")
            # Initialize with RAG and PubMed enabled
            xai_orchestrator = CVDAgentOrchestrator(
                openai_api_key=api_key,
                use_rag=True,      # Enable RAG for clinical guidelines
                use_pubmed=True    # Enable PubMed for scientific articles
            )
            print("XAI Agent Orchestrator initialized successfully (with RAG and PubMed)")
        except Exception as e:
            print(f"Error initializing XAI Orchestrator: {e}")
            return None
    return xai_orchestrator

def prepare_patient_data_from_context(context):
    """Convert frontend context to patient data dictionary for orchestrator"""
    patient_data = context.get('patientData', {})
    
    # If patient_data is already in the right format, return it
    if isinstance(patient_data, dict) and patient_data:
        # Ensure all values are floats
        return {k: float(v) if v is not None else None for k, v in patient_data.items()}
    
    return {}

def prepare_shap_values_from_context(context):
    """Convert frontend shapValues to dictionary format"""
    shap_values = context.get('shapValues', {})
    
    # If shapValues is an array of objects (e.g., [{name, value, shap}, ...])
    if isinstance(shap_values, list):
        shap_dict = {}
        for item in shap_values:
            if isinstance(item, dict) and 'name' in item and 'shap' in item:
                shap_dict[item['name']] = float(item['shap'])
        return shap_dict
    
    # If shapValues is already a dictionary, return it
    if isinstance(shap_values, dict):
        return {k: float(v) if v is not None else 0.0 for k, v in shap_values.items()}
    
    return {}

def prepare_updated_results_from_context(context):
    """Convert frontend updatedResults to a list of prediction results"""
    updated_results = context.get('updatedResults', [])
    
    if not isinstance(updated_results, list):
        return []
    
    formatted_results = []
    for result in updated_results:
        try:
            # Extract risk score and convert to probability
            risk_score_str = result.get('riskScore', '')
            risk_score = float(risk_score_str) if risk_score_str else 0.0
            if risk_score > 1:
                risk_score = risk_score / 100.0
            
            # Extract SHAP values from featuresWithShap
            shap_values = {}
            features_with_shap = result.get('featuresWithShap', [])
            for feature in features_with_shap:
                if isinstance(feature, dict) and 'name' in feature and 'shap' in feature:
                    shap_values[feature['name']] = float(feature['shap'])
            
            # Get patient data
            patient_data = result.get('patientData', {})
            if isinstance(patient_data, dict):
                patient_data = {k: float(v) if v is not None else None for k, v in patient_data.items()}
            
            formatted_results.append({
                "risk_score": risk_score,
                "risk_level": "High" if risk_score > 0.7 else ("Moderate" if risk_score > 0.3 else "Low"),
                "shap_values": shap_values,
                "feature_values": patient_data
            })
        except (ValueError, TypeError, KeyError) as e:
            print(f"Error formatting updated result: {e}")
            continue
    
    return formatted_results

def analyze_message_intent(message: str) -> str:
    """Analyze user message to determine which agent to use"""
    message_lower = message.lower()
    
    # Keywords for different agents
    explanation_keywords = ['explain', 'why', 'how', 'what does', 'understand', 'meaning']
    intervention_keywords = ['recommend', 'suggest', 'what should', 'action', 'plan', 'intervention', 'treatment', 'advice']
    knowledge_keywords = ['what is', 'tell me about', 'define', 'information', 'learn']
    
    # Check for explanation requests
    if any(kw in message_lower for kw in explanation_keywords):
        if 'shap' in message_lower or 'contribution' in message_lower or 'factor' in message_lower:
            return 'explanation'
    
    # Check for intervention requests
    if any(kw in message_lower for kw in intervention_keywords):
        return 'intervention'
    
    # Check for knowledge requests
    if any(kw in message_lower for kw in knowledge_keywords):
        return 'knowledge'
    
    # Default to knowledge agent for general questions
    return 'knowledge'

@app.route('/api/chat', methods=['POST'])
def chat():
    try:
        data = request.get_json()
        user_message = data.get('message', '')
        context = data.get('context', {})
        
        # Get external sources toggles (defaults: True)
        use_guideline_sources = context.get('useGuidelineSources', True)
        use_pubmed_sources = context.get('usePubmedSources', True)
        
        # Try to use XAI Agent System if available
        orchestrator = get_orchestrator()
        
        if orchestrator and XAI_AGENT_AVAILABLE:
            # Prepare patient data from context
            patient_data = prepare_patient_data_from_context(context)
            
            # Prepare updated results (what-if scenarios)
            updated_results = prepare_updated_results_from_context(context)
            
            # If we have patient data, update orchestrator state (always update, not just if missing)
            # This ensures that when a new patient's data is submitted, the orchestrator uses the new data
            if patient_data:
                # Check if we need to run a new prediction
                risk_score_str = context.get('riskScore', '')
                shap_values = prepare_shap_values_from_context(context)
                
                # If we have prediction results, create/update prediction result dict
                if risk_score_str and risk_score_str != 'N/A':
                    try:
                        # Convert risk score from percentage to probability if needed
                        risk_score = float(risk_score_str) if isinstance(risk_score_str, str) else risk_score_str
                        # If risk_score is > 1, it's likely a percentage, convert to probability
                        if risk_score > 1:
                            risk_score = risk_score / 100.0
                        
                        # Always update orchestrator state with current patient data
                        # This ensures new patient data replaces old patient data
                        orchestrator.current_prediction = {
                            "risk_score": risk_score,
                            "risk_level": "High" if risk_score > 0.7 else ("Moderate" if risk_score > 0.3 else "Low"),
                            "shap_values": shap_values if shap_values else {},
                            "feature_values": patient_data
                        }
                        orchestrator.current_patient_data = patient_data
                    except (ValueError, TypeError) as e:
                        print(f"Error processing risk score: {e}")
                        pass
            
            # Store updated results in orchestrator for comparison queries
            if updated_results:
                # Store as a class attribute so agents can access it
                orchestrator.updated_scenarios = updated_results
            else:
                orchestrator.updated_scenarios = []
            
            # Determine which agent to use based on message intent
            intent = analyze_message_intent(user_message)
            
            try:
                # Check if user is asking about comparisons or what-if scenarios
                message_lower = user_message.lower()
                is_comparison_query = any(kw in message_lower for kw in [
                    'compare', 'difference', 'better', 'worse', 'change', 'updated', 
                    'what-if', 'scenario', 'second', 'third', 'fourth', 'alternative'
                ])
                
                # If user asks about comparisons and we have updated scenarios
                if is_comparison_query and updated_results and orchestrator.current_prediction:
                    if orchestrator.explanation_agent:
                        # Temporarily disable RAG if toggle is OFF
                        original_use_rag = orchestrator.explanation_agent.use_rag
                        if not use_guideline_sources:
                            orchestrator.explanation_agent.use_rag = False
                        
                        # Compare original with most recent updated result
                        latest_updated = updated_results[-1]
                        comparison = orchestrator.explanation_agent.compare_predictions(
                            orchestrator.current_prediction,
                            latest_updated,
                            label1="Original Analysis",
                            label2=f"Updated Scenario {len(updated_results)}"
                        )
                        response_text = comparison
                        
                        # Restore original setting
                        orchestrator.explanation_agent.use_rag = original_use_rag
                    else:
                        response_text = orchestrator.ask_question(user_message)
                elif intent == 'explanation' and orchestrator.current_prediction:
                    # Use explanation agent
                    if orchestrator.explanation_agent:
                        # Temporarily disable RAG if toggle is OFF
                        original_use_rag = orchestrator.explanation_agent.use_rag
                        if not use_guideline_sources:
                            orchestrator.explanation_agent.use_rag = False
                        
                        # Include updated scenarios context if available
                        if updated_results:
                            explanation = orchestrator.explanation_agent.explain_prediction(
                                orchestrator.current_prediction,
                                detail_level="moderate"
                            )
                            # Add note about available comparisons
                            response_text = f"{explanation}\n\nNote: You have {len(updated_results)} what-if scenario(s) available. Ask me to compare them with the original analysis to see how changes affect the risk."
                        else:
                            explanation = orchestrator.explanation_agent.explain_prediction(
                                orchestrator.current_prediction,
                                detail_level="moderate"
                            )
                            response_text = explanation
                        
                        # Restore original setting
                        orchestrator.explanation_agent.use_rag = original_use_rag
                    else:
                        response_text = orchestrator.ask_question(user_message)
                elif intent == 'intervention' and orchestrator.current_prediction:
                    # Use intervention agent
                    if orchestrator.intervention_agent:
                        # Temporarily disable RAG if toggle is OFF
                        original_use_rag = orchestrator.intervention_agent.use_rag
                        if not use_guideline_sources:
                            orchestrator.intervention_agent.use_rag = False
                        
                        # If we have updated results, use the most recent for better recommendations
                        prediction_for_intervention = updated_results[-1] if updated_results else orchestrator.current_prediction
                        interventions = orchestrator.intervention_agent.suggest_interventions(
                            prediction_for_intervention,
                            top_n=5
                        )
                        response_text = interventions
                        
                        # Restore original setting
                        orchestrator.intervention_agent.use_rag = original_use_rag
                    else:
                        response_text = orchestrator.ask_question(user_message)
                else:
                    # Use knowledge agent for general questions
                    # Include updated scenarios info in context
                    context_for_question = {
                        "prediction": orchestrator.current_prediction,
                        "patient_data": orchestrator.current_patient_data,
                        "updated_scenarios_count": len(updated_results) if updated_results else 0,
                        "use_guideline_sources": use_guideline_sources,
                        "use_pubmed_sources": use_pubmed_sources
                    }
                    # Temporarily disable RAG/PubMed if toggle is OFF
                    if orchestrator.knowledge_agent:
                        original_use_rag = orchestrator.knowledge_agent.use_rag
                        original_use_pubmed = orchestrator.knowledge_agent.use_pubmed
                        if not use_guideline_sources:
                            orchestrator.knowledge_agent.use_rag = False
                        if not use_pubmed_sources:
                            orchestrator.knowledge_agent.use_pubmed = False
                        response_text = orchestrator.knowledge_agent.answer_question(user_message, context_for_question)
                        # Restore original settings
                        orchestrator.knowledge_agent.use_rag = original_use_rag
                        orchestrator.knowledge_agent.use_pubmed = original_use_pubmed
                    else:
                        response_text = orchestrator.ask_question(user_message)
                
                return jsonify({
                    "status": "success",
                    "response": response_text
                })
            except Exception as e:
                print(f"XAI Agent error: {e}")
                import traceback
                traceback.print_exc()
                # Fall back to simple response generator
                risk_score = context.get('riskScore', 'N/A')
                patient_data = context.get('patientData', {})
                response_text = generate_chat_response(user_message, risk_score, patient_data)
                return jsonify({
                    "status": "success",
                    "response": response_text
                })
        else:
            # Fall back to simple rule-based system
            risk_score = context.get('riskScore', 'N/A')
            patient_data = context.get('patientData', {})
            response_text = generate_chat_response(user_message, risk_score, patient_data)
            
            return jsonify({
                "status": "success",
                "response": response_text
            })
        
    except Exception as e:
        print(f"Chat error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

def generate_chat_response(user_message: str, risk_score: str, patient_data: dict) -> str:
    """Basit kural tabanlı chatbot response generator"""
    message_lower = user_message.lower()
    
    # Risk score questions
    if 'risk' in message_lower or 'risk score' in message_lower:
        score = float(risk_score) if risk_score != 'N/A' else 0
        if score > 70:
            return f"The patient's CVD risk score is {risk_score}%, indicating HIGH risk. This requires immediate monitoring and intervention. Recommendations: Regular ECG, cardiac enzyme monitoring, and consideration for emergency department evaluation."
        elif score > 50:
            return f"The patient's CVD risk score is {risk_score}%, indicating MODERATE risk. Routine follow-up and lifestyle modifications are recommended. Lipid profile, ECG, and physical activity assessment should be conducted."
        else:
            return f"The patient's CVD risk score is {risk_score}%, indicating LOW risk. Routine health screenings and preventive measures are sufficient."
    
    # SHAP values
    if 'contribution' in message_lower or 'importance' in message_lower or 'shap' in message_lower:
        return "SHAP values show how each feature contributes to the risk prediction. Positive values increase risk, while negative values decrease it. Patient management can be optimized by prioritizing features with the highest contribution."
    
    # Laboratory values
    if 'laboratory' in message_lower or 'lab' in message_lower or 'blood' in message_lower:
        return "Laboratory values play a critical role in CVD risk assessment. Lipid profiles (cholesterol, LDL, HDL), inflammatory markers, and organ function tests are particularly important. Abnormal values can increase risk factors."
    
    # General health recommendations
    if 'advice' in message_lower or 'recommendation' in message_lower or 'suggest' in message_lower:
        score = float(risk_score) if risk_score != 'N/A' else 0
        if score > 70:
            return "HIGH RISK patient recommendations: Urgent cardiologist consultation, statin therapy evaluation, aspirin prophylaxis, smoking cessation program, dietary and lifestyle modifications. Patient should seek immediate medical attention for any chest pain or shortness of breath."
        elif score > 50:
            return "MODERATE RISK patient recommendations: Regular lipid monitoring, at least 150 minutes of moderate-intensity physical activity per week, Mediterranean diet, smoking cessation, routine cardiovascular assessment."
        else:
            return "LOW RISK patient recommendations: Annual health screening, balanced diet, regular physical activity, blood pressure monitoring, and lifestyle modifications."
    
    # Default response
    responses = [
        "I can analyze the patient's condition based on CVD risk analysis results. You can ask about risk scores, SHAP values, or laboratory tests.",
        "I can provide information about patient data and risk analysis results. What would you like to know about?",
        "For more information about CVD risk score and SHAP analysis, you can ask about risk scores, laboratory values, or SHAP values."
    ]
    
    return responses[hash(user_message) % len(responses)]

# --- 5. Sunucuyu Başlat ---
if __name__ == '__main__':
    # 'host="0.0.0.0"' dışarıdan erişime izin verir (geliştirme için)
    # 'debug=True' kod değiştikçe sunucuyu yeniden başlatır
    app.run(host="0.0.0.0", port=5000, debug=True)