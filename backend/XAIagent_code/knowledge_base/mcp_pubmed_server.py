"""
MCP (Model Context Protocol) Server for PubMed
Provides PubMed access through MCP protocol for AI agents
"""
import sys
import json
import asyncio
from pathlib import Path
from typing import Dict, Any, List, Optional
import time

# MCP imports
try:
    from mcp import Server, types
    MCP_AVAILABLE = True
except ImportError:
    try:
        # Alternative: Use JSON-RPC style if mcp package not available
        import jsonrpc
        MCP_AVAILABLE = False
        JSONRPC_AVAILABLE = True
    except ImportError:
        MCP_AVAILABLE = False
        JSONRPC_AVAILABLE = False

# PubMed imports
try:
    from Bio import Entrez
    from Bio import Medline
    BIOPYTHON_AVAILABLE = True
except ImportError:
    BIOPYTHON_AVAILABLE = False

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))


class PubMedMCPServer:
    """
    MCP Server for PubMed access
    Provides tools for searching and retrieving PubMed articles
    """
    
    def __init__(self, email: str = "mcp.pubmed@example.com", api_key: Optional[str] = None):
        """
        Initialize PubMed MCP Server
        
        Args:
            email: Email for Entrez API
            api_key: Optional NCBI API key for higher rate limits
        """
        if not BIOPYTHON_AVAILABLE:
            raise ImportError("BioPython not installed. Run: pip install biopython")
        
        Entrez.email = email
        self.api_key = api_key
        self.server = None
        
        if MCP_AVAILABLE:
            self._setup_mcp_server()
        elif JSONRPC_AVAILABLE:
            self._setup_jsonrpc_server()
        else:
            # Fallback: Direct function interface
            print("Warning: MCP libraries not available. Using direct interface.")
    
    def _setup_mcp_server(self):
        """Setup MCP server with tools"""
        self.server = Server("pubmed-mcp-server")
        
        @self.server.list_tools()
        async def list_tools() -> List[types.Tool]:
            """List available PubMed tools"""
            return [
                types.Tool(
                    name="search_pubmed",
                    description="Search PubMed for scientific articles",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "query": {
                                "type": "string",
                                "description": "Search query (e.g., 'CML cardiovascular risk')"
                            },
                            "max_results": {
                                "type": "integer",
                                "description": "Maximum number of results",
                                "default": 10
                            },
                            "sort_by": {
                                "type": "string",
                                "enum": ["relevance", "pub_date", "author"],
                                "description": "Sort order",
                                "default": "relevance"
                            }
                        },
                        "required": ["query"]
                    }
                ),
                types.Tool(
                    name="get_article_by_pmid",
                    description="Get article details by PubMed ID (PMID)",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "pmid": {
                                "type": "string",
                                "description": "PubMed ID"
                            }
                        },
                        "required": ["pmid"]
                    }
                ),
                types.Tool(
                    name="search_cml_cvd",
                    description="Search for articles about CML and cardiovascular disease",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "max_results": {
                                "type": "integer",
                                "description": "Maximum number of results",
                                "default": 10
                            },
                            "additional_terms": {
                                "type": "string",
                                "description": "Additional search terms",
                                "default": ""
                            }
                        }
                    }
                ),
                types.Tool(
                    name="format_articles_for_rag",
                    description="Format PubMed articles for RAG system",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "query": {
                                "type": "string",
                                "description": "Search query"
                            },
                            "max_results": {
                                "type": "integer",
                                "description": "Maximum number of results",
                                "default": 5
                            }
                        },
                        "required": ["query"]
                    }
                )
            ]
        
        @self.server.call_tool()
        async def call_tool(name: str, arguments: Dict[str, Any]) -> List[types.TextContent]:
            """Handle tool calls"""
            if name == "search_pubmed":
                query = arguments.get("query", "")
                max_results = arguments.get("max_results", 10)
                sort_by = arguments.get("sort_by", "relevance")
                
                articles = self._search_articles(query, max_results, sort_by)
                return [types.TextContent(
                    type="text",
                    text=json.dumps(articles, indent=2)
                )]
            
            elif name == "get_article_by_pmid":
                pmid = arguments.get("pmid", "")
                article = self._get_article_summary(pmid)
                return [types.TextContent(
                    type="text",
                    text=json.dumps(article, indent=2) if article else "Article not found"
                )]
            
            elif name == "search_cml_cvd":
                max_results = arguments.get("max_results", 10)
                additional_terms = arguments.get("additional_terms", "")
                articles = self._search_cml_cvd(max_results, additional_terms)
                return [types.TextContent(
                    type="text",
                    text=json.dumps(articles, indent=2)
                )]
            
            elif name == "format_articles_for_rag":
                query = arguments.get("query", "")
                max_results = arguments.get("max_results", 5)
                formatted = self._format_for_rag(query, max_results)
                return [types.TextContent(
                    type="text",
                    text=formatted
                )]
            
            else:
                raise ValueError(f"Unknown tool: {name}")
    
    def _setup_jsonrpc_server(self):
        """Setup JSON-RPC server as fallback"""
        # JSON-RPC implementation would go here
        pass
    
    def _search_articles(self, 
                       query: str, 
                       max_results: int = 10,
                       sort_by: str = "relevance") -> List[Dict[str, Any]]:
        """Search PubMed for articles"""
        try:
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
            time.sleep(0.34)  # Rate limiting
            
            return articles
            
        except Exception as e:
            print(f"Error searching PubMed: {e}")
            return []
    
    def _get_article_summary(self, pmid: str) -> Optional[Dict[str, Any]]:
        """Get article summary by PMID"""
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
    
    def _search_cml_cvd(self, max_results: int = 10, additional_terms: str = "") -> List[Dict[str, Any]]:
        """Search for CML and CVD articles"""
        query = f"(chronic myeloid leukemia OR CML) AND (cardiovascular disease OR CVD OR cardiac risk) AND (TKI OR tyrosine kinase inhibitor)"
        if additional_terms:
            query += f" AND ({additional_terms})"
        
        return self._search_articles(query, max_results=max_results)
    
    def _format_for_rag(self, query: str, max_results: int = 5) -> str:
        """Format articles for RAG system"""
        articles = self._search_articles(query, max_results=max_results)
        
        if not articles:
            return "No relevant articles found in PubMed."
        
        formatted = f"Relevant scientific articles from PubMed ({len(articles)} results):\n\n"
        for i, article in enumerate(articles, 1):
            formatted += f"--- Article {i} ---\n"
            formatted += f"Title: {article['title']}\n"
            formatted += f"Authors: {', '.join(article['authors'][:3])}{' et al.' if len(article['authors']) > 3 else ''}\n"
            formatted += f"Journal: {article['journal']} ({article['year']})\n"
            formatted += f"PMID: {article['pmid']}\n"
            if article.get('doi'):
                formatted += f"DOI: {article['doi']}\n"
            formatted += f"\nAbstract:\n{article['abstract']}\n\n"
        
        return formatted
    
    async def run(self, transport: Any = None):
        """Run the MCP server"""
        if self.server:
            await self.server.run(transport)
        else:
            print("MCP server not initialized. Using direct interface.")


