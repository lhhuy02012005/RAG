import os
import warnings
import shutil # Thêm thư viện để quản lý file

# Tạm ẩn các cảnh báo
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
        self.embeddings = OllamaEmbeddings(model="nomic-embed-text")
        
        # Khai báo model chuyên gia
        self.expert_fb = ChatOllama(model="llama3.2", temperature=0)
        self.expert_google = ChatOllama(model="gemma2:2b", temperature=0.3) 
        self.router_ai = ChatOllama(model="llama3.2:1b", temperature=0)

        # Prompt chất lượng cao
        template = """Bạn là một chuyên gia phân tích tài liệu chuyên nghiệp. 
Hãy sử dụng thông tin từ ngữ cảnh (context) dưới đây để trả lời câu hỏi của người dùng bằng tiếng Việt.

NGỮ CẢNH (CONTEXT):
{context}

CÂU HỎI: 
{question}

CÂU TRẢ LỜI CỦA BẠN (TIẾNG VIỆT):"""

        self.QA_PROMPT = PromptTemplate(template=template, input_variables=["context", "question"])
        
        # Xử lý dữ liệu (Có kiểm tra trùng lặp)
        self.vector_db = self._prepare_data(pdf_path)

    def _prepare_data(self, path):
        # Tạo tên thư mục lưu trữ dựa trên tên file (loại bỏ khoảng trắng)
        file_name = os.path.basename(path).replace(" ", "_")
        persist_directory = f"./chroma_db_{file_name}"

        # KIỂM TRA: Nếu đã có dữ liệu rồi thì LOAD luôn
        if os.path.exists(persist_directory):
            print(f"--- [Hệ thống] Tìm thấy dữ liệu cũ tại: {persist_directory}. Đang nạp... ---")
            return Chroma(
                persist_directory=persist_directory, 
                embedding_function=self.embeddings
            )
        
        # NẾU CHƯA CÓ: Mới tiến hành phân tích PDF
        print(f"--- [Hệ thống] Đang phân tích file mới: {path} ---")
        if not os.path.exists(path):
            raise FileNotFoundError(f"Không tìm thấy file: {path}")
            
        loader = PyPDFLoader(path)
        docs = loader.load()
        
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=800, 
            chunk_overlap=100,
            separators=["\n\n", "\n", ".", " ", ""]
        )
        chunks = text_splitter.split_documents(docs)
        
        print(f"--- [Hệ thống] Đang tạo Vector Database tại: {persist_directory} ---")
        
        # Tạo và lưu trữ database xuống ổ cứng
        vector_db = Chroma.from_documents(
            documents=chunks, 
            embedding=self.embeddings,
            persist_directory=persist_directory # Dòng quan trọng nhất
        )
        return vector_db

    def route_question(self, query):
        route_prompt = f"""Phân loại câu hỏi: '{query}'
        Nếu cần tính toán/kỹ thuật: 'FACEBOOK'
        Nếu là hội thoại/tiếng Việt: 'GOOGLE'
        Trả ra 1 từ duy nhất."""
        decision = self.router_ai.invoke(route_prompt).content.strip().upper()
        return "FACEBOOK" if "FACEBOOK" in decision else "GOOGLE"

    def ask(self, query):
        model_choice = self.route_question(query)
        selected_model = self.expert_fb if model_choice == "FACEBOOK" else self.expert_google
        
        qa_chain = RetrievalQA.from_chain_type(
            llm=selected_model,
            chain_type="stuff",
            retriever=self.vector_db.as_retriever(search_kwargs={"k": 3}),
            chain_type_kwargs={"prompt": self.QA_PROMPT}
        )

        response = qa_chain.invoke({"query": query})
        return response["result"]

if __name__ == "__main__":
    PDF_FILE = "data.pdf"
    if os.path.exists(PDF_FILE):
        rag = SmartRAGSystem(PDF_FILE)
        # ... chạy loop chat