from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from SmartRAGSystem import SmartRAGSystem
import shutil
import os
import uvicorn

app = FastAPI()

# Cấu hình CORS để React gọi được API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Thư mục chứa file tạm khi upload
UPLOAD_DIR = "uploads"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

rag_instance = None

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    global rag_instance
    
    # Không giới hạn đuôi file ở đây nữa
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Khởi tạo RAG với file bất kỳ
    try:
        rag_instance = SmartRAGSystem(file_path)
        return {"status": "success", "filename": file.filename}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/chat")
async def chat(query: str):
    if not rag_instance:
        return {"error": "Vui lòng upload tài liệu trước khi chat!"}
    
    answer = rag_instance.ask(query)
    return {"answer": answer}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)