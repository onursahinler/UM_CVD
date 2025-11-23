# PubMed MCP Integration - Summary

## ✅ Completed Features

### 1. MCP Server (`mcp_pubmed_server.py`)
- ✅ PubMed API access through MCP protocol
- ✅ Tool-based interface (for AI agents)
- ✅ 4 main tools:
  - `search_pubmed` - General article search
  - `get_article_by_pmid` - Article details by PMID
  - `search_cml_cvd` - CML and CVD articles
  - `format_articles_for_rag` - Formatting for RAG

### 2. MCP Client (`mcp_pubmed_server.py`)
- ✅ Client for accessing MCP server
- ✅ Local and remote access support
- ✅ Fallback: Direct API usage if MCP unavailable

### 3. PubMed Service Update (`pubmed_service.py`)
- ✅ MCP support added
- ✅ `use_mcp` parameter for MCP/direct API selection
- ✅ Automatic fallback mechanism

### 4. Agent Integration
- ✅ Knowledge Agent: Retrieves information from PubMed using MCP
- ✅ Automatic reference display
- ✅ RAG system integration

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd backend/XAIagent_code
pip install -r requirements.txt
```

### 2. Environment Variables (Optional)

Add to `.env` file:

```bash
PUBMED_EMAIL=your.email@example.com
NCBI_API_KEY=your_api_key_here  # Optional
```

### 3. Test

```bash
cd backend/XAIagent_code/knowledge_base
python test_mcp_pubmed.py
```

## 💻 Usage

### Automatic Usage in Agents

```python
from orchestrator import CVDAgentOrchestrator

orchestrator = CVDAgentOrchestrator(
    openai_api_key="your-key",
    use_pubmed=True  # MCP automatically used
)

# Ask question - will retrieve information from PubMed
answer = orchestrator.ask_question(
    "What are the latest findings on CML cardiovascular risk?"
)
# Answer will come with references from PubMed articles
```

### Manual MCP Client Usage

```python
from knowledge_base.mcp_pubmed_server import PubMedMCPClient

client = PubMedMCPClient()

# Search PubMed
articles = client.search(
    query="CML cardiovascular risk TKI",
    max_results=10
)

# Format for RAG
formatted = client.format_for_rag(
    query="CML cardiovascular monitoring",
    max_results=5
)
```

## 📁 File Structure

```
knowledge_base/
├── mcp_pubmed_server.py      # MCP Server and Client
├── pubmed_service.py          # PubMed Service (with MCP support)
├── test_mcp_pubmed.py         # Test script
└── MCP_PUBMED_SETUP.md        # Detailed documentation
```

## 🔧 MCP Tools

### 1. search_pubmed
```json
{
  "query": "CML cardiovascular risk",
  "max_results": 10,
  "sort_by": "relevance"
}
```

### 2. get_article_by_pmid
```json
{
  "pmid": "12345678"
}
```

### 3. search_cml_cvd
```json
{
  "max_results": 10,
  "additional_terms": "monitoring"
}
```

### 4. format_articles_for_rag
```json
{
  "query": "CML cardiovascular risk factors",
  "max_results": 5
}
```

## ⚠️ Important Notes

1. **MCP Optional:** If MCP library is not installed, the system uses PubMed API directly
2. **Rate Limiting:** PubMed API accepts maximum 3 requests per second
3. **Email Required:** A valid email address is required for NCBI Entrez API

## 📚 Detailed Documentation

For more information:
- `knowledge_base/MCP_PUBMED_SETUP.md` - Detailed setup and usage guide
- `knowledge_base/mcp_pubmed_server.py` - MCP server implementation
- `knowledge_base/test_mcp_pubmed.py` - Test script

## 🔗 Related Files

- `agents/knowledge_agent.py` - Knowledge agent (uses MCP)
- `orchestrator.py` - Orchestrator (MCP integrated)
- `backend/app.py` - Flask backend (MCP integrated)
