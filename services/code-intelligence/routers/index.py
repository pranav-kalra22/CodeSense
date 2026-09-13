from fastapi import APIRouter, BackgroundTasks
from pydantic import BaseModel
from indexer import index_repository

router = APIRouter()

class IndexRequest(BaseModel):
    repo_name: str

@router.post("/index")
async def trigger_index(req: IndexRequest, background_tasks: BackgroundTasks):
    print(f" Received request to index remote GitHub repo: {req.repo_name}")
    
    # Offload the git clone and vector embedding to a background thread
    background_tasks.add_task(index_repository, req.repo_name)
    
    return {
        "status": "indexing_started",
        "repo_name": req.repo_name,
        "message": "Repository indexing is running in the background."
    }