"""
Knowledge Agent - Enhanced with Intelligent Query Generation and RAG
"""
import sys
from pathlib import Path
from typing import Dict, Any, List, Optional
import json
import os

# OpenAI import
try:
    from openai import OpenAI
except ImportError:
    print("Warning: OpenAI library not installed. Run: pip install openai")
    OpenAI = None

# Add parent directory to path for config import
sys.path.append(str(Path(__file__).parent.parent))
from config import OPENAI_API_KEY, OPENAI_MODEL, FEATURE_INFO

# RAG and PubMed imports
try:
    from knowledge_base.rag_service import RAGService
    RAG_AVAILABLE = True
except ImportError:
    RAG_AVAILABLE = False
    print("Warning: RAG service not available")

try:
    from knowledge_base.pubmed_service import PubMedService
    PUBMED_AVAILABLE = True
except ImportError:
    PUBMED_AVAILABLE = False
    print("Warning: PubMed service not available")


class KnowledgeAgent:
    """
    Agent responsible for answering questions about features, medical concepts,
    and providing educational information about CML and CVD using RAG and PubMed.
    """

    def __init__(self, api_key: str = None, use_rag: bool = True, use_pubmed: bool = True):
        """
        Initialize the knowledge agent
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
                print("✓ Knowledge Agent: RAG service initialized")
            except Exception as e:
                print(f"Warning: Could not initialize RAG service: {e}")
                self.use_rag = False

        # Initialize PubMed service (with MCP support)
        self.pubmed_service = None
        self.use_pubmed = use_pubmed and PUBMED_AVAILABLE
        if self.use_pubmed:
            try:
                # Try to use MCP if available, otherwise use direct API
                self.pubmed_service = PubMedService(use_mcp=True)
                print("✓ Knowledge Agent: PubMed service initialized (with MCP)")
            except Exception as e:
                try:
                    # Fallback to direct API
                    self.pubmed_service = PubMedService(use_mcp=False)
                    print("✓ Knowledge Agent: PubMed service initialized (direct API)")
                except Exception as e2:
                    print(f"Warning: Could not initialize PubMed service: {e2}")
                    self.use_pubmed = False

        # Build knowledge base context
        self.knowledge_base = self._build_knowledge_base()

    def _build_knowledge_base(self) -> str:
        """
        Build a basic knowledge base context from feature information
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

    def _generate_search_queries(self, user_question: str) -> dict:
        """
        Generates optimized search queries for RAG and PubMed.
        Uses simple text parsing to be robust against library versions.
        """
        # --- BASİTLEŞTİRİLMİŞ VE SAĞLAM PROMPT ---
        system_prompt = """
        You are a medical search assistant.
        Convert the user's question into TWO simple search queries.
        
        OUTPUT FORMAT (Exactly like this):
        RAG: <keywords for guidelines>
        PUBMED: <keywords for scientific articles>
        
        RULES:
        1. PUBMED query must be VERY SHORT (max 3-4 keywords).
        2. REMOVE stop words (is, the, a, for, patient).
        3. REMOVE years (2020-2024).
        4. FOCUS on the drug names and the side effect.
        
        Example 1:
        User: "Search for recent studies about obesity impact on Imatinib efficacy"
        Output:
        RAG: Imatinib obesity efficacy guidelines
        PUBMED: Imatinib obesity BMI pharmacokinetics
        
        Example 2:
        User: "Is Imatinib metabolically safer than Nilotinib regarding glucose?"
        Output:
        RAG: Imatinib Nilotinib metabolic glucose lipid
        PUBMED: Imatinib Nilotinib hyperglycemia hyperlipidemia
        """
        
        try:
            # JSON mode yerine standart text kullanıyoruz (Hata riskini sıfırlar)
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_question}
                ],
                temperature=0
            )
            content = response.choices[0].message.content
            
            # Varsayılan değerler
            rag_query = user_question
            pubmed_query = f"CML {user_question}"
            
            # Basit Metin Ayrıştırma (Parsing)
            for line in content.split('\n'):
                clean_line = line.strip()
                if clean_line.startswith("RAG:"):
                    rag_query = clean_line.replace("RAG:", "").strip()
                elif clean_line.startswith("PUBMED:"):
                    pubmed_query = clean_line.replace("PUBMED:", "").strip()
            
            # Güvenlik: Eğer PubMed sorgusu hala çok uzunsa (5 kelimeden fazla), zorla kısalt
            if len(pubmed_query.split()) > 5:
                # Sadece ilk 4 kelimeyi al
                pubmed_query = " ".join(pubmed_query.split()[:4])

            return {
                "rag_query": rag_query,
                "pubmed_query": pubmed_query,
                "needs_external_info": True
            }
            
        except Exception as e:
            print(f"Query generation error: {e}")
            # Hata durumunda en basit anahtar kelimeleri kullan
            # Sadece ilaç isimlerini ve ilk 2 anlamlı kelimeyi yakalamaya çalışalım
            simple_words = [w for w in user_question.split() if len(w) > 3][:4]
            simple_query = " ".join(simple_words)
            
            return {
                "rag_query": user_question,
                "pubmed_query": simple_query,
                "needs_external_info": True
            }

    def answer_question(self, question: str, context: Dict[str, Any] = None) -> str:
        """
        Answer a general question about features, CML, or CVD.
        Uses generated queries to fetch data from RAG and PubMed.
        """
        # 1. Generate optimized search queries
        search_params = self._generate_search_queries(question)
        
        # Check context for override flags (from frontend toggles)
        # Varsayılan olarak sınıfın ayarlarını al
        use_rag_config = self.use_rag
        use_pubmed_config = self.use_pubmed
        
        # Context'ten gelen zorlamaları kontrol et
        if context:
            # Eğer context'te 'use_guideline_sources' varsa ve True ise, sınıf ayarını ez
            if 'use_guideline_sources' in context:
                use_rag_config = context.get('use_guideline_sources') and self.use_rag
            
            # Eğer context'te 'use_pubmed_sources' varsa ve True ise, sınıf ayarını ez
            if 'use_pubmed_sources' in context:
                use_pubmed_config = context.get('use_pubmed_sources') and self.use_pubmed
        
        force_search = False
        trigger_words = ['pubmed', 'search', 'find', 'study', 'article', 'guideline', 'reference']
        if any(w in question.lower() for w in trigger_words):
            force_search = True

        # Arama yapmalı mıyız? (GPT "evet" dediyse VEYA biz zorluyorsak VEYA butonlar açıksa)
        # Butonlar açıksa her zaman aramaya çalışmak en güvenlisidir.
        should_search = search_params.get("needs_external_info", True) or force_search or (use_rag_config or use_pubmed_config)
        
        guideline_context = ""
        pubmed_context = ""
        references = []
        
        # --- RAG Retrieval ---
        if use_rag_config and should_search and self.rag_service:
            try:
                query_text = search_params["rag_query"]
                # Eğer query çok boşsa, orijinal soruyu kullan
                if len(query_text) < 5: 
                    query_text = question
                    
                print(f"DEBUG: Searching RAG with: {query_text}")
                
                rag_results = self.rag_service.retrieve(query_text, n_results=4)
                
                if rag_results:
                    guideline_context = "\n\n=== Retrieved Clinical Guidelines ===\n"
                    for i, result in enumerate(rag_results, 1):
                        guideline_context += f"Source [{i}]: {result['source']} (Page {result['page']})\n"
                        guideline_context += f"Content: {result['text'][:600]}...\n\n"
                        references.append({
                            'type': 'guideline',
                            'source': result['source'],
                            'page': result['page']
                        })
            except Exception as e:
                print(f"Error retrieving from RAG: {e}")

        # --- PubMed Retrieval ---
        if use_pubmed_config and should_search and self.pubmed_service:
            try:
                query_text = search_params["pubmed_query"]
                # Eğer query çok boşsa veya GPT saçma bir şey döndüyse düzelt
                if len(query_text) < 5 or "pubmed" in query_text.lower():
                    query_text = f"CML cardiovascular {question}"

                print(f"DEBUG: Searching PubMed with: {query_text}")
                
                articles = self.pubmed_service.search_articles(
                    query=query_text,
                    max_results=3
                )
                if articles:
                    pubmed_context = "\n\n=== Retrieved PubMed Articles ===\n"
                    for article in articles:
                        pubmed_context += f"Title: {article['title']}\n"
                        pubmed_context += f"Journal: {article['journal']} ({article['year']})\n"
                        pubmed_context += f"Abstract: {article['abstract'][:500]}...\n"
                        pubmed_context += f"PMID: {article['pmid']}\n\n"
                        references.append({
                            'type': 'pubmed',
                            'pmid': article['pmid'],
                            'title': article['title'],
                            'journal': article['journal'],
                            'year': article['year']
                        })
                else:
                    print("DEBUG: No articles found in PubMed.")
            except Exception as e:
                print(f"Error searching PubMed: {e}")

        # Build enhanced system prompt
        system_prompt = f"""You are a specialized medical knowledge assistant for CML and CVD risk.

CONTEXT AND SOURCES:
{self.knowledge_base}

{guideline_context}

{pubmed_context}

INSTRUCTIONS:
1. Answer the user's question based primarily on the 'Retrieved Clinical Guidelines' and 'PubMed Articles' provided above.
2. If the retrieved text contains the answer, cite the source clearly (e.g., "According to the ELN guidelines...").
3. DO NOT GENERATE A "REFERENCES" OR "SOURCES" SECTION AT THE END.** The system will automatically append the verified reference list.
4. Do NOT invent references. Only use what is provided in the context.
4. If the retrieved documents do not answer the question, you may use your general medical knowledge but explicitly state that this information is general and not from the uploaded documents.
5. Be professional, concise, and evidence-based.
"""

        # Build user prompt with context if provided
        user_prompt = question
        if context:
            patient_summary = "Patient Context:\n"
            if 'patient_data' in context:
                 patient_summary += f"Patient Data: {json.dumps(context['patient_data'])}\n"
            if 'prediction' in context:
                 patient_summary += f"Risk Prediction: {context['prediction']}\n"
            
            user_prompt = f"{patient_summary}\n\nUser Question: {question}"

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.3,
                max_tokens=1000
            )

            answer = response.choices[0].message.content

            # Add formatted references to the end
            if references:
                answer += "\n\n**References & Sources:**\n"
                seen_refs = set()
                for ref in references:
                    if ref['type'] == 'guideline':
                        ref_str = f"- 📄 **Guideline:** {ref['source']} (Page {ref['page']})"
                    elif ref['type'] == 'pubmed':
                        pmid = ref.get('pmid', 'N/A')
                        link = f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/" if pmid != 'N/A' else ""
                        ref_str = f"- 🔬 **Article:** {ref['title']}\n" \
                                  f"  *Journal:* {ref['journal']} ({ref['year']})\n" \
                                  f"  *PMID:* [{pmid}]({link})"
                    
                    if ref_str not in seen_refs:
                        answer += ref_str + "\n"
                        seen_refs.add(ref_str)

            return answer

        except Exception as e:
            return f"Error answering question: {e}"

    def explain_feature_importance(self, feature_name: str) -> str:
        """
        Explain why a feature is important for CVD risk
        """
        feature_info = FEATURE_INFO.get(feature_name, {})
        question = f"Explain why {feature_info.get('name', feature_name)} is important for cardiovascular disease risk in CML patients. Include normal ranges and what abnormal values indicate."
        return self.answer_question(question)

    def compare_features(self, feature1: str, feature2: str) -> str:
        """
        Compare two features and explain their relationship
        """
        info1 = FEATURE_INFO.get(feature1, {})
        info2 = FEATURE_INFO.get(feature2, {})
        question = f"Compare {info1.get('name', feature1)} and {info2.get('name', feature2)} in the context of CML and CVD risk. How do they relate to each other?"
        return self.answer_question(question)

    def get_feature_recommendations(self, feature_name: str, current_value: float) -> str:
        """
        Get recommendations for improving a specific feature value
        """
        feature_info = FEATURE_INFO.get(feature_name, {})
        question = f"A CML patient has a {feature_info.get('name', feature_name)} value of {current_value} {feature_info.get('unit', '')}. Is this normal? What are the recommendations to improve this value according to clinical guidelines?"
        return self.answer_question(question)

    def explain_tki_medications(self) -> str:
        """
        Explain TKI medications used in CML treatment
        """
        question = "Explain the cardiovascular risks and monitoring requirements for these TKI medications: Imatinib, Dasatinib, Nilotinib, Ponatinib, and Ruxolitinib."
        return self.answer_question(question)

    def get_risk_factor_education(self, risk_factors: List[str]) -> str:
        """
        Provide educational information about specific risk factors
        """
        factors_str = ", ".join(risk_factors[:5])
        question = f"Provide patient education for these cardiovascular risk factors in CML context: {factors_str}. Explain simple ways to manage them."
        return self.answer_question(question)

    def get_all_features_info(self) -> Dict[str, Dict[str, str]]:
        """
        Get information about all features in the model
        """
        return FEATURE_INFO


if __name__ == "__main__":
    # Test requires API key
    if not os.getenv("OPENAI_API_KEY"):
        print("Set OPENAI_API_KEY environment variable to test")
    else:
        agent = KnowledgeAgent()
        
        print("\n--- Testing General Query ---")
        answer = agent.answer_question("Does Sprycel cause heart problems?")
        print("Answer:", answer)