from fastapi import APIRouter
from pydantic import BaseModel
from services.vector_store import vector_db
from services.llm import call_llm

# Import our new modular hybrid search engine
from search.keyword_search import extract_keywords, run_keyword_search
from search.semantic_search import run_semantic_search
from search.hybrid_ranker import reciprocal_rank_fusion

router = APIRouter()

class ExplainRequest(BaseModel):
    question: str
    repo_name: str

class FunctionRef(BaseModel):
    name: str
    file: str
    distance: float

class ExplainResponse(BaseModel):
    answer: str
    referenced_functions: list[FunctionRef]
    confidence: float

class RepoSummaryRequest(BaseModel):
    repo_name: str

class RepoSummaryResponse(BaseModel):
    summary: str

@router.post("/explain", response_model=ExplainResponse)
async def explain_code(request: ExplainRequest):
    """
    Enterprise RAG: Orchestrates Hybrid Search pipeline.
    """
    print(f"\n[Hybrid RAG] Incoming Question: '{request.question}'")
    
    # 1. Keyword Arm
    keywords = extract_keywords(request.question)
    kw_results = run_keyword_search(keywords, request.repo_name)
    
    # 2. Semantic Arm
    vec_results = await run_semantic_search(request.question, request.repo_name)
    
    # 3. RRF Fusion
    final_docs = reciprocal_rank_fusion(kw_results, vec_results)
    print(f" [DEBUG] Final RRF Top 8: {[d['meta'].get('function_name') for d in final_docs]}")
    if not final_docs:
        return ExplainResponse(
            answer="I couldn't find any indexed code matching that request.",
            referenced_functions=[],
            confidence=0.0
        )

    # 4. Build Context
    context_blocks = []
    referenced_functions = []
    
    for item in final_docs:
        meta = item["meta"]
        f_name = meta.get('function_name', 'unknown')
        f_file = meta.get('file', 'unknown')
        
        context_blocks.append(f"--- FILE: {f_file} | FUNCTION: {f_name} ---\n{item['doc']}\n")
        referenced_functions.append(FunctionRef(name=f_name, file=f_file, distance=item['distance']))

    combined_context = "\n".join(context_blocks)
    confidence_score = 95.0 if len(kw_results) > 0 else 85.0

    # 5. Final LLM Synthesis
    prompt = f"""You are an elite Staff Engineer explaining a codebase to a new team member.
    
The developer asks: "{request.question}"

Here is the exact source code for the most relevant functions retrieved from the {request.repo_name} repository:

{combined_context}

INSTRUCTIONS:
1. Directly answer their question based ONLY on the provided code. Do not hallucinate outside features.
2. Explicitly reference specific function names and file names to ground your explanation.
3. Use Markdown backticks for code elements.
4. Be concise, structured, and easy to read.
"""

    answer = await call_llm(prompt)
    
    return ExplainResponse(
        answer=answer,
        referenced_functions=referenced_functions,
        confidence=round(confidence_score, 1)
    )

@router.post("/repo-summary", response_model=RepoSummaryResponse)
async def repo_summary(request: RepoSummaryRequest):
    results = vector_db.collection.get(
        where={"repo": request.repo_name},
        include=["documents", "metadatas"]
    )
    
    if not results["documents"] or len(results["documents"]) == 0:
        return RepoSummaryResponse(summary="No indexed code found for this repository.")

    file_map = {}
    for i in range(len(results["documents"])):
        meta = results["metadatas"][i]
        doc = results["documents"][i]
        file_path = meta.get('file', 'unknown')
        func_name = meta.get('function_name', 'unknown')
        
        if file_path not in file_map:
            file_map[file_path] = []
        file_map[file_path].append(f"- {func_name}():\n{doc[:200]}...")
        
    codebase_structure = ""
    for file, funcs in file_map.items():
        codebase_structure += f"\nFile: {file}\n"
        codebase_structure += "\n".join(funcs) + "\n"

    prompt = f"""You are a Staff Engineer analyzing the '{request.repo_name}' repository.
Here is the codebase structure:
{codebase_structure}

Provide a structured, high-level overview using Markdown:
1. **Purpose:** What does this project likely do?
2. **Architecture:** How is the code organized? 
3. **Key Components:** Important files/functions.
4. **Tech Stack:** Inferred languages or patterns.
"""
    summary = await call_llm(prompt)
    return RepoSummaryResponse(summary=summary)