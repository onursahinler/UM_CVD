"""
Setup script for processing clinical guideline PDFs
Run this script after placing PDF files in the pdfs/ directory
"""
import sys
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from knowledge_base.rag_service import RAGService


def main():
    """Process all PDF files in the pdfs directory"""
    print("=" * 60)
    print("Clinical Guidelines Setup")
    print("=" * 60)
    
    # Initialize RAG service
    print("\nInitializing RAG service...")
    try:
        rag = RAGService(use_openai_embeddings=True)
    except Exception as e:
        print(f"Error initializing RAG service: {e}")
        print("\nTrying with sentence-transformers instead...")
        try:
            rag = RAGService(use_openai_embeddings=False)
        except Exception as e2:
            print(f"Error: {e2}")
            print("\nPlease install required dependencies:")
            print("  pip install chromadb PyPDF2 sentence-transformers")
            return
    
    # Check for PDF files
    pdf_dir = Path(__file__).parent / "pdfs"
    pdf_files = list(pdf_dir.glob("*.pdf"))
    
    if not pdf_files:
        print(f"\n⚠️  No PDF files found in {pdf_dir}")
        print("Please place your clinical guideline PDFs in this directory.")
        return
    
    print(f"\nFound {len(pdf_files)} PDF file(s):")
    for pdf in pdf_files:
        print(f"  - {pdf.name}")
    
    # Ask for confirmation
    response = input("\nProcess all PDF files? (y/n): ")
    if response.lower() != 'y':
        print("Cancelled.")
        return
    
    # Process PDFs
    print("\nProcessing PDFs...")
    print("-" * 60)
    
    results = rag.process_all_pdfs(chunk_size=1000)
    
    # Display results
    print("\n" + "=" * 60)
    print("Processing Results:")
    print("=" * 60)
    
    total_chunks = 0
    for pdf_name, num_chunks in results.items():
        status = "✓" if num_chunks > 0 else "✗"
        print(f"{status} {pdf_name}: {num_chunks} chunks")
        total_chunks += num_chunks
    
    print(f"\nTotal chunks created: {total_chunks}")
    
    # Get collection stats
    stats = rag.get_collection_stats()
    print(f"\nCollection Statistics:")
    print(f"  Total chunks: {stats['total_chunks']}")
    print(f"  Number of sources: {stats['num_sources']}")
    print(f"  Sources: {', '.join(stats['sources'])}")
    
    print("\n✓ Setup complete!")
    print("\nYou can now use the agent system with clinical guidelines.")


if __name__ == "__main__":
    main()








