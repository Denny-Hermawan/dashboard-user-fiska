// components/ChatbotButton.js
"use client";

import React, { useState, useEffect, useRef } from 'react';
// --- [BARU] Impor ReactMarkdown ---
import ReactMarkdown from 'react-markdown'; 
// Impor ikon
import { MdSupportAgent, MdClose, MdSend, MdHourglassTop } from 'react-icons/md';

export default function ChatbotButton({ userId }) { // Pastikan userId ada
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { from: 'ai', text: 'Halo! Ada yang bisa saya bantu terkait data toko Anda?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const chatBodyRef = useRef(null);

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = { from: 'user', text: input };
    setMessages([...messages, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Panggil "Jembatan" API kita
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: userMessage.text, userId: userId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Gagal mendapatkan balasan (Client Check)');
      }

      const aiResponse = { from: 'ai', text: data.text };
      setMessages(prev => [...prev, aiResponse]);

    } catch (error) {
      console.error(error);
      const errorResponse = { from: 'ai', text: `Error: ${error.message}` };
      setMessages(prev => [...prev, errorResponse]);
    } finally {
      setIsLoading(false);
    }
  };

  // Efek untuk auto-scroll ke pesan terbaru
  useEffect(() => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const bubbleClasses = "fixed bottom-5 right-5 z-[1000] w-[60px] h-[60px] rounded-full bg-gradient-to-br from-cyan-700 to-cyan-500 text-white flex items-center justify-center shadow-lg cursor-pointer transition-all duration-300 ease-in-out hover:scale-110 hover:shadow-xl";

  if (!isOpen) {
    return (
      <button
        onClick={toggleChat}
        className={bubbleClasses}
        title="Tanya AI"
      >
        <MdSupportAgent className="w-8 h-8" />
      </button>
    );
  }

  return (
    <>
      <button
        onClick={toggleChat}
        className={bubbleClasses}
        title="Tutup Chat"
      >
        <MdClose className="w-8 h-8" />
      </button>

      <div className="chatbox-window" role="dialog" aria-labelledby="chatbox-title">
        <div className="chatbox-header">
          <h3 id="chatbox-title" className="text-lg font-bold text-gray-900">Asisten AI Fiska</h3>
          <p className="text-sm text-gray-500">Ditenagai oleh Gemini</p>
        </div>

        <div ref={chatBodyRef} className="chatbox-body">
          {messages.map((msg, index) => (
            // --- [PERUBAHAN DI SINI] ---
            // Kita ganti {msg.text} dengan <ReactMarkdown>
            <div key={index} className={`chat-message ${msg.from === 'user' ? 'user' : 'ai'}`}>
              <ReactMarkdown>{msg.text}</ReactMarkdown>
            </div>
            // --- AKHIR PERUBAHAN ---
          ))}
          {isLoading && (
            <div className="chat-message ai opacity-80">
              <MdHourglassTop className="w-4 h-4 inline-block animate-spin mr-2" />
              AI sedang mengetik...
            </div>
          )}
        </div>

        <form onSubmit={handleSend} className="chatbox-input-form">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isLoading ? "AI sedang membalas..." : "Ketik pertanyaan Anda..."}
            className="chatbox-input"
            disabled={isLoading}
          />
          <button 
            type="submit" 
            className="chatbox-send-btn" 
            title="Kirim"
            disabled={isLoading}
          >
            {isLoading ? (
              <MdHourglassTop className="w-5 h-5 animate-spin" />
            ) : (
              <MdSend className="w-5 h-5" />
            )}
          </button>
        </form>
      </div>
    </>
  );
}