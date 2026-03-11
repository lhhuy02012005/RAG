import React, { useState, useRef, useEffect } from "react";
import { Send, FileUp, User, Bot, Loader2, Plus, MessageSquare, Trash2, Globe, Cpu } from "lucide-react";

const App = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [fileName, setFileName] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setIsUploading(true);
    const isImage = file.type.startsWith('image/');
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("http://localhost:8000/upload", { method: "POST", body: formData });
      const data = await res.json();
      
      if (data.status === "success") {
        setFileName(file.name);
        // Thông báo linh hoạt theo loại file
        const welcomeMsg = isImage 
          ? `Hệ thống đã sẵn sàng phân tích hình ảnh: ${file.name}`
          : `Hệ thống đã sẵn sàng với tài liệu: ${file.name}`;
          
        setMessages(prev => [...prev, { role: "system", content: welcomeMsg }]);
      }
    } catch (error) {
      console.error("Upload error:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg = input;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setIsLoading(true);

    try {
      const response = await fetch(`http://localhost:8000/chat?query=${encodeURIComponent(userMsg)}`);
      const data = await response.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.answer || data.error }]);
    } catch (error) {
      setMessages((prev) => [...prev, { role: "assistant", content: "Mất kết nối với máy chủ AI." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#212121] text-[#ececec] font-sans overflow-hidden">
      {/* SIDEBAR - Giữ nguyên */}
      <aside className="w-[260px] bg-[#171717] flex flex-col h-full border-r border-white/10 hidden md:flex">
        <div className="p-3">
          <button className="w-full flex items-center gap-3 px-3 py-3 text-sm rounded-lg border border-white/20 hover:bg-white/5 transition-all mb-2 shadow-sm">
            <Plus size={16} /> New chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-3 space-y-2">
            <div className="text-[11px] font-bold text-gray-500 px-3 mt-4 mb-2 uppercase text-center tracking-widest opacity-50 italic">AI Multimodal System</div>
        </div>
      </aside>

      {/* CHAT AREA */}
      <main className="flex-1 flex flex-col relative h-full">
        <header className="h-14 border-b border-white/10 flex items-center justify-between px-6 bg-[#212121]/80 backdrop-blur-sm z-20">
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-200 tracking-tight tracking-widest uppercase text-sm">Smart AI v2.0</span>
            <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-gray-400">VISION + RAG</span>
          </div>
          {fileName && (
            <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              {fileName}
            </div>
          )}
        </header>

        <div className="flex-1 overflow-y-auto pt-4 space-y-0 pb-40 scroll-smooth custom-scrollbar">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-40 select-none animate-in fade-in duration-700">
              <Bot size={60} strokeWidth={1} className="mb-4 text-emerald-500" />
              <h2 className="text-xl font-medium tracking-tight">Hệ thống AI đa năng</h2>
              <p className="text-sm mt-2 font-light">Tải lên Ảnh, PDF hoặc Word để bắt đầu</p>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div key={idx} className={`w-full py-8 border-b border-white/5 ${msg.role === "assistant" ? "bg-[#2f2f2f]/30" : msg.role === "system" ? "bg-indigo-500/5" : ""}`}>
                <div className="max-w-3xl mx-auto flex gap-6 px-4">
                  <div className={`w-8 h-8 rounded-sm flex items-center justify-center shrink-0 shadow-sm ${msg.role === "user" ? "bg-indigo-600 shadow-indigo-500/20" : "bg-[#10a37f] shadow-emerald-500/20"}`}>
                    {msg.role === "user" ? <User size={18} /> : <Bot size={18} />}
                  </div>
                  <div className="flex-1 space-y-2">
                    <p className="font-bold text-[10px] uppercase tracking-[0.2em] text-gray-500">
                      {msg.role === "user" ? "Bạn" : msg.role === "system" ? "Hệ thống" : "Smart AI"}
                    </p>
                    <div className={`prose prose-invert max-w-none text-[15px] leading-relaxed whitespace-pre-wrap ${msg.role === 'system' ? 'text-indigo-400 italic font-light' : 'text-gray-200'}`}>
                      {msg.content}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
          {isLoading && (
            <div className="w-full py-8 bg-[#2f2f2f]/30 border-b border-white/5">
              <div className="max-w-3xl mx-auto flex gap-6 px-4 items-center">
                <div className="w-8 h-8 rounded-sm bg-[#10a37f] flex items-center justify-center shrink-0"><Loader2 className="animate-spin text-white" size={18} /></div>
                <span className="text-sm text-gray-400 animate-pulse font-medium italic">AI đang phân tích dữ liệu...</span>
              </div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>

        {/* INPUT AREA */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#212121] via-[#212121] to-transparent pt-10 pb-6 px-4">
          <div className="max-w-3xl mx-auto relative group">
            {isUploading && (
              <div className="absolute -top-12 left-0 right-0 flex justify-center">
                <div className="bg-indigo-600 text-white text-[10px] px-3 py-1 rounded-md animate-bounce shadow-[0_4px_15px_rgba(79,70,229,0.4)]">
                   Đang xử lý dữ liệu...
                </div>
              </div>
            )}

            <div className="flex flex-col bg-[#2f2f2f] border border-white/10 rounded-2xl shadow-2xl focus-within:border-white/30 transition-all overflow-hidden px-2 py-2 backdrop-blur-sm">
              <textarea
                rows="1"
                className="w-full bg-transparent border-none focus:outline-none text-white resize-none py-3 px-4 text-[15px] placeholder-gray-500 font-light"
                placeholder="Hỏi bất cứ điều gì..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSend())}
              />
              <div className="flex items-center justify-between px-2 pb-1">
                <div className="flex items-center gap-1">
                  <label className="cursor-pointer text-gray-400 hover:text-white hover:bg-white/10 p-2 rounded-lg transition-all relative group-item">
                    <FileUp size={18} />
                    <input type="file" className="hidden" onChange={handleUpload} accept=".pdf,.docx,.doc,.txt,.png,.jpg,.jpeg" />
                  </label>
                  <button className="text-gray-400 hover:text-white hover:bg-white/10 p-2 rounded-lg transition-all"><Globe size={18} /></button>
                  <button className="text-gray-400 hover:text-white hover:bg-white/10 p-2 rounded-lg transition-all"><Cpu size={18} /></button>
                </div>
                <button onClick={handleSend} disabled={!input.trim() || isLoading} className={`p-2 rounded-xl transition-all ${input.trim() ? "bg-white text-black hover:scale-105" : "bg-gray-700 text-gray-500 cursor-not-allowed"}`}>
                  <Send size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;