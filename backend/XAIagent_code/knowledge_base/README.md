# Knowledge Base System - Clinical Guidelines & PubMed Integration

This system enhances AI agents by retrieving information from clinical guidelines and PubMed articles.

## 📁 Folder Structure

```
knowledge_base/
├── pdfs/              # PDF clinical guidelines go here
├── vector_db/         # ChromaDB vector database (auto-created)
├── rag_service.py     # RAG service (PDF processing and retrieval)
├── pubmed_service.py  # PubMed service (scientific article search)
└── README.md          # This file
```

## 🚀 Installation

### 1. Install Dependencies

```bash
cd backend/XAIagent_code
pip install -r requirements.txt
```

Required packages:
- `chromadb` - Vector database
- `PyPDF2` or `pdfplumber` - PDF processing
- `sentence-transformers` - Multi-language embeddings (for Dutch support)
- `biopython` - PubMed API access
- `openai` - OpenAI embeddings (preferred)

### 2. Load PDF Guidelines

Copy your clinical guideline PDFs to the `knowledge_base/pdfs/` folder:

```bash
# Example
cp /path/to/clinical_guideline.pdf backend/XAIagent_code/knowledge_base/pdfs/
cp /path/to/dutch_guideline.pdf backend/XAIagent_code/knowledge_base/pdfs/
```

**Note:** The system supports both English and Dutch PDFs.

## 📚 Usage

### Processing PDFs

To load PDFs into the system:

```python
from knowledge_base.rag_service import RAGService

# Initialize RAG service
rag = RAGService(use_openai_embeddings=True)

# Process all PDFs
results = rag.process_all_pdfs()
print(f"Processed PDFs: {results}")

# Or process a single PDF
from pathlib import Path
pdf_path = Path("knowledge_base/pdfs/guideline.pdf")
rag.process_pdf(pdf_path)
```

### Using Agents

Agents automatically use the RAG system:

```python
from orchestrator import CVDAgentOrchestrator

# Start orchestrator (RAG automatically active)
orchestrator = CVDAgentOrchestrator(
    openai_api_key="your-api-key",
    use_rag=True,      # RAG active
    use_pubmed=True    # PubMed active
)

# Ask question - will now retrieve information from guidelines
answer = orchestrator.ask_question(
    "What are the cardiovascular risk factors for CML patients?"
)
print(answer)  # Answer with references from guidelines
```

### Manual RAG Usage

```python
from knowledge_base.rag_service import RAGService

rag = RAGService()

# Retrieve information from guidelines
results = rag.retrieve(
    query="CML cardiovascular risk monitoring",
    n_results=5
)

for result in results:
    print(f"Source: {result['source']}, Page: {result['page']}")
    print(f"Text: {result['text'][:200]}...")
```

### PubMed Usage

```python
from knowledge_base.pubmed_service import PubMedService

pubmed = PubMedService(email="your.email@example.com")

# Search for articles related to CML and CVD
articles = pubmed.search_cml_cvd_articles(max_results=5)

for article in articles:
    print(f"{article['title']}")
    print(f"  {article['journal']} ({article['year']})")
    print(f"  PMID: {article['pmid']}")
```

## 🔧 Configuration

### Embedding Model Selection

**OpenAI Embeddings (Recommended):**
- Better quality
- Paid (but inexpensive)
- Multi-language support

```python
rag = RAGService(use_openai_embeddings=True)
```

**Sentence-Transformers (Free):**
- Free
- Multi-language (including Dutch)
- Works offline

```python
rag = RAGService(use_openai_embeddings=False)
```

### Chunk Size

You can adjust chunk size when processing PDFs:

```python
rag.process_pdf(pdf_path, chunk_size=1000)  # Default: 1000 characters
```

## 📊 System Status

```python
from knowledge_base.rag_service import RAGService

rag = RAGService()
stats = rag.get_collection_stats()

print(f"Total chunks: {stats['total_chunks']}")
print(f"Number of sources: {stats['num_sources']}")
print(f"Sources: {stats['sources']}")
```

## 🔄 Clear Database

If you want to delete all data and start fresh:

```python
rag = RAGService()
rag.clear_collection()
# Then reprocess PDFs
rag.process_all_pdfs()
```

## 🌍 Multi-language Support

The system supports Dutch and other languages:

- **OpenAI Embeddings:** Automatic multi-language
- **Sentence-Transformers:** Uses `paraphrase-multilingual-MiniLM-L12-v2` model

Dutch PDFs are automatically processed and searchable.

## ⚠️ Important Notes

1. **Initial Setup:** After loading PDFs, always run `process_all_pdfs()`
2. **API Keys:** Add OpenAI API key to `.env` file or as environment variable
3. **Rate Limiting:** PubMed API accepts maximum 3 requests per second
4. **Disk Space:** Vector database takes up disk space (approximately 2-3x PDF size)

## 🐛 Troubleshooting

### "RAG service not available" Error
```bash
pip install chromadb PyPDF2 sentence-transformers
```

### "No PDF files found" Warning
Make sure PDFs are in the `knowledge_base/pdfs/` folder.

### Embedding Error
Check your OpenAI API key or use sentence-transformers.

## 📝 Example Usage Scenario

```python
# 1. Load PDFs
from knowledge_base.rag_service import RAGService
rag = RAGService()
rag.process_all_pdfs()

# 2. Start agent system
from orchestrator import CVDAgentOrchestrator
orchestrator = CVDAgentOrchestrator(
    openai_api_key=os.getenv("OPENAI_API_KEY"),
    use_rag=True,
    use_pubmed=True
)

# 3. Analyze patient
patient_data = {...}
result = orchestrator.analyze_patient(patient_data)

# 4. Ask question - will retrieve information from guidelines
answer = orchestrator.ask_question(
    "What monitoring is recommended for high-risk CML patients?"
)
# Answer will come with references from guidelines
```

## 🔗 Related Files

- `agents/knowledge_agent.py` - Knowledge agent (uses RAG)
- `agents/explanation_agent.py` - Explanation agent (uses RAG)
- `agents/intervention_agent.py` - Intervention agent (uses RAG)
- `orchestrator.py` - Agent coordinator
