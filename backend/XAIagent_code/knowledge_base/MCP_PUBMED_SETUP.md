# PubMed MCP (Model Context Protocol) Integration

This documentation explains the use of MCP (Model Context Protocol) for PubMed access.

## 📋 Overview

MCP (Model Context Protocol) enables AI agents to access external sources (like PubMed) through a standard protocol. This provides:

- ✅ Standard protocol-based PubMed access
- ✅ Tool-based access (for AI agents)
- ✅ RAG system integration
- ✅ Remote access support (optional)

## 🏗️ Architecture

```
AI Agent (Knowledge/Explanation/Intervention)
    ↓
PubMedMCPClient (MCP Client)
    ↓
PubMedMCPServer (MCP Server)
    ↓
PubMed API (Entrez)
```

## 🚀 Installation

### 1. Install Dependencies

```bash
cd backend/XAIagent_code
pip install -r requirements.txt
```

Required packages:
- `biopython` - PubMed API access
- `mcp` - Model Context Protocol (optional)

**Note:** MCP library is optional. If not installed, the system uses PubMed API directly.

### 2. Environment Variables

Add to `.env` file (optional):

```bash
PUBMED_EMAIL=your.email@example.com  # Email for NCBI
NCBI_API_KEY=your_api_key_here        # Optional: For higher rate limits
```

## 💻 Usage

### Starting MCP Server

#### Standalone Server (for testing)

```bash
cd backend/XAIagent_code/knowledge_base
python mcp_pubmed_server.py
```

#### Programmatic Usage

```python
from knowledge_base.mcp_pubmed_server import PubMedMCPServer
import asyncio

async def main():
    server = PubMedMCPServer(
        email="your.email@example.com",
        api_key=None  # Optional
    )
    # Run server
    await server.run()

asyncio.run(main())
```

### MCP Client Usage

#### Automatic Usage in Agents

Agents automatically use MCP (if available):

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
```

#### Manual MCP Client Usage

```python
from knowledge_base.mcp_pubmed_server import PubMedMCPClient

# Local client (direct interface)
client = PubMedMCPClient()

# Search PubMed
articles = client.search(
    query="CML cardiovascular risk TKI",
    max_results=10
)

# Search for CML and CVD articles
cml_articles = client.search_cml_cvd(max_results=5)

# Format for RAG
formatted = client.format_for_rag(
    query="CML cardiovascular monitoring",
    max_results=3
)
```

### Direct Service Usage (without MCP)

If you don't want to use MCP:

```python
from knowledge_base.pubmed_service import PubMedService

# Without MCP
service = PubMedService(
    email="your.email@example.com",
    use_mcp=False  # Use direct API
)

articles = service.search_articles("CML cardiovascular risk")
```

## 🔧 MCP Tools

The MCP server provides the following tools:

### 1. `search_pubmed`
Search PubMed for articles

**Parameters:**
- `query` (string, required): Search query
- `max_results` (integer, default: 10): Maximum number of results
- `sort_by` (string, default: "relevance"): Sort order ("relevance", "pub_date", "author")

**Example:**
```json
{
  "query": "CML cardiovascular risk",
  "max_results": 10,
  "sort_by": "relevance"
}
```

### 2. `get_article_by_pmid`
Get article details by PMID

**Parameters:**
- `pmid` (string, required): PubMed ID

**Example:**
```json
{
  "pmid": "12345678"
}
```

### 3. `search_cml_cvd`
Search for articles about CML and CVD

**Parameters:**
- `max_results` (integer, default: 10): Maximum number of results
- `additional_terms` (string, default: ""): Additional search terms

**Example:**
```json
{
  "max_results": 10,
  "additional_terms": "monitoring"
}
```

### 4. `format_articles_for_rag`
Format for RAG system

**Parameters:**
- `query` (string, required): Search query
- `max_results` (integer, default: 5): Maximum number of results

**Example:**
```json
{
  "query": "CML cardiovascular risk factors",
  "max_results": 5
}
```

## 🔄 RAG Integration

Articles retrieved through MCP are automatically integrated into the RAG system:

```python
from knowledge_base.pubmed_service import PubMedService
from knowledge_base.rag_service import RAGService

# Get articles from PubMed via MCP
pubmed = PubMedService(use_mcp=True)
articles = pubmed.search_cml_cvd_articles(max_results=5)

# Add to RAG system (optional)
rag = RAGService()
# Format articles for RAG and add
for article in articles:
    # Convert article to RAG format and add
    formatted = pubmed.format_article_for_context(article)
    # Add to RAG (if needed)
```

## 📊 Usage in Agents

### Knowledge Agent

Knowledge agent automatically uses MCP:

```python
from agents.knowledge_agent import KnowledgeAgent

agent = KnowledgeAgent(
    api_key="your-key",
    use_pubmed=True  # MCP automatically used
)

answer = agent.answer_question(
    "What are the cardiovascular risks for CML patients?"
)
# Answer will come with references from PubMed articles
```

### Explanation Agent

Explanation agent can also use MCP (in the future):

```python
from agents.explanation_agent import ExplanationAgent

agent = ExplanationAgent(
    api_key="your-key",
    use_rag=True
)

# Explanations can use information from PubMed
```

## ⚠️ Important Notes

1. **Rate Limiting:** PubMed API accepts maximum 3 requests per second. MCP server automatically handles rate limiting.

2. **MCP Optional:** If MCP library is not installed, the system uses PubMed API directly.

3. **Email Required:** A valid email address is required for NCBI Entrez API.

4. **API Key (Optional):** NCBI API key provides higher rate limits. [Get it from NCBI](https://www.ncbi.nlm.nih.gov/account/settings/).

## 🐛 Troubleshooting

### "MCP library not available" Warning

This is normal. The system uses PubMed API directly:

```bash
# To install MCP library (optional)
pip install mcp
```

### "BioPython not installed" Error

```bash
pip install biopython
```

### Rate Limiting Error

PubMed API rate limit exceeded. Wait a bit or use an API key.

## 📝 Example Usage Scenario

```python
# 1. Create MCP client
from knowledge_base.mcp_pubmed_server import PubMedMCPClient

client = PubMedMCPClient()

# 2. Search for CML and CVD articles
articles = client.search_cml_cvd(max_results=5)

# 3. Format for RAG
formatted = client.format_for_rag(
    query="CML cardiovascular risk monitoring",
    max_results=3
)

# 4. Use in agent system
from orchestrator import CVDAgentOrchestrator

orchestrator = CVDAgentOrchestrator(
    openai_api_key=os.getenv("OPENAI_API_KEY"),
    use_pubmed=True  # MCP automatically used
)

answer = orchestrator.ask_question(
    "What monitoring is recommended for CML patients at cardiovascular risk?"
)
# Answer will come with references from PubMed articles
```

## 🔗 Related Files

- `mcp_pubmed_server.py` - MCP Server implementation
- `pubmed_service.py` - PubMed service (with MCP support)
- `agents/knowledge_agent.py` - Knowledge agent (uses MCP)
- `orchestrator.py` - Orchestrator (MCP integrated)

## 📚 More Information

- [MCP Protocol Documentation](https://modelcontextprotocol.io/)
- [NCBI Entrez API Documentation](https://www.ncbi.nlm.nih.gov/books/NBK25497/)
- [BioPython Documentation](https://biopython.org/)
