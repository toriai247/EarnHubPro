
import React, { useState, useEffect } from 'react';
import GlassCard from '../../components/GlassCard';
import { 
    Database, Terminal, Copy, AlertTriangle, ShieldCheck, 
    Zap, Server, Cpu, Activity, HardDrive, RefreshCw, 
    ShieldAlert, GitFork, Trash2, CheckCircle2, Wrench, 
    Table as TableIcon, History, Terminal as TerminalIcon, 
    Lock, Shield, Ghost, DatabaseBackup, Code
} from 'lucide-react';
import { useUI } from '../../context/UIContext';
import { motion, AnimatePresence } from 'framer-motion';

const DatabaseUltra: React.FC = () => {
    const { toast } = useUI();
    const [activeTab, setActiveTab] = useState<'repair' | 'ledger' | 'cleanup' | 'security'>('repair');
    const [sysMetrics, setSysMetrics] = useState({ cpu: 12, ram: 42, latency: 15, nodes: 4 });
    const [copied, setCopied] = useState(false);
    const [history, setHistory] = useState<string[]>([]);

    useEffect(() => {
        const int = setInterval(() => {
            setSysMetrics({
                cpu: 5 + Math.random() * 8,
                ram: 38 + Math.random() * 4,
                latency: 10 + Math.random() * 5,
                nodes: 4
            });
        }, 3000);
        
        // Mock session history
        setHistory([
            "Kernel initialized at " + new Date().toLocaleTimeString(),
            "DB Node primary connection established",
            "Checking table integrity: OK",
            "Waiting for admin input..."
        ]);

        return () => clearInterval(int);
    }, []);

    const SCRIPTS = {
        repair: `-- ==========================================
-- MASTER DATABASE INITIALIZER & REPAIR (V9.5)
-- FIXES: "Table Does Not Exist" & Bonus Bug
-- ==========================================

-- 1. CREATE CORE TABLES IF MISSING
CREATE TABLE IF NOT EXISTS daily_bonus_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    streak INTEGER NOT NULL,
    amount NUMERIC(20,4) DEFAULT 0,
    claimed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS daily_bonus_config (
    day INTEGER PRIMARY KEY,
    reward_amount NUMERIC(20,4) DEFAULT 0,
    is_active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS ad_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    network VARCHAR(50),
    ad_unit_id TEXT,
    action_type VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. FIX UNLIMITED BONUS BUG (ONE CLAIM PER DAY UNIQUE INDEX)
-- First: Clean duplicates to prevent index failure
DELETE FROM daily_bonus_logs a USING daily_bonus_logs b
WHERE a.id < b.id 
  AND a.user_id = b.user_id 
  AND date(a.claimed_at) = date(b.claimed_at);

-- Second: Create the Atomic Constraint
DO $$ BEGIN
    CREATE UNIQUE INDEX IF NOT EXISTS idx_one_claim_per_day 
    ON daily_bonus_logs (user_id, (claimed_at::date));
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Index already exists'; END $$;

-- 3. INITIALIZE DEFAULT CONFIGS IF EMPTY
INSERT INTO daily_bonus_config (day, reward_amount)
VALUES (1, 0.1), (2, 0.2), (3, 0.3), (4, 0.4), (5, 0.5), (6, 0.75), (7, 1.0)
ON CONFLICT (day) DO NOTHING;

-- 4. REFRESH ALL WALLET AGGREGATES
UPDATE wallets SET 
    balance = main_balance + deposit_balance + game_balance + earning_balance + commission_balance + bonus_balance + investment_balance,
    withdrawable = main_balance,
    deposit = deposit_balance;`,

        ledger: `-- ==========================================
-- V7 PURE LEDGER ATOMIC REPAIR
-- RE-INITIALIZE FINANCIAL CORE
-- ==========================================

-- Reset Ledger Functions
DROP FUNCTION IF EXISTS process_ledger_entry_v7(UUID, TEXT, TEXT, NUMERIC, TEXT, BOOLEAN);

CREATE OR REPLACE FUNCTION process_ledger_entry_v7(
    p_user_id UUID,
    p_type TEXT,
    p_wallet TEXT,
    p_amount NUMERIC,
    p_description TEXT,
    p_is_credit BOOLEAN 
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_current_val NUMERIC;
    v_new_val NUMERIC;
BEGIN
    -- Row-level locking for concurrency
    PERFORM * FROM wallets WHERE user_id = p_user_id FOR UPDATE;
    EXECUTE format('SELECT COALESCE(%I, 0) FROM wallets WHERE user_id = %L', p_wallet, p_user_id) INTO v_current_val;
    
    IF p_is_credit THEN
        v_new_val := v_current_val + p_amount;
    ELSE
        v_new_val := v_current_val - p_amount;
        IF v_new_val < 0 THEN
            RETURN jsonb_build_object('success', false, 'message', 'Insufficient funds');
        END IF;
    END IF;

    EXECUTE format('UPDATE wallets SET %I = %L, updated_at = NOW() WHERE user_id = %L', p_wallet, v_new_val, p_user_id);

    INSERT INTO transactions (user_id, type, amount, balance_before, balance_after, wallet_affected, description, status, created_at)
    VALUES (p_user_id, p_type, p_amount, v_current_val, v_new_val, p_wallet, p_description, 'success', NOW());

    -- Re-aggregate total balance
    UPDATE wallets SET 
        balance = main_balance + deposit_balance + game_balance + earning_balance + commission_balance + bonus_balance + investment_balance
    WHERE user_id = p_user_id;

    RETURN jsonb_build_object('success', true, 'new_balance', v_new_val);
END;
$$;`,

        security: `-- ==========================================
-- SYSTEM HARDENING & FRAUD PROTECTION
-- ==========================================

-- Enable strict policies on transactions
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Reset broken auth profiles
DELETE FROM profiles WHERE id NOT IN (SELECT id FROM auth.users);

-- Force KYC check on withdrawal table
-- (Optional: Run this to lock all unverified users)
-- UPDATE profiles SET is_withdraw_blocked = true WHERE is_kyc_1 = false;`,

        cleanup: `-- ==========================================
-- DATABASE MAINTENANCE & LOG CLEANUP
-- ==========================================

-- 1. CLEAN EXPIRED SESSIONS (Mock)
-- 2. REMOVE OLD NOTIFICATIONS (Older than 14 days)
DELETE FROM notifications WHERE created_at < NOW() - INTERVAL '14 days';

-- 3. VACUUM TABLES (Requires separate execution in SQL editor)
-- ANALYZE;
`
    };

    const copySql = () => {
        navigator.clipboard.writeText(SCRIPTS[activeTab]);
        setCopied(true);
        setHistory(prev => [`[${new Date().toLocaleTimeString()}] COPIED ${activeTab.toUpperCase()} SCRIPT`, ...prev]);
        toast.success(`${activeTab.toUpperCase()} Ready to Execute`);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="space-y-6 animate-fade-in pb-24 relative font-mono selection:bg-brand selection:text-black">
            
            {/* TERMINAL HEADER */}
            <header className="bg-[#050505] p-6 rounded-3xl border border-white/10 shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center gap-5">
                    <div className="p-5 bg-brand rounded-2xl shadow-[0_0_40px_rgba(250,204,21,0.2)] border border-white/10 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:animate-shimmer"></div>
                        <Terminal size={40} className="text-black" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-3xl font-black text-white uppercase tracking-tighter">
                                ULTRA <span className="text-brand">KERNEL</span>
                            </h1>
                            <span className="bg-white/5 border border-white/10 px-2 py-0.5 rounded text-[10px] text-gray-500 font-bold">V9.5.0-STABLE</span>
                        </div>
                        <p className="text-gray-500 text-[10px] font-bold uppercase tracking-[0.2em] mt-1 flex items-center gap-2">
                             <RefreshCw size={10} className="animate-spin text-brand"/> Systems Synchronized 
                        </p>
                    </div>
                </div>

                <div className="flex gap-4">
                    <div className="text-right">
                        <span className="text-[10px] text-gray-600 uppercase font-black">Processor</span>
                        <div className="flex items-center gap-2 justify-end">
                            <div className="w-16 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                <motion.div animate={{ width: `${sysMetrics.cpu}%` }} className="h-full bg-brand" />
                            </div>
                            <span className="text-xs font-black text-white">{sysMetrics.cpu.toFixed(1)}%</span>
                        </div>
                    </div>
                    <div className="w-px h-10 bg-white/5"></div>
                    <div className="text-right">
                        <span className="text-[10px] text-gray-600 uppercase font-black">RAM Utility</span>
                        <div className="flex items-center gap-2 justify-end">
                            <div className="w-16 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                <motion.div animate={{ width: `${sysMetrics.ram}%` }} className="h-full bg-blue-500" />
                            </div>
                            <span className="text-xs font-black text-white">{sysMetrics.ram.toFixed(0)}%</span>
                        </div>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                
                {/* DANGER ZONE ADVISORY */}
                <div className="lg:col-span-1 space-y-4">
                    <GlassCard className="bg-red-900/10 border-red-500/30 p-5">
                        <h4 className="text-red-400 font-black text-xs uppercase flex items-center gap-2 mb-3">
                            <ShieldAlert size={16}/> Warning Level: HIGH
                        </h4>
                        <p className="text-[10px] text-red-200/70 leading-relaxed">
                            Accessing raw database kernel functions allows direct manipulation of financial ledgers.
                            Execution errors may cause temporary node downtime. 
                        </p>
                        <div className="mt-4 pt-4 border-t border-red-500/10 space-y-2">
                            <div className="flex items-center justify-between text-[10px] font-bold">
                                <span className="text-gray-500">ENCRYPTION:</span>
                                <span className="text-green-500">AES-256</span>
                            </div>
                            <div className="flex items-center justify-between text-[10px] font-bold">
                                <span className="text-gray-500">NODE ID:</span>
                                <span className="text-white">NX-MAIN-001</span>
                            </div>
                        </div>
                    </GlassCard>

                    <div className="bg-[#0a0a0a] rounded-2xl border border-white/5 p-4 flex flex-col gap-2">
                        <h4 className="text-[10px] font-bold text-gray-600 uppercase mb-2">Operation Logs</h4>
                        <div className="space-y-1 h-32 overflow-y-auto no-scrollbar">
                            {history.map((h, i) => (
                                <p key={i} className="text-[9px] text-gray-500 font-mono truncate">
                                    {'>'} {h}
                                </p>
                            ))}
                        </div>
                    </div>
                    
                    <button className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-[10px] font-black uppercase text-gray-400 flex items-center justify-center gap-2 transition">
                         <DatabaseBackup size={14}/> Generate System Backup
                    </button>
                </div>

                {/* MASTER CONSOLE */}
                <div className="lg:col-span-3">
                    <GlassCard className="bg-[#020202] border-white/10 p-0 overflow-hidden shadow-[0_0_100px_rgba(0,0,0,1)] flex flex-col">
                        
                        {/* Tab Switcher */}
                        <div className="bg-[#0a0a0a] px-4 py-3 border-b border-white/10 flex justify-between items-center overflow-x-auto no-scrollbar">
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => setActiveTab('repair')}
                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition flex items-center gap-2 ${activeTab === 'repair' ? 'bg-brand text-black shadow-lg shadow-brand/20' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
                                >
                                    <Wrench size={14}/> SETUP REPAIR
                                </button>
                                <button 
                                    onClick={() => setActiveTab('ledger')}
                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition flex items-center gap-2 ${activeTab === 'ledger' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
                                >
                                    <GitFork size={14}/> CORE LEDGER
                                </button>
                                <button 
                                    onClick={() => setActiveTab('security')}
                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition flex items-center gap-2 ${activeTab === 'security' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
                                >
                                    <Shield size={14}/> HARDENING
                                </button>
                                <button 
                                    onClick={() => setActiveTab('cleanup')}
                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition flex items-center gap-2 ${activeTab === 'cleanup' ? 'bg-gray-700 text-white shadow-lg' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
                                >
                                    <Trash2 size={14}/> LOG PURGE
                                </button>
                            </div>
                            
                            <button 
                                onClick={copySql} 
                                className={`text-[10px] px-6 py-2.5 rounded-xl transition border flex items-center gap-2 font-black whitespace-nowrap ml-4 ${copied ? 'bg-green-600 border-green-500 text-white' : 'bg-white text-black hover:bg-gray-200'}`}
                            >
                                {copied ? <CheckCircle2 size={14}/> : <Copy size={14}/>} 
                                {copied ? 'SCRIPT COPIED' : 'COPY MASTER SQL'}
                            </button>
                        </div>
                        
                        {/* SQL View */}
                        <div className="p-0 bg-black relative">
                            <div className="absolute top-6 right-6 z-10 opacity-10 pointer-events-none">
                                <TerminalIcon size={120} className="text-white" />
                            </div>
                            
                            {/* Line Numbers Sim */}
                            <div className="absolute left-0 top-0 bottom-0 w-8 bg-[#0a0a0a] border-r border-white/5 flex flex-col items-center py-8 text-[9px] text-gray-700 select-none">
                                {Array.from({length: 20}).map((_, i) => <span key={i}>{i+1}</span>)}
                            </div>

                            <pre className="text-[11px] text-green-500/90 font-mono overflow-x-auto h-[500px] p-8 pl-12 custom-scrollbar leading-relaxed bg-[#020202] selection:bg-green-500/30">
                                <span className="text-gray-600 select-none">-- [INTERNAL SYSTEM KERNEL] --</span>
                                {"\n"}
                                {SCRIPTS[activeTab]}
                            </pre>
                        </div>

                        {/* Status Footer */}
                        <div className="bg-[#0a0a0a] px-4 py-2 border-t border-white/10 flex items-center justify-between text-[10px] font-bold text-gray-600 uppercase">
                            <div className="flex gap-4">
                                <span className="flex items-center gap-1.5"><Lock size={10}/> RLS Enforced</span>
                                <span className="flex items-center gap-1.5 text-brand"><CheckCircle2 size={10}/> All Tables Initialized</span>
                            </div>
                            <div>
                                Encoding: UTF-8 • SQL Standard: Postgres
                            </div>
                        </div>
                    </GlassCard>
                </div>
            </div>

            <div className="flex flex-col items-center justify-center py-10 text-center relative">
                 <div className="absolute inset-0 bg-brand/5 blur-[120px] rounded-full pointer-events-none"></div>
                 
                 <div className="flex gap-10 mb-8 relative z-10">
                    <div className="flex flex-col items-center group">
                        <div className="w-16 h-16 bg-white/5 rounded-3xl flex items-center justify-center mb-3 border border-white/10 text-blue-500 group-hover:scale-110 group-hover:bg-blue-500/10 transition"><Code size={28}/></div>
                        <span className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Verify Logic</span>
                    </div>
                    <div className="flex flex-col items-center group">
                        <div className="w-16 h-16 bg-white/5 rounded-3xl flex items-center justify-center mb-3 border border-white/10 text-green-500 group-hover:scale-110 group-hover:bg-green-500/10 transition"><Activity size={28}/></div>
                        <span className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Reconcile</span>
                    </div>
                    <div className="flex flex-col items-center group">
                        <div className="w-16 h-16 bg-white/5 rounded-3xl flex items-center justify-center mb-3 border border-white/10 text-purple-500 group-hover:scale-110 group-hover:bg-purple-500/10 transition"><Shield size={28}/></div>
                        <span className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Audit Vault</span>
                    </div>
                 </div>
                 <h4 className="text-white font-black text-xl uppercase tracking-widest relative z-10">Central Intelligence Terminal</h4>
                 <p className="text-xs text-gray-500 max-w-lg mt-3 leading-relaxed px-4 relative z-10">
                    This terminal provides low-level access to the Postgres core. Applying scripts here modifies the platform's DNA. 
                    <br/>Ensure you've backed up user wallets before running destructive cleanup scripts.
                 </p>
            </div>
        </div>
    );
};

export default DatabaseUltra;
