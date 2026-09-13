import os

class VectorStore:
    def __init__(self):
        # Read the ChromaDB host from the environment, defaulting to the Docker network name
        chroma_host = os.getenv("CHROMA_HOST", "chromadb")
        chroma_port = os.getenv("CHROMA_PORT", "8000")
        
        self.client = None
        self.collection = None
        
        try:
            import chromadb
            from chromadb.config import Settings
            
            print(f"Connecting to ChromaDB at {chroma_host}:{chroma_port}...")
            
            self.client = chromadb.HttpClient(
                host=chroma_host,
                port=chroma_port,
                settings=Settings(anonymized_telemetry=False)
            )
            
            # Get or create the collection for our code snippets
            # We use cosine similarity which is standard for text embeddings
            self.collection = self.client.get_or_create_collection(
                name="codebase_functions",
                metadata={"hnsw:space": "cosine"}
            )
            print("ChromaDB connection established and collection ready.")
        except Exception as e:
            print(f"⚠️  ChromaDB not available — RAG features disabled. Error: {e}")
            print("   Core review pipeline (/api/review) will still work via Groq API.")

    def add_functions(self, ids: list[str], embeddings: list[list[float]], metadatas: list[dict], documents: list[str]):
        """Inserts embedded code snippets into the database."""
        if self.collection is None:
            print("⚠️  ChromaDB not available — skipping add_functions")
            return
        self.collection.upsert(
            ids=ids,
            embeddings=embeddings,
            metadatas=metadatas,
            documents=documents
        )

# Create a singleton instance to be used across the app
vector_db = VectorStore()
