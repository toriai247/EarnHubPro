
import React, { useEffect, useState } from 'react';
import GlassCard from '../../components/GlassCard';
import { supabase } from '../../integrations/supabase/client';
import { 
    Database, Download, Server, ShieldCheck, 
    FileJson, Clock, RefreshCw, Loader2, 
    Code, Terminal, Save, Trash2, HardDrive, Globe, Copy, Table, AlertTriangle, Skull, Users, BellRing, Radio
} from 'lucide-react';
import { useUI } from '../../context/UIContext';
import { motion, AnimatePresence } from 'framer-motion';

// List of all tables to backup
const TABLE_LIST = [
    'active_ludo_matches', 'bot_profiles', 'currency_rates', 'deposit_bonuses',
    'deposit_requests', 'game_config', 'game_history', 'game_settings',
    'help_requests', 'investment_plans', 'investments', 'ludo_cards',
    'notifications', 'payment_methods', 'player_rigging', 'profiles',
    'referrals', 'spin_items', 'system_config', 'tasks', 'transactions',
    'user_biometrics', 'user_tasks', 'user_withdrawal_methods',
    'video_submissions', 'wallets', 'withdraw_requests', 'withdrawal_settings'
];

const BROADCAST_SQL = `-- NOTIFICATION SYSTEM SETUP
-- Run this to fix "Function not found" and "Policy already exists" errors.

-- 1. DROP EXISTING OBJECTS TO AVOID CONFLICTS
DROP FUNCTION IF EXISTS admin_broadcast_notification(TEXT, TEXT, TEXT);
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admins can insert notifications" ON public.notifications;

-- 2. CREATE TABLE (If not exists)
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT CHECK (type IN ('info', 'success', 'warning', 'error')) DEFAULT 'info',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. ENABLE RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 4. CREATE POLICIES
CREATE POLICY "Users can view own notifications"
ON public.notifications FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can insert notifications"
ON public.notifications FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND admin_user = true
  )
);

-- 5. CREATE BROADCAST FUNCTION
CREATE OR REPLACE FUNCTION admin_broadcast_notification(
    p_title TEXT,
    p_message TEXT,
    p_type TEXT
) RETURNS VOID AS $$
BEGIN
    -- Insert notification for every active user profile
    INSERT INTO notifications (user_id, title, message, type, is_read)
    SELECT id, p_title, p_message, p_type, false
    FROM profiles
    WHERE is_suspended = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
`;

