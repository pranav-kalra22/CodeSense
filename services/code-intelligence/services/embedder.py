from transformers import AutoTokenizer, AutoModel
import torch

print("Loading CodeBERT model into memory... (This takes a moment)")
tokenizer = AutoTokenizer.from_pretrained("microsoft/codebert-base")
model = AutoModel.from_pretrained("microsoft/codebert-base")
print(" CodeBERT loaded successfully.")

def embed_code(code: str) -> list[float]:
    """
    Converts a string of code into a 768-dimensional vector using CodeBERT.
    """
    # Tokenize the input, truncating it to fit BERT's 512 token limit
    inputs = tokenizer(code, return_tensors="pt", truncation=True, max_length=512, padding=True)
    
    with torch.no_grad():
        outputs = model(**inputs)
        
    # Extract the [CLS] token's embedding (represents the whole sequence)
    embedding = outputs.last_hidden_state[:, 0, :].squeeze().tolist()
    
    return embedding