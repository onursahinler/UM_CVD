"use client";

import React, { useState, useRef, useEffect } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface UpdatedResult {
  riskScore: string;
  featuresWithShap: Array<{ name: string; value: number; shap: number }>;
  patientData?: any;
}

interface ChatBotProps {
  isOpen: boolean;
  onClose: () => void;
  patientData: any;
  riskScore: string;
  shapValues?: any;
  updatedResults?: UpdatedResult[];
}

export function ChatBot({ isOpen, onClose, patientData, riskScore, shapValues, updatedResults }: ChatBotProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hello! I'm your AI assistant for CVD risk analysis. Ask me about risk scores, laboratory values, SHAP analysis, or treatment recommendations."
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [useGuidelineSources, setUseGuidelineSources] = useState(true);
  const [usePubmedSources, setUsePubmedSources] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const previousRiskScoreRef = useRef<string>(riskScore);

  // --- SCROLL LOGIC (DÜZELTİLDİ) ---
  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    // setTimeout, modal açılırken DOM'un hazır olmasını bekler
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior });
    }, 100);
  };

  // 1. Mesajlar değiştiğinde aşağı kaydır
  useEffect(() => {
    if (isOpen) {
      scrollToBottom("smooth");
    }
  }, [messages, isOpen]);

  // 2. Pencere ilk açıldığında en aşağıya kaydır (Pozisyonu hatırla)
  useEffect(() => {
    if (isOpen) {
      scrollToBottom("auto"); // Açılışta "tak" diye gitsin, animasyonsuz
    }
  }, [isOpen]);

  // --- PATIENT CHANGE LOGIC ---
  useEffect(() => {
    // Eğer hasta (risk skoru) değişirse sohbeti sıfırla
    if (previousRiskScoreRef.current !== riskScore && previousRiskScoreRef.current !== '') {
      setMessages([
        {
          role: "assistant",
          content: "Hello! I'm your AI assistant for CVD risk analysis. Ask me about risk scores, laboratory values, SHAP analysis, or treatment recommendations."
        }
      ]);
    }
    previousRiskScoreRef.current = riskScore;
  }, [riskScore]);

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      role: "user",
      content: inputValue
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const context = {
        riskScore,
        patientData,
        shapValues,
        updatedResults: updatedResults || [],
        conversation: messages,
        useGuidelineSources,
        usePubmedSources
      };

      const response = await fetch('http://localhost:5000/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputValue,
          context: context
        }),
      });

      const data = await response.json();
      
      setMessages(prev => [...prev, {
        role: "assistant",
        content: data.response || "I apologize, an error occurred. Please try again."
      }]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Connection error occurred. Please try again later."
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // --- DÜZELTME: Unmount yerine CSS ile gizleme ---
  // if (!isOpen) return null;  <-- BU SATIRI KALDIRDIK.
  // Yerine aşağıdaki className içinde 'hidden' kontrolü ekledik.

  return (
    <div className={`fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-300 ${
      isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none hidden'
    }`}>
      <div className={`bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-2xl h-[600px] flex flex-col border border-white/20 overflow-hidden transform transition-all duration-300 ${
        isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
      }`}>
        
        {/* Header */}
        <div className="relative z-50 flex items-center justify-between p-5 border-b border-gray-200/50 bg-gradient-to-r from-blue-50/50 to-purple-50/50 rounded-t-3xl overflow-visible">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full blur-md opacity-50"></div>
              <div className="relative w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">AI Assistant</h3>
              <p className="text-xs text-gray-500 font-medium">CVD Risk Analysis Expert</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Toggles */}
            <div className="flex flex-col gap-2 bg-white/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-gray-200/50 min-w-[220px]">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-gray-700">Guidelines</span>
                  <span className="text-[10px] text-gray-500">Use uploaded PDF clinical guidelines</span>
                </div>
                <button
                  onClick={() => setUseGuidelineSources(!useGuidelineSources)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    useGuidelineSources ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${useGuidelineSources ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
              <div className="flex items-center justify-between border-t border-gray-200 pt-2">
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-gray-700">PubMed</span>
                  <span className="text-[10px] text-gray-500">Use PubMed scientific articles</span>
                </div>
                <button
                  onClick={() => setUsePubmedSources(!usePubmedSources)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    usePubmedSources ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${usePubmedSources ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-full hover:bg-gray-100"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="relative z-10 flex-1 overflow-y-auto p-5 space-y-4 bg-gradient-to-b from-white/50 to-gray-50/30 scroll-smooth">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
            >
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-md ${
                msg.role === 'user'
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                  : 'bg-white/90 backdrop-blur-sm text-gray-800 border border-gray-200/50'
              }`}>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start animate-fade-in">
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl px-4 py-3 shadow-md border border-gray-200/50">
                <div className="flex gap-2">
                  <div className="w-2.5 h-2.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full animate-bounce"></div>
                  <div className="w-2.5 h-2.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2.5 h-2.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
            </div>
          )}
          
          {/* Scroll Anchor */}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-gray-200/50 bg-gradient-to-r from-blue-50/30 to-purple-50/30 rounded-b-3xl">
          <div className="flex gap-3">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="flex-1 bg-white/90 backdrop-blur-sm text-gray-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 border border-gray-200/50 shadow-sm transition-all placeholder:text-gray-400"
              disabled={isLoading}
            />
            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || isLoading}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-medium transition-all shadow-lg hover:shadow-xl disabled:hover:shadow-lg flex items-center justify-center min-w-[56px]"
            >
              {isLoading ? (
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}