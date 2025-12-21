
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Undo2, Redo2, Save, FileCode, Loader2, Maximize2, Minimize2, Copy, Check } from 'lucide-react';

interface CodeEditorProps {
    initialValue: string;
    onSave: (value: string) => Promise<void>;
    language?: string;
    fileName: string;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ initialValue, onSave, language = "html", fileName }) => {
    const [code, setCode] = useState(initialValue);
    const [history, setHistory] = useState<string[]>([initialValue]);
    const [historyIndex, setHistoryIndex] = useState(0);
    const [isSaving, setIsSaving] = useState(false);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [copied, setCopied] = useState(false);
    
    const textAreaRef = useRef<HTMLTextAreaElement>(null);
    const lineNoRef = useRef<HTMLDivElement>(null);
    const preRef = useRef<HTMLPreElement>(null);

    // Sync scroll between line numbers, highlight overlay, and textarea
    const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
        const top = e.currentTarget.scrollTop;
        if (lineNoRef.current) lineNoRef.current.scrollTop = top;
        if (preRef.current) preRef.current.scrollTop = top;
    };

    useEffect(() => {
        setCode(initialValue);
        setHistory([initialValue]);
        setHistoryIndex(0);
        if (textAreaRef.current) textAreaRef.current.scrollTop = 0;
    }, [initialValue]);

    const handleCodeChange = (newVal: string) => {
        setCode(newVal);
        if (newVal !== history[historyIndex]) {
            const newHistory = history.slice(0, historyIndex + 1);
            newHistory.push(newVal);
            if (newHistory.length > 50) newHistory.shift();
            setHistory(newHistory);
            setHistoryIndex(newHistory.length - 1);
        }
    };

    // Very basic regex highlighter for visibility
    const highlightedCode = useMemo(() => {
        let highlighted = code
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");

        // Keywords
        highlighted = highlighted.replace(/\b(const|let|var|function|return|if|else|for|while|import|export|from|class|extends|interface|type|async|await|try|catch|true|false|null|undefined)\b/g, '<span class="text-blue-400 font-bold">$1</span>');
        
        // Strings
        highlighted = highlighted.replace(/(["'`].*?["'`])/g, '<span class="text-emerald-400">$1</span>');
        
        // Comments
        highlighted = highlighted.replace(/(\/\/.*)/g, '<span class="text-gray-500 italic">$1</span>');
        highlighted = highlighted.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="text-gray-500 italic">$1</span>');

        // Functions
        highlighted = highlighted.replace(/\b([a-z_A-Z0-9]+)(?=\()/g, '<span class="text-yellow-200">$1</span>');

        return highlighted;
    }, [code]);

    const undo = () => {
        if (historyIndex > 0) {
            const prevIndex = historyIndex - 1;
            setHistoryIndex(prevIndex);
            setCode(history[prevIndex]);
        }
    };

    const save = async () => {
        setIsSaving(true);
        await onSave(code);
        setIsSaving(false);
    };

    const copyCode = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            const start = textAreaRef.current?.selectionStart || 0;
            const end = textAreaRef.current?.selectionEnd || 0;
            const target = e.target as HTMLTextAreaElement;
            const value = target.value;
            target.value = value.substring(0, start) + "    " + value.substring(end);
            textAreaRef.current!.selectionStart = textAreaRef.current!.selectionEnd = start + 4;
            handleCodeChange(target.value);
        }
    };

    const lineNumbers = code.split('\n').map((_, i) => i + 1);

    return (
        <div className={`flex flex-col bg-[#0d1117] rounded-3xl border border-white/10 overflow-hidden shadow-2xl transition-all duration-300 ${isFullScreen ? 'fixed inset-4 z-[200]' : 'h-full w-full'}`}>
            {/* Header / Toolbar */}
            <div className="flex items-center justify-between px-6 py-4 bg-[#161b22] border-b border-white/5">
                <div className="flex items-center gap-5">
                    <div className="flex items-center gap-3">
                        <FileCode size={20} className="text-blue-400" />
                        <span className="text-sm font-black text-gray-200 font-mono tracking-tight">{fileName}</span>
                    </div>
                    <div className="h-4 w-px bg-white/10"></div>
                    <div className="flex items-center gap-1">
                        <button onClick={undo} disabled={historyIndex === 0} className="p-2 text-gray-500 hover:text-white disabled:opacity-20 transition-colors">
                            <Undo2 size={18} />
                        </button>
                        <button onClick={copyCode} className="p-2 text-gray-500 hover:text-white transition-colors">
                            {copied ? <Check size={18} className="text-green-500"/> : <Copy size={18} />}
                        </button>
                    </div>
                </div>
                
                <div className="flex items-center gap-3">
                    <button onClick={() => setIsFullScreen(!isFullScreen)} className="p-2 text-gray-500 hover:text-white transition-colors">
                        {isFullScreen ? <Minimize2 size={20}/> : <Maximize2 size={20}/>}
                    </button>
                    <button 
                        onClick={save}
                        disabled={isSaving || code === initialValue}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
                            code === initialValue 
                            ? 'bg-white/5 text-gray-600 cursor-not-allowed border border-white/5' 
                            : 'bg-blue-600 text-white hover:bg-blue-500 shadow-[0_0_25px_rgba(37,99,235,0.4)] active:scale-95'
                        }`}
                    >
                        {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                        {isSaving ? 'Deploying' : 'Deploy Code'}
                    </button>
                </div>
            </div>

            {/* Editor Area */}
            <div className="flex flex-1 overflow-hidden relative bg-[#0d1117] font-mono">
                {/* Line Numbers gutter */}
                <div 
                    ref={lineNoRef}
                    className="w-14 bg-[#0d1117] border-r border-white/5 py-5 flex flex-col items-center text-[11px] text-gray-600 select-none overflow-hidden"
                >
                    {lineNumbers.map(n => (
                        <div key={n} className="h-[21px] leading-[21px] w-full text-center hover:text-gray-400 transition-colors">
                            {n}
                        </div>
                    ))}
                </div>
                
                {/* Highlighting Overlay (Simulated) */}
                <pre
                    ref={preRef}
                    aria-hidden="true"
                    className="absolute inset-0 left-14 pointer-events-none p-5 text-[14px] leading-[21px] m-0 overflow-hidden whitespace-pre-wrap break-all text-transparent"
                    dangerouslySetInnerHTML={{ __html: highlightedCode }}
                />

                {/* Main Textarea */}
                <textarea
                    ref={textAreaRef}
                    value={code}
                    onChange={(e) => handleCodeChange(e.target.value)}
                    onScroll={handleScroll}
                    onKeyDown={handleKeyDown}
                    className="flex-1 bg-transparent text-gray-300 font-mono text-[14px] p-5 h-full outline-none resize-none selection:bg-blue-500/30 custom-scrollbar leading-[21px] placeholder-gray-800 z-10"
                    spellCheck={false}
                    autoCapitalize="off"
                    autoComplete="off"
                    autoCorrect="off"
                />
            </div>

            {/* Footer Status Bar */}
            <div className="px-6 py-2.5 bg-[#161b22] border-t border-white/5 flex justify-between items-center text-[10px] font-mono text-gray-500">
                <div className="flex gap-5">
                    <span>STATUS: {isSaving ? 'WRITING...' : 'IDLE'}</span>
                    <span>LN: {lineNumbers.length}</span>
                    <span>ENC: UTF-8</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                    NODE_SYNCED
                </div>
            </div>
        </div>
    );
};

export default CodeEditor;
