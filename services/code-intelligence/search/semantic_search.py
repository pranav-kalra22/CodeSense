from services.embedder import embed_code
from services.vector_store import vector_db
from services.llm import call_llm

async def run_semantic_search(question: str, repo_name: str) -> list[dict]:
    """Executes HyDE and ChromaDB nearest-neighbor vector search."""
    hyde_prompt = f"""You are a code translation engine. 
The user is searching a codebase for this: "{question}"
Write a hypothetical, minimal 3-line Python function signature and docstring that represents exactly what they are looking for. 
DO NOT write logic. ONLY output the raw text.
"""
    hypothetical_code = await call_llm(hyde_prompt)
    hypothetical_code = hypothetical_code.replace("```python", "").replace("```", "").strip()
    
    question_embedding = embed_code(hypothetical_code)
    
    raw_vec_results = vector_db.collection.query(
        query_embeddings=[question_embedding],
        n_results=15, 
        where={"repo": repo_name}
    )
    
    vec_results = []
    if raw_vec_results and raw_vec_results.get("documents") and len(raw_vec_results["documents"][0]) > 0:
        docs = raw_vec_results["documents"][0]
        metas = raw_vec_results["metadatas"][0]
        distances = raw_vec_results.get("distances", [[0.5] * len(docs)])[0]
        ids = raw_vec_results["ids"][0]
        
        for i in range(len(docs)):
            vec_results.append({
                "id": ids[i],
                "meta": metas[i],
                "doc": docs[i],
                "distance": distances[i]
            })
            
    return vec_results