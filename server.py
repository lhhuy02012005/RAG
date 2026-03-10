from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from SmartRAGSystem import SmartRAGSystem # Import class của bạn
import shutil
import os

app = FastAPI()

# Cho phép React (thường chạy ở port 3000) truy cập
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

rag_instance = None

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    global rag_instance
    file_path = f"temp_{file.filename}"
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Khởi tạo RAG với file mới upload
    rag_instance = SmartRAGSystem(file_path)
    return {"status": "success", "filename": file.filename}

@app.get("/chat")
async def chat(query: str):
    if not rag_instance:
        return {"error": "Vui lòng upload file trước"}
    answer = rag_instance.ask(query)
    return {"answer": answer}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 