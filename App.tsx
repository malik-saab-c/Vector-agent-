import React, { useState } from 'react';
import { AgentPanel } from './components/ChatPanel';
import { ResultsView } from './components/PreviewWindow';
import { MetadataSidebar } from './components/FileExplorer';
import { AgentState, VectorImage } from './types';
import { generateVectorCandidates, generateImageMetadata, upscaleImageService, generateRealEPS, convertToJPG } from './services/geminiService';

const App = () => {
  const [input, setInput] = useState('');
  const [state, setState] = useState<AgentState>({
    status: 'idle',
    logs: [],
    candidates: [],
    selectedImage: null,
    upscaledBlob: null,
    metadata: null
  });

  const addLog = (msg: string) => {
    setState(prev => ({ ...prev, logs: [...prev.logs, msg] }));
  };

  const handleGenerate = async (file?: File) => {
    // 1. Initial State Setup
    setState(prev => ({ 
      ...prev, 
      status: 'generating', 
      logs: [
          'INITIALIZING SPECTRA-GAN ENGINE...',
          'Loading Gemini 2.5 Flash Image Model...',
          file ? `MODE: VECTOR TRACING (Source: ${file.name})` : `MODE: CREATIVE GENERATION`,
      ],
      candidates: [],
      selectedImage: null,
      upscaledBlob: null,
      metadata: null
    }));

    let base64Image: string | undefined;

    // 2. Handle File Upload (if any)
    if (file) {
        addLog(`Processing input image...`);
        try {
            base64Image = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target?.result as string);
                reader.readAsDataURL(file);
            });
        } catch (e) {
            addLog("Error reading file.");
            setState(prev => ({ ...prev, status: 'error' }));
            return;
        }
    }

    // 3. Prompt Logic Logging
    if (!file && !input.trim()) {
        addLog('Input empty. Using random high-demand concept...');
    } else if (input.trim()) {
         addLog(`Analyzing prompt: "${input}"`);
         addLog('Optimizing for Adobe Stock quality...');
    }

    try {
      // 4. Call Service
      const candidates = await generateVectorCandidates(input, base64Image);
      
      if (candidates.length === 0) {
        throw new Error("No valid candidates generated. Safety filter may have triggered.");
      }

      // 5. Success State
      setState(prev => ({ 
        ...prev, 
        status: 'review', 
        candidates, 
        logs: [
            ...prev.logs, 
            'Rendering complete.', 
            `Generated 1 Premium Variant.`, 
            'Waiting for user selection...'
        ] 
      }));

    } catch (e: any) {
      console.error(e);
      addLog(`CRITICAL ERROR: ${e.message || "Generation failed"}`);
      setState(prev => ({ ...prev, status: 'error', logs: [...prev.logs, 'Process terminated.'] }));
    }
  };

  const handleSelect = async (img: VectorImage) => {
    setState(prev => ({ 
      ...prev, 
      selectedImage: img, 
      status: 'upscaling',
      logs: [
          ...prev.logs, 
          `User selected Variant`, 
          'Initiating 2x Smart Upscale Protocol...',
          'Generating SEO Metadata (Pollinations AI)...'
      ]
    }));

    try {
      // Parallel execution: Upscale AND Metadata
      const upscalePromise = upscaleImageService(img.data, img.mimeType);
      const metadataPromise = generateImageMetadata(img.data, img.mimeType);
      
      const [upscaledBlob, metadata] = await Promise.all([upscalePromise, metadataPromise]);

      setState(prev => ({
        ...prev,
        status: 'complete',
        upscaledBlob,
        metadata,
        logs: [
            ...prev.logs, 
            'Upscale successful (2048px).', 
            'SEO Metadata generated.', 
            'Ready for download.',
            'Task Complete.'
        ]
      }));

    } catch (e) {
      console.error(e);
      addLog('Error during post-processing.');
      setState(prev => ({ ...prev, status: 'error' }));
    }
  };

  const handleDownloadSVG = () => {
    if (!state.upscaledBlob) return;
    addLog("Downloading SVG...");
    const reader = new FileReader();
    reader.readAsDataURL(state.upscaledBlob);
    reader.onloadend = () => {
      const base64data = reader.result as string;
      const img = new Image();
      img.onload = () => {
          const width = img.width;
          const height = img.height;
          
          const svgContent = `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <desc>SpectraGAN AI Vector</desc>
  <image href="${base64data}" height="${height}" width="${width}" />
</svg>`.trim();

          const blob = new Blob([svgContent], { type: 'image/svg+xml' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `spectragan-${state.selectedImage?.id || Date.now()}.svg`;
          a.click();
          URL.revokeObjectURL(url);
          addLog("SVG Downloaded.");
      };
      img.src = base64data;
    };
  };

  const handleDownloadEPS = async () => {
     if (!state.upscaledBlob || !state.selectedImage) return;
     addLog("Generating EPS (Standard)...");
     
     try {
         const baseName = `spectragan-${state.selectedImage.id}`;
         const epsBlob = await generateRealEPS(state.upscaledBlob);
         
         const url = URL.createObjectURL(epsBlob);
         const a = document.createElement('a');
         a.href = url;
         a.download = `${baseName}.eps`;
         a.click();
         URL.revokeObjectURL(url);
         addLog("EPS Downloaded.");
     } catch (e) {
         console.error(e);
         addLog("Error creating EPS.");
     }
  };

  const handleDownloadJPG = async () => {
     if (!state.upscaledBlob || !state.selectedImage) return;
     addLog("Enhancing JPG (5000px | 25MP) for Stock...");
     
     try {
         const baseName = `spectragan-${state.selectedImage.id}`;
         const jpgBlob = await convertToJPG(state.upscaledBlob);
         
         const url = URL.createObjectURL(jpgBlob);
         const a = document.createElement('a');
         a.href = url;
         a.download = `${baseName}.jpg`;
         a.click();
         URL.revokeObjectURL(url);
         addLog("High-Res JPG Downloaded.");
     } catch (e) {
         console.error(e);
         addLog("Error creating JPG.");
     }
  };

  return (
    <div className="flex h-screen w-screen bg-[#020617] text-white overflow-hidden font-sans">
      <div className="w-[350px] flex-shrink-0 z-20 shadow-2xl shadow-green-900/10">
        <AgentPanel 
          input={input} 
          setInput={setInput} 
          onGenerate={handleGenerate} 
          logs={state.logs}
          status={state.status}
        />
      </div>

      <div className="flex-1 flex flex-col min-w-0 bg-[#050b1d] relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-50"></div>
        <ResultsView 
          state={state}
          onSelect={handleSelect}
          onRegenerate={() => handleGenerate()}
          onDownloadSVG={handleDownloadSVG}
          onDownloadEPS={handleDownloadEPS}
          onDownloadJPG={handleDownloadJPG}
        />
      </div>

      <div className="w-80 flex-shrink-0 border-l border-green-900/30">
        <MetadataSidebar metadata={state.metadata} />
      </div>
    </div>
  );
};

export default App;