import React, { useEffect, useRef, useState } from 'react';
import { RefreshCw, Monitor, Tablet, Smartphone, Loader2 } from 'lucide-react';
import { FileSystem, File } from '../types';

interface PreviewWindowProps {
  files: FileSystem;
}

export const PreviewWindow: React.FC<PreviewWindowProps> = ({ files }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [key, setKey] = useState(0); // Force iframe reload

  // --- VIRTUAL BUNDLER LOGIC ---
  const assemblePreview = () => {
    // Cast to explicit File[] type to avoid 'unknown' type errors from Object.values
    const allFiles = Object.values(files) as File[];

    // 1. Priority: GenBuilder native 'preview.html' (Self-contained React)
    const nativePreview = allFiles.find(f => f.name.endsWith('preview.html'));
    if (nativePreview) return nativePreview.content;

    // 2. Fallback: Standard 'index.html' (Typical website)
    const indexFile = allFiles.find(f => f.name.endsWith('index.html'));
    
    if (indexFile) {
      let html = indexFile.content;

      // Inline CSS: Replace <link rel="stylesheet" href="style.css">
      html = html.replace(/<link[^>]+href=["']([^"']+)["'][^>]*>/g, (match, href) => {
        if (match.includes('stylesheet')) {
          const cssFile = files[href] || files[`css/${href}`] || allFiles.find(f => f.name.endsWith(href));
          if (cssFile) {
            return `<style>\n${cssFile.content}\n</style>`;
          }
        }
        return match;
      });

      // Inline JS: Replace <script src="script.js"></script>
      html = html.replace(/<script[^>]+src=["']([^"']+)["'][^>]*><\/script>/g, (match, src) => {
        const jsFile = files[src] || files[`js/${src}`] || allFiles.find(f => f.name.endsWith(src));
        if (jsFile) {
          return `<script>\n${jsFile.content}\n</script>`;
        }
        return match;
      });

      // Inline Images: Replace <img src="image.png">
      html = html.replace(/src=["']([^"']+)["']/g, (match, src) => {
        if (!src.startsWith('http') && !src.startsWith('data:')) {
           const imgFile = files[src] || files[`assets/${src}`] || files[`images/${src}`] || allFiles.find(f => f.name.endsWith(src));
           if (imgFile) {
             return `src="${imgFile.content}"`; // content is already data:image/... base64
           }
        }
        return match;
      });

      return html;
    }

    return null;
  };

  const previewContent = assemblePreview();

  const defaultContent = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>GenBuilder Preview</title>
        <style>
          body { background-color: #09090b; color: #71717a; font-family: system-ui, sans-serif; height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; margin: 0; }
        </style>
      </head>
      <body>
        <div style="text-align: center;">
          <h2 style="color: #e4e4e7; margin-bottom: 8px;">Waiting for Code</h2>
          <p>Import a ZIP or ask AI to build something.</p>
        </div>
      </body>
    </html>
  `;

  useEffect(() => {
    // Files changed, re-render
  }, [files]);

  const handleRefresh = () => {
    setKey(prev => prev + 1);
  };

  const getWidth = () => {
    switch(viewport) {
      case 'mobile': return '375px';
      case 'tablet': return '768px';
      default: return '100%';
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#18181b]">
      <div className="h-12 border-b border-gray-800 flex items-center justify-between px-4 bg-[#09090b]">
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-800 rounded-md p-0.5">
            <button
              onClick={() => setViewport('desktop')}
              className={`p-1.5 rounded ${viewport === 'desktop' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
              title="Desktop View"
            >
              <Monitor size={16} />
            </button>
            <button
              onClick={() => setViewport('tablet')}
              className={`p-1.5 rounded ${viewport === 'tablet' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
              title="Tablet View"
            >
              <Tablet size={16} />
            </button>
            <button
              onClick={() => setViewport('mobile')}
              className={`p-1.5 rounded ${viewport === 'mobile' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
              title="Mobile View"
            >
              <Smartphone size={16} />
            </button>
          </div>
          <span className="text-xs text-gray-500 ml-2 font-mono">
            {viewport === 'desktop' ? '100%' : viewport === 'tablet' ? '768px' : '375px'}
          </span>
        </div>
        <button 
          onClick={handleRefresh} 
          className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-800 rounded-full"
          title="Reload Preview"
        >
          <RefreshCw size={16} />
        </button>
      </div>
      
      <div className="flex-1 flex justify-center bg-[#18181b] overflow-hidden relative">
        <div 
          className="transition-all duration-300 ease-in-out h-full border-x border-gray-800 bg-white shadow-2xl"
          style={{ width: getWidth() }}
        >
          <iframe
            key={key}
            ref={iframeRef}
            srcDoc={previewContent || defaultContent}
            title="App Preview"
            className="w-full h-full border-none bg-white"
            sandbox="allow-scripts allow-modals allow-same-origin allow-forms"
          />
        </div>
      </div>
    </div>
  );
};