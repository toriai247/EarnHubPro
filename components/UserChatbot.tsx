
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Bot, Sparkles, Loader2, Minus, Maximize2 } from 'lucide-react';
import { chatWithAI, NAXXIVO_PUBLIC_CONTEXT } from '../lib/aiHelper';
import GlassCard from './GlassCard';

interface ChatMessage {
    id: string;
    role: 'user' | 'ai';
    text: string;
    timestamp: Date;
}

const UserChatbot: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: 'init',
            role: 'ai',
            text: "Hi there! I'm Nova, your Naxxivo assistant. \n\nAsk me anything about earning, games, or your wallet! 🚀",
            timestamp: new Date()
        }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        if (isOpen) {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, isOpen, isTyping]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMsg: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            text: input.trim(),
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsTyping(true);

        try {
            // Append history for better context (last 5 messages)
            const conversationHistory = messages.slice(-5).map(m => `${m.role.toUpperCase()}: ${m.text}`).join('\n');
            const fullPrompt = `${conversationHistory}\nUSER: ${userMsg.text}`;

            const responseText = await chatWithAI(fullPrompt, NAXXIVO_PUBLIC_CONTEXT);
            
            const aiMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'ai',
                text: responseText || "I'm having trouble connecting to the neural network. Please try again.",
                timestamp: new Date()
            };
            setMessages(prev => [...prev, aiMsg]);
        } catch (e) {
            console.error(e);
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'ai',
                text: "Connection error. Please check your internet or try later.",
                timestamp: new Date()
            }]);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <>
            {/* FLOATING ACTION BUTTON */}
            <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-50"
            >
                <AnimatePresence>
                    {!isOpen && (
                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            initial={{ opacity: 0, rotate: 90 }}
                            animate={{ opacity: 1, rotate: 0 }}
                            exit={{ opacity: 0, rotate: 90 }}
                            onClick={() => setIsOpen(true)}
                            className="w-14 h-14 rounded-full bg-gradient-to-br from-electric-600 to-purple-600 shadow-[0_0_20px_rgba(124,58,237,0.5)] flex items-center justify-center text-white border-2 border-white/20 relative group"
                        >
                            <Bot size={28} />
                            <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                            </span>
                            <div className="absolute right-full mr-4 bg-white/10 backdrop-blur-md px-3 py-1 rounded-lg text-xs font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                Ask Nova AI
                            </div>
                        </motion.button>
                    )}
                </AnimatePresence>
            </motion.div>

            {/* CHAT WINDOW */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 50, scale: 0.9 }}
                        className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-50 w-[90vw] sm:w-[380px] h-[500px] max-h-[80vh] flex flex-col"
                    >
                        <GlassCard className="flex-1 flex flex-col p-0 overflow-hidden border-purple-500/30 bg-dark-900/95 backdrop-blur-xl shadow-2xl rounded-3xl">
                            
                            {/* HEADER */}
                            <div className="p-4 bg-gradient-to-r from-electric-900/50 to-purple-900/50 border-b border-white/10 flex justify-between items-center shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-electric-500 to-purple-500 flex items-center justify-center shadow-lg relative">
                                        <Bot size={20} className="text-white" />
                                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-dark-900 rounded-full"></div>
                                    </div>
                                    <div>
                                        <h3 className="font-display font-black text-white text-lg leading-none">NOVA</h3>
                                        <p className="text-[10px] text-purple-300 font-bold uppercase tracking-wider flex items-center gap-1">
                                            <Sparkles size={8} /> AI Assistant
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => setIsOpen(false)} 
                                        className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition"
                                    >
                                        <Minus size={18} />
                                    </button>
                                </div>
                            </div>

                            {/* MESSAGES */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-black/20">
                                {messages.map((msg) => (
                                    <motion.div
                                        key={msg.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div className={`max-w-[85%] rounded-2xl p-3 text-sm leading-relaxed shadow-sm ${
                                            msg.role === 'user' 
                                            ? 'bg-electric-600 text-white rounded-tr-none' 
                                            : 'bg-white/10 text-gray-200 border border-white/5 rounded-tl-none'
                                        }`}>
                                            <div className="whitespace-pre-wrap">{msg.text}</div>
                                            <div className={`text-[9px] mt-1 text-right ${msg.role === 'user' ? 'text-electric-200' : 'text-gray-500'}`}>
                                                {msg.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                                {isTyping && (
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                                        <div className="bg-white/10 rounded-2xl rounded-tl-none p-3 border border-white/5 flex items-center gap-1.5">
                                            <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce"></div>
                                            <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0.15s'}}></div>
                                            <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0.3s'}}></div>
                                        </div>
                                    </motion.div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* INPUT */}
                            <form onSubmit={handleSendMessage} className="p-3 bg-white/5 border-t border-white/10 shrink-0">
                                <div className="relative flex items-center">
                                    <input 
                                        type="text" 
                                        value={input}
                                        onChange={e => setInput(e.target.value)}
                                        placeholder="Ask about Naxxivo..."
                                        className="w-full bg-black/40 border border-white/10 rounded-xl pl-4 pr-12 py-3 text-white text-sm focus:border-purple-500 outline-none transition shadow-inner"
                                    />
                                    <button 
                                        type="submit" 
                                        disabled={!input.trim() || isTyping}
                                        className="absolute right-2 p-2 bg-electric-600 text-white rounded-lg hover:bg-electric-500 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                                    >
                                        {isTyping ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                    </button>
                                </div>
                            </form>

                        </GlassCard>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default UserChatbot;