class PubMedMCPClient:
    """
    MCP Client for accessing PubMed through MCP protocol
    Can be used by agents to query PubMed
    """
    
    def __init__(self, server_url: Optional[str] = None):
        """
        Initialize MCP client
        
        Args:
            server_url: URL of MCP server (if remote)
                        If None, uses direct interface
        """
        self.server_url = server_url
        self.client = None
        
        if server_url:
            # Setup remote client
            # This would connect to remote MCP server
            pass
        else:
            # Use direct interface (local)
            self._use_direct_interface()
    
    def _use_direct_interface(self):
        """Use direct PubMed service interface"""
        from knowledge_base.pubmed_service import PubMedService
        self.pubmed_service = PubMedService()
    
    def search(self, query: str, max_results: int = 10, sort_by: str = "relevance") -> List[Dict[str, Any]]:
        """Search PubMed articles"""
        if self.pubmed_service:
            return self.pubmed_service.search_articles(query, max_results, sort_by)
        else:
            # Would use MCP client call here
            raise NotImplementedError("Remote MCP client not yet implemented")
    
    def get_article(self, pmid: str) -> Optional[Dict[str, Any]]:
        """Get article by PMID"""
        if self.pubmed_service:
            return self.pubmed_service.get_article_summary(pmid)
        else:
            raise NotImplementedError("Remote MCP client not yet implemented")
    
    def search_cml_cvd(self, max_results: int = 10, additional_terms: str = "") -> List[Dict[str, Any]]:
        """Search for CML and CVD articles"""
        if self.pubmed_service:
            return self.pubmed_service.search_cml_cvd_articles(max_results, additional_terms)
        else:
            raise NotImplementedError("Remote MCP client not yet implemented")
    
    def format_for_rag(self, query: str, max_results: int = 5) -> str:
        """Format articles for RAG"""
        if self.pubmed_service:
            return self.pubmed_service.search_and_format(query, max_results)
        else:
            raise NotImplementedError("Remote MCP client not yet implemented")


# Standalone server runner
async def main():
    """Run MCP server standalone"""
    import os
    
    email = os.getenv("PUBMED_EMAIL", "mcp.pubmed@example.com")
    api_key = os.getenv("NCBI_API_KEY", None)
    
    server = PubMedMCPServer(email=email, api_key=api_key)
    
    if MCP_AVAILABLE:
        # Run with stdio transport (for MCP protocol)
        from mcp.server.stdio import stdio_server
        async with stdio_server() as (read_stream, write_stream):
            await server.run((read_stream, write_stream))
    else:
        print("MCP library not available. Server running in direct mode.")
        print("Use PubMedMCPClient for access.")


if __name__ == "__main__":
    asyncio.run(main())

