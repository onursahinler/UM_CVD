# Clinical Guidelines Integration - Setup Guide

This guide contains step-by-step instructions for integrating clinical guidelines into the system.

## 📋 Summary

The system now has the following features:
- ✅ PDF format clinical guideline processing
- ✅ RAG (Retrieval-Augmented Generation) for paragraph-level information retrieval
- ✅ Multi-language support (including Dutch)
- ✅ PubMed scientific article integration
- ✅ Reference display (source + page number)
- ✅ Automatic usage in Explanation, Knowledge, and Intervention agents

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd backend/XAIagent_code
pip install -r requirements.txt
```

### 2. Place PDF Guidelines

Copy your clinical guideline PDFs to this folder:

```bash
backend/XAIagent_code/knowledge_base/pdfs/
```

**Example:**
```bash
cp /path/to/clinical_guideline.pdf backend/XAIagent_code/knowledge_base/pdfs/
cp /path/to/dutch_guideline.pdf backend/XAIagent_code/knowledge_base/pdfs/
```

### 3. Process PDFs

```bash
cd backend/XAIagent_code/knowledge_base
python setup_guidelines.py
```

This script will:
- Read all PDFs
- Split texts into paragraphs
- Create embeddings
- Save to vector database

### 4. Test

```bash
python test_rag.py
```

## 📁 File Structure

```
backend/XAIagent_code/
├── knowledge_base/
│   ├── pdfs/                    # PDF guidelines go here
│   │   ├── guideline1.pdf
│   │   └── dutch_guideline.pdf
│   ├── vector_db/                # ChromaDB database (automatic)
│   ├── rag_service.py            # RAG service
│   ├── pubmed_service.py         # PubMed service
│   ├── setup_guidelines.py       # Setup script
│   ├── test_rag.py               # Test script
│   └── README.md                 # Detailed documentation
├── agents/
│   ├── knowledge_agent.py        # ✅ RAG integrated
│   ├── explanation_agent.py      # ✅ RAG integrated
│   └── intervention_agent.py     # ✅ RAG integrated
└── orchestrator.py               # ✅ RAG support added
```

## 🔧 Configuration

### OpenAI API Key

Add to `.env` file or as environment variable:

```bash
export OPENAI_API_KEY="sk-..."
```

or `.env` file:
```
OPENAI_API_KEY=sk-...
```

### Embedding Model Selection

**OpenAI Embeddings (Recommended):**
- Better quality
- Multi-language (including Dutch)
- Paid but inexpensive

**Sentence-Transformers (Free):**
- Works offline
- Multi-language support
- Free

To change in code, use the `use_openai_embeddings` parameter in `rag_service.py`.

## 💻 Usage Examples

### Python Usage

```python
from orchestrator import CVDAgentOrchestrator
import os

# Start orchestrator with RAG
orchestrator = CVDAgentOrchestrator(
    openai_api_key=os.getenv("OPENAI_API_KEY"),
    use_rag=True,      # RAG active
    use_pubmed=True    # PubMed active
)

# Ask question - will retrieve information from guidelines
answer = orchestrator.ask_question(
    "What cardiovascular monitoring is recommended for CML patients?"
)
print(answer)
# Answer will come with references from guidelines:
# "... [1] Clinical Guideline: guideline.pdf, Page 15"
```

### Manual RAG Usage

```python
from knowledge_base.rag_service import RAGService

rag = RAGService()

# Retrieve information from guidelines
results = rag.retrieve(
    query="CML cardiovascular risk factors",
    n_results=5
)

for result in results:
    print(f"Source: {result['source']}")
    print(f"Page: {result['page']}")
    print(f"Text: {result['text']}")
```

### PubMed Usage

```python
from knowledge_base.pubmed_service import PubMedService

pubmed = PubMedService(email="your.email@example.com")

# Search for CML and CVD articles
articles = pubmed.search_cml_cvd_articles(max_results=5)

for article in articles:
    print(f"{article['title']}")
    print(f"  {article['journal']} ({article['year']})")
    print(f"  PMID: {article['pmid']}")
```

## 🔄 PDF Updates

When you add a new PDF or update an existing one:

```bash
# Reprocess all PDFs
python setup_guidelines.py

# Or in Python:
from knowledge_base.rag_service import RAGService
rag = RAGService()
rag.process_all_pdfs()
```

## 📊 System Status Check

```python
from knowledge_base.rag_service import RAGService

rag = RAGService()
stats = rag.get_collection_stats()

print(f"Total chunks: {stats['total_chunks']}")
print(f"Number of sources: {stats['num_sources']}")
print(f"Sources: {stats['sources']}")
```

## 🌍 Multi-language Support

The system supports Dutch and other languages:

- **OpenAI Embeddings:** Automatic multi-language
- **Sentence-Transformers:** `paraphrase-multilingual-MiniLM-L12-v2` model

Dutch PDFs are automatically processed and searchable.

## ⚠️ Troubleshooting

### "RAG service not available" Error

```bash
pip install chromadb PyPDF2 pdfplumber sentence-transformers
```

### "No PDF files found" Warning

Make sure PDFs are in the `knowledge_base/pdfs/` folder.

### Embedding Error

Check your OpenAI API key or use sentence-transformers:

```python
rag = RAGService(use_openai_embeddings=False)
```

### ChromaDB Error

```bash
pip install --upgrade chromadb
```

## 📝 Agent RAG Usage

### Knowledge Agent
- Retrieves information from guidelines when answering questions
- Also uses PubMed articles
- Automatically shows references

### Explanation Agent
- Uses guideline information in risk explanations
- Explains according to clinical guidelines
- Adds source references

### Intervention Agent
- Uses guidelines for intervention recommendations
- Provides recommendations aligned with clinical guidelines
- Shows references

## 🎯 Next Steps

1. ✅ Copy PDFs to `knowledge_base/pdfs/` folder
2. ✅ Run `setup_guidelines.py`
3. ✅ Test with `test_rag.py`
4. ✅ Start using the agent system

## 📚 Detailed Documentation

For more information:
- `knowledge_base/README.md` - Detailed RAG documentation
- `knowledge_base/rag_service.py` - RAG service code
- `knowledge_base/pubmed_service.py` - PubMed service code

## 🔗 Related Files

- `agents/knowledge_agent.py` - Knowledge agent (uses RAG)
- `agents/explanation_agent.py` - Explanation agent (uses RAG)
- `agents/intervention_agent.py` - Intervention agent (uses RAG)
- `orchestrator.py` - Agent coordinator (RAG support added)
- `backend/app.py` - Flask backend (RAG integrated)
