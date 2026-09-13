from fastapi import APIRouter
from models.schema import SearchRequest
from services.vector_store import vector_db
from services.embedder import embed_code

router = APIRouter()

@router.post("/search")
async def search_similar(req: SearchRequest):
    try:
        print(f"[Explorer API] Searching nearest neighbors for target: '{req.query}' in '{req.repo_name}'")
        
        target_docs = vector_db.collection.get(
            where={
                "$and": [
                    {"repo": req.repo_name},
                    {"function_name": req.query}
                ]
            },
            include=["embeddings"]
        )
        
        target_embeddings = target_docs.get("embeddings") if target_docs else None
        
        if target_embeddings is None or len(target_embeddings) == 0:
            print(f" Target function '{req.query}' not found. Falling back to text-name embedding.")
            query_vector = [embed_code(req.query)]
        else:
            print(f" Found exact mathematical signature for '{req.query}'. Searching vector space...")
            emb = target_embeddings[0]
            if hasattr(emb, "tolist"):
                emb = emb.tolist()
            query_vector = [emb]
            
        results = vector_db.collection.query(
            query_embeddings=query_vector,
            where={"repo": req.repo_name},
            n_results=4
        )
        
        output = []
        docs = results.get("documents")
        
        if docs is not None and len(docs) > 0 and len(docs[0]) > 0:
            documents = docs[0]
            metadatas = results["metadatas"][0]
            dist_array = results.get("distances")
            distances = dist_array[0] if dist_array is not None else [0.1] * len(documents)
            
            for idx, doc in enumerate(documents):
                meta = metadatas[idx]
                if meta.get("function_name") == req.query:
                    continue
                    
                dist = distances[idx]
                d = max(0.0, float(dist))
                # CodeBERT cosine distances span [0.000, 0.012] due to BERT representation anisotropy.
                # Map this realistically:
                # - Near duplicates (< 0.001): 95% - 99%
                # - Similar logic (0.002 - 0.004): 80% - 92%
                # - Moderate overlap (0.005 - 0.007): 65% - 78%
                # - Distant / loose (0.008+): 40% - 60%
                if d <= 0.0005:
                    similarity = 99
                else:
                    scaled = 100.0 - (d / 0.012) * 60.0
                    similarity = max(25, min(99, int(round(scaled))))
                
                output.append({
                    "name": meta.get("function_name") or meta.get("name") or "anonymous_func",
                    "file": meta.get("file") or meta.get("file_path") or "unknown_file",
                    "similarity": similarity,
                    "snippet": doc
                })
                
        output.sort(key=lambda x: x["similarity"], reverse=True)
        return output[:3]
    except Exception as e:
        print(f"[Explorer API] Vector computation error: {e}")
        return []