import React, { useState, useRef, useEffect } from 'react';
import { Upload, Image as ImageIcon, Send, Loader2, Sparkles, MessageSquare, Download, RefreshCw, X, HelpCircle } from 'lucide-react';
import { generateEditOrResponse } from './services/geminiService';
import { ChatMessage, AppState, ImageState } from './types';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>('idle');
  const [currentImage, setCurrentImage] = useState<ImageState | null>(null);
  const [prompt, setPrompt] = useState('');
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [history, isLoading]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setCurrentImage({
        original: result,
        current: result,
        history: [result]
      });
      setAppState('active');
      setHistory([{
        role: 'system',
        content: 'Image uploaded successfully. You can now ask me to edit this image or answer questions about it.',
        timestamp: Date.now()
      }]);
    };
    reader.readAsDataURL(file);
  };

  const handleSendMessage = async () => {
    if (!prompt.trim() || !currentImage) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: prompt,
      timestamp: Date.now()
    };

    setHistory(prev => [...prev, userMessage]);
    setPrompt('');
    setIsLoading(true);

    try {
      // We send the CURRENT version of the image to the model for editing/context
      const result = await generateEditOrResponse(currentImage.current, userMessage.content);

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: result.text || (result.image ? 'I have edited the image based on your request.' : 'I processed your request.'),
        image: result.image,
        timestamp: Date.now()
      };

      setHistory(prev => [...prev, assistantMessage]);

      if (result.image) {
        setCurrentImage(prev => {
          if (!prev) return null;
          return {
            ...prev,
            current: result.image!,
            history: [...prev.history, result.image!]
          };
        });
      }
    } catch (error) {
      console.error(error);
      setHistory(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: Date.now(),
        isError: true
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const revertToOriginal = () => {
    if (currentImage) {
      setCurrentImage({
        ...currentImage,
        current: currentImage.original
      });
      setHistory(prev => [...prev, {
        role: 'system',
        content: 'Reverted to original image.',
        timestamp: Date.now()
      }]);
    }
  };

  const downloadImage = () => {
    if (currentImage?.current) {
      const link = document.createElement('a');
      link.href = currentImage.current;
      link.download = `gemini-edit-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="flex h-screen bg-gray-900 text-white font-sans overflow-hidden">
      {/* Left Panel - Image Area */}
      <div className="flex-1 flex flex-col border-r border-gray-800 bg-black/40 relative">
        <div className="absolute inset-0 flex items-center justify-center p-8">
          {currentImage ? (
            <div className="relative w-full h-full flex items-center justify-center animate-in fade-in duration-500">
               <img 
                 src={currentImage.current} 
                 alt="Workspace" 
                 className="max-w-full max-h-full object-contain shadow-2xl rounded-lg border border-gray-800"
               />
               <div className="absolute top-4 right-4 flex gap-2">
                 <button 
                   onClick={revertToOriginal}
                   className="p-2 bg-gray-800/80 hover:bg-gray-700 backdrop-blur-md rounded-full text-white transition-all tooltip-trigger"
                   title="Revert to Original"
                 >
                   <RefreshCw size={20} />
                 </button>
                 <button 
                   onClick={downloadImage}
                   className="p-2 bg-indigo-600/90 hover:bg-indigo-500 backdrop-blur-md rounded-full text-white transition-all"
                   title="Download"
                 >
                   <Download size={20} />
                 </button>
               </div>
            </div>
          ) : (
            <div className="text-center p-12 border-2 border-dashed border-gray-700 rounded-xl hover:border-indigo-500 transition-colors bg-gray-900/50">
              <div className="mb-4 flex justify-center">
                <div className="p-4 bg-gray-800 rounded-full">
                  <ImageIcon size={48} className="text-indigo-400" />
                </div>
              </div>
              <h2 className="text-2xl font-bold mb-2">Upload an Image</h2>
              <p className="text-gray-400 mb-6 max-w-sm mx-auto">
                Drag and drop or click to upload. <br/>
                Gemini 2.5 Flash can edit images or answer questions about them.
              </p>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-medium transition-all shadow-lg shadow-indigo-500/20"
              >
                Select Image
              </button>
            </div>
          )}
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileSelect} 
            accept="image/*" 
            className="hidden" 
          />
        </div>
      </div>

      {/* Right Panel - Chat Interface */}
      <div className="w-[400px] flex flex-col bg-gray-900 border-l border-gray-800 shadow-2xl z-10">
        {/* Header */}
        <div className="p-4 border-b border-gray-800 bg-gray-900/95 backdrop-blur z-20 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Sparkles className="text-indigo-400" size={20} />
            <h1 className="font-bold text-lg">Gemini Vision</h1>
          </div>
          {currentImage && (
             <button 
             onClick={() => {
               setCurrentImage(null);
               setHistory([]);
               setAppState('idle');
             }}
             className="text-xs text-gray-500 hover:text-red-400 transition-colors"
           >
             Close Session
           </button>
          )}
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-gray-700">
          {history.length === 0 && appState === 'idle' && (
             <div className="text-center text-gray-500 mt-10 space-y-4">
                <HelpCircle className="mx-auto text-gray-700" size={40} />
                <p>Upload an image to get started.</p>
             </div>
          )}
          
          {history.map((msg, idx) => (
            <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div 
                className={`max-w-[85%] rounded-2xl p-4 ${
                  msg.role === 'user' 
                    ? 'bg-indigo-600 text-white rounded-br-none' 
                    : msg.role === 'system'
                    ? 'bg-gray-800/50 text-gray-400 text-sm border border-gray-800'
                    : 'bg-gray-800 text-gray-100 rounded-bl-none border border-gray-700'
                } shadow-md`}
              >
                {msg.content && <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>}
                
                {msg.image && (
                   <div className="mt-3 rounded-lg overflow-hidden border border-gray-600/50">
                      <img src={msg.image} alt="Generated result" className="w-full h-auto" />
                   </div>
                )}
              </div>
              <span className="text-xs text-gray-500 mt-1 px-1">
                {msg.role === 'user' ? 'You' : 'Gemini'} • {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </span>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
               <div className="bg-gray-800 rounded-2xl rounded-bl-none p-4 border border-gray-700 flex items-center gap-3">
                 <Loader2 className="animate-spin text-indigo-400" size={18} />
                 <span className="text-gray-300 text-sm">Thinking & Processing...</span>
               </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-gray-800 bg-gray-900">
          <div className="relative">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={currentImage ? "E.g., 'Change background to blue' or 'Describe this image'" : "Upload an image first..."}
              disabled={!currentImage || isLoading}
              className="w-full bg-gray-800 text-white rounded-xl pl-4 pr-12 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 border border-gray-700 resize-none h-[52px] scrollbar-hide disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            />
            <button
              onClick={handleSendMessage}
              disabled={!currentImage || !prompt.trim() || isLoading}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white disabled:opacity-50 disabled:bg-gray-700 transition-all"
            >
              <Send size={18} />
            </button>
          </div>
          <div className="mt-2 flex justify-between text-xs text-gray-500 px-1">
            <span>Gemini 2.5 Flash Image</span>
            <span>Supports edits & chat</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;