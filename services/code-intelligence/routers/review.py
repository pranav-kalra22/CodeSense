from fastapi import APIRouter
from groq import Groq
import os
import json
import httpx

from models.schema import ReviewRequest, ReviewResponse, ReviewComment
from services.embedder import embed_code
from services.vector_store import vector_db

router = APIRouter()
groq_client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

# ─── LANGUAGE RULES & PROMPT ENGINEERING HELPERS ─────────────────────────

def detect_language(file_path: str) -> str:
    ext_map = {
        ".py":   "Python", ".go":   "Go", ".js":   "JavaScript",
        ".ts":   "JavaScript", ".java": "Java", ".cpp":  "C++",
        ".mjs":  "JavaScript", ".jsx":  "JavaScript", ".tsx":  "JavaScript",
        ".kt":   "Kotlin", ".rb":   "Ruby", ".rs":   "Rust",
        ".cs":   "C#", ".php":  "PHP",
    }
    ext = "." + file_path.rsplit(".", 1)[-1] if "." in file_path else ""
    return ext_map.get(ext, "Unknown")

def _get_language_checklist(language: str) -> str:
    lang = language.lower()
    if lang == "go":
        return """
### GO — MANDATORY ANALYSIS PROTOCOL ###
1. RESOURCE INVENTORY: Identify every acquired resource (DB connections, Tickers, File handles).
2. LIFECYCLE: Verify `defer resource.Close()` is on the SAME line it was acquired.
3. HOT PATH: Flag `regexp.MustCompile` or DB connection acquisition inside loops.
4. SHUTDOWN: `os.Exit()` or `log.Fatal()` anywhere bypasses defers. FLAG immediately.
5. CONCURRENCY: Watch for un-joined goroutines. Note: `make(chan T, N)` is standard, do NOT flag."""
    elif lang == "python":
        return """
### PYTHON — MANDATORY ANALYSIS PROTOCOL ###
1. RESOURCE INVENTORY: Identify File handles, DB cursors, Locks, HTTP sessions.
2. LIFECYCLE: Verify resources use `with` statements or `.close()` in `finally` blocks.
3. SILENT FAILURES: Flag bare `except:` or `except Exception:` with no logging. Flag mutable default args `def func(x=[])`.
4. CONCURRENCY: Flag missing `await` on coroutines. Flag blocking I/O in async defs."""
    elif lang == "javascript":
        return """
### JAVASCRIPT / TYPESCRIPT — MANDATORY ANALYSIS PROTOCOL ###
1. LIFECYCLE: Verify streams are `.destroy()`ed and event listeners `.off()` removed to prevent memory leaks.
2. HOT PATH: Flag `fs.readFileSync` as it blocks the event loop.
3. PROMISES: Flag `async` functions called without `await`. Flag `.then()` chains missing `.catch()`."""
    elif lang in ("java", "kotlin"):
        return """
### JAVA / KOTLIN — MANDATORY ANALYSIS PROTOCOL ###
1. LIFECYCLE: Ensure resources use try-with-resources `try (Resource r = ...) {}`.
2. HOT PATH: Flag `Pattern.compile()` or string concatenation `+` inside loops.
3. SILENT FAILURES: Flag empty `catch (Exception e) {}` blocks. Flag catching `Throwable`."""
    elif lang == "rust":
        return """
### RUST — MANDATORY ANALYSIS PROTOCOL ###
1. UNSAFE: Flag any `unsafe` block and require an explicit justification comment.
2. ERROR HANDLING: Flag `.unwrap()` or `.expect()` in non-test code. Recommend `?` or `match`."""
    else:
        return """
### GENERAL — MANDATORY ANALYSIS PROTOCOL ###
1. Verify opened resources have explicit close/cleanup paths.
2. Flag expensive initialization inside loops.
3. Check for catch-all error handlers that swallow failures silently."""

def _get_confidence_filter(language: str) -> str:
    lang = language.lower()
    specific = ""
    if lang == "go":
        specific = "- Do NOT flag single-statement DB ops for missing transactions.\n- Do NOT flag channel sends (ch <- val) for missing error checks. They don't return errors.\n- Do NOT flag `return value, nil` as masking errors."
    elif lang == "python":
        specific = "- Do NOT flag `return value, None` on a clean success path as error masking."
    elif lang == "javascript":
        specific = "- Do NOT flag top-level missing try/catch if an outer handler exists."
    
    return f"""
### CONFIDENCE FILTER — APPLY BEFORE WRITING ANY COMMENT ###
REJECT a comment entirely if any of these are true:
- You are not 100% certain the flagged line is actually wrong.
- You are guessing at what a function's return type or signature is.
- The issue is stylistic only (naming, formatting, line length).
{specific}
A wrong comment is WORSE than no comment. When in doubt, stay silent.
"""

# ─── MAIN REVIEW ENDPOINT ────────────────────────────────────────────────

@router.post("/review", response_model=ReviewResponse)
async def review_pr(req: ReviewRequest):
    print(f" Starting AI Review for {req.repo} PR #{req.pr_number} (File: {req.file_path})")
    
    # 1. LANGUAGE DETECTION
    language = detect_language(req.file_path)
    language_checklist = _get_language_checklist(language)
    confidence_filter = _get_confidence_filter(language)

    # 2. RAG RETRIEVAL (ChromaDB)
    similar_code_context = ""
    try:
        if req.diff_content:
            query_vector = embed_code(req.diff_content[:2000])
            results = vector_db.collection.query(
                query_embeddings=[query_vector],
                n_results=3,
                where={"repo": req.repo} 
            )
            if results and results.get("documents") and len(results["documents"][0]) > 0:
                similar_code_context = "\n### EXISTING CODEBASE CONTEXT ###\nHere are similar functions already existing in this codebase. Use these to understand the team's coding style:\n"
                for i, doc in enumerate(results["documents"][0]):
                    similar_code_context += f"--- Snippet {i+1} ---\n{doc}\n"
    except Exception as e:
        print(f" ChromaDB Retrieval bypassed: {e}")

    # 3. RLHF RETRIEVAL (api-server)
    feedback_context = ""
    try:
        api_url = f"http://api-server:8083/api/v1/repos/{req.repo}/feedback-summary"
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(api_url)
            if resp.status_code == 200:
                data = resp.json()
                if data and data.get("total_feedback", 0) > 0:
                    acc_rate = data.get("acceptance_rate", 0)
                    recent_rejected = data.get("recent_rejected", [])
                    recent_accepted = data.get("recent_accepted", [])
                    
                    feedback_context = f"\n### HISTORICAL DEVELOPER FEEDBACK ###\nYour past suggestions have an acceptance rate of {acc_rate:.1f}%.\n"
                    if recent_rejected:
                        feedback_context += "\nCRITICAL - Developers REJECTED these types of suggestions (DO NOT REPEAT):\n" + "\n".join([f"- {c}" for c in recent_rejected])
                    if recent_accepted:
                        feedback_context += "\nDevelopers ACCEPTED these types of suggestions (DO MORE OF THIS):\n" + "\n".join([f"- {c}" for c in recent_accepted])
    except Exception as e:
        print(f" Failed to fetch developer feedback: {e}")

    # 4. SYSTEM PROMPT CONSTRUCTION
    system_prompt = f"""You are a Senior Security & Code Quality Engineer reviewing a GitHub Pull Request.
You must output YOUR ENTIRE RESPONSE as a valid JSON array of objects.
Do not include markdown blocks like ```json.

### CRITICAL INSTRUCTION ON LINE NUMBERS & FILE PATHS ###
1. The git diff provided to you has been explicitly formatted with absolute line numbers. 
   Every added line of code starts with the line number followed by a colon and a plus sign (e.g., `42: + def secure_password(pwd):`).
   You MUST use the exact integer provided in the prefix as the `line_number` in your JSON. DO NOT guess or calculate line numbers.
2. For the `file_path` field in your JSON, you MUST use the exact file name provided in the user prompt. DO NOT guess the file name.

Format: [{{"file_path": "string", "line_number": int, "severity": "error|warning|info", "category": "security|performance|style|logic|error-handling|general", "comment_text": "string"}}]

{language_checklist}
{confidence_filter}
{f'### CUSTOM TEAM INSTRUCTIONS ###{req.custom_instructions}' if req.custom_instructions else ''}
{similar_code_context}
{feedback_context}
"""

    user_prompt = f"Please review the following git diff for the file `{req.file_path}` (Language: {language}) and output ONLY the JSON array of your findings:\n\n{req.diff_content}"

    # 5. LLM GENERATION
    try:
        model_name = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
        completion = groq_client.chat.completions.create(
            model=model_name,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.1,
        )
        
        raw_response = completion.choices[0].message.content.strip()
        
        if raw_response.startswith("```json"):
            raw_response = raw_response[7:]
        if raw_response.endswith("```"):
            raw_response = raw_response[:-3]
            
        comments_data = json.loads(raw_response)
        
        # Validate against our Pydantic model
        validated_comments = [ReviewComment(**c) for c in comments_data]
        
        return ReviewResponse(
            status="success",
            comments=validated_comments
        )

    except Exception as e:
        print(f" LLM Error: {e}")
        return ReviewResponse(status="error", message=str(e), comments=[])