import React from 'react';
import { Copy, Tag, Type, FileText } from 'lucide-react';
import { ImageMetadata } from '../types';

interface MetadataSidebarProps {
  metadata: ImageMetadata | null;
}

export const MetadataSidebar: React.FC<MetadataSidebarProps> = ({ metadata }) => {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="h-full flex flex-col bg-slate-950 border-l border-slate-800 w-80">
      <div className="p-6 border-b border-slate-800">
        <h2 className="text-slate-200 font-bold text-sm tracking-wider flex items-center gap-2 uppercase">
          <FileText size={16} className="text-emerald-500" /> 
          Asset Metadata
        </h2>
        <p className="text-xs text-slate-500 mt-1">Ready for Adobe Stock / Shutterstock</p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-thin">
        {!metadata ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-700 text-xs font-mono text-center border-2 border-dashed border-slate-800/50 rounded-xl">
            <span>NO DATA GENERATED</span>
          </div>
        ) : (
          <>
            <div className="animate-slide-up">
              <div className="flex items-center justify-between mb-3">
                <span className="text-emerald-400 text-xs font-bold uppercase flex items-center gap-2">
                  <Type size={12} /> Suggested Titles
                </span>
              </div>
              <div className="space-y-2">
                {metadata.titles.map((title, i) => (
                  <div key={i} className="group relative">
                    <div className="bg-slate-900 hover:bg-slate-800 p-3 rounded-lg text-xs text-slate-300 border border-slate-800 transition-colors pr-8">
                      {title}
                    </div>
                    <button 
                      onClick={() => copyToClipboard(title)}
                      className="absolute right-2 top-2 p-1 text-slate-600 hover:text-emerald-400 transition-colors"
                      title="Copy"
                    >
                      <Copy size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="animate-slide-up" style={{animationDelay: '100ms'}}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-emerald-400 text-xs font-bold uppercase flex items-center gap-2">
                  <Tag size={12} /> Keywords ({metadata.keywords.length})
                </span>
                <button 
                  onClick={() => copyToClipboard(metadata.keywords.join(', '))}
                  className="text-[10px] bg-slate-800 hover:bg-emerald-900/50 text-emerald-400 px-2 py-1 rounded transition-colors border border-slate-700 hover:border-emerald-500/30"
                >
                  COPY ALL
                </button>
              </div>
              <div className="bg-slate-900 p-4 rounded-xl text-xs text-slate-400 border border-slate-800 leading-loose">
                {metadata.keywords.map((kw, i) => (
                    <span key={i} className="inline-block hover:text-emerald-300 transition-colors cursor-default">
                        {kw}{i < metadata.keywords.length - 1 ? ', ' : ''}
                    </span>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
