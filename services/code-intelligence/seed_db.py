import uuid
import hashlib
import random
from services.vector_store import vector_db

def get_demo_vector(text: str):
    h = int(hashlib.md5(text.encode()).hexdigest(), 16)
    random.seed(h)
    return [random.uniform(-0.1, 0.1) for _ in range(768)]

def seed():
    target_repo = "Darshan0403/ai-code-review" 
    
    # 1. Wipe the old identical clones so they don't mess up our search
    try:
        vector_db.collection.delete(where={"repo": target_repo})
        print("️ Cleared old identical vectors...")
    except Exception:
        pass
        
    print(" Seeding ChromaDB with UNIQUE AST Vectors...")
    
    dummy_files = [
        {
            "file": "handlers/auth.go",
            "functions": [
                {"name": "ValidateJWT", "lines": "12-45", "code": "func ValidateJWT(token string) bool {\n  // checks sig\n  return true\n}"},
                {"name": "GenerateToken", "lines": "47-80", "code": "func GenerateToken(user User) string {\n  // signs payload\n  return token\n}"}
            ]
        },
        {
            "file": "db/postgres.go",
            "functions": [
                {"name": "ConnectDB", "lines": "10-25", "code": "func ConnectDB(dsn string) *Pool {\n  return pool\n}"},
                {"name": "QueryUser", "lines": "27-60", "code": "func QueryUser(id string) User {\n  // SELECT * FROM users\n}"}
            ]
        },
        {
            "file": "services/rag.py",
            "functions": [
                {"name": "embed_code", "lines": "15-30", "code": "def embed_code(snippet):\n  return model.encode(snippet)"},
                {"name": "search_chroma", "lines": "32-50", "code": "def search_chroma(query_vec):\n  return collection.query(query_vec)"}
            ]
        }
    ]

    ids = []
    documents = []
    metadatas = []
    embeddings = []

    for item in dummy_files:
        for func in item["functions"]:
            ids.append(str(uuid.uuid4()))
            documents.append(func["code"])
            metadatas.append({
                "repo": target_repo, 
                "file": item["file"],
                "function_name": func["name"],
                "lines": func["lines"]
            })
            # Generate a distinct vector for each function!
            embeddings.append(get_demo_vector(func["code"]))

    try:
        vector_db.collection.add(
            ids=ids,
            embeddings=embeddings,
            metadatas=metadatas,
            documents=documents
        )
        print(f" Successfully seeded {len(ids)} UNIQUE AST nodes for {target_repo}!")
    except Exception as e:
        print(f" Seed failed: {e}")

if __name__ == "__main__":
    seed()