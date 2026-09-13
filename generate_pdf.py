import os
import subprocess

html_path = os.path.abspath("codesense_masterclass.html")
pdf_path = os.path.abspath("CodeSense_Complete_Technical_Masterclass_and_Interview_Defense_Guide.pdf")

# We read the markdown guide and generate a publication-quality HTML representation
edge_path = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if not os.path.exists(edge_path):
    print("Edge not found at:", edge_path)
    exit(1)

print("Starting generation...")
