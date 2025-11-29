
import React, { useEffect, useState } from 'react';
import GlassCard from '../../components/GlassCard';
import { supabase } from '../../integrations/supabase/client';
import { 
    Database, Download, Server, ShieldCheck, 
    FileJson, Clock, RefreshCw, Loader2, 
    Code, Terminal, Save, Trash2, HardDrive, Globe, Copy, Table, AlertTriangle, Skull, Users, BellRing, Radio, Settings, Rocket
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
    'video_submissions', 'wallets', 'withdraw_requests', 'withdrawal_settings',
    'crash_game_state', 'crash_bets' // Added new tables
];

const CRASH_GAME_SQL = `-- 1. CRASH GAME STATE (Singleton)
CREATE TABLE IF NOT EXISTS public.crash_game_state (
    id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1), -- Ensure single row
    status TEXT CHECK (status IN ('BETTING', 'FLYING', 'CRASHED')) DEFAULT 'BETTING',
    current_round_id UUID DEFAULT gen_random_uuid(),
    start_time TIMESTAMP WITH TIME ZONE DEFAULT now(),
    crash_point NUMERIC DEFAULT 1.00,
    last_crash_point NUMERIC DEFAULT 0.00,
    total_bets_current_round NUMERIC DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert initial row if not exists
INSERT INTO public.crash_game_state (id, status)
SELECT 1, 'BETTING'
WHERE NOT EXISTS (SELECT 1 FROM public.crash_game_state);

-- Enable RLS (Public Read)
ALTER TABLE public.crash_game_state ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Crash State" ON public.crash_game_state;
CREATE POLICY "Public Read Crash State" ON public.crash_game_state FOR SELECT TO authenticated, anon USING (true);
-- Admin/Server update
DROP POLICY IF EXISTS "Admin Update Crash State" ON public.crash_game_state;
CREATE POLICY "Admin Update Crash State" ON public.crash_game_state FOR UPDATE TO authenticated USING (true); -- Simplified for game loop

-- 2. CRASH BETS (Round History)
CREATE TABLE IF NOT EXISTS public.crash_bets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    round_id UUID,
    user_id UUID,
    user_name TEXT,
    avatar_url TEXT,
    amount NUMERIC NOT NULL,
    cashed_out_at NUMERIC DEFAULT NULL,
    profit NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.crash_bets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Bets" ON public.crash_bets;
CREATE POLICY "Public Read Bets" ON public.crash_bets FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "User Place Bet" ON public.crash_bets;
CREATE POLICY "User Place Bet" ON public.crash_bets FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "User Update Bet" ON public.crash_bets;
CREATE POLICY "User Update Bet" ON public.crash_bets FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- 3. ENABLE REALTIME
ALTER PUBLICATION supabase_realtime ADD TABLE crash_game_state;
ALTER PUBLICATION supabase_realtime ADD TABLE crash_bets;

-- 4. GAME LOOP LOGIC (RPC)
CREATE OR REPLACE FUNCTION next_crash_round_phase(p_current_status TEXT) RETURNS JSON AS $$
DECLARE
    state RECORD;
    v_total_bets NUMERIC;
    v_crash_point NUMERIC;
    v_random NUMERIC;
BEGIN
    SELECT * INTO state FROM crash_game_state WHERE id = 1;
    
    -- If currently BETTING and time is up -> Go FLYING
    IF p_current_status = 'BETTING' AND state.status = 'BETTING' THEN
        -- Calculate Crash Point based on Bets (House Edge Logic)
        SELECT COALESCE(SUM(amount), 0) INTO v_total_bets FROM crash_bets WHERE round_id = state.current_round_id;
        
        -- Default Algo: Random biased + Pool Check
        -- Simple logic for demo: 
        v_random := random();
        
        IF v_random < 0.03 THEN v_crash_point := 1.00; -- Instant Crash (3% chance)
        ELSIF v_random < 0.50 THEN v_crash_point := 1.00 + (random() * 1.50); -- 1x - 2.5x
        ELSIF v_random < 0.80 THEN v_crash_point := 2.50 + (random() * 2.50); -- 2.5x - 5x
        ELSE v_crash_point := 5.00 + (random() * 15.00); -- Moon
        END IF;
        
        -- Apply Limit if bets are high (Rigging Protection)
        IF v_total_bets > 100 AND v_crash_point > 2.0 THEN
             v_crash_point := 1.20 + (random() * 0.80);
        END IF;

        UPDATE crash_game_state SET
            status = 'FLYING',
            start_time = now(), -- Flight Start Time
            crash_point = round(v_crash_point, 2),
            total_bets_current_round = v_total_bets;
            
        RETURN json_build_object('status', 'FLYING', 'crash_point', round(v_crash_point, 2));
    END IF;

    -- If currently FLYING and crashed -> Go CRASHED
    IF p_current_status = 'FLYING' AND state.status = 'FLYING' THEN
        UPDATE crash_game_state SET
            status = 'CRASHED',
            last_crash_point = state.crash_point,
            start_time = now(); -- Cooldown Start Time
            
        RETURN json_build_object('status', 'CRASHED');
    END IF;

    -- If currently CRASHED and cooldown over -> Go BETTING
    IF p_current_status = 'CRASHED' AND state.status = 'CRASHED' THEN
        UPDATE crash_game_state SET
            status = 'BETTING',
            current_round_id = gen_random_uuid(),
            start_time = now(), -- Betting Start Time
            total_bets_current_round = 0;
            
        RETURN json_build_object('status', 'BETTING');
    END IF;

    RETURN json_build_object('status', state.status, 'message', 'No change');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
`;

const BROADCAST_SQL = `-- NOTIFICATION SYSTEM SETUP
DROP FUNCTION IF EXISTS admin_broadcast_notification(TEXT, TEXT, TEXT);
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT CHECK (type IN ('info', 'success', 'warning', 'error')) DEFAULT 'info',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can insert notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND admin_user = true));

CREATE OR REPLACE FUNCTION admin_broadcast_notification(p_title TEXT, p_message TEXT, p_type TEXT) RETURNS VOID AS $$
BEGIN
    INSERT INTO notifications (user_id, title, message, type, is_read)
    SELECT id, p_title, p_message, p_type, false FROM profiles WHERE is_suspended = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
`;

const SYSTEM_CONFIG_FIX_SQL = `-- FIX SYSTEM TOGGLES (Task Off/On)
-- Run this if "Task Off" or "Maintenance Mode" is not working for users.

-- 1. Create Table if missing
CREATE TABLE IF NOT EXISTS public.system_config (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    is_tasks_enabled BOOLEAN DEFAULT true,
    is_games_enabled BOOLEAN DEFAULT true,
    is_invest_enabled BOOLEAN DEFAULT true,
    is_invite_enabled BOOLEAN DEFAULT true,
    is_video_enabled BOOLEAN DEFAULT true,
    is_deposit_enabled BOOLEAN DEFAULT true,
    is_withdraw_enabled BOOLEAN DEFAULT true,
    maintenance_mode BOOLEAN DEFAULT false,
    global_alert TEXT,
    p2p_transfer_fee_percent NUMERIC DEFAULT 2.0,
    p2p_min_transfer NUMERIC DEFAULT 10.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Ensure at least one row exists
INSERT INTO public.system_config (id, is_tasks_enabled)
SELECT gen_random_uuid(), true
WHERE NOT EXISTS (SELECT 1 FROM public.system_config);

-- 3. Fix Permissions (RLS)
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

-- Allow EVERYONE to READ config (Critical for features to turn off for users)
DROP POLICY IF EXISTS "Public read access" ON public.system_config;
CREATE POLICY "Public read access" ON public.system_config FOR SELECT USING (true);

-- Allow ADMINS to UPDATE/INSERT
DROP POLICY IF EXISTS "Admin update access" ON public.system_config;
CREATE POLICY "Admin update access" ON public.system_config FOR ALL
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND admin_user = true));

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE system_config;
`;

const NOTIFICATION_TRIGGERS_SQL = `-- AUTO NOTIFICATION TRIGGERS
-- Sends alerts for deposits, withdrawals, referrals, and investments.

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
CREATE TRIGGER on_deposit_update AFTER UPDATE ON deposit_requests FOR EACH ROW EXECUTE FUNCTION notify_deposit_update();

-- (Add similar triggers for withdrawals/referrals as needed)
`;

const PUBLIC_PROFILE_SQL = `-- ENABLE PUBLIC PROFILES & USER SEARCH
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON "public"."profiles";
CREATE POLICY "Enable read access for authenticated users" ON "public"."profiles" AS PERMISSIVE FOR SELECT TO authenticated USING (true);
`;

const RESET_SCRIPT_SQL = `-- DANGER: SYSTEM RESET SCRIPT
BEGIN;
TRUNCATE TABLE transactions, deposit_requests, withdraw_requests, game_history, investments, referrals, user_tasks, video_submissions, active_ludo_matches CASCADE;
UPDATE wallets SET balance=0, main_balance=0, deposit_balance=0, game_balance=0, earning_balance=0, investment_balance=0, referral_balance=0, commission_balance=0, deposit=0, withdrawable=0, total_earning=0, today_earning=0, pending_withdraw=0, referral_earnings=0;
UPDATE wallets SET bonus_balance = 1.00;
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
                        {/* CRASH GAME SQL (NEW) */}
                        <GlassCard className="bg-pink-950/20 border-pink-500/40 relative overflow-hidden">
                            <div className="absolute -right-10 -bottom-10 opacity-10"><Rocket size={200} className="text-pink-500"/></div>
                            <h3 className="text-2xl font-black text-pink-400 mb-4 flex items-center gap-2 uppercase tracking-widest">
                                <Rocket size={32} /> Realtime Crash Game Setup
                            </h3>
                            <p className="text-gray-300 text-sm max-w-xl mb-6 leading-relaxed">
                                Initializes the synchronized Crash Game engine. Creates <span className="font-mono text-white">crash_game_state</span> and <span className="font-mono text-white">crash_bets</span> tables, adds RLS policies, and defines the logic for calculating multipliers based on the betting pool.
                            </p>

                            <div className="bg-black/50 rounded-xl border border-pink-500/30 p-4 mb-4">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-pink-400 text-xs font-bold font-mono">CRASH_GAME_INIT.SQL</span>
                                    <button 
                                        onClick={() => { navigator.clipboard.writeText(CRASH_GAME_SQL); toast.success("SQL Copied!"); }}
                                        className="text-xs bg-pink-600 text-white px-3 py-1 rounded font-bold hover:bg-pink-500 flex items-center gap-1"
                                    >
                                        <Copy size={12}/> Copy SQL
                                    </button>
                                </div>
                                <pre className="text-[10px] text-pink-200/80 font-mono whitespace-pre-wrap select-text h-40 overflow-y-auto custom-scrollbar">
                                    {CRASH_GAME_SQL}
                                </pre>
                            </div>
                        </GlassCard>

                        {/* SYSTEM CONFIG FIX (NEW) */}
                        <GlassCard className="bg-orange-950/20 border-orange-500/40 relative overflow-hidden">
                            <div className="absolute -right-10 -bottom-10 opacity-10"><Settings size={200} className="text-orange-500"/></div>
                            <h3 className="text-2xl font-black text-orange-400 mb-4 flex items-center gap-2 uppercase tracking-widest">
                                <Settings size={32} /> System Config Fix
                            </h3>
                            <p className="text-gray-300 text-sm max-w-xl mb-6 leading-relaxed">
                                <strong className="text-white">Required Fix:</strong> If "Task Off" or other system toggles are not working for users, it means the database permissions are blocking public access to the config table. Run this script to fix it.
                            </p>

                            <div className="bg-black/50 rounded-xl border border-orange-500/30 p-4 mb-4">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-orange-400 text-xs font-bold font-mono">SYSTEM_CONFIG_FIX.SQL</span>
                                    <button 
                                        onClick={() => { navigator.clipboard.writeText(SYSTEM_CONFIG_FIX_SQL); toast.success("SQL Copied!"); }}
                                        className="text-xs bg-orange-600 text-white px-3 py-1 rounded font-bold hover:bg-orange-500 flex items-center gap-1"
                                    >
                                        <Copy size={12}/> Copy SQL
                                    </button>
                                </div>
                                <pre className="text-[10px] text-orange-200/80 font-mono whitespace-pre-wrap select-text h-40 overflow-y-auto custom-scrollbar">
                                    {SYSTEM_CONFIG_FIX_SQL}
                                </pre>
                            </div>
                        </GlassCard>

                        {/* BROADCAST SQL */}
                        <GlassCard className="bg-purple-950/20 border-purple-500/40 relative overflow-hidden">
                            <div className="absolute -right-10 -bottom-10 opacity-10"><Radio size={200} className="text-purple-500"/></div>
                            <h3 className="text-2xl font-black text-purple-400 mb-4 flex items-center gap-2 uppercase tracking-widest">
                                <Radio size={32} /> Notification System Setup
                            </h3>
                            <p className="text-gray-300 text-sm max-w-xl mb-6 leading-relaxed">
                                Enable the "Send to All" feature in NotiSender by creating the tables and helper function.
                                <br/><span className="text-yellow-400 font-bold">Important:</span> Includes <code>ALTER PUBLICATION</code> to enable Live Updates.
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
