def reciprocal_rank_fusion(kw_results: list[dict], vec_results: list[dict], k=60, w_kw=1.5, w_vec=1.0) -> list[dict]:
    """Merges Keyword and Vector results using weighted Reciprocal Rank Fusion."""
    fusion_scores = {}
    merged_pool = {}
    
    # Process Keyword Ranks
    for rank, item in enumerate(kw_results):
        func_id = item["id"]
        merged_pool[func_id] = item
        fusion_scores[func_id] = fusion_scores.get(func_id, 0) + (w_kw / (k + rank))
        
    # Process Vector Ranks
    for rank, item in enumerate(vec_results):
        func_id = item["id"]
        merged_pool[func_id] = item
        fusion_scores[func_id] = fusion_scores.get(func_id, 0) + (w_vec / (k + rank))
        
    # Sort by highest RRF score
    ranked_ids = sorted(fusion_scores.keys(), key=lambda x: fusion_scores[x], reverse=True)
    
    # Return Top 8 Deduplicated
    return [merged_pool[fid] for fid in ranked_ids[:8]]