import os
from fastapi import HTTPException
from groq import AsyncGroq

# 1. Initialize the Groq client globally.
# Using AsyncGroq allows FastAPI to handle multiple concurrent Assistant/Search requests
# efficiently without blocking the event loop or spinning up new clients every time.
api_key = os.getenv("GROQ_API_KEY")
if not api_key:
    print("WARNING: GROQ_API_KEY is not set in the environment!")

GROQ_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")

# Initialize the async client
groq_client = AsyncGroq(api_key=api_key)

async def call_llm(prompt: str, system_prompt: str = None) -> str:
    """
    The Single-Source-of-Truth LLM caller for the entire application.
    Used by /api/explain and semantic_search.
    """
    if not api_key:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY is not set!")

    # 2. Build the message array
    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    
    messages.append({"role": "user", "content": prompt})

    # 3. Call Groq using the official Python SDK
    try:
        completion = await groq_client.chat.completions.create(
            model=GROQ_MODEL,
            messages=messages,
            temperature=0.2, # Kept low so the AI remains strictly analytical
            max_tokens=2048,
        )
        
        # 4. Extract and return the raw text
        return completion.choices[0].message.content

    except Exception as e:
        print(f" LLM Client Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to communicate with LLM")