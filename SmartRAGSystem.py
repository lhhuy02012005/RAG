import os
import warnings

# Tạm ẩn các cảnh báo từ Pydantic
warnings.filterwarnings("ignore", category=UserWarning)

from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_ollama import OllamaEmbeddings, ChatOllama
from langchain_community.vectorstores import Chroma
from langchain_classic.chains import RetrievalQA
from langchain_core.prompts import PromptTemplate

class SmartRAGSystem:
    def __init__(self, pdf_path):
        print("--- Đang khởi tạo hệ thống RAG thông minh ---")
        # Sử dụng model embedding của Ollama
        self.embeddings = OllamaEmbeddings(model="nomic-embed-text")
        
        # Cấu hình các "chuyên gia"
        # Llama 3.2 cho logic, Gemma 2 cho ngôn ngữ tự nhiên
        self.expert_fb = ChatOllama(model="llama3.2", temperature=0)
        self.expert_google = ChatOllama(model="gemma2:2b", temperature=0.3) 
        self.router_ai = ChatOllama(model="llama3.2:1b", temperature=0)

        # 1. Định nghĩa PROMPT CHẤT LƯỢNG CAO (System Instruction)
        template = """Bạn là một chuyên gia phân tích tài liệu chuyên nghiệp. 
Hãy sử dụng thông tin từ ngữ cảnh (context) dưới đây để trả lời câu hỏi của người dùng.

YÊU CẦU BẮT BUỘC:
- Trả lời bằng TIẾNG VIỆT một cách rõ ràng, mạch lạc.
- Nếu thông tin không có trong tài liệu, hãy nói: "Xin lỗi, tài liệu không cung cấp thông tin này", không được tự ý bịa ra.
- Nếu câu hỏi liên quan đến số liệu hoặc bước thực hiện, hãy trình bày dạng danh sách cho dễ đọc.

NGỮ CẢNH (CONTEXT):
{context}

CÂU HỎI: 
{question}

CÂU TRẢ LỜI CỦA BẠN:"""

        self.QA_PROMPT = PromptTemplate(
            template=template, 
            input_variables=["context", "question"]
        )
        
        # Chuẩn bị cơ sở dữ liệu vector
        self.vector_db = self._prepare_data(pdf_path)

    def _prepare_data(self, path):
        print(f"--- Đang phân tích file: {path} ---")
        if not os.path.exists(path):
            raise FileNotFoundError(f"Không tìm thấy file: {path}")
            
        loader = PyPDFLoader(path)
        docs = loader.load()
        
        # Chia nhỏ văn bản (tối ưu cho tiếng Việt)
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=800, 
            chunk_overlap=100,
            separators=["\n\n", "\n", ".", " ", ""]
        )
        chunks = text_splitter.split_documents(docs)
        
        print(f"--- Đã nạp {len(chunks)} đoạn văn bản vào bộ nhớ tạm ---")
        return Chroma.from_documents(documents=chunks, embedding=self.embeddings)

    def route_question(self, query):
        # Prompt cho Trọng tài bằng tiếng Việt để tăng độ chính xác
        route_prompt = f"""Bạn là một trợ lý điều hướng. Nhiệm vụ của bạn là phân loại câu hỏi khách hàng.
Câu hỏi: '{query}'

Quy tắc:
- Nếu câu hỏi cần tính toán, so sánh số liệu, quy trình kỹ thuật: Trả lời 'FACEBOOK'.
- Nếu câu hỏi là chào hỏi, cảm xúc, hoặc hỏi về nội dung chung bằng tiếng Việt: Trả lời 'GOOGLE'.

Chỉ trả ra duy nhất một từ: FACEBOOK hoặc GOOGLE. Không giải thích gì thêm.
"""
        decision = self.router_ai.invoke(route_prompt).content.strip().upper()
        return "FACEBOOK" if "FACEBOOK" in decision else "GOOGLE"

    def ask(self, query):
        # 1. Trọng tài chọn model chuyên gia
        model_choice = self.route_question(query)
        selected_model = self.expert_fb if model_choice == "FACEBOOK" else self.expert_google
        
        print(f"--- [Router] Sử dụng Model: {model_choice} ---")

        # 2. Tạo Chain truy vấn với Prompt đã cấu hình
        qa_chain = RetrievalQA.from_chain_type(
            llm=selected_model,
            chain_type="stuff",
            retriever=self.vector_db.as_retriever(search_kwargs={"k": 3}),
            chain_type_kwargs={"prompt": self.QA_PROMPT} # Đưa Prompt tiếng Việt vào đây
        )

        # 3. Trực tiếp gọi invoke và lấy kết quả
        response = qa_chain.invoke({"query": query})
        return response["result"]

# --- Test hệ thống (Chỉ chạy khi chạy trực tiếp file này) ---
if __name__ == "__main__":
    # Đổi tên file phù hợp với file bạn có
    PDF_FILE = "data.pdf"
    if os.path.exists(PDF_FILE):
        rag = SmartRAGSystem(PDF_FILE)
        while True:
            q = input("\nHỏi: ")
            if q.lower() in ['exit', 'quit']: break
            print("\nĐáp:", rag.ask(q))
    else:
        print("Vui lòng chuẩn bị file data.pdf")