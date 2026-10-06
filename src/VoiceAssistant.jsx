import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Globe, X, MessageSquare, Volume2 } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

export default function VoiceAssistant({ user }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [reply, setReply] = useState('');
  const [error, setError] = useState('');
  const [lang, setLang] = useState('en-IN');
  const [isSupported, setIsSupported] = useState(true);
  const [inputText, setInputText] = useState('');
  
  const recognitionRef = useRef(null);
  
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }
    
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    
    recognition.onresult = (event) => {
      const current = event.resultIndex;
      const text = event.results[current][0].transcript;
      setTranscript(text);
      sendToAssistant(text);
    };
    
    recognition.onerror = (event) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);
      if (event.error === 'not-allowed') {
        setError('Microphone access denied. Please allow microphone permissions.');
      } else if (event.error !== 'no-speech') {
        setError(`Error: ${event.error}`);
      }
    };
    
    recognition.onend = () => {
      setIsListening(false);
    };
    
    recognitionRef.current = recognition;
  }, []);
  
  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = lang;
    }
  }, [lang]);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      setError('');
      setReply('');
      setTranscript('');
      try {
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (e) {
        console.error("Recognition start error:", e);
      }
    }
  };

  const speak = (text) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    window.speechSynthesis.speak(utterance);
  };

  const sendToAssistant = async (text) => {
    setReply('Thinking...');
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (user?.token) {
        headers['Authorization'] = `Bearer ${user.token}`;
      }
      
      const res = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ message: text, language: lang })
      });
      
      if (!res.ok) {
        throw new Error("Chat API Error: " + res.status);
      }
      
      const data = await res.json();
      const answer = data.reply || "I didn't get a proper reply.";
      setReply(answer);
      speak(answer);
      
    } catch (err) {
      const msg = err.message || "Failed to reach assistant.";
      setReply(`Error: ${msg}`);
      speak("Sorry, I am unable to answer right now.");
    }
  };

  const handleManualSend = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    setTranscript(inputText);
    sendToAssistant(inputText);
    setInputText('');
  };

  if (!isSupported) {
    return (
      <div className="fixed bottom-6 right-6 z-50 p-4 bg-white border border-red-200 shadow-xl rounded-xl w-72 animate-fadeUp">
        <h3 className="font-bold text-red-600 mb-2">Voice Not Supported</h3>
        <p className="text-sm text-slate-600">Voice works best in Chrome. Your browser doesn't support the Web Speech API.</p>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {isOpen && (
        <div className="bg-white border border-slate-200 shadow-2xl rounded-2xl w-80 mb-4 overflow-hidden animate-fadeUp">
          <div className="bg-brand-900 text-white p-4 flex justify-between items-center">
            <div className="flex items-center gap-2 font-bold">
              <MessageSquare size={18} />
              AI Assistant
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white/70 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>
          
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
            <div className="flex items-center gap-2 text-slate-600">
              <Globe size={16} />
              <select 
                value={lang} 
                onChange={(e) => setLang(e.target.value)}
                className="bg-transparent text-sm font-medium focus:outline-none"
              >
                <option value="en-IN">English (India)</option>
                <option value="ta-IN">Tamil (தமிழ்)</option>
                <option value="hi-IN">Hindi (हिंदी)</option>
              </select>
            </div>
          </div>
          
          <div className="p-4 min-h-[160px] flex flex-col justify-end gap-3 bg-white">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-100">
                {error}
              </div>
            )}
            
            {transcript && (
              <div className="self-end bg-brand-100 text-brand-900 px-4 py-2 rounded-2xl rounded-tr-sm text-sm max-w-[85%] shadow-sm">
                {transcript}
              </div>
            )}
            
            {reply && (
              <div className="self-start bg-slate-100 text-slate-800 px-4 py-2 rounded-2xl rounded-tl-sm text-sm max-w-[85%] shadow-sm flex flex-col gap-1">
                {reply}
                {reply !== 'Thinking...' && !reply.startsWith('Error') && (
                  <button onClick={() => speak(reply)} className="self-end mt-1 text-slate-400 hover:text-brand-500" title="Listen again">
                    <Volume2 size={14} />
                  </button>
                )}
              </div>
            )}
            
            {!transcript && !reply && !error && (
              <div className="text-center text-slate-400 text-sm font-medium py-8">
                Tap the microphone or type to speak
              </div>
            )}
          </div>
          
          <form onSubmit={handleManualSend} className="p-3 bg-slate-50 border-t border-slate-100 flex gap-2">
            <input 
              type="text" 
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder="Ask me anything..." 
              className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
            />
            <button type="submit" className="bg-brand-500 text-white p-2 rounded-lg hover:bg-brand-600 transition-colors">
              <MessageSquare size={18} />
            </button>
          </form>
        </div>
      )}
      
      <button 
        onClick={() => {
          if (!isOpen) setIsOpen(true);
          toggleListening();
        }}
        className={`flex items-center justify-center w-14 h-14 rounded-full shadow-xl transition-all ${
          isListening 
            ? 'bg-red-500 text-white animate-pulse shadow-red-500/30' 
            : 'bg-brand-500 text-white hover:bg-brand-600 hover:scale-105'
        }`}
      >
        {isListening ? <MicOff size={24} /> : <Mic size={24} />}
      </button>
    </div>
  );
}