const NOTIFICATION_TRIGGERS_SQL = `-- AUTO NOTIFICATION SYSTEM V2
-- Run this to enable automatic notifications for Deposits, Withdrawals, and Referrals.

-- 1. Function to Notify on Deposit Status Change
CREATE OR REPLACE FUNCTION notify_deposit_update() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    INSERT INTO notifications (user_id, title, message, type, is_read)
    VALUES (NEW.user_id, 'Deposit Successful', 'Your deposit of $' || NEW.amount || ' via ' || NEW.method_name || ' has been approved.', 'success', false);
  ELSIF NEW.status = 'rejected' AND OLD.status != 'rejected' THEN
    INSERT INTO notifications (user_id, title, message, type, is_read)
    VALUES (NEW.user_id, 'Deposit Rejected', 'Your deposit request was rejected. Reason: ' || COALESCE(NEW.admin_note, 'Contact Support'), 'error', false);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_deposit_update ON deposit_requests;
CREATE TRIGGER on_deposit_update
AFTER UPDATE ON deposit_requests
FOR EACH ROW EXECUTE FUNCTION notify_deposit_update();

-- 2. Function to Notify on Withdrawal Status Change
CREATE OR REPLACE FUNCTION notify_withdraw_update() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    INSERT INTO notifications (user_id, title, message, type, is_read)
    VALUES (NEW.user_id, 'Payment Sent', 'Your withdrawal of $' || NEW.amount || ' has been processed successfully.', 'success', false);
  ELSIF NEW.status = 'rejected' AND OLD.status != 'rejected' THEN
    INSERT INTO notifications (user_id, title, message, type, is_read)
    VALUES (NEW.user_id, 'Withdrawal Refunded', 'Your withdrawal request was rejected and funds returned.', 'error', false);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_withdraw_update ON withdraw_requests;
CREATE TRIGGER on_withdraw_update
AFTER UPDATE ON withdraw_requests
FOR EACH ROW EXECUTE FUNCTION notify_withdraw_update();

-- 3. Function to Notify on New Referral
CREATE OR REPLACE FUNCTION notify_new_referral() RETURNS TRIGGER AS $$
DECLARE
  referrer_name TEXT;
  new_user_name TEXT;
BEGIN
  SELECT name_1 INTO new_user_name FROM profiles WHERE id = NEW.referred_id;
  
  INSERT INTO notifications (user_id, title, message, type, is_read)
  VALUES (NEW.referrer_id, 'New Team Member', COALESCE(new_user_name, 'A new user') || ' has joined your team!', 'info', false);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_referral_add ON referrals;
CREATE TRIGGER on_referral_add
AFTER INSERT ON referrals
FOR EACH ROW EXECUTE FUNCTION notify_new_referral();

-- 4. Function to Notify on Investment Completion
CREATE OR REPLACE FUNCTION notify_investment_complete() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    INSERT INTO notifications (user_id, title, message, type, is_read)
    VALUES (NEW.user_id, 'Plan Matured', 'Your investment plan ' || NEW.plan_name || ' has finished. Capital returned.', 'success', false);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_investment_update ON investments;
CREATE TRIGGER on_investment_update
AFTER UPDATE ON investments
FOR EACH ROW EXECUTE FUNCTION notify_investment_complete();
`;

const PUBLIC_PROFILE_SQL = `-- ENABLE PUBLIC PROFILES & USER SEARCH
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON "public"."profiles";

CREATE POLICY "Enable read access for authenticated users"
ON "public"."profiles"
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (true);
`;

const RESET_SCRIPT_SQL = `-- DANGER: SYSTEM RESET SCRIPT
-- This will delete ALL transaction history but keep user accounts.
BEGIN;
TRUNCATE TABLE transactions, deposit_requests, withdraw_requests, game_history, investments, referrals, user_tasks, video_submissions, active_ludo_matches CASCADE;
UPDATE wallets SET 
  balance = 0, main_balance = 0, deposit_balance = 0, 
  game_balance = 0, earning_balance = 0, investment_balance = 0, 
  referral_balance = 0, commission_balance = 0, bonus_balance = 0,
  deposit = 0, withdrawable = 0, total_earning = 0, 
  today_earning = 0, pending_withdraw = 0, referral_earnings = 0;
UPDATE wallets SET bonus_balance = 1.00;
INSERT INTO transactions (id, user_id, type, amount, status, description, created_at)
SELECT gen_random_uuid(), user_id, 'bonus', 1.00, 'success', 'System Reset Bonus (120 TK)', now()
FROM wallets;
COMMIT;
`;

interface BackupFile {
    name: string;
    id: string;
    created_at: string;
    metadata: any;
}

const DatabaseUltra: React.FC = () => {
    const { toast, confirm } = useUI();
    const [backups, setBackups] = useState<BackupFile[]>([]);
    const [loading, setLoading] = useState(false);
    const [backupProgress, setBackupProgress] = useState(0);
    const [activeTab, setActiveTab] = useState<'recovery' | 'schema' | 'danger'>('recovery');
    const [timeUntilBackup, setTimeUntilBackup] = useState<string>('--:--:--');
    const [tableCounts, setTableCounts] = useState<Record<string, number>>({});

    useEffect(() => {
        fetchBackups();
    }, []);

    useEffect(() => {
        if (activeTab === 'schema') {
            fetchTableCounts();
        }
    }, [activeTab]);

    const fetchTableCounts = async () => {
        const counts: Record<string, number> = {};
        const promises = TABLE_LIST.map(async (table) => {
            const { count } = await supabase.from(table).select('*', { count: 'exact', head: true });
            return { table, count: count || 0 };
        });
        
        try {
            const results = await Promise.all(promises);
            results.forEach(r => counts[r.table] = r.count);
            setTableCounts(counts);
        } catch (e) {
            console.error("Error fetching table counts", e);
        }
    };

    const getNextBackupTime = () => {
        const now = new Date();
        const bstOffset = 6 * 60 * 60 * 1000;
        const bstNow = new Date(now.getTime() + bstOffset);
        const nextTargetBST = new Date(bstNow);
        nextTargetBST.setUTCHours(0, 0, 0, 0); 
        
        if (nextTargetBST.getTime() <= bstNow.getTime()) {
            nextTargetBST.setDate(nextTargetBST.getDate() + 1);
        }
        return new Date(nextTargetBST.getTime() - bstOffset);
    };

    useEffect(() => {
        const timer = setInterval(() => {
            const now = new Date();
            const target = getNextBackupTime();
            const diff = target.getTime() - now.getTime();

            const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const s = Math.floor((diff % (1000 * 60)) / 1000);
            setTimeUntilBackup(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);

            if (diff <= 1000 && diff > 0) {
                handleGenerateBackup(true);
            }
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const fetchBackups = async () => {
        const { data, error } = await supabase.storage.from('db-backups').list('', {
            limit: 10,
            sortBy: { column: 'created_at', order: 'desc' },
        });
        if (data) {
            setBackups(data as BackupFile[]);
        }
    };

    const handleGenerateBackup = async (isAuto = false) => {
        if (loading) return;
        setLoading(true);
        setBackupProgress(0);
        
        try {
            const fullDump: any = {
                timestamp: new Date().toISOString(),
                environment: 'production',
                tables: {}
            };

            for (let i = 0; i < TABLE_LIST.length; i++) {
                const tableName = TABLE_LIST[i];
                const { data, error } = await supabase.from(tableName).select('*');
                
                if (!error && data) {
                    fullDump.tables[tableName] = data;
                }
                setBackupProgress(Math.round(((i + 1) / TABLE_LIST.length) * 100));
            }

            const jsonString = JSON.stringify(fullDump, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const fileName = `backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;

            const { error: uploadError } = await supabase.storage
                .from('db-backups')
                .upload(fileName, blob, { upsert: true });

            if (uploadError) throw uploadError;

            if (!isAuto) {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                toast.success("Backup Uploaded & Downloaded!");
            } else {
                toast.info("Daily Backup Completed.");
            }
            
            fetchBackups();

        } catch (e: any) {
            console.error(e);
            if (!isAuto) toast.error("Backup Failed: " + e.message);
        } finally {
            setLoading(false);
            setBackupProgress(0);
        }
    };

    const handleDownload = async (fileName: string) => {
        const { data, error } = await supabase.storage.from('db-backups').download(fileName);
        if (error) {
            toast.error("Download Error");
            return;
        }
        const url = URL.createObjectURL(data);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleDelete = async (fileName: string) => {
        if (!await confirm("Delete this backup permanently?")) return;
        await supabase.storage.from('db-backups').remove([fileName]);
        fetchBackups();
        toast.info("Backup deleted");
    };

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h2 className="text-3xl font-display font-black text-cyan-400 flex items-center gap-3">
                        <HardDrive className="text-white" size={32} /> DATABASE ULTRA
                    </h2>
                    <p className="text-gray-400 text-sm mt-1">
                        Disaster Recovery • Schema Visualization • Secure Vault
                    </p>
                </div>
                
                <div className="flex gap-3">
                    <button 
                        onClick={() => handleGenerateBackup(false)}
                        disabled={loading}
                        className="bg-cyan-500 text-black px-6 py-3 rounded-xl font-black flex items-center gap-2 hover:bg-cyan-400 transition shadow-[0_0_20px_rgba(34,211,238,0.3)] disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : <Save size={20} />} 
                        {loading ? `${backupProgress}%` : 'GENERATE FULL BACKUP'}
                    </button>
                </div>
            </div>

            {/* TABS */}
            <div className="flex border-b border-white/10 overflow-x-auto no-scrollbar">
                <button 
                    onClick={() => setActiveTab('recovery')}
                    className={`px-6 py-3 font-bold text-sm transition whitespace-nowrap ${activeTab === 'recovery' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-500 hover:text-white'}`}
                >
                    Recovery Vault
                </button>
                <button 
                    onClick={() => setActiveTab('schema')}
                    className={`px-6 py-3 font-bold text-sm transition whitespace-nowrap ${activeTab === 'schema' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-500 hover:text-white'}`}
                >
                    Schema Visualizer
                </button>
                <button 
                    onClick={() => setActiveTab('danger')}
                    className={`px-6 py-3 font-bold text-sm transition whitespace-nowrap flex items-center gap-2 ${activeTab === 'danger' ? 'text-red-500 border-b-2 border-red-500' : 'text-red-900/60 hover:text-red-400'}`}
                >
                    <AlertTriangle size={14}/> Danger Zone
                </button>
            </div>

            {/* TAB CONTENT */}
            <AnimatePresence mode="wait">
                {activeTab === 'recovery' && (
                    <motion.div 
                        key="recovery"
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                        className="space-y-6"
                    >
                        {/* Latest Snapshot Card */}
                        <GlassCard className="border-cyan-500/30 bg-cyan-950/10 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-6 opacity-10"><Server size={120} /></div>
                            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                                <ShieldCheck className="text-green-400" /> Secure Cloud Storage
                            </h3>
                            <p className="text-sm text-gray-400 max-w-2xl mb-6">
                                Backups are stored in the <span className="text-white font-mono bg-white/10 px-1 rounded">db-backups</span> bucket. 
                                Files contain a full JSON dump of all {TABLE_LIST.length} tables. 
                                In case of data loss, download the JSON and use a custom script to re-seed the database.
                            </p>
                            
                            <div className="flex flex-wrap gap-4">
                                <div className="flex items-center gap-2 bg-black/30 px-3 py-1.5 rounded-lg border border-cyan-500/30">
                                    <Clock size={14} className="text-cyan-400 animate-pulse" />
                                    <span className="text-xs text-cyan-400 font-mono font-bold">{timeUntilBackup}</span>
                                    <span className="text-[9px] text-gray-500 uppercase ml-1">Next Auto-Run (BST)</span>
                                </div>
                                <div className="flex items-center gap-2 bg-black/30 px-3 py-1.5 rounded-lg border border-white/10">
                                    <Globe size={14} className="text-gray-400" />
                                    <span className="text-[10px] text-gray-400 uppercase">Region: Bangladesh (UTC+6)</span>
                                </div>
                            </div>
                        </GlassCard>

                        {/* Backup List */}
                        <div className="bg-black/40 border border-white/10 rounded-2xl overflow-hidden">
                            <div className="p-4 border-b border-white/10 bg-white/5 flex justify-between items-center">
                                <h4 className="font-bold text-white flex items-center gap-2"><Clock size={16}/> Backup Timeline</h4>
                                <button onClick={fetchBackups} className="text-gray-400 hover:text-white"><RefreshCw size={16}/></button>
                            </div>
                            <div className="divide-y divide-white/5">
                                {backups.length === 0 ? (
                                    <div className="p-8 text-center text-gray-500">No backups found. Generate one now.</div>
                                ) : (
                                    backups.map((file) => (
                                        <div key={file.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition group">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-blue-500/20 text-blue-400 rounded-lg flex items-center justify-center border border-blue-500/30">
                                                    <FileJson size={20} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-white">{file.name}</p>
                                                    <p className="text-xs text-gray-500">{new Date(file.created_at).toLocaleString()}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <button 
                                                    onClick={() => handleDownload(file.name)}
                                                    className="px-4 py-2 bg-white/5 hover:bg-green-500/20 text-green-400 border border-white/10 hover:border-green-500/50 rounded-lg text-xs font-bold flex items-center gap-2 transition"
                                                >
                                                    <Download size={14} /> Download JSON
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(file.name)}
                                                    className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}

                {activeTab === 'schema' && (
                    <motion.div
                        key="schema"
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                        className="space-y-6"
                    >
                        {/* Database Statistics */}
                        <div className="mb-4">
                            <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                                <Table size={18} className="text-cyan-400"/> Table Statistics
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                {TABLE_LIST.map(table => (
                                    <div key={table} className="bg-white/5 border border-white/10 p-3 rounded-xl flex justify-between items-center group hover:border-cyan-500/30 transition">
                                        <span className="text-xs text-gray-400 truncate max-w-[130px]" title={table}>{table}</span>
                                        <span className="text-xs font-black text-cyan-400 font-mono bg-cyan-900/20 px-2 py-0.5 rounded border border-cyan-500/20">
                                            {tableCounts[table] !== undefined ? tableCounts[table].toLocaleString() : '-'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}

                {activeTab === 'danger' && (
                    <motion.div
                        key="danger"
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                        className="space-y-6"
                    >
                        {/* BROADCAST SQL */}
                        <GlassCard className="bg-purple-950/20 border-purple-500/40 relative overflow-hidden">
                            <div className="absolute -right-10 -bottom-10 opacity-10"><Radio size={200} className="text-purple-500"/></div>
                            <h3 className="text-2xl font-black text-purple-400 mb-4 flex items-center gap-2 uppercase tracking-widest">
                                <Radio size={32} /> Notification System Setup
                            </h3>
                            <p className="text-gray-300 text-sm max-w-xl mb-6 leading-relaxed">
                                Enable the "Send to All" feature in NotiSender by creating the tables and helper function.
                            </p>

                            <div className="bg-black/50 rounded-xl border border-purple-500/30 p-4 mb-4">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-purple-400 text-xs font-bold font-mono">NOTIFICATION_SETUP.SQL</span>
                                    <button 
                                        onClick={() => { navigator.clipboard.writeText(BROADCAST_SQL); toast.success("SQL Copied!"); }}
                                        className="text-xs bg-purple-600 text-white px-3 py-1 rounded font-bold hover:bg-purple-500 flex items-center gap-1"
                                    >
                                        <Copy size={12}/> Copy SQL
                                    </button>
                                </div>
                                <pre className="text-[10px] text-purple-200/80 font-mono whitespace-pre-wrap select-text h-40 overflow-y-auto custom-scrollbar">
                                    {BROADCAST_SQL}
                                </pre>
                            </div>
                        </GlassCard>

                        {/* NOTIFICATION TRIGGERS (NEW) */}
                        <GlassCard className="bg-blue-950/20 border-blue-500/40 relative overflow-hidden">
                            <div className="absolute -right-10 -bottom-10 opacity-10"><BellRing size={200} className="text-blue-500"/></div>
                            <h3 className="text-2xl font-black text-blue-400 mb-4 flex items-center gap-2 uppercase tracking-widest">
                                <BellRing size={32} /> Auto-Notification Triggers
                            </h3>
                            <p className="text-gray-300 text-sm max-w-xl mb-6 leading-relaxed">
                                Install database triggers to automatically send notifications to users for specific events (Deposit Approved, Withdrawal Paid, New Referral, etc.). This makes the system "Live".
                            </p>

                            <div className="bg-black/50 rounded-xl border border-blue-500/30 p-4 mb-4">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-blue-400 text-xs font-bold font-mono">AUTO_NOTIFY_TRIGGERS.SQL</span>
                                    <button 
                                        onClick={() => { navigator.clipboard.writeText(NOTIFICATION_TRIGGERS_SQL); toast.success("SQL Copied!"); }}
                                        className="text-xs bg-blue-600 text-white px-3 py-1 rounded font-bold hover:bg-blue-500 flex items-center gap-1"
                                    >
                                        <Copy size={12}/> Copy SQL
                                    </button>
                                </div>
                                <pre className="text-[10px] text-blue-200/80 font-mono whitespace-pre-wrap select-text h-32 overflow-y-auto custom-scrollbar">
                                    {NOTIFICATION_TRIGGERS_SQL}
                                </pre>
                            </div>
                        </GlassCard>

                        {/* RLS POLICY HELPER */}
                        <GlassCard className="bg-green-950/20 border-green-500/40 relative overflow-hidden">
                            <div className="absolute -right-10 -bottom-10 opacity-10"><Users size={200} className="text-green-500"/></div>
                            <h3 className="text-2xl font-black text-green-400 mb-4 flex items-center gap-2 uppercase tracking-widest">
                                <ShieldCheck size={32} /> Enable Public Profiles
                            </h3>
                            <p className="text-gray-300 text-sm max-w-xl mb-6 leading-relaxed">
                                If users cannot see other profiles or search doesn't work, it means **Row Level Security (RLS)** is blocking read access. 
                                Run the script below in your Supabase SQL Editor to fix it.
                            </p>

                            <div className="bg-black/50 rounded-xl border border-green-500/30 p-4 mb-4">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-green-400 text-xs font-bold font-mono">ENABLE_PUBLIC_PROFILES.SQL</span>
                                    <button 
                                        onClick={() => { navigator.clipboard.writeText(PUBLIC_PROFILE_SQL); toast.success("Policy SQL Copied!"); }}
                                        className="text-xs bg-green-600 text-white px-3 py-1 rounded font-bold hover:bg-green-500 flex items-center gap-1"
                                    >
                                        <Copy size={12}/> Copy SQL
                                    </button>
                                </div>
                                <pre className="text-[10px] text-green-200/80 font-mono whitespace-pre-wrap select-text h-32 overflow-y-auto custom-scrollbar">
                                    {PUBLIC_PROFILE_SQL}
                                </pre>
                            </div>
                        </GlassCard>

                        {/* RESET */}
                        <GlassCard className="bg-red-950/20 border-red-500/40 relative overflow-hidden">
                            <div className="absolute -right-10 -bottom-10 opacity-20"><Skull size={200} className="text-red-500"/></div>
                            <h3 className="text-2xl font-black text-red-500 mb-4 flex items-center gap-2 uppercase tracking-widest">
                                <AlertTriangle size={32} /> Emergency Reset
                            </h3>
                            <p className="text-gray-300 text-sm max-w-xl mb-6 leading-relaxed">
                                Use this tool to wipe all user transaction history while keeping user accounts intact. 
                                It will generate a script to:
                                <br/><br/>
                                <ul className="list-disc pl-5 space-y-1 text-red-300">
                                    <li>Delete all transactions, games, and investment records.</li>
                                    <li>Reset all wallet balances to 0.</li>
                                    <li><strong>Credit every user with $1.00 USD (120 TK)</strong> bonus.</li>
                                </ul>
                            </p>

                            <div className="bg-black/50 rounded-xl border border-red-500/30 p-4 mb-4">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-red-400 text-xs font-bold font-mono">RESET_PROTOCOL_V1.SQL</span>
                                    <button 
                                        onClick={() => { navigator.clipboard.writeText(RESET_SCRIPT_SQL); toast.success("Reset Script Copied!"); }}
                                        className="text-xs bg-red-600 text-white px-3 py-1 rounded font-bold hover:bg-red-500 flex items-center gap-1"
                                    >
                                        <Copy size={12}/> Copy Script
                                    </button>
                                </div>
                                <pre className="text-[10px] text-red-200/80 font-mono whitespace-pre-wrap select-text h-40 overflow-y-auto custom-scrollbar">
                                    {RESET_SCRIPT_SQL}
                                </pre>
                            </div>
                        </GlassCard>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default DatabaseUltra;
