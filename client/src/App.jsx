
import React, { useState } from 'react';
import axios from 'axios';

const BACKENDURL = import.meta.env.VITE_API_URL;

function ChatPDF() {
  const [file, setFile] = useState(null);
  const [userQuery, setUserQuery] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !userQuery) {
      alert("Please select a PDF and enter a query!");
      return;
    }
    const formData = new FormData();
    formData.append("pdf", file);       
    formData.append("userQuery", userQuery); 

    try {
      setLoading(true);
      
      const res = await axios.post(`${BACKENDURL}/upload`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setAnswer(res.data); 
    } catch (error) {
      console.error("Error uploading file:", error);
      alert("Something went wrong!");
    } finally {
      setLoading(false);
    }
  };
return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
      

      <aside className="w-80 border-r border-slate-800/60 bg-slate-900/30 backdrop-blur-2xl p-6 flex-col justify-between hidden md:flex">
        <div>
          <h2 className="text-xl font-bold bg-linear-to-r from-blue-400 via-indigo-400 to-purple-500 bg-clip-text text-transparent mb-6">
            RAG PDF Assistant
          </h2>
          
          <div className="border border-slate-700/50 hover:border-blue-500/50 rounded-2xl p-6 text-center cursor-pointer transition bg-slate-900/40 backdrop-blur-md shadow-inner">
            <p className="text-sm text-slate-300 font-medium">Upload your PDF document</p>
            <span className="text-xs text-slate-500 mt-1 block">Connected to Qdrant & Gemini</span>
          </div>
        </div>

        <div className="text-xs text-slate-500 text-center bg-slate-900/20 py-3 rounded-xl border border-slate-800/40">
          Status: Ready to chat 🚀
        </div>
      </aside>

 
      <main className="flex-1 flex flex-col bg-slate-950 relative">
        
        {/* Header */}
        <header className="h-16 border-b border-slate-800/60 bg-slate-900/20 backdrop-blur-xl flex items-center px-6 justify-between">
          <span className="text-sm font-medium text-slate-400">
            Document Intelligence <span className="text-blue-400 font-semibold">Active</span>
          </span>
        </header>

 
        <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-4xl w-full mx-auto">

          <div className="flex items-start space-x-3">
            <div className="h-9 w-9 rounded-xl bg-linear-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-sm shadow-lg shadow-blue-500/20">AI</div>
            <div className="bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl rounded-2xl p-4 max-w-xl text-sm text-slate-200 leading-relaxed shadow-xl">
              Hello! Upload a PDF file below, type your question, and get instant answers from your document context.
            </div>
          </div>


          {answer && (
            <div className="flex items-start space-x-3">
              <div className="h-9 w-9 rounded-xl bg-linear-to-tr from-emerald-600 to-teal-600 flex items-center justify-center font-bold text-sm shadow-lg shadow-emerald-500/20">Ans</div>
              <div className="bg-slate-900/80 border border-emerald-500/30 backdrop-blur-xl rounded-2xl p-5 max-w-2xl text-sm text-slate-100 leading-relaxed shadow-2xl">
                {answer}
              </div>
            </div>
          )}

        </div>

        <div className="p-6 border-t border-slate-800/60 bg-slate-900/30 backdrop-blur-2xl">
          <form onSubmit={handleSubmit} className="flex flex-col md:flex-row items-center gap-3 max-w-4xl mx-auto">
            
            <input 
              type="file" 
              accept="application/pdf" 
              onChange={(e) => setFile(e.target.files[0])}
              className="w-full md:w-auto text-xs text-slate-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-600/20 file:text-blue-400 hover:file:bg-blue-600/30 cursor-pointer bg-slate-900/60 border border-slate-800/80 rounded-xl p-1"
            />

            <input 
              type="text" 
              placeholder="Ask a question about your PDF..." 
              value={userQuery} 
              onChange={(e) => setUserQuery(e.target.value)}
              className="flex-1 w-full bg-slate-900/80 border border-slate-800/80 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-blue-500/80 transition shadow-inner placeholder-slate-500"
            />

            <button 
              type="submit" 
              disabled={loading}
              className="w-full md:w-auto bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-6 py-3 rounded-xl text-sm font-medium transition shadow-lg shadow-blue-600/25 disabled:opacity-50 cursor-pointer"
            >
              {loading ? "Analyzing..." : "Ask AI"}
            </button>
          </form>
        </div>

      </main>
    </div>
  );
}
export default ChatPDF;