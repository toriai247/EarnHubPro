
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
    const [activeTab, setActiveTab] = useState<'repair' | 'ledger' | 'affiliate' | 'cleanup'>('repair');
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
        
        setHistory([
            "Kernel initialized at " + new Date().toLocaleTimeString(),
            "Affiliate Tracking Module Loaded",
            "Waiting for admin input..."
        ]);

        return () => clearInterval(int);
    }, []);

    const SCRIPTS = {
        repair: `-- 1. CORE TABLES REPAIR
CREATE TABLE IF NOT EXISTS daily_bonus_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    streak INTEGER NOT NULL,
    amount NUMERIC(20,4) DEFAULT 0,
    claimed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. FIX UNLIMITED BONUS BUG
DO $$ BEGIN
    CREATE UNIQUE INDEX IF NOT EXISTS idx_one_claim_per_day 
    ON daily_bonus_logs (user_id, (claimed_at::date));
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Index exists'; END $$;

-- 3. REFRESH WALLETS
UPDATE wallets SET 
    balance = main_balance + deposit_balance + game_balance + earning_balance + commission_balance + bonus_balance + investment_balance,
    withdrawable = main_balance,
    deposit = deposit_balance;`,

        ledger: `-- V7 PURE LEDGER ATOMIC REPAIR
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
    PERFORM * FROM wallets WHERE user_id = p_user_id FOR UPDATE;
    EXECUTE format('SELECT COALESCE(%I, 0) FROM wallets WHERE user_id = %L', p_wallet, p_user_id) INTO v_current_val;
    
    IF p_is_credit THEN v_new_val := v_current_val + p_amount;
    ELSE v_new_val := v_current_val - p_amount;
        IF v_new_val < 0 THEN RETURN jsonb_build_object('success', false, 'message', 'Insufficient funds'); END IF;
    END IF;

    EXECUTE format('UPDATE wallets SET %I = %L, updated_at = NOW() WHERE user_id = %L', p_wallet, v_new_val, p_user_id);
    INSERT INTO transactions (user_id, type, amount, balance_before, balance_after, wallet_affected, description, status, created_at)
    VALUES (p_user_id, p_type, p_amount, v_current_val, v_new_val, p_wallet, p_description, 'success', NOW());

    UPDATE wallets SET balance = main_balance + deposit_balance + game_balance + earning_balance + commission_balance + bonus_balance + investment_balance WHERE user_id = p_user_id;
    RETURN jsonb_build_object('success', true, 'new_balance', v_new_val);
END; $$;`,

        affiliate: `-- ==========================================
-- AFFILIATE SYSTEM KERNEL (UNLIMITED EARN)
-- ==========================================

-- 1. Create Tracking Table
CREATE TABLE IF NOT EXISTS unlimited_earn_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    action_type VARCHAR(20) NOT NULL, -- 'view' or 'click'
    amount NUMERIC(20,4) DEFAULT 0,
    visitor_ip VARCHAR(50),
    country VARCHAR(100),
    city VARCHAR(100),
    device_info VARCHAR(100),
    browser VARCHAR(50),
    os VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Tracking RPC (Rewarding logic)
CREATE OR REPLACE FUNCTION track_unlimited_action_v2(
    p_referrer_uid INTEGER,
    p_action_type TEXT,
    p_visitor_ip TEXT,
    p_country TEXT DEFAULT 'Unknown',
    p_city TEXT DEFAULT 'Unknown',
    p_device_type TEXT DEFAULT 'Desktop',
    p_browser TEXT DEFAULT 'Unknown',
    p_os TEXT DEFAULT 'Unknown',
    p_user_agent TEXT DEFAULT ''
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_ref_id UUID;
    v_reward NUMERIC;
BEGIN
    -- Get Referrer UUID
    SELECT id INTO v_ref_id FROM profiles WHERE user_uid = p_referrer_uid;
    IF v_ref_id IS NULL THEN RETURN jsonb_build_object('success', false, 'message', 'Invalid Node'); END IF;

    -- Set Reward magnitude
    IF p_action_type = 'view' THEN v_reward := 0.10;
    ELSIF p_action_type = 'click' THEN v_reward := 0.05;
    ELSE v_reward := 0;
    END IF;

    -- Deduplicate Views (Prevent spam from same IP within 1 hour)
    IF EXISTS (
        SELECT 1 FROM unlimited_earn_logs 
        WHERE visitor_ip = p_visitor_ip 
        AND action_type = p_action_type 
        AND referrer_id = v_ref_id
        AND created_at > (NOW() - INTERVAL '1 hour')
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Spam detected');
    END IF;

    -- Log Activity
    INSERT INTO unlimited_earn_logs (referrer_id, action_type, amount, visitor_ip, country, city, device_info, browser, os, user_agent)
    VALUES (v_ref_id, p_action_type, v_reward, p_visitor_ip, p_country, p_city, p_device_type, p_browser, p_os, p_user_agent);

    -- Process Payment
    IF v_reward > 0 THEN
        PERFORM process_ledger_entry_v7(v_ref_id, 'TASK_EARN', 'earning_balance', v_reward, 'Affiliate yield: ' || p_action_type, true);
    END IF;

    RETURN jsonb_build_object('success', true, 'reward', v_reward);
END; $$;`,

        cleanup: `-- LOG CLEANUP
DELETE FROM notifications WHERE created_at < NOW() - INTERVAL '14 days';
DELETE FROM unlimited_earn_logs WHERE created_at < NOW() - INTERVAL '30 days';
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
            <header className="bg-[#050505] p-6 rounded-3xl border border-white/10 shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center gap-5">
                    <div className="p-5 bg-brand rounded-2xl shadow-[0_0_40px_rgba(250,204,21,0.2)] border border-white/10">
                        <Terminal size={40} className="text-black" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-3xl font-black text-white uppercase tracking-tighter">ULTRA <span className="text-brand">KERNEL</span></h1>
                        </div>
                        <p className="text-gray-500 text-[10px] font-bold uppercase tracking-[0.2em] mt-1">V9.5.0-STABLE</p>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-1 space-y-4">
                    <GlassCard className="bg-red-900/10 border-red-500/30 p-5">
                        <h4 className="text-red-400 font-black text-xs uppercase mb-3 flex items-center gap-2"><ShieldAlert size={16}/> Critical Mode</h4>
                        <p className="text-[10px] text-red-200/70 leading-relaxed">Execute scripts in Supabase SQL Editor to repair broken modules.</p>
                    </GlassCard>
                </div>

                <div className="lg:col-span-3">
                    <GlassCard className="bg-[#020202] border-white/10 p-0 overflow-hidden shadow-2xl flex flex-col">
                        <div className="bg-[#0a0a0a] px-4 py-3 border-b border-white/10 flex justify-between items-center overflow-x-auto no-scrollbar">
                            <div className="flex gap-2">
                                <button onClick={() => setActiveTab('repair')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition ${activeTab === 'repair' ? 'bg-brand text-black' : 'text-gray-500'}`}>REPAIR</button>
                                <button onClick={() => setActiveTab('ledger')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition ${activeTab === 'ledger' ? 'bg-blue-600 text-white' : 'text-gray-500'}`}>LEDGER</button>
                                <button onClick={() => setActiveTab('affiliate')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition ${activeTab === 'affiliate' ? 'bg-cyan-600 text-white' : 'text-gray-500'}`}>AFFILIATE</button>
                                <button onClick={() => setActiveTab('cleanup')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition ${activeTab === 'cleanup' ? 'bg-gray-700 text-white' : 'text-gray-500'}`}>CLEAN</button>
                            </div>
                            <button onClick={copySql} className={`text-[10px] px-6 py-2.5 rounded-xl transition border font-black ${copied ? 'bg-green-600 border-green-500 text-white' : 'bg-white text-black'}`}>
                                {copied ? 'COPIED' : 'COPY SQL'}
                            </button>
                        </div>
                        <pre className="text-[11px] text-green-500/90 font-mono overflow-x-auto h-[400px] p-8 leading-relaxed bg-[#020202]">
                            {SCRIPTS[activeTab]}
                        </pre>
                    </GlassCard>
                </div>
            </div>
        </div>
    );
};

export default DatabaseUltra;
