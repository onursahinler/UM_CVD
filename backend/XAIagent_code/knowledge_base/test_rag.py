"""
Test script for RAG service
Tests PDF processing and retrieval functionality
"""
import sys
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from knowledge_base.rag_service import RAGService


def test_rag_service():
    """Test RAG service functionality"""
    print("Testing RAG Service...")
    print("=" * 60)
    
    # Initialize RAG service
    try:
        rag = RAGService(use_openai_embeddings=True)
        print("✓ RAG service initialized")
    except Exception as e:
        print(f"✗ Error initializing RAG service: {e}")
        return False
    
    # Check collection stats
    stats = rag.get_collection_stats()
    print(f"\nCollection Statistics:")
    print(f"  Total chunks: {stats['total_chunks']}")
    print(f"  Sources: {stats['sources']}")
    
    if stats['total_chunks'] == 0:
        print("\n⚠️  No documents in collection. Please run setup_guidelines.py first.")
        return False
    
    # Test retrieval
    print("\n" + "=" * 60)
    print("Testing Retrieval:")
    print("=" * 60)
    
    test_queries = [
        "What are cardiovascular risk factors for CML patients?",
        "How should CML patients be monitored for cardiovascular disease?",
        "What interventions are recommended for high-risk patients?"
    ]
    
    for query in test_queries:
        print(f"\nQuery: {query}")
        print("-" * 60)
        
        results = rag.retrieve(query, n_results=3)
        
        if results:
            print(f"Found {len(results)} relevant chunks:")
            for i, result in enumerate(results, 1):
                print(f"\n  [{i}] Source: {result['source']}, Page: {result['page']}")
                print(f"      Text: {result['text'][:200]}...")
        else:
            print("  No results found")
    
    print("\n" + "=" * 60)
    print("✓ RAG service test complete!")
    return True


if __name__ == "__main__":
    test_rag_service()








