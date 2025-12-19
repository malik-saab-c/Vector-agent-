import React, { useState } from 'react';
import { ChatPanel } from './components/ChatPanel';
import { FileExplorer } from './components/FileExplorer';
import { PreviewWindow } from './components/PreviewWindow';
import { CodeEditor } from './components/CodeEditor';
import { FileSystem, Message, ViewMode, Attachment } from './types';
import { generateProjectCode } from './services/geminiService';
import { Eye, Code2 } from 'lucide-react';

const App = () => {
  const [files, setFiles] = useState<FileSystem>({});
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('preview');

  const handleSendMessage = async (content: string, attachment?: Attachment) => {
    // Add user message
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      attachment,
      timestamp: Date.now(),
    };
    
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      // Call Gemini API with optional attachment
      const result = await generateProjectCode(content, files, messages, attachment);
      
      // Update File System - Incremental Merge
      const updatedFiles = { ...files };
      const changedFileNames: string[] = [];
      
      // Mark old files as not new
      Object.keys(updatedFiles).forEach(k => {
        updatedFiles[k].isNew = false;
      });

      if (result.files && Array.isArray(result.files)) {
        result.files.forEach((file: any) => {
          updatedFiles[file.name] = {
            name: file.name,
            content: file.content,
            language: file.language,
            isNew: true
          };
          // We only list visible source files in the "Generated Files" list (exclude preview.html usually)
          if (!file.name.includes('preview.html')) {
            changedFileNames.push(file.name);
          }
        });
      }
      
      setFiles(updatedFiles);

      // Add AI Response with Structured Data
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.summary || "Project updated.",
        buildSteps: result.buildSteps || ["Building project..."],
        fileChanges: changedFileNames,
        previewSnapshot: result.previewSnapshot,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, aiMsg]);

    } catch (error) {
      console.error(error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'system',
        content: "System Error: Failed to generate build. Please try again.",
        timestamp: Date.now(),
        isError: true
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (fileName: string) => {
    setSelectedFile(fileName);
    // Optional: Switch to code view automatically if user clicks a file
    // setViewMode('code');
  };

  const handleDownloadZip = async () => {
    const JSZip = (window as any).JSZip;
    if (!JSZip) {
      alert("ZIP library not ready.");
      return;
    }
    const zip = new JSZip();
    
    Object.keys(files).forEach(fileName => {
      // Decode Base64 for binary files if needed, or JSZip handles base64 strings if configured
      const file = files[fileName];
      if (file.content.startsWith('data:')) {
          // It's a data URI, extract base64
          const base64Data = file.content.split(',')[1];
          zip.file(fileName, base64Data, { base64: true });
      } else {
          zip.file(fileName, file.content);
      }
    });
    
    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    const a = document.createElement("a");
    a.href = url;
    a.download = "genbuilder-project.zip";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportZip = async (file: File) => {
    const JSZip = (window as any).JSZip;
    if (!JSZip) {
      alert("ZIP library not ready.");
      return;
    }
    
    try {
      const zip = new JSZip();
      const zipContent = await zip.loadAsync(file);
      const newFiles: FileSystem = {};
      const promises: Promise<void>[] = [];
      
      // Helper to determine mime type
      const getMimeType = (filename: string) => {
          const ext = filename.split('.').pop()?.toLowerCase();
          if (ext === 'png') return 'image/png';
          if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
          if (ext === 'svg') return 'image/svg+xml';
          if (ext === 'mp3') return 'audio/mpeg';
          if (ext === 'wav') return 'audio/wav';
          return null;
      };

      zipContent.forEach((relativePath: string, zipEntry: any) => {
        if (zipEntry.dir) return;
        if (relativePath.includes('__MACOSX') || relativePath.includes('.DS_Store')) return;

        const ext = relativePath.split('.').pop()?.toLowerCase();
        const mimeType = getMimeType(relativePath);

        if (mimeType) {
            // Handle Binary Files (Images/Audio)
            promises.push(
                zipEntry.async("base64").then((base64: string) => {
                    newFiles[relativePath] = {
                        name: relativePath,
                        content: `data:${mimeType};base64,${base64}`,
                        language: 'binary',
                        isNew: false
                    };
                })
            );
        } else if (['ts', 'tsx', 'js', 'jsx', 'html', 'css', 'json', 'md', 'txt'].includes(ext || '')) {
           // Handle Text Files
           promises.push(
             zipEntry.async("string").then((content: string) => {
               newFiles[relativePath] = {
                 name: relativePath,
                 content: content,
                 language: ext === 'ts' || ext === 'tsx' ? 'typescript' : 
                           ext === 'js' || ext === 'jsx' ? 'javascript' : 
                           ext === 'html' ? 'html' : 
                           ext === 'css' ? 'css' : 'plaintext',
                 isNew: false
               };
             })
           );
        }
      });
      
      await Promise.all(promises);
      
      setFiles(newFiles);
      
      const hasPreview = Object.keys(newFiles).some(k => k.endsWith('preview.html'));
      const hasIndex = Object.keys(newFiles).some(k => k.endsWith('index.html'));

      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'system',
        content: `Project imported: ${file.name}. ${hasPreview || hasIndex ? "Preview should be visible." : "No index.html found - preview might be empty."}`,
        timestamp: Date.now()
      }]);

    } catch (e) {
      console.error("Failed to import zip", e);
      alert("Invalid ZIP file or structure.");
    }
  };

  return (
    <div className="flex h-screen w-screen bg-[#09090b] text-white overflow-hidden font-sans">
      {/* Sidebar: Files & Chat */}
      <div className="w-[400px] flex flex-col border-r border-gray-800 flex-shrink-0 z-20 shadow-2xl">
        <div className="h-[250px] border-b border-gray-800 bg-[#09090b]">
          <FileExplorer 
            files={files} 
            selectedFile={selectedFile} 
            onSelectFile={handleFileSelect}
            onImportZip={handleImportZip}
            onDownloadZip={handleDownloadZip}
          />
        </div>
        <div className="flex-1 min-h-0 bg-[#09090b]">
          <ChatPanel 
            messages={messages} 
            isLoading={isLoading} 
            onSendMessage={handleSendMessage} 
          />
        </div>
      </div>

      {/* Main Content: Preview / Code */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#121212]">
        <div className="h-14 bg-[#09090b] border-b border-gray-800 flex items-center px-6 justify-between">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
            <span className="text-sm font-medium text-gray-300 tracking-tight">
              {viewMode === 'preview' ? 'Live Preview Environment' : `Editing: ${selectedFile || 'Code'}`}
            </span>
          </div>
          
          <div className="flex bg-gray-800/50 p-1 rounded-lg border border-gray-700/50">
            <button
              onClick={() => setViewMode('preview')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
                viewMode === 'preview' 
                  ? 'bg-gray-700 text-white shadow-sm' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Eye size={14} />
              Preview
            </button>
            <button
              onClick={() => setViewMode('code')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
                viewMode === 'code' 
                  ? 'bg-gray-700 text-white shadow-sm' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Code2 size={14} />
              Code
            </button>
          </div>
        </div>

        <div className="flex-1 relative overflow-hidden">
          {viewMode === 'preview' ? (
            <PreviewWindow files={files} />
          ) : (
            selectedFile && files[selectedFile] ? (
              <CodeEditor 
                content={files[selectedFile].content} 
                language={files[selectedFile].language} 
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-500 text-sm">
                <Code2 size={48} className="mb-4 opacity-20" />
                <p>Select a file from the explorer to view source code.</p>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default App;