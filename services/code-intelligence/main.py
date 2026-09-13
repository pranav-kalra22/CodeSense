from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import review, index, search, explain, ast
from services.vector_store import vector_db

app = FastAPI(title="Code Intelligence Service")

# --- CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://*.vercel.app",
        "https://*.onrender.com",
    ],
    allow_origin_regex=r"https://.*\.vercel\.app|https://.*\.onrender\.com",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Routers ---
app.include_router(review.router, prefix="/api")
app.include_router(index.router, prefix="/api")
app.include_router(search.router, prefix="/api")
app.include_router(explain.router, prefix="/api")
app.include_router(ast.router, prefix="/api")

# --- Startup Event ---
@app.on_event("startup")
async def startup_event():
    print("Code Intelligence Service Booting Up...")
    if vector_db.collection is None:
        print("ChromaDB not connected — skipping startup test. RAG features disabled.")
        return
    try:
        vector_db.add_functions(
            ids=["test_1"],
            embeddings=[[0.1] * 768],
            metadatas=[{"repo": "test", "file": "main.py"}],
            documents=["def hello_world(): print('Hello')"]
        )
        vector_db.collection.query(query_embeddings=[[0.1] * 768], n_results=1)
        print(" ChromaDB Test Successful!")
    except Exception as e:
        print(f" ChromaDB Test Failed: {e}")

# --- Health / Debug ---
@app.get("/health")
def health():
    return {"status": "ok", "service": "code-intelligence"}

@app.get("/debug/check-function")
async def check_function(repo: str, func_name: str):
    try:
        results = vector_db.collection.get(
            where={"$and": [{"repo": repo}, {"function_name": func_name}]}
        )
        return {
            "found": len(results.get("ids", [])) > 0,
            "count": len(results.get("ids", [])),
            "metadatas": results.get("metadatas", [])
        }
    except Exception as e:
        return {"error": str(e)}