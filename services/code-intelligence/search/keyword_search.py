import re
from services.vector_store import vector_db

def extract_keywords(question: str) -> list[str]:
    """Converts natural language to potential code identifiers with basic stemming."""
    stop_words = {'is', 'there', 'a', 'the', 'to', 'for', 'how', 'does', 
                  'what', 'which', 'function', 'method', 'class', 'do', 'we',
                  'have', 'any', 'can', 'you', 'find', 'show', 'me', 'in', 'of'}
    
    words = re.findall(r'[a-zA-Z]+', question.lower())
    base_keywords = [w for w in words if w not in stop_words and len(w) > 2]
    
    keywords = []
    # FIX: Basic stemming to handle 'preprocessing' -> 'preprocess', 'images' -> 'image'
    for w in base_keywords:
        keywords.append(w)
        if w.endswith('ing'): keywords.append(w[:-3])
        elif w.endswith('es'): keywords.append(w[:-2])
        elif w.endswith('s') and not w.endswith('ss'): keywords.append(w[:-1])
        elif w.endswith('ed'): keywords.append(w[:-2])
    
    snake_combos = []
    for i in range(len(keywords)):
        for j in range(i + 1, min(i + 3, len(keywords) + 1)):
            snake_combos.append("_".join(keywords[i:j]))
            
    final_keywords = list(set(keywords + snake_combos)) # Remove duplicates
    print(f" [DEBUG] Extracted Keywords: {final_keywords}")
    return final_keywords

def run_keyword_search(keywords: list[str], repo_name: str) -> list[dict]:
    all_funcs = vector_db.collection.get(
        where={"repo": repo_name},
        include=["documents", "metadatas"]
    )
    
    if not all_funcs or not all_funcs.get("ids"):
        return []
        
    scored_docs = []
    for i, meta in enumerate(all_funcs["metadatas"]):
        func_name = meta.get("function_name", "").lower()
        file_path = meta.get("file", "").lower()
        doc_body = all_funcs["documents"][i].lower()
        
        score = 0
        for kw in keywords:
            if kw in func_name: score += 3.0
            elif kw in file_path: score += 1.0
            elif kw in doc_body: score += 0.5
                
        if score > 0:
            scored_docs.append({
                "id": all_funcs["ids"][i],
                "score": score,
                "meta": meta,
                "doc": all_funcs["documents"][i],
                "distance": 0.1 
            })
            
    scored_docs.sort(key=lambda x: x["score"], reverse=True)
    
    # X-RAY LOG: What did the Keyword arm actually find?
    print(f" [DEBUG] Keyword Top 3: {[d['meta'].get('function_name') for d in scored_docs[:3]]}")
    return scored_docs[:15]