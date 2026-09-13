from pydantic import BaseModel
from typing import List, Optional

class ReviewRequest(BaseModel):
    repo: str
    pr_number: int
    diff_content: str
    file_path: str = ""
    custom_instructions: str = ""

class ReviewComment(BaseModel):
    file_path: str
    line_number: int  # Changed from 'line' to match Go worker expectations
    severity: str     # error, warning, info
    category: str = "general"
    comment_text: str # Changed from 'comment' to match Go worker expectations

class ReviewResponse(BaseModel):
    status: str
    message: Optional[str] = None
    comments: List[ReviewComment] = []

# ... (existing review schemas) ...

class ASTRequest(BaseModel):
    repo_name: str

class SearchRequest(BaseModel):
    repo_name: str
    query: str