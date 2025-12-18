"""
Test script for PubMed MCP integration
Tests MCP client and server functionality
"""
import sys
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

def test_mcp_client():
    """Test MCP client functionality"""
    print("Testing PubMed MCP Client...")
    print("=" * 60)
    
    try:
        from knowledge_base.mcp_pubmed_server import PubMedMCPClient
        
        # Initialize client
        client = PubMedMCPClient()
        print("✓ MCP Client initialized")
        
        # Test search
        print("\nTesting search...")
        articles = client.search(
            query="CML cardiovascular risk",
            max_results=3
        )
        print(f"✓ Found {len(articles)} articles")
        
        if articles:
            print(f"\nFirst article:")
            print(f"  Title: {articles[0]['title'][:80]}...")
            print(f"  Journal: {articles[0]['journal']}")
            print(f"  Year: {articles[0]['year']}")
            print(f"  PMID: {articles[0]['pmid']}")
        
        # Test CML/CVD search
        print("\nTesting CML/CVD search...")
        cml_articles = client.search_cml_cvd(max_results=2)
        print(f"✓ Found {len(cml_articles)} CML/CVD articles")
        
        # Test RAG formatting
        print("\nTesting RAG formatting...")
        formatted = client.format_for_rag(
            query="CML cardiovascular monitoring",
            max_results=2
        )
        print(f"✓ Formatted text length: {len(formatted)} characters")
        print(f"\nFormatted text preview:")
        print(formatted[:300] + "...")
        
        print("\n" + "=" * 60)
        print("✓ MCP Client test complete!")
        return True
        
    except ImportError as e:
        print(f"✗ Import error: {e}")
        print("Make sure all dependencies are installed:")
        print("  pip install biopython")
        return False
    except Exception as e:
        print(f"✗ Error: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_pubmed_service_with_mcp():
    """Test PubMed service with MCP"""
    print("\nTesting PubMed Service with MCP...")
    print("=" * 60)
    
    try:
        from knowledge_base.pubmed_service import PubMedService
        
        # Test with MCP
        print("\n1. Testing with MCP enabled...")
        try:
            service_mcp = PubMedService(use_mcp=True)
            print("✓ PubMed Service with MCP initialized")
            
            articles = service_mcp.search_cml_cvd_articles(max_results=2)
            print(f"✓ Found {len(articles)} articles via MCP")
        except Exception as e:
            print(f"⚠ MCP not available, using direct API: {e}")
        
        # Test without MCP
        print("\n2. Testing with direct API...")
        service_direct = PubMedService(use_mcp=False)
        print("✓ PubMed Service with direct API initialized")
        
        articles = service_direct.search_cml_cvd_articles(max_results=2)
        print(f"✓ Found {len(articles)} articles via direct API")
        
        print("\n" + "=" * 60)
        print("✓ PubMed Service test complete!")
        return True
        
    except Exception as e:
        print(f"✗ Error: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    print("PubMed MCP Integration Test")
    print("=" * 60)
    
    # Test MCP client
    test1 = test_mcp_client()
    
    # Test PubMed service
    test2 = test_pubmed_service_with_mcp()
    
    if test1 and test2:
        print("\n" + "=" * 60)
        print("✓ All tests passed!")
    else:
        print("\n" + "=" * 60)
        print("⚠ Some tests failed. Check errors above.")













