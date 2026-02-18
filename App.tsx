
import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import InstructionCard from './components/InstructionCard';
import { generateVeoPrompts } from './services/geminiService';
import { PromptSet, StyleType, AppState } from './types';
import { STYLES, IMAGE_COUNTS } from './constants';

// Removed local 'declare global' for window.aistudio to avoid conflict with the environment's predefined AIStudio type.
// We will access window.aistudio using type assertion to handle the existing global definition safely.

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    title: '',
    count: 4,
    style: 'Auto',
    result: null,
    loading: false,
    error: null,
    images: []
  });

  const [hasKey, setHasKey] = useState<boolean>(true);

  useEffect(() => {
    const checkKey = async () => {
      // Accessing aistudio which is globally defined as AIStudio in the environment
      const aistudio = (window as any).aistudio;
      if (aistudio) {
        try {
          const selected = await aistudio.hasSelectedApiKey();
          setHasKey(selected);
        } catch (e) {
          console.error("Error checking key selection status:", e);
        }
      }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    const aistudio = (window as any).aistudio;
    if (aistudio) {
      try {
        await aistudio.openSelectKey();
        // Assume success as per platform instructions to mitigate race condition
        setHasKey(true);
      } catch (e) {
        console.error("Error opening key selector:", e);
      }
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    const fileList = Array.from(files).slice(0, 3) as File[];
    const promises = fileList.map(file => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    });

    Promise.all(promises).then(base64s => {
      setState(prev => ({ ...prev, images: base64s }));
    });
  };

  const handleGenerate = async () => {
    if (!state.title.trim() && state.images.length === 0) {
      setState(prev => ({ ...prev, error: "Vui lòng nhập tiêu đề hoặc tải ảnh lên!" }));
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null, result: null }));
    try {
      const result = await generateVeoPrompts(state.title, state.count, state.style, state.images);
      setState(prev => ({ ...prev, result, loading: false }));
    } catch (err: any) {
      // If the request fails with "Requested entity was not found", it indicates an issue with the API key project
      if (err.message?.includes("Requested entity was not found")) {
        setHasKey(false);
        setState(prev => ({ ...prev, error: "API Key không khả dụng. Vui lòng chọn lại Key từ project đã bật Billing.", loading: false }));
      } else {
        setState(prev => ({ ...prev, error: err.message || "Đã có lỗi xảy ra", loading: false }));
      }
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Đã copy vào bộ nhớ tạm!");
  };

  return (
    <div className="min-h-screen pb-20 px-4 max-w-5xl mx-auto">
      <Header />
      
      <main className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Panel: Inputs */}
        <section className="md:col-span-1 space-y-6">
          {/* API Key Selection Section */}
          <div className="bg-[#2d333b] p-4 rounded-xl shadow-sm border border-gray-700 text-sm text-gray-300">
            <div className="flex items-center gap-2 mb-3">
              <span>Lấy API Key Free:</span>
              <a 
                href="https://aistudio.google.com/app/apikey" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline"
              >
                Gemini API Key
              </a>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-gray-400 font-medium">Gemini API Key:</label>
              <div 
                onClick={handleSelectKey}
                className="w-full bg-[#1c2128] border border-gray-600 rounded px-3 py-2 text-gray-400 cursor-pointer hover:border-indigo-500 transition-colors flex items-center justify-between"
              >
                <span className="truncate">{hasKey ? '••••••••••••••••••••••••••••••••' : 'Nhấn để chọn Gemini API Key...'}</span>
                {!hasKey && <span className="text-[10px] bg-red-900/50 text-red-300 px-1.5 py-0.5 rounded flex-shrink-0">Billing required</span>}
              </div>
              <p className="text-[10px] text-gray-500 mt-1 italic">
                * Cần chọn API Key từ project đã bật Billing (ai.google.dev/gemini-api/docs/billing)
              </p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tiêu đề nội dung</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Cải tạo phòng ngủ cũ..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                  value={state.title}
                  onChange={(e) => setState(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tải ảnh tham chiếu (Tối đa 3)</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
                {state.images.length > 0 && (
                  <div className="mt-2 flex gap-2 flex-wrap">
                    {state.images.map((img, i) => (
                      <div key={i} className="relative w-12 h-12 rounded border border-gray-200 overflow-hidden">
                        <img src={img} className="w-full h-full object-cover" alt="ref" />
                        <button 
                          onClick={() => setState(prev => ({ ...prev, images: prev.images.filter((_, idx) => idx !== i) }))}
                          className="absolute top-0 right-0 bg-red-500 text-white w-4 h-4 text-[10px] flex items-center justify-center rounded-bl"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Số lượng ảnh (Timeline)</label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {IMAGE_COUNTS.map(num => (
                    <button
                      key={num}
                      onClick={() => setState(prev => ({ ...prev, count: num }))}
                      className={`py-2 text-[10px] font-bold rounded-lg border transition-all ${
                        state.count === num
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phong cách</label>
                <select
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  value={state.style}
                  onChange={(e) => setState(prev => ({ ...prev, style: e.target.value as StyleType }))}
                >
                  {STYLES.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleGenerate}
                disabled={state.loading}
                className={`w-full py-3 px-4 rounded-lg font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2 ${
                  state.loading 
                    ? 'bg-indigo-400 cursor-not-allowed' 
                    : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95'
                }`}
              >
                {state.loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Đang thiết kế...
                  </>
                ) : 'Tạo gói Prompt'}
              </button>

              {state.error && (
                <p className="text-red-500 text-sm font-medium bg-red-50 p-3 rounded-lg border border-red-200">
                  {state.error}
                </p>
              )}

              <InstructionCard />
            </div>
          </div>
        </section>

        {/* Right Panel: Results */}
        <section className="md:col-span-2 space-y-6">
          {!state.result && !state.loading && (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-2xl p-12">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-center">Nhập tiêu đề dự án hoặc tải ảnh lên,<br/>sau đó nhấn "Tạo gói Prompt" để nhận chuỗi kịch bản.</p>
            </div>
          )}

          {state.result && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Project Blueprint Analysis */}
              <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                <h3 className="font-bold text-indigo-900 mb-1">Dự án: {state.result.analysis.subject}</h3>
                <p className="text-xs text-indigo-700">Tiến trình: {state.result.analysis.progression}</p>
              </div>

              {/* Timeline Items */}
              <div className="space-y-8">
                {state.result.imagePrompts.map((prompt, idx) => (
                  <div key={idx} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex justify-between items-center">
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Image Prompt #{idx + 1}</span>
                      <button 
                        onClick={() => copyToClipboard(prompt)}
                        className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path></svg>
                        Copy
                      </button>
                    </div>
                    <div className="p-4 text-sm text-gray-700 leading-relaxed italic">
                      {prompt}
                    </div>

                    {/* Show Video Prompt if not the last item in timeline */}
                    {idx < state.result!.videoPrompts.length && (
                      <div className="p-4 bg-indigo-50/50 border-t border-gray-100">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Video Transition {idx + 1} → {idx + 2}</span>
                          <button 
                            onClick={() => copyToClipboard(state.result!.videoPrompts[idx])}
                            className="text-[10px] font-bold text-indigo-600 hover:underline"
                          >
                            Copy Video Prompt
                          </button>
                        </div>
                        <div className="text-xs text-indigo-800 line-clamp-2">
                          {state.result!.videoPrompts[idx]}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </main>
      
      <footer className="mt-12 py-8 border-t border-gray-100 text-center text-gray-400 text-xs">
        &copy; 2024 Veo3 Prompt Master. Chuyên gia tạo chuỗi Prompt Timelapse xây dựng & cải tạo.
      </footer>
    </div>
  );
};

export default App;
