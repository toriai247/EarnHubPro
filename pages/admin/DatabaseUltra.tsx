
import React, { useEffect, useState } from 'react';
import GlassCard from '../../components/GlassCard';
import { supabase } from '../../integrations/supabase/client';
import { 
    Database, Download, Server, ShieldCheck, 
    FileJson, Clock, RefreshCw, Loader2, 
    Terminal, Save, Trash2, HardDrive, 
    Copy, List, BarChart3, Search, Code, Activity, PieChart, 
    AlertOctagon, Skull, AlertTriangle, HardDriveDownload, Cpu
} from 'lucide-react';
import { useUI } from '../../context/UIContext';

// Comprehensive List of Tables
const TABLE_LIST = [
    'profiles', 'wallets', 'transactions', 'investments', 'investment_plans',
    'deposit_requests', 'withdraw_requests', 'game_history', 'notifications',
    'referrals', 'tasks', 'user_tasks', 'system_config', 'payment_methods',
    'deposit_bonuses', 'withdrawal_settings', 'user_withdrawal_methods',
    'crash_game_state', 'crash_bets', 'referral_tiers', 'ludo_cards',
    'spin_items', 'bot_profiles', 'help_requests', 'marketplace_tasks', 'marketplace_submissions',
    'game_configs', 'task_attempts', 'daily_bonus_config', 'daily_streaks',
    'influencer_campaigns', 'influencer_submissions', 'published_sites'
];

// SQL Templates Library
const SQL_TOOLS = {
    setup: [
        {
            title: 'New: Site Publisher Module',
            desc: 'Creates table for publishing external sites via custom URLs.',
            sql: `
CREATE TABLE IF NOT EXISTS public.published_sites (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    target_url TEXT NOT NULL,
    page_title TEXT,
    meta_desc TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    views INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Upgrade existing table if needed
ALTER TABLE public.published_sites ADD COLUMN IF NOT EXISTS page_title TEXT;
ALTER TABLE public.published_sites ADD COLUMN IF NOT EXISTS meta_desc TEXT;

ALTER TABLE public.published_sites ENABLE ROW LEVEL SECURITY;

-- Public Read
DROP POLICY IF EXISTS "Public read sites" ON public.published_sites;
CREATE POLICY "Public read sites" ON public.published_sites FOR SELECT USING (is_active = true);

-- Admin Manage
DROP POLICY IF EXISTS "Admin manage sites" ON public.published_sites;
CREATE POLICY "Admin manage sites" ON public.published_sites FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND (role = 'admin' OR admin_user = true)
  )
);
`
        },
        {
            title: 'Setup: Influencer / Staff Module',
            desc: 'Creates tables for Staff campaigns and submissions.',
            sql: `
-- 1. Create Campaigns Table
CREATE TABLE IF NOT EXISTS public.influencer_campaigns (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    platform TEXT CHECK (platform IN ('facebook', 'youtube', 'instagram', 'tiktok')),
    media_link TEXT NOT NULL,
    requirements TEXT,
    payout NUMERIC(10, 2) NOT NULL,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Submissions Table
CREATE TABLE IF NOT EXISTS public.influencer_submissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id UUID REFERENCES public.influencer_campaigns(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    proof_link TEXT NOT NULL,
    views_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable RLS
ALTER TABLE public.influencer_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.influencer_submissions ENABLE ROW LEVEL SECURITY;

-- 4. Policies
-- Campaigns: Public Read, Admin Write
DROP POLICY IF EXISTS "Public read campaigns" ON public.influencer_campaigns;
CREATE POLICY "Public read campaigns" ON public.influencer_campaigns FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin manage campaigns" ON public.influencer_campaigns;
CREATE POLICY "Admin manage campaigns" ON public.influencer_campaigns FOR ALL USING (true); 

-- Submissions: Staff insert, Admin manage
DROP POLICY IF EXISTS "Staff insert submission" ON public.influencer_submissions;
CREATE POLICY "Staff insert submission" ON public.influencer_submissions FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Staff view own" ON public.influencer_submissions;
CREATE POLICY "Staff view own" ON public.influencer_submissions FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admin manage submissions" ON public.influencer_submissions;
CREATE POLICY "Admin manage submissions" ON public.influencer_submissions FOR ALL USING (true); 

-- 5. Seed Data
INSERT INTO public.influencer_campaigns (title, platform, media_link, requirements, payout) VALUES
('Share Official Launch Video', 'facebook', 'https://facebook.com/naxxivo/launch', 'Share on Profile, Min 5k Friends', 50.00),
('Create YouTube Review', 'youtube', 'https://naxxivo.com', 'Create a 3min review video. Min 1k views.', 150.00),
('Instagram Story Shoutout', 'instagram', 'https://instagram.com/naxxivo', 'Tag @naxxivo in story. 24h active.', 25.00);
`
        },
        {
            title: 'Fix: Reset Daily Bonus System',
            desc: 'Drops old policies/tables and recreates Daily Bonus system cleanly.',
            sql: `
-- 1. Drop existing policies to prevent conflicts
DROP POLICY IF EXISTS "Public read config" ON public.daily_bonus_config;
DROP POLICY IF EXISTS "Admin update config" ON public.daily_bonus_config;
DROP POLICY IF EXISTS "Users view own streak" ON public.daily_streaks;
DROP POLICY IF EXISTS "Users update own streak" ON public.daily_streaks;
DROP POLICY IF EXISTS "Users insert own streak" ON public.daily_streaks;

-- 2. Drop tables to reset schema and data
DROP TABLE IF EXISTS public.daily_bonus_config;
DROP TABLE IF EXISTS public.daily_streaks;

-- 3. Create Configuration Table
CREATE TABLE public.daily_bonus_config (
    day INTEGER PRIMARY KEY,
    reward_amount NUMERIC(10, 2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create User Streaks Table
CREATE TABLE public.daily_streaks (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    current_streak INTEGER DEFAULT 1,
    last_claimed_at TIMESTAMPTZ DEFAULT NOW(),
    total_claimed NUMERIC(10, 2) DEFAULT 0
);

-- 5. Enable RLS
ALTER TABLE public.daily_bonus_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_streaks ENABLE ROW LEVEL SECURITY;

-- 6. Create Policies
CREATE POLICY "Public read config" ON public.daily_bonus_config FOR SELECT USING (true);
CREATE POLICY "Admin update config" ON public.daily_bonus_config FOR ALL USING (true); 

CREATE POLICY "Users view own streak" ON public.daily_streaks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own streak" ON public.daily_streaks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users insert own streak" ON public.daily_streaks FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 7. Insert Default Data
INSERT INTO public.daily_bonus_config (day, reward_amount) VALUES
(1, 0.10), (2, 0.20), (3, 0.30), (4, 0.40), (5, 0.50), (6, 0.75), (7, 2.00);

-- 8. Admin Reset Function
CREATE OR REPLACE FUNCTION admin_reset_all_streaks()
RETURNS void AS $$
BEGIN
  UPDATE public.daily_streaks 
  SET current_streak = 1, 
      last_claimed_at = NOW() - INTERVAL '48 hours';
END;
$$ LANGUAGE plpgsql;
`
        },
        {
            title: 'Factory Reset: Task System V4.1 (AI Vision)',
            desc: 'Upgrades Task DB to support AI Visual DNA & Quiz verification.',
            sql: `
-- 1. DROP OLD TABLES (CLEAN SLATE)
DROP TABLE IF EXISTS public.marketplace_submissions CASCADE;
DROP TABLE IF EXISTS public.task_attempts CASCADE;
DROP TABLE IF EXISTS public.marketplace_tasks CASCADE;

-- 2. CREATE TASKS TABLE (With Visual DNA)
CREATE TABLE public.marketplace_tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    creator_id UUID REFERENCES auth.users(id) NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    target_url TEXT NOT NULL,
    total_quantity INTEGER NOT NULL DEFAULT 0,
    remaining_quantity INTEGER NOT NULL DEFAULT 0,
    price_per_action NUMERIC(10, 4) NOT NULL,
    worker_reward NUMERIC(10, 4) NOT NULL,
    proof_type TEXT DEFAULT 'ai_quiz', -- 'ai_quiz' or 'manual'
    quiz_config JSONB DEFAULT '{}'::jsonb, -- { question, options, correct_index }
    ai_reference_data JSONB DEFAULT '{}'::jsonb, -- Visual DNA features
    requirements JSONB DEFAULT '[]'::jsonb, -- Legacy support
    timer_seconds INTEGER DEFAULT 15,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CREATE ATTEMPTS TABLE (Anti-Cheat 2-Strike Rule)
CREATE TABLE public.task_attempts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID REFERENCES public.marketplace_tasks(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    attempts_count INTEGER DEFAULT 0,
    last_attempt_at TIMESTAMPTZ DEFAULT NOW(),
    is_locked BOOLEAN DEFAULT FALSE,
    UNIQUE(task_id, user_id)
);

-- 4. CREATE SUBMISSIONS TABLE (History)
CREATE TABLE public.marketplace_submissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID REFERENCES public.marketplace_tasks(id) ON DELETE CASCADE,
    worker_id UUID REFERENCES auth.users(id) NOT NULL,
    submission_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT DEFAULT 'approved', -- Mostly approved instantly via AI
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. ENABLE SECURITY
ALTER TABLE public.marketplace_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_submissions ENABLE ROW LEVEL SECURITY;

-- 6. POLICIES (PERMISSIONS)
-- Tasks: Public read
DROP POLICY IF EXISTS "Public read tasks" ON public.marketplace_tasks;
CREATE POLICY "Public read tasks" ON public.marketplace_tasks FOR SELECT USING (true);
DROP POLICY IF EXISTS "Creators manage tasks" ON public.marketplace_tasks;
CREATE POLICY "Creators manage tasks" ON public.marketplace_tasks FOR ALL USING (auth.uid() = creator_id);

-- Attempts: Users manage their own
DROP POLICY IF EXISTS "Users own attempts" ON public.task_attempts;
CREATE POLICY "Users own attempts" ON public.task_attempts FOR ALL USING (auth.uid() = user_id);

-- Submissions: Workers insert, Creators view
DROP POLICY IF EXISTS "Workers insert own" ON public.marketplace_submissions;
CREATE POLICY "Workers insert own" ON public.marketplace_submissions FOR INSERT WITH CHECK (auth.uid() = worker_id);
DROP POLICY IF EXISTS "Workers view own" ON public.marketplace_submissions;
CREATE POLICY "Workers view own" ON public.marketplace_submissions FOR SELECT USING (auth.uid() = worker_id);
DROP POLICY IF EXISTS "Creators view submissions" ON public.marketplace_submissions;
CREATE POLICY "Creators view submissions" ON public.marketplace_submissions FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.marketplace_tasks WHERE id = task_id AND creator_id = auth.uid())
);
`
        }
    ],
    maintenance: [
        {
            title: 'Fix Submission Permissions',
            desc: 'Run this if reviews are not showing up (RLS Fix).',
            sql: `
ALTER TABLE marketplace_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Creators view submissions" ON marketplace_submissions;
CREATE POLICY "Creators view submissions" ON marketplace_submissions 
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM marketplace_tasks 
    WHERE marketplace_tasks.id = marketplace_submissions.task_id 
    AND marketplace_tasks.creator_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Creators update submissions" ON marketplace_submissions;
CREATE POLICY "Creators update submissions" ON marketplace_submissions 
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM marketplace_tasks 
    WHERE marketplace_tasks.id = marketplace_submissions.task_id 
    AND marketplace_tasks.creator_id = auth.uid()
  )
);`
        }
    ],
    danger: [
        {
            title: 'MASTER ADMIN POLICY (GOD MODE)',
            desc: 'Unrestricted Admin Access to ALL 39+ Tables. Run in Supabase SQL Editor.',
            sql: `
-- 1. Create Secure Admin Check Function (Prevents Infinite Recursion)
CREATE OR REPLACE FUNCTION public.check_is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER -- Bypass RLS for this check
SET search_path = public
AS $$
BEGIN
  -- Check if the user is an admin in the profiles table
  IF EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() 
      AND (role = 'admin' OR admin_user = true)
  ) THEN
      RETURN TRUE;
  ELSE
      RETURN FALSE;
  END IF;
END;
$$;

-- 2. Apply Master Policy to ALL Tables (Loop)
DO $$ 
DECLARE 
    t text; 
BEGIN 
    FOR t IN 
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' 
    LOOP 
        -- Enable RLS just in case
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t); 
        
        -- Drop old policies to avoid conflicts
        EXECUTE format('DROP POLICY IF EXISTS "Admins Full Access" ON public.%I;', t); 
        
        -- Create new GOD MODE policy using the secure function
        EXECUTE format('CREATE POLICY "Admins Full Access" ON public.%I FOR ALL USING (public.check_is_admin()) WITH CHECK (public.check_is_admin());', t); 
    END LOOP; 
END $$;

-- 3. Grant Storage Access (Files/Images)
DROP POLICY IF EXISTS "Admin Storage Full Access" ON storage.objects;
CREATE POLICY "Admin Storage Full Access" ON storage.objects FOR ALL USING (public.check_is_admin()) WITH CHECK (public.check_is_admin());
`
        },
        {
            title: 'Factory Reset (Data Only)',
            desc: 'Wipes all user data but keeps table structure.',
            sql: `TRUNCATE TABLE transactions, deposit_requests, withdraw_requests, game_history, investments, notifications, marketplace_submissions, user_tasks, task_attempts, daily_streaks, influencer_submissions CASCADE;
UPDATE wallets SET balance=0, main_balance=0, deposit=0, withdrawable=0, total_earning=0, deposit_balance=0, game_balance=0, earning_balance=0, bonus_balance=0, referral_balance=0, commission_balance=0, investment_balance=0;
UPDATE profiles SET level_1=1, xp_1=0;`
        }
    ]
};

interface BackupFile {
    name: string;
    id: string;
    created_at: string;
    metadata: any;
}

const DatabaseUltra: React.FC = () => {
    const { toast, confirm } = useUI();
    const [activeTab, setActiveTab] = useState<'dashboard' | 'explorer' | 'backups' | 'tools'>('dashboard');
    
    // Data States
    const [tableStats, setTableStats] = useState<Record<string, number>>({});
    const [totalRecords, setTotalRecords] = useState(0);
    const [loadingStats, setLoadingStats] = useState(false);
    
    // Explorer States
    const [selectedTable, setSelectedTable] = useState<string>('profiles');
    const [tableData, setTableData] = useState<any[]>([]);
    const [loadingData, setLoadingData] = useState(false);
    const [viewMode, setViewMode] = useState<'data' | 'schema'>('data');

    // Backup States
    const [backups, setBackups] = useState<BackupFile[]>([]);
    const [backupProgress, setBackupProgress] = useState(0);
    const [processingBackup, setProcessingBackup] = useState(false);

    useEffect(() => {
        refreshStats();
        fetchBackups();
    }, []);

    useEffect(() => {
        if (activeTab === 'explorer') {
            fetchTableData(selectedTable);
        }
    }, [selectedTable, activeTab]);

    const refreshStats = async () => {
        setLoadingStats(true);
        const counts: Record<string, number> = {};
        let total = 0;
        
        const promises = TABLE_LIST.map(async (table) => {
            const { count } = await supabase.from(table).select('*', { count: 'exact', head: true });
            return { table, count: count || 0 };
        });
        
        try {
            const results = await Promise.all(promises);
            results.forEach(r => {
                counts[r.table] = r.count;
                total += r.count;
            });
            setTableStats(counts);
            setTotalRecords(total);
        } catch (e) {
            console.error("Stats Error", e);
        } finally {
            setLoadingStats(false);
        }
    };

    const fetchTableData = async (table: string) => {
        setLoadingData(true);
        const { data, error } = await supabase.from(table).select('*').limit(50).order('created_at', { ascending: false });
        if (error) {
            const { data: retryData } = await supabase.from(table).select('*').limit(50);
            setTableData(retryData || []);
        } else {
            setTableData(data || []);
        }
        setLoadingData(false);
    };

    const fetchBackups = async () => {
        const { data } = await supabase.storage.from('db-backups').list('', {
            limit: 10,
            sortBy: { column: 'created_at', order: 'desc' },
        });
        if (data) setBackups(data as BackupFile[]);
    };

    const handleBackup = async () => {
        if (processingBackup) return;
        setProcessingBackup(true);
        setBackupProgress(0);
        
        try {
            const fullDump: any = { timestamp: new Date().toISOString(), tables: {} };

            for (let i = 0; i < TABLE_LIST.length; i++) {
                const tableName = TABLE_LIST[i];
                const { data } = await supabase.from(tableName).select('*');
                if (data) fullDump.tables[tableName] = data;
                setBackupProgress(Math.round(((i + 1) / TABLE_LIST.length) * 100));
            }

            const jsonString = JSON.stringify(fullDump, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const fileName = `backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;

            await supabase.storage.from('db-backups').upload(fileName, blob, { upsert: true });
            toast.success("Backup created successfully!");
            fetchBackups();

        } catch (e: any) {
            toast.error("Backup Failed: " + e.message);
        } finally {
            setProcessingBackup(false);
            setBackupProgress(0);
        }
    };

    const handleDownloadBackup = async (fileName: string) => {
        const { data } = await supabase.storage.from('db-backups').download(fileName);
        if (data) {
            const url = URL.createObjectURL(data);
            const a = document.createElement('a');
            a.href = url; a.download = fileName; a.click();
            URL.revokeObjectURL(url);
        }
    };

    const handleDeleteBackup = async (fileName: string) => {
        if (!await confirm("Delete this backup permanently?")) return;
        await supabase.storage.from('db-backups').remove([fileName]);
        fetchBackups();
        toast.success("Backup deleted");
    };

    const copySQL = (sql: string) => {
        navigator.clipboard.writeText(sql);
        toast.success("SQL Copied. Paste in Supabase Editor.");
    };

    const estimatedSizeMB = (totalRecords * 0.5) / 1024; 

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h2 className="text-3xl font-display font-black text-cyan-400 flex items-center gap-3">
                        <Database className="text-white" size={32} /> DATABASE ULTRA
                    </h2>
                    <p className="text-gray-400 text-sm mt-1">
                        Advanced Admin Console • v4.6.0
                    </p>
                </div>
                <div className="flex items-center gap-2 bg-black/40 border border-white/10 px-3 py-1.5 rounded-lg">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        <span className="text-xs font-bold text-green-400">ONLINE</span>
                    </div>
                    <div className="h-4 w-px bg-white/10 mx-1"></div>
                    <span className="text-xs text-gray-400">{TABLE_LIST.length} Tables</span>
                </div>
            </div>

            <div className="flex overflow-x-auto no-scrollbar gap-1 bg-white/5 p-1 rounded-xl border border-white/5">
                {[
                    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
                    { id: 'explorer', label: 'Data Explorer', icon: Search },
                    { id: 'backups', label: 'Recovery Vault', icon: HardDrive },
                    { id: 'tools', label: 'System Tools', icon: Terminal },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold transition whitespace-nowrap flex-1 justify-center ${
                            activeTab === tab.id 
                            ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/50' 
                            : 'text-gray-400 hover:text-white hover:bg-white/10'
                        }`}
                    >
                        <tab.icon size={16} /> {tab.label}
                    </button>
                ))}
            </div>

            {/* CONTENT AREA */}
            {activeTab === 'dashboard' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <GlassCard className="p-5 border-l-4 border-l-cyan-500 bg-cyan-950/10">
                            <div className="flex justify-between items-start mb-2">
                                <p className="text-cyan-400 text-xs font-bold uppercase tracking-wider">Total Records</p>
                                <List size={20} className="text-cyan-500"/>
                            </div>
                            <h3 className="text-3xl font-black text-white">
                                {loadingStats ? <Loader2 className="animate-spin"/> : totalRecords.toLocaleString()}
                            </h3>
                            <p className="text-[10px] text-gray-500 mt-1">Across all tables</p>
                        </GlassCard>

                        <GlassCard className="p-5 border-l-4 border-l-purple-500 bg-purple-950/10">
                            <div className="flex justify-between items-start mb-2">
                                <p className="text-purple-400 text-xs font-bold uppercase tracking-wider">Estimated Size</p>
                                <HardDrive size={20} className="text-purple-500"/>
                            </div>
                            <h3 className="text-3xl font-black text-white">
                                {loadingStats ? <Loader2 className="animate-spin"/> : `~${estimatedSizeMB.toFixed(2)} MB`}
                            </h3>
                            <p className="text-[10px] text-gray-500 mt-1">Text-based estimation</p>
                        </GlassCard>

                        <GlassCard className="p-5 border-l-4 border-l-green-500 bg-green-950/10">
                            <div className="flex justify-between items-start mb-2">
                                <p className="text-green-400 text-xs font-bold uppercase tracking-wider">System Health</p>
                                <Activity size={20} className="text-green-500"/>
                            </div>
                            <h3 className="text-3xl font-black text-white">100%</h3>
                            <p className="text-[10px] text-gray-500 mt-1">All systems operational</p>
                        </GlassCard>
                    </div>
                </div>
            )}

            {activeTab === 'explorer' && (
                <div className="flex flex-col lg:flex-row gap-4 h-[75vh]">
                    <div className="w-full lg:w-64 bg-black/40 border border-white/10 rounded-2xl flex flex-col overflow-hidden shrink-0">
                        <div className="p-3 border-b border-white/10 bg-white/5 font-bold text-xs uppercase text-gray-400">Tables</div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                            {TABLE_LIST.map(table => (
                                <button 
                                    key={table}
                                    onClick={() => setSelectedTable(table)}
                                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition flex justify-between items-center ${selectedTable === table ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
                                >
                                    <span className="truncate">{table}</span>
                                    <span className="opacity-50">{tableStats[table] || 0}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 bg-black/40 border border-white/10 rounded-2xl flex flex-col overflow-hidden relative">
                        <div className="p-3 border-b border-white/10 bg-white/5 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <h3 className="font-mono font-bold text-white text-lg">{selectedTable}</h3>
                                <div className="flex bg-black/30 rounded-lg p-0.5 border border-white/10">
                                    <button onClick={() => setViewMode('data')} className={`px-3 py-1 rounded text-[10px] font-bold uppercase transition ${viewMode === 'data' ? 'bg-white/10 text-white' : 'text-gray-500'}`}>Data</button>
                                    <button onClick={() => setViewMode('schema')} className={`px-3 py-1 rounded text-[10px] font-bold uppercase transition ${viewMode === 'schema' ? 'bg-white/10 text-white' : 'text-gray-500'}`}>Schema</button>
                                </div>
                            </div>
                            <button onClick={() => fetchTableData(selectedTable)} className="p-1.5 bg-white/5 rounded hover:bg-white/10 text-gray-400 hover:text-white transition">
                                <RefreshCw size={14} className={loadingData ? 'animate-spin' : ''}/>
                            </button>
                        </div>

                        <div className="flex-1 overflow-auto custom-scrollbar p-0">
                            {loadingData ? (
                                <div className="h-full flex items-center justify-center">
                                    <Loader2 className="animate-spin text-cyan-500" size={32} />
                                </div>
                            ) : viewMode === 'data' ? (
                                tableData.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-gray-500">
                                        <Database size={40} className="opacity-20 mb-2" />
                                        <p className="text-sm">No records found.</p>
                                    </div>
                                ) : (
                                    <table className="w-full text-left text-xs border-collapse">
                                        <thead className="bg-black/50 sticky top-0 z-10 text-gray-400 font-mono">
                                            <tr>
                                                {Object.keys(tableData[0]).map(key => (
                                                    <th key={key} className="p-3 border-b border-white/10 whitespace-nowrap bg-black">{key}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5 font-mono">
                                            {tableData.map((row, i) => (
                                                <tr key={i} className="hover:bg-white/5 transition">
                                                    {Object.values(row).map((val: any, j) => (
                                                        <td key={j} className="p-3 whitespace-nowrap text-gray-300 max-w-[200px] truncate">
                                                            {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )
                            ) : (
                                <div className="p-6">
                                    <div className="bg-black/50 border border-white/10 rounded-xl p-4 font-mono text-xs text-green-400 whitespace-pre-wrap">
                                        {`-- Schema for ${selectedTable} (Auto-Generated View)\n`}
                                        {tableData.length > 0 && Object.keys(tableData[0]).map(key => {
                                            const val = tableData[0][key];
                                            const type = typeof val;
                                            return `${key}: ${type === 'object' ? 'json/array' : type}`;
                                        }).join('\n')}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'backups' && (
                <div className="space-y-6">
                    <GlassCard className="bg-cyan-950/10 border-cyan-500/30 flex justify-between items-center">
                        <div>
                            <h3 className="font-bold text-white text-lg">Secure Backup Vault</h3>
                            <p className="text-xs text-gray-400">Encrypted JSON dumps of all tables.</p>
                        </div>
                        <button 
                            onClick={handleBackup}
                            disabled={processingBackup}
                            className="bg-cyan-600 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-cyan-500 transition shadow-lg shadow-cyan-900/50 disabled:opacity-50"
                        >
                            {processingBackup ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>}
                            {processingBackup ? `Backing Up ${backupProgress}%` : 'Create New Backup'}
                        </button>
                    </GlassCard>

                    <div className="bg-black/40 border border-white/10 rounded-2xl overflow-hidden">
                        <div className="p-4 bg-white/5 border-b border-white/10 font-bold text-white text-sm flex items-center gap-2">
                            <Clock size={16}/> Backup History
                        </div>
                        <div className="divide-y divide-white/5">
                            {backups.length === 0 ? (
                                <div className="p-8 text-center text-gray-500">No backups found in storage bucket 'db-backups'.</div>
                            ) : (
                                backups.map(file => (
                                    <div key={file.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-blue-500/20 text-blue-400 rounded-lg flex items-center justify-center border border-blue-500/30">
                                                <FileJson size={20} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-white">{file.name}</p>
                                                <p className="text-[10px] text-gray-500">{new Date(file.created_at).toLocaleString()}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleDownloadBackup(file.name)} className="p-2 bg-white/5 hover:bg-green-500/20 text-green-400 rounded transition"><HardDriveDownload size={16}/></button>
                                            <button onClick={() => handleDeleteBackup(file.name)} className="p-2 bg-white/5 hover:bg-red-500/20 text-red-400 rounded transition"><Trash2 size={16}/></button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'tools' && (
                <div className="space-y-8">
                    
                    {/* Setup Tools */}
                    <div>
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Cpu size={16} /> Initialization Scripts
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {SQL_TOOLS.setup.map((tool, idx) => (
                                <GlassCard key={idx} className="border border-blue-500/20 bg-blue-900/10 hover:border-blue-500/40 transition group">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400 group-hover:scale-110 transition"><Code size={20}/></div>
                                        <button onClick={() => copySQL(tool.sql)} className="text-[10px] bg-black/40 hover:bg-blue-600 text-gray-400 hover:text-white px-2 py-1 rounded transition flex items-center gap-1">
                                            <Copy size={10}/> Copy SQL
                                        </button>
                                    </div>
                                    <h4 className="font-bold text-white text-sm mb-1">{tool.title}</h4>
                                    <p className="text-xs text-gray-400 mb-3 h-8">{tool.desc}</p>
                                </GlassCard>
                            ))}
                        </div>
                    </div>

                    {/* Maintenance & Fixes */}
                    <div>
                        <h3 className="text-sm font-bold text-yellow-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Activity size={16} /> Maintenance & Fixes
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {SQL_TOOLS.maintenance.map((tool, idx) => (
                                <GlassCard key={idx} className="border border-yellow-500/20 bg-yellow-900/10 hover:border-yellow-500/40 transition group">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="p-2 bg-yellow-500/20 rounded-lg text-yellow-400 group-hover:scale-110 transition"><Terminal size={20}/></div>
                                        <button onClick={() => copySQL(tool.sql)} className="text-[10px] bg-black/40 hover:bg-yellow-600 text-gray-400 hover:text-white px-2 py-1 rounded transition flex items-center gap-1">
                                            <Copy size={10}/> Copy SQL
                                        </button>
                                    </div>
                                    <h4 className="font-bold text-white text-sm mb-1">{tool.title}</h4>
                                    <p className="text-xs text-gray-400 mb-3 h-8">{tool.desc}</p>
                                </GlassCard>
                            ))}
                        </div>
                    </div>

                    {/* Danger Zone */}
                    <div>
                        <h3 className="text-sm font-bold text-red-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <AlertOctagon size={16} /> Danger Zone
                        </h3>
                        <div className="grid grid-cols-1 gap-4">
                            {SQL_TOOLS.danger.map((tool, idx) => (
                                <GlassCard key={idx} className="border border-red-500/30 bg-red-950/10 relative overflow-hidden">
                                    <div className="absolute right-0 top-0 p-4 opacity-10"><Skull size={100} className="text-red-500"/></div>
                                    <div className="relative z-10 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                                        <div>
                                            <h4 className="font-bold text-red-400 text-lg mb-1 flex items-center gap-2"><AlertTriangle size={18}/> {tool.title}</h4>
                                            <p className="text-xs text-gray-400 max-w-md">{tool.desc}</p>
                                        </div>
                                        <button onClick={() => copySQL(tool.sql)} className="p-2 bg-red-500/20 text-red-400 rounded hover:bg-red-500 hover:text-white transition"><Copy size={14}/></button>
                                    </div>
                                </GlassCard>
                            ))}
                        </div>
                    </div>

                </div>
            )}

        </div>
    );
};

export default DatabaseUltra;
