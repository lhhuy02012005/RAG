import os
import warnings
import pytesseract
from PIL import Image

# Tắt cảnh báo
warnings.filterwarnings("ignore", category=UserWarning)

from langchain_community.document_loaders import (
    PyPDFLoader,
    TextLoader,
    Docx2txtLoader,
    UnstructuredFileLoader
)
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_ollama import OllamaEmbeddings, ChatOllama
from langchain_community.vectorstores import Chroma
from langchain_classic.chains import RetrievalQA
from langchain_core.prompts import PromptTemplate

# Chỉ định đường dẫn Tesseract cho macOS (nếu cài qua Homebrew)
pytesseract.pytesseract.tesseract_cmd = r'/opt/homebrew/bin/tesseract'

class SmartRAGSystem:
    def __init__(self, file_path):
        print("\n" + "="*50)
        print("🚀 KHỞI TẠO HỆ THỐNG SMART RAG")
        print("="*50)

        self.file_path = file_path
        self.file_extension = os.path.splitext(file_path)[1].lower()

        # Cấu hình Models
        self.embeddings = OllamaEmbeddings(model="nomic-embed-text")
        self.llm = ChatOllama(model="qwen2.5:3b", temperature=0.1)

        # Kiểm tra định dạng
        self.is_image = self.file_extension in [".jpg", ".jpeg", ".png", ".bmp", ".webp"]

        if not self.is_image:
            self.vector_db = self.prepare_data(file_path)
        else:
            print(f"📸 Chế độ: OCR ẢNH | File: {os.path.basename(file_path)}")

    # ==========================
    # QUY TRÌNH XỬ LÝ DỮ LIỆU (LOADER -> CHUNKING -> VECTOR DB)
    # ==========================
    def prepare_data(self, path):
        file_name = os.path.basename(path).replace(" ", "_")
        persist_dir = f"./chroma_db_{file_name}"

        # 1. Kiểm tra Cache Database
        if os.path.exists(persist_dir):
            print(f"📂 [BƯỚC 1: DATABASE] Tìm thấy dữ liệu cũ tại: {persist_dir}")
            print(f"♻️ [HÀNH ĐỘNG] Loading VectorDB từ ổ đĩa...")
            if os.path.exists(path):
                os.remove(path)
            return Chroma(persist_directory=persist_dir, embedding_function=self.embeddings)

        print(f"📄 [BƯỚC 1: LOADER] Đang đọc nội dung file: {path}")
        
        # Chọn Loader phù hợp
        if self.file_extension == ".pdf":
            loader = PyPDFLoader(path)
        elif self.file_extension in [".docx", ".doc"]:
            loader = Docx2txtLoader(path)
        elif self.file_extension in [".txt", ".md"]:
            loader = TextLoader(path, encoding="utf-8")
        else:
            loader = UnstructuredFileLoader(path)

        docs = loader.load()
        print(f"✅ Đã tải xong {len(docs)} trang tài liệu.")

        # 2. Quy trình Chunking (Theo chiến lược tối ưu)
        print(f"✂️ [BƯỚC 2: CHUNKING] Đang phân mảnh văn bản (Recursive Character)...")
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            separators=["\n\n", "\n", ". ", "! ", "? ", "; ", " ", ""],
            add_start_index=True
        )
        chunks = splitter.split_documents(docs)
        
        # Log một vài đoạn mẫu để kiểm tra
        print(f"✅ Đã tạo thành công {len(chunks)} đoạn (chunks).")
        if len(chunks) > 0:
            print(f"📝 Đoạn mẫu đầu tiên (50 ký tự): '{chunks[0].page_content[:50]}...'")

        # 3. Quy trình Embedding & Lưu Vector Database
        print(f"🧠 [BƯỚC 3: VECTOR DB] Đang thực hiện Embedding và lưu vào ChromaDB...")
        vector_db = Chroma.from_documents(
            documents=chunks,
            embedding=self.embeddings,
            persist_directory=persist_dir
        )
        
        print(f"💾 [HÀNH ĐỘNG] Đã lưu Database thành công. Đang dọn dẹp file gốc...")
        if os.path.exists(path):
            os.remove(path)
        
        print("✨ HOÀN TẤT CHUẨN BỊ DỮ LIỆU RAG.\n")
        return vector_db

    # ==========================
    # QUY TRÌNH OCR ẢNH
    # ==========================
    def process_image(self, query):
        try:
            print(f"🖼️ [BƯỚC 1: OCR] Đang dùng Tesseract quét ảnh: {self.file_path}")
            image = Image.open(self.file_path)

            # Thực hiện OCR
            raw_text = pytesseract.image_to_string(image, lang="vie")

            # Log nội dung thô để kiểm tra độ chính xác
            print("\n" + "-"*20 + " NỘI DUNG OCR TRÍCH XUẤT (RAW) " + "-"*20)
            if raw_text.strip():
                print(raw_text)
            else:
                print("⚠️ [CẢNH BÁO] Không tìm thấy ký tự nào trong ảnh!")
            print("-" * 70 + "\n")

            if not raw_text.strip():
                return "Không phát hiện được văn bản trong ảnh."

            print(f"🤖 [BƯỚC 2: AI] Đang gửi nội dung OCR sang LLM (Qwen2.5) để phân tích...")
            prompt = f"Dựa vào nội dung trích xuất từ ảnh:\n{raw_text}\n\nHãy trả lời bằng tiếng Việt câu hỏi: {query}"
            res = self.llm.invoke(prompt)

            return res.content

        except Exception as e:
            return f"❌ Lỗi quy trình OCR: {str(e)}"

    # ==========================
    # QUY TRÌNH TRUY VẤN (RETRIEVAL)
    # ==========================
    def ask(self, query):
        if self.is_image:
            return self.process_image(query)

        print(f"🔍 [RETRIEVAL] Đang tìm kiếm thông tin liên quan trong Database (k=5)...")
        
        template = """Bạn là chuyên gia phân tích tài liệu và trợ lý thông tin đa năng.

QUY TẮC:
1. Nếu là file thì câu hỏi liên quan đến NGỮ CẢNH dưới đây, hãy ưu tiên sử dụng nó để trả lời chính xác.
2. Nếu câu hỏi KHÔNG có trong NGỮ CẢNH (ví dụ hỏi về địa lý, xã hội chung), hãy sử dụng kiến thức sẵn có của bạn để trả lời người dùng một cách hữu ích.

NGỮ CẢNH: {context}
CÂU HỎI: {question}
TRẢ LỜI:"""

        prompt = PromptTemplate(template=template, input_variables=["context", "question"])

        qa_chain = RetrievalQA.from_chain_type(
            llm=self.llm,
            chain_type="stuff",
            retriever=self.vector_db.as_retriever(search_kwargs={"k": 5}),
            chain_type_kwargs={"prompt": prompt}
        )

        print(f"💭 [AI] Đang suy luận câu trả lời...")
        result = qa_chain.invoke({"query": query})
        return result["result"]

# ==========================
# CHƯƠNG TRÌNH CHÍNH
# ==========================
if __name__ == "__main__":
    # Thay đổi tên file tại đây để test (ví dụ: 'my_photo.jpg' hoặc 'report.pdf')
    FILE_PATH = "data.pdf" 

    if not os.path.exists(FILE_PATH):
        print(f"❌ Không tìm thấy file: {FILE_PATH}")
        exit()

    rag = SmartRAGSystem(FILE_PATH)

    print("\n✅ HỆ THỐNG SẴN SÀNG.")
    while True:
        user_input = input("\n🤔 Bạn hỏi: ")
        if user_input.lower() in ["exit", "quit"]: break
        if not user_input.strip(): continue

        answer = rag.ask(user_input)
        print(f"\n🤖 AI trả lời:\n{answer}")
        print("-" * 60)