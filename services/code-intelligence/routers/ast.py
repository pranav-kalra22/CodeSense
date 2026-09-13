from fastapi import APIRouter
from models.schema import ASTRequest
from services.vector_store import vector_db

router = APIRouter()

@router.post("/ast")
async def get_ast(req: ASTRequest):
    try:
        records = vector_db.collection.get(where={"repo": req.repo_name})
        
        if not records or not records.get("metadatas") or len(records["metadatas"]) == 0:
            return []
        
        file_map = {}
        for idx, meta in enumerate(records["metadatas"]):
            file_path = meta.get("file") or meta.get("file_path") or "unknown_file.go"
            func_name = meta.get("function_name") or meta.get("name") or f"func_{idx}"
            line_range = meta.get("lines") or meta.get("line_range") or "1-30"
            
            if file_path not in file_map:
                file_map[file_path] = []
                
            if not any(f["name"] == func_name for f in file_map[file_path]):
                file_map[file_path].append({"name": func_name, "lines": str(line_range)})
        
        return [{"file": k, "functions": v} for k, v in file_map.items()]
    except Exception as e:
        print(f"[Explorer API] Error compiling AST view: {e}")
        return []