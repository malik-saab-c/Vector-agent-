import React from 'react';
import { VectorImage, AgentState } from '../types';
import { Download, RefreshCw, CheckCircle, Image as ImageIcon, Sparkles, Wand2, Maximize, AlertCircle, FileImage } from 'lucide-react';

interface ResultsViewProps {
  state: AgentState;
  onSelect: (img: VectorImage) => void;
  onRegenerate: () => void;
  onDownloadSVG: () => void;
  onDownloadEPS: () => void;
  onDownloadJPG: () => void;
}

export const ResultsView: React.FC<ResultsViewProps> = ({ 
  state, onSelect, onRegenerate, onDownloadSVG, onDownloadEPS, onDownloadJPG
}) => {
  const { candidates, selectedImage, status, upscaledBlob } = state;

  // IDLE STATE
  if (status === 'idle') {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-slate-950 relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 -left-4 w-72 h-72 bg-emerald-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
            <div className="absolute top-0 -right-4 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
            <div className="absolute -bottom-8 left-20 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
        </div>
        
        <div className="z-10 text-center p-10 border border-slate-800 rounded-3xl bg-slate-900/60 backdrop-blur-xl shadow-2xl max-w-md mx-4">
          <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/20">
             <Wand2 size={40} className="text-emerald-400" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-3 tracking-tight">SpectraGAN <span className="text-emerald-500">v4.0</span></h2>
          <p className="text-slate-400 font-light text-lg leading-relaxed">
            The ultimate AI Vector Engine.
            <br/>
            <span className="text-sm text-slate-500">Upload a sketch or describe your idea to generate commercial-grade SVG/EPS assets.</span>
          </p>
        </div>
      </div>
    );
  }

  // ERROR STATE
  if (status === 'error') {
      return (
        <div className="h-full flex flex-col items-center justify-center bg-slate-950 p-8">
            <div className="bg-red-950/30 border border-red-900/50 p-8 rounded-2xl text-center max-w-md">
                <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-red-200 mb-2">Generation Failed</h3>
                <p className="text-red-400/80 mb-6">The AI could not process your request. This usually happens if the safety filters are triggered or the prompt was too vague.</p>
                <button 
                    onClick={onRegenerate}
                    className="bg-red-900/50 hover:bg-red-800 text-red-100 px-6 py-3 rounded-xl transition-colors font-medium border border-red-700/50"
                >
                    Try Again
                </button>
            </div>
        </div>
      );
  }

  // COMPLETED (UPSCALED) VIEW
  if (status === 'complete' && selectedImage && upscaledBlob) {
    const upscaledUrl = URL.createObjectURL(upscaledBlob);
    return (
      <div className="h-full flex flex-col p-8 overflow-y-auto bg-slate-950 scrollbar-thin">
        <div className="flex items-center justify-between mb-8 max-w-5xl mx-auto w-full">
           <div>
             <h2 className="text-emerald-400 font-bold text-3xl flex items-center gap-3 tracking-tight">
               <CheckCircle size={32} className="text-emerald-500" /> 
               Vector Asset Ready
             </h2>
             <p className="text-slate-400 mt-2 font-light">
                High-fidelity upscale complete. Ready for Adobe Illustrator.
             </p>
           </div>
           <button 
             onClick={onRegenerate}
             className="flex items-center gap-2 px-6 py-3 text-sm font-medium text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all border border-slate-800 shadow-lg"
           >
             <RefreshCw size={18} /> Generate New
           </button>
        </div>

        {/* Hero Image Container */}
        <div className="flex-1 flex items-center justify-center w-full max-w-5xl mx-auto mb-8">
            <div className="bg-[#ffffff] rounded-xl border border-slate-800 shadow-2xl p-8 relative overflow-hidden group w-full flex justify-center items-center min-h-[500px]">
                {/* Transparency Grid Background for the white canvas area */}
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/grid-me.png')] opacity-10"></div>
                
                <img 
                    src={upscaledUrl} 
                    alt="Upscaled Result" 
                    className="max-h-[60vh] object-contain z-10 drop-shadow-2xl"
                />
                
                <div className="absolute top-4 right-4 flex gap-2">
                     <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-xs font-bold border border-emerald-200 shadow-sm">
                        2X UPSCALE
                     </span>
                     <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-bold border border-blue-200 shadow-sm">
                        PREMIUM VECTOR
                     </span>
                </div>
            </div>
        </div>

        {/* Action Buttons */}
        <div className="max-w-3xl mx-auto w-full pb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            
            {/* SVG Button */}
            <button 
                onClick={onDownloadSVG}
                className="group relative flex items-center justify-center gap-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 px-6 rounded-2xl transition-all shadow-xl hover:shadow-emerald-500/20 active:scale-95 border-b-4 border-emerald-800 active:border-b-0 active:translate-y-1 h-24"
            >
                <Download size={22} className="group-hover:-translate-y-1 transition-transform" />
                <div className="text-left">
                    <div className="text-xs font-medium opacity-80">Web Format</div>
                    <div className="text-lg">Scalable SVG</div>
                </div>
            </button>

            {/* Stock Group */}
            <div className="flex gap-4">
                <button 
                    onClick={onDownloadEPS}
                    className="flex-1 group relative flex flex-col items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-bold py-4 px-4 rounded-2xl transition-all shadow-xl hover:shadow-slate-500/10 active:scale-95 border-b-4 border-slate-900 active:border-b-0 active:translate-y-1 border border-slate-700 h-24"
                >
                    <Download size={20} className="text-orange-400 group-hover:-translate-y-1 transition-transform" />
                    <div className="text-center">
                        <div className="text-lg text-orange-400">EPS</div>
                        <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Vector</div>
                    </div>
                </button>
                <button 
                    onClick={onDownloadJPG}
                    className="flex-1 group relative flex flex-col items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-bold py-4 px-4 rounded-2xl transition-all shadow-xl hover:shadow-slate-500/10 active:scale-95 border-b-4 border-slate-900 active:border-b-0 active:translate-y-1 border border-slate-700 h-24"
                >
                    <FileImage size={20} className="text-blue-400 group-hover:-translate-y-1 transition-transform" />
                    <div className="text-center">
                        <div className="text-lg text-blue-400">JPG</div>
                        <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Preview</div>
                    </div>
                </button>
            </div>
          </div>
          
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3 text-center">
             <p className="text-slate-400 text-xs flex items-center justify-center gap-2">
                <AlertCircle size={12} className="text-orange-400" />
                <strong>Adobe Stock Tip:</strong> Download both EPS & JPG, then select both files to upload together.
             </p>
          </div>
        </div>
      </div>
    );
  }

  // SELECTION VIEW (CANDIDATES)
  return (
    <div className="h-full flex flex-col p-8 bg-slate-950 overflow-y-auto">
      <div className="flex items-center justify-between mb-8 max-w-6xl mx-auto w-full">
        <div>
           <h2 className="text-white font-bold text-3xl flex items-center gap-3 tracking-tight">
             {status === 'generating' ? (
                <>
                  <div className="relative">
                     <Sparkles className="animate-spin-slow text-emerald-400" size={32} />
                     <div className="absolute inset-0 animate-ping opacity-50 bg-emerald-500 rounded-full blur-lg"></div>
                  </div>
                  Dreaming Vectors...
                </>
             ) : (
                <>
                   <ImageIcon className="text-emerald-400" size={32} />
                   Select Variant
                </>
             )}
           </h2>
           <p className="text-slate-400 text-lg mt-2 font-light">
             {status === 'generating' ? 'Analyzing trends & generating 3 unique concepts...' : 'Choose the best concept to finalize.'}
           </p>
        </div>
        
        {status === 'review' && (
          <button 
            onClick={onRegenerate}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-200 rounded-xl border border-slate-700 transition-all hover:border-emerald-500/50"
          >
            <RefreshCw size={18} /> Regenerate
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1 content-start max-w-6xl mx-auto w-full pb-8">
        {candidates.map((img, idx) => (
          <div 
            key={img.id}
            onClick={() => status === 'review' && onSelect(img)}
            className={`
              relative aspect-square rounded-3xl overflow-hidden cursor-pointer transition-all duration-500 group shadow-2xl bg-slate-900
              ${status === 'upscaling' && selectedImage?.id === img.id ? 'ring-4 ring-emerald-500 scale-100 z-10 opacity-100' : 'hover:-translate-y-2 hover:shadow-emerald-900/20'}
              ${status === 'upscaling' && selectedImage?.id !== img.id ? 'opacity-30 grayscale scale-95 pointer-events-none blur-sm' : ''}
              border border-slate-800
            `}
          >
            {/* Image */}
            <img 
              src={`data:${img.mimeType};base64,${img.data}`} 
              className="w-full h-full object-cover"
              alt={`Variant ${idx + 1}`} 
            />
            
            {/* Prompt Label Overlay */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-950/95 via-slate-950/80 to-transparent p-6 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
               <p className="text-white text-sm font-medium line-clamp-2">{img.prompt}</p>
               <div className="flex items-center gap-2 mt-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                  Click to Upscale <Maximize size={12} />
               </div>
            </div>
            
            {/* Selection/Upscaling Overlay */}
            {status === 'upscaling' && selectedImage?.id === img.id && (
               <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center backdrop-blur-sm">
                 <div className="relative mb-6">
                    <div className="w-20 h-20 border-4 border-slate-700 rounded-full"></div>
                    <div className="w-20 h-20 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
                    <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-emerald-400 animate-pulse" />
                 </div>
                 <span className="text-white font-bold text-xl tracking-wide">UPSCALING...</span>
                 <span className="text-emerald-500 text-sm font-mono mt-2">2048 x 2048px Processing</span>
               </div>
            )}
          </div>
        ))}
        
        {/* Loading Placeholders */}
        {candidates.length === 0 && status === 'generating' && (
           [0, 1, 2].map(i => (
             <div key={i} className="aspect-square bg-slate-900 rounded-3xl border border-slate-800 relative overflow-hidden flex flex-col items-center justify-center group">
                {/* Shimmer Effect */}
                <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-slate-800/30 to-transparent"></div>
                
                <div className="z-10 text-center p-6 opacity-60">
                   <div className="mb-4 relative mx-auto w-12 h-12">
                      <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping"></div>
                      <Sparkles className="relative z-10 text-emerald-500 w-12 h-12" />
                   </div>
                   <span className="text-sm font-mono text-slate-400 block uppercase tracking-widest mb-2">Generating Variant {i+1}</span>
                   <div className="h-1 w-24 bg-slate-800 rounded-full mx-auto overflow-hidden">
                      <div className="h-full bg-emerald-500/50 w-full animate-progress-indeterminate"></div>
                   </div>
                </div>
             </div>
           ))
        )}
      </div>
    </div>
  );
};