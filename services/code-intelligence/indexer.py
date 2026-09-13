import os
import shutil
import subprocess
import uuid
from services.vector_store import vector_db
from services.embedder import embed_code
from services.ast_parser import extract_functions

# We use a temporary directory for the shallow clones
CLONE_DIR = "/tmp/repo_index"

def get_language_from_ext(filename: str) -> str:
    """Maps file extensions to Tree-Sitter language identifiers."""
    ext = filename.split('.')[-1].lower()
    mapping = {
        'py': 'python',
        'go': 'go',
        'js': 'javascript',
        'jsx': 'javascript',
        'ts': 'typescript',
        'tsx': 'typescript'
    }
    return mapping.get(ext)

def index_repository(repo_full_name: str):
    print(f"\n Starting Real Indexing Pipeline for {repo_full_name}...", flush=True)
    repo_path = os.path.join(CLONE_DIR, repo_full_name.replace("/", "_"))
    
    if os.path.exists(repo_path):
        shutil.rmtree(repo_path)
        
    clone_url = f"https://github.com/{repo_full_name}.git"
    try:
        print(f" Cloning {clone_url}...", flush=True)
        subprocess.run(["git", "clone", "--depth", "1", clone_url, repo_path], check=True, capture_output=True)
    except subprocess.CalledProcessError as e:
        print(f" Failed to clone repository: {e.stderr.decode()}", flush=True)
        return
        
    print(" Parsing AST and extracting functions...", flush=True)
    all_functions = []
    
    for root, dirs, files in os.walk(repo_path):
        # Ignore standard build/dependency directories
        if any(ignored in root for ignored in ['.git', 'vendor', 'node_modules', 'dist', 'build']):
            continue
            
        for file in files:
            lang = get_language_from_ext(file)
            if not lang:
                continue # Skip files we don't support parsing for

            filepath = os.path.join(root, file)
            rel_path = os.path.relpath(filepath, repo_path)
            
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    code_content = f.read()
                
                # Use the robust Tree-Sitter parser instead of regex
                extracted = extract_functions(code_content, lang)
                
                for func in extracted:
                    all_functions.append({
                        "name": func["name"],
                        "lines": f"{func['start_line']}-{func['end_line']}",
                        "code": func["body"],
                        "file": rel_path
                    })
            except Exception as e:
                print(f" Skipping file {filepath}: {e}", flush=True)

    if not all_functions:
        shutil.rmtree(repo_path)
        print(f" No parsable functions found for {repo_full_name}. Destroying clone.", flush=True)
        return

    print(f" Generating CodeBERT Vectors for {len(all_functions)} functions... (This might take a minute)", flush=True)
    
    ids = []
    documents = []
    metadatas = []
    embeddings = []
    
    for func in all_functions:
        ids.append(str(uuid.uuid4()))
        documents.append(func["code"])
        metadatas.append({
            "repo": repo_full_name,
            "file": func["file"],
            "function_name": func["name"],
            "lines": func["lines"]
        })
        embeddings.append(embed_code(func["code"]))
        
    print(" Upserting into ChromaDB...", flush=True)
    try:
        # Note: 'repo' matches the metadata key we set above. 
        # (Your original regex code used "repo_name" in review.py but "repo" here. I am keeping "repo" for the DB write, 
        # but you should ensure review.py uses the same key when querying).
        vector_db.collection.delete(where={"repo": repo_full_name})
        vector_db.collection.add(ids=ids, embeddings=embeddings, metadatas=metadatas, documents=documents)
    except Exception as e:
        print(f" ChromaDB Write Error: {e}", flush=True)

    print(" Destroying temporary clone...", flush=True)
    shutil.rmtree(repo_path)
    
    print(f" Successfully Indexed {len(all_functions)} functions for {repo_full_name}!", flush=True)