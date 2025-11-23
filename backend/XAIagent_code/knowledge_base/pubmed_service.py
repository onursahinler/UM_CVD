"""
PubMed Service - Retrieves scientific articles from PubMed
Can be used directly or through MCP (Model Context Protocol)
"""
import sys
from pathlib import Path
from typing import List, Dict, Any, Optional
import json
import time

try:
    from Bio import Entrez
    from Bio import Medline
    BIOPYTHON_AVAILABLE = True
except ImportError:
    BIOPYTHON_AVAILABLE = False

try:
    import requests
    REQUESTS_AVAILABLE = True
except ImportError:
    REQUESTS_AVAILABLE = False

# MCP imports
try:
    from knowledge_base.mcp_pubmed_server import PubMedMCPClient
    MCP_AVAILABLE = True
except ImportError:
    MCP_AVAILABLE = False


class PubMedService:
    """
    Service for retrieving scientific articles from PubMed
    Can use MCP (Model Context Protocol) for access
    """
    
    def __init__(self, 
                 email: str = "your.email@example.com",
                 use_mcp: bool = False,
                 mcp_server_url: Optional[str] = None):
        """
        Initialize PubMed service
        
        Args:
            email: Email address for Entrez API (required by NCBI)
            use_mcp: Whether to use MCP protocol for access
            mcp_server_url: URL of MCP server (if remote)
        """
        self.use_mcp = use_mcp and MCP_AVAILABLE
        self.mcp_client = None
        
        if self.use_mcp:
            try:
                self.mcp_client = PubMedMCPClient(server_url=mcp_server_url)
                print("✓ PubMed Service: Using MCP protocol")
            except Exception as e:
                print(f"Warning: Could not initialize MCP client: {e}")
                self.use_mcp = False
        
        if not self.use_mcp:
            if not BIOPYTHON_AVAILABLE:
                raise ImportError("BioPython not installed. Run: pip install biopython")
            
            Entrez.email = email
            self.api_key = None  # Optional: Get from NCBI for higher rate limits
    
    def search_articles(self, 
                       query: str, 
                       max_results: int = 10,
                       sort_by: str = "relevance") -> List[Dict[str, Any]]:
        """
        Search PubMed for articles
        
        Args:
            query: Search query (e.g., "CML cardiovascular risk TKI")
            max_results: Maximum number of results
            sort_by: Sort order ("relevance", "pub_date", "author")
            
        Returns:
            List of article dictionaries
        """
        # Use MCP client if available
        if self.use_mcp and self.mcp_client:
            return self.mcp_client.search(query, max_results, sort_by)
        
        # Direct API access
        try:
            # Search PubMed
            handle = Entrez.esearch(
                db="pubmed",
                term=query,
                retmax=max_results,
                sort=sort_by,
                api_key=self.api_key
            )
            record = Entrez.read(handle)
            handle.close()
            
            if not record['IdList']:
                return []
            
            # Fetch article details
            ids = record['IdList']
            handle = Entrez.efetch(
                db="pubmed",
                id=ids,
                rettype="medline",
                retmode="text",
                api_key=self.api_key
            )
            records = Medline.parse(handle)
            
            articles = []
            for record in records:
                article = {
                    'pmid': record.get('PMID', ''),
                    'title': record.get('TI', 'No title'),
                    'authors': record.get('AU', []),
                    'journal': record.get('TA', 'Unknown journal'),
                    'year': record.get('DP', '').split()[0] if record.get('DP') else 'Unknown',
                    'abstract': record.get('AB', 'No abstract available'),
                    'doi': record.get('LID', [''])[0] if record.get('LID') else '',
                    'mesh_terms': record.get('MH', []),
                    'keywords': record.get('OT', [])
                }
                articles.append(article)
            
            handle.close()
            
            # Rate limiting (NCBI recommends max 3 requests/second)
            time.sleep(0.34)
            
            return articles
            
        except Exception as e:
            print(f"Error searching PubMed: {e}")
            return []
    
    def search_cml_cvd_articles(self, 
                                max_results: int = 10,
                                additional_terms: str = "") -> List[Dict[str, Any]]:
        """
        Search for articles specifically about CML and CVD
        
        Args:
            max_results: Maximum number of results
            additional_terms: Additional search terms
            
        Returns:
            List of article dictionaries
        """
        # Use MCP client if available
        if self.use_mcp and self.mcp_client:
            return self.mcp_client.search_cml_cvd(max_results, additional_terms)
        
        # Direct API access
        query = f"(chronic myeloid leukemia OR CML) AND (cardiovascular disease OR CVD OR cardiac risk) AND (TKI OR tyrosine kinase inhibitor)"
        if additional_terms:
            query += f" AND ({additional_terms})"
        
        return self.search_articles(query, max_results=max_results)
    
    def get_article_summary(self, pmid: str) -> Optional[Dict[str, Any]]:
        """
        Get summary for a specific article by PMID
        
        Args:
            pmid: PubMed ID
            
        Returns:
            Article dictionary or None
        """
        # Use MCP client if available
        if self.use_mcp and self.mcp_client:
            return self.mcp_client.get_article(pmid)
        
        # Direct API access
        try:
            handle = Entrez.esummary(db="pubmed", id=pmid, api_key=self.api_key)
            record = Entrez.read(handle)
            handle.close()
            
            if record:
                summary = record[0]
                return {
                    'pmid': summary.get('Id', pmid),
                    'title': summary.get('Title', ''),
                    'authors': summary.get('AuthorList', []),
                    'journal': summary.get('Source', ''),
                    'year': summary.get('PubDate', ''),
                    'doi': summary.get('DOI', ''),
                    'abstract': summary.get('AbstractText', 'No abstract available')
                }
        except Exception as e:
            print(f"Error fetching article {pmid}: {e}")
        
        return None
    
    def format_article_for_context(self, article: Dict[str, Any]) -> str:
        """
        Format article for use as context in LLM prompts
        
        Args:
            article: Article dictionary
            
        Returns:
            Formatted string
        """
        formatted = f"Title: {article['title']}\n"
        formatted += f"Authors: {', '.join(article['authors'][:3])}{' et al.' if len(article['authors']) > 3 else ''}\n"
        formatted += f"Journal: {article['journal']} ({article['year']})\n"
        formatted += f"PMID: {article['pmid']}\n"
        if article.get('doi'):
            formatted += f"DOI: {article['doi']}\n"
        formatted += f"\nAbstract:\n{article['abstract']}\n"
        
        return formatted
    
    def search_and_format(self, 
                         query: str, 
                         max_results: int = 5) -> str:
        """
        Search PubMed and format results for LLM context
        
        Args:
            query: Search query
            max_results: Number of results
            
        Returns:
            Formatted string with article summaries
        """
        # Use MCP client if available
        if self.use_mcp and self.mcp_client:
            return self.mcp_client.format_for_rag(query, max_results)
        
        # Direct API access
        articles = self.search_articles(query, max_results=max_results)
        
        if not articles:
            return "No relevant articles found in PubMed."
        
        formatted = f"Relevant scientific articles from PubMed ({len(articles)} results):\n\n"
        for i, article in enumerate(articles, 1):
            formatted += f"--- Article {i} ---\n"
            formatted += self.format_article_for_context(article)
            formatted += "\n"
        
        return formatted


if __name__ == "__main__":
    # Test PubMed service
    if not BIOPYTHON_AVAILABLE:
        print("BioPython not installed. Install with: pip install biopython")
    else:
        service = PubMedService(email="test@example.com")
        
        # Test search
        print("Searching for CML and CVD articles...")
        articles = service.search_cml_cvd_articles(max_results=3)
        
        print(f"\nFound {len(articles)} articles:")
        for article in articles:
            print(f"\n{article['title']}")
            print(f"  {article['journal']} ({article['year']})")
            print(f"  PMID: {article['pmid']}")

