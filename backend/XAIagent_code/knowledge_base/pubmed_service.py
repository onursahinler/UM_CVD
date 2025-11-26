"""
PubMed Service - Optimized for RAG/LLM Context
Removes BioPython dependency for better stability and XML parsing control.
"""
import requests
import xml.etree.ElementTree as ET
from typing import List, Dict, Any, Optional
import time

class PubMedService:
    """
    Lightweight PubMed Service using direct NCBI E-utilities API.
    """
    
    BASE_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"

    def __init__(self, email: str = "demo@example.com", use_mcp: bool = False):
        # use_mcp parametresini uyumluluk için tutuyoruz ama kullanmıyoruz
        self.email = email
        self.session = requests.Session()

    def _get_text(self, element: Optional[ET.Element], default: str = "") -> str:
        """Helper to safely extract text from XML element."""
        if element is not None and element.text:
            return element.text
        return default

    def search_articles(self, query: str, max_results: int = 5, sort_by: str = "relevance") -> List[Dict[str, Any]]:
        """
        Search PubMed and return clean, formatted JSON for the LLM.
        """
        try:
            # 1. ESearch: Get PMIDs
            search_params = {
                "db": "pubmed",
                "term": query,
                "retmode": "json",
                "retmax": max_results,
                "sort": sort_by,
                "email": self.email
            }
            
            resp = self.session.get(f"{self.BASE_URL}/esearch.fcgi", params=search_params, timeout=10)
            resp.raise_for_status()
            data = resp.json()
            
            id_list = data.get("esearchresult", {}).get("idlist", [])
            
            if not id_list:
                return []

            # 2. EFetch: Get Details (XML)
            fetch_params = {
                "db": "pubmed",
                "id": ",".join(id_list),
                "retmode": "xml",
                "email": self.email
            }
            
            # Fetch XML content
            fetch_resp = self.session.get(f"{self.BASE_URL}/efetch.fcgi", params=fetch_params, timeout=15)
            fetch_resp.raise_for_status()
            
            # 3. Parse XML manually (More robust than BioPython for Abstracts)
            return self._parse_pubmed_xml(fetch_resp.content)

        except Exception as e:
            print(f"PubMed API Error: {e}")
            return []

    def _parse_pubmed_xml(self, xml_content: bytes) -> List[Dict[str, Any]]:
        """
        Parses the raw XML from PubMed to extract clean fields.
        """
        articles = []
        try:
            root = ET.fromstring(xml_content)
            
            for article_tag in root.findall(".//PubmedArticle"):
                article_data = {}
                
                # Basic Info
                medline = article_tag.find("MedlineCitation")
                article = medline.find("Article")
                
                # PMID
                pmid = medline.find("PMID")
                article_data['pmid'] = self._get_text(pmid)
                
                # Title
                article_data['title'] = self._get_text(article.find("ArticleTitle"))
                
                # Journal & Year
                journal = article.find("Journal")
                article_data['journal'] = self._get_text(journal.find("Title"))
                
                year = journal.find(".//PubDate/Year")
                if year is not None:
                    article_data['year'] = year.text
                else:
                    # Bazen tarih sadece MedlineDate içindedir
                    medline_date = journal.find(".//PubDate/MedlineDate")
                    article_data['year'] = self._get_text(medline_date)[:4]

                # Abstract (Kritik Kısım: Parçalı abstractları birleştirme)
                abstract_tag = article.find("Abstract")
                full_abstract = []
                if abstract_tag is not None:
                    for text_node in abstract_tag.findall("AbstractText"):
                        label = text_node.get("Label") # BACKGROUND, RESULTS vs.
                        text = text_node.text or ""
                        if label:
                            full_abstract.append(f"{label}: {text}")
                        else:
                            full_abstract.append(text)
                    article_data['abstract'] = "\n".join(full_abstract)
                else:
                    article_data['abstract'] = "No abstract available."

                articles.append(article_data)
                
        except Exception as e:
            print(f"XML Parsing Error: {e}")
            
        return articles

    def search_cml_cvd_articles(self, max_results: int = 5, additional_terms: str = "") -> List[Dict[str, Any]]:
        """
        Domain-specific search wrapper.
        """
        base_query = "(chronic myeloid leukemia OR CML) AND (cardiovascular OR heart) AND (TKI OR tyrosine kinase)"
        if additional_terms:
            full_query = f"{base_query} AND {additional_terms}"
        else:
            full_query = base_query
            
        return self.search_articles(full_query, max_results=max_results)

# Test Block
if __name__ == "__main__":
    service = PubMedService()
    results = service.search_articles("Dasatinib cardiovascular risk", max_results=2)
    for res in results:
        print(f"\nTitle: {res['title']}")
        print(f"Abstract: {res['abstract'][:100]}...")