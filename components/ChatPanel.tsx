import React, { useEffect, useRef, useState } from 'react';
import { Send, Loader2, Terminal, Activity, Paperclip, X } from 'lucide-react';

interface AgentPanelProps {
  input: string;
  setInput: (v: string) => void;
  onGenerate: (file?: File) => void;
  logs: string[];
  status: string;
}

export const AgentPanel: React.FC<AgentPanelProps> = ({ 
  input, setInput, onGenerate, logs, status 
}) => {
  const isBusy = status === 'generating' || status === 'upscaling';
  const logsEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = () => {
    onGenerate(selectedFile || undefined);
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 border-r border-slate-800">
      <div className="p-6 border-b border-slate-800 bg-slate-950">
        <h1 className="text-lg font-bold text-slate-100 flex items-center gap-2 font-mono tracking-tight">
          <Terminal size={20} className="text-emerald-500" />
          VECTOR<span className="text-emerald-500">AGENT</span>
        </h1>
        <div className="flex items-center gap-2 mt-2">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isBusy ? 'bg-emerald-400' : 'bg-slate-500'}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isBusy ? 'bg-emerald-500' : 'bg-slate-500'}`}></span>
            </span>
            <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold">
                {isBusy ? 'System Active' : 'System Idle'}
            </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-xs scrollbar-hide bg-slate-950/50">
        {logs.length === 0 && (
          <div className="text-slate-600 italic p-4 text-center border border-dashed border-slate-800 rounded-lg">
            Agent ready. <br/>Upload image to vectorise or enter prompt.
          </div>
        )}
        {logs.map((log, i) => (
          <div key={i} className="flex gap-3 text-emerald-500/90 animate-fade-in group">
            <span className="text-slate-700 select-none group-hover:text-emerald-500/50">[{new Date().toLocaleTimeString([], {hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit'})}]</span>
            <span className="flex-1 border-l-2 border-slate-800 pl-3 group-hover:border-emerald-500/30 transition-colors">
                {log.startsWith('Error') ? <span className="text-red-400">{log}</span> : log}
            </span>
          </div>
        ))}
        {isBusy && (
          <div className="flex gap-2 text-emerald-400 p-2 bg-emerald-500/5 rounded border border-emerald-500/10">
            <Activity size={14} className="animate-pulse" />
            <span className="animate-pulse">Processing task...</span>
          </div>
        )}
        <div ref={logsEndRef} />
      </div>

      <div className="p-4 bg-slate-950 border-t border-slate-800">
        {previewUrl && (
            <div className="mb-3 relative inline-block">
                <img src={previewUrl} alt="Upload Preview" className="h-16 w-16 object-cover rounded-lg border border-emerald-500/50" />
                <button onClick={clearFile} className="absolute -top-2 -right-2 bg-slate-800 text-white rounded-full p-1 border border-slate-600 hover:bg-red-900">
                    <X size={12} />
                </button>
            </div>
        )}

        <div className="relative">
            <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={selectedFile ? "Add instructions for this image..." : "Describe vector to create..."}
            className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl p-4 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 placeholder-slate-600 resize-none h-32 mb-3 font-sans transition-all pl-12"
            disabled={isBusy}
            />
            <div className="absolute top-4 left-4">
                 <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="text-slate-400 hover:text-emerald-400 transition-colors p-1 hover:bg-slate-800 rounded"
                    title="Upload Reference Image"
                    disabled={isBusy}
                 >
                    <Paperclip size={20} />
                 </button>
                 <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileSelect} 
                    className="hidden" 
                    accept="image/png, image/jpeg, image/jpg"
                 />
            </div>
            
            {input.length > 0 && (
                <div className="absolute bottom-16 right-3 text-xs text-slate-600 pointer-events-none">
                    {input.length} chars
                </div>
            )}
        </div>
        
        <button
          onClick={handleSubmit}
          disabled={isBusy}
          className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20 active:scale-[0.98]"
        >
          {isBusy ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          {selectedFile ? 'VECTORISE IMAGE' : (input.trim() ? 'GENERATE VECTOR' : 'I\'M FEELING LUCKY')}
        </button>
      </div>
    </div>
  );
};
