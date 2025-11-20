
import React, { useState } from 'react';
import GlassCard from '../components/GlassCard';
import { Send, MessageSquare, User, Headphones } from 'lucide-react';

const Support: React.FC = () => {
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([
      { id: 1, sender: 'admin', text: 'Hello! How can I help you with EarnHub Pro today?', time: '10:00 AM' }
  ]);

  const handleSend = (e: React.FormEvent) => {
      e.preventDefault();
      if (!message.trim()) return;

      const newMsg = { id: Date.now(), sender: 'user', text: message, time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) };
      setChatHistory([...chatHistory, newMsg]);
      setMessage('');

      // Simulate response
      setTimeout(() => {
          setChatHistory(prev => [...prev, { 
              id: Date.now() + 1, 
              sender: 'admin', 
              text: 'Thank you for your message. Our support team will review it shortly.', 
              time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) 
          }]);
      }, 1500);
  };

  return (
    <div className="pb-24 sm:pl-20 sm:pt-6 h-[calc(100vh-80px)] flex flex-col">
      <header className="mb-4 shrink-0">
         <h1 className="text-2xl font-display font-bold text-white flex items-center gap-2">
            <Headphones className="text-neon-glow" /> Support Chat
         </h1>
      </header>

      <GlassCard className="flex-1 flex flex-col p-0 overflow-hidden mb-4">
          <div className="bg-white/5 p-4 border-b border-white/5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-royal-600 flex items-center justify-center">
                  <Headphones size={20} text-white />
              </div>
              <div>
                  <h3 className="font-bold text-white">Customer Support</h3>
                  <p className="text-xs text-neon-green flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-neon-green rounded-full animate-pulse"></span> Online
                  </p>
              </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatHistory.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                          msg.sender === 'user' 
                          ? 'bg-royal-600 text-white rounded-tr-none' 
                          : 'bg-white/10 text-gray-200 rounded-tl-none'
                      }`}>
                          <p>{msg.text}</p>
                          <p className={`text-[10px] mt-1 ${msg.sender === 'user' ? 'text-royal-200' : 'text-gray-500'}`}>{msg.time}</p>
                      </div>
                  </div>
              ))}
          </div>

          <form onSubmit={handleSend} className="p-3 bg-black/20 border-t border-white/5 flex gap-2">
              <input 
                  type="text" 
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Type your message..." 
                  className="flex-1 bg-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-royal-500 transition"
              />
              <button type="submit" className="p-3 bg-neon-green text-black rounded-xl hover:bg-emerald-400 transition">
                  <Send size={20} />
              </button>
          </form>
      </GlassCard>
    </div>
  );
};

export default Support;
