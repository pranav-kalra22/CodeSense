from tree_sitter_languages import get_language, get_parser
from typing import List, Dict

def extract_functions(code: str, lang_string: str) -> List[Dict]:
    """
    Parses source code into an AST and extracts all functions/methods.
    """
    # Normalize language extensions to Tree-Sitter language names
    lang = lang_string.lower()
    if lang in ['js', 'jsx']: lang = 'javascript'
    elif lang in ['ts', 'tsx']: lang = 'typescript'
    elif lang in ['py']: lang = 'python'
    elif lang == 'golang': lang = 'go'

    try:
        parser = get_parser(lang)
    except Exception as e:
        print(f"AST Parser: Language '{lang}' not supported. Skipping. ({e})")
        return []

    # Parse the code into a tree
    code_bytes = bytes(code, "utf8")
    tree = parser.parse(code_bytes)
    root_node = tree.root_node

    functions = []

    # Recursive function to traverse the AST looking for function nodes
    def traverse(node):
        # Catch standard function and method declarations across Python, Go, and JS/TS
        valid_types = [
            'function_definition',   # Python
            'method_definition',     # Python / JS
            'function_declaration',  # Go / JS
            'method_declaration'     # Go
        ]
        
        if node.type in valid_types:
            name_node = None
            for child in node.children:
                if child.type in ['identifier', 'property_identifier', 'name']:
                    name_node = child
                    break
            
            func_name = name_node.text.decode('utf8') if name_node else "anonymous"
            func_body = node.text.decode('utf8')
            
            functions.append({
                "name": func_name,
                "body": func_body,
                "start_line": node.start_point[0] + 1,
                "end_line": node.end_point[0] + 1
            })
        
        # Recursively check all child nodes
        for child in node.children:
            traverse(child)

    traverse(root_node)
    return functions