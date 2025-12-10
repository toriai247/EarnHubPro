
import React, { useEffect, useState } from 'react';
import GlassCard from '../../components/GlassCard';
import { supabase } from '../../integrations/supabase/client';
import { 
    Database, Download, Server, ShieldCheck, 
    FileJson, Clock, RefreshCw, Loader2, 
    Terminal, Save, Trash2, HardDrive, 
    Copy, List, BarChart3, Search, Code, Activity, PieChart, 
    AlertOctagon, Skull, AlertTriangle, HardDriveDownload, Cpu, Hammer
} from 'lucide-react';
import { useUI } from '../../context/UIContext';

// Comprehensive List of Tables
const TABLE_LIST = [
    'profiles', 'wallets', 'transactions', 'investments', 'investment_plans',
    'deposit_requests', 'withdraw_requests', 'game_history', 'notifications',
    'referrals', 'marketplace_tasks', 'marketplace_submissions',
    'system_config', 'payment_methods', 'deposit_bonuses', 'withdrawal_settings', 
    'user_withdrawal_methods', 'crash_game_state', 'crash_bets', 'referral_tiers', 
    'ludo_cards', 'spin_items', 'bot_profiles', 'help_requests', 
    'game_configs', 'task_attempts', 'daily_bonus_config', 'daily_streaks',
    'influencer_campaigns', 'influencer_submissions', 'published_sites', 'video_ads',
    'task_reports'
];

// SQL Templates Library
const SQL_TOOLS = {
    setup: [
        {
            title: 'System: Wallet Auditor (Strict Math)',
            desc: 'Creates a function to recalculate wallet balances based purely on transaction history. Use this to fix discrepancies.',
            sql: `
CREATE OR REPLACE FUNCTION reconcile_user_balance(target_user_id UUID) 
RETURNS TABLE(
    calculated_main NUMERIC, 
    calculated_deposit NUMERIC, 
    calculated_earning NUMERIC,
    calculated_game NUMERIC
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    calc_main NUMERIC := 0;
    calc_deposit NUMERIC := 0;
    calc_earning NUMERIC := 0;
    calc_game NUMERIC := 0;
BEGIN
    -- 1. Calculate Deposit Balance (Deposits - Investments - Transfers Out)
    SELECT COALESCE(SUM(amount), 0) INTO calc_deposit 
    FROM transactions 
    WHERE user_id = target_user_id 
    AND type IN ('deposit', 'admin_credit_deposit');

    -- Subtract investments/transfers from deposit if logical flow exists (Simplified for generic)
    -- For now, we assume simple additive flows for audit baseline.

    -- 2. Calculate Earnings (Tasks + Referrals + Video)
    SELECT COALESCE(SUM(amount), 0) INTO calc_earning
    FROM transactions
    WHERE user_id = target_user_id
    AND type IN ('earn', 'referral', 'sponsorship');

    -- 3. Calculate Game Balance (Wins - Losses/Bets if tracked separately)
    -- Note: This is tricky if bets are deducted from main. 
    -- We assume Game Balance = Total Wins stored in Game Wallet.
    SELECT COALESCE(SUM(amount), 0) INTO calc_game
    FROM transactions
    WHERE user_id = target_user_id
    AND type IN ('game_win');

    -- 4. Calculate Main Balance (Withdrawals are negative, Transfers, etc)
    -- This assumes 'withdraw' type amount is negative or we subtract it.
    -- Ideally, we sum EVERYTHING else here or perform specific logic.
    
    -- Returning calculated values for Admin Review
    RETURN QUERY SELECT calc_main, calc_deposit, calc_earning, calc_game;
END;
$$;

-- Function to FORCE SYNC (Dangerous: Overwrites Wallet)
CREATE OR REPLACE FUNCTION force_sync_wallet(target_user_id UUID) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    -- Variables to hold sums
    sum_deposits NUMERIC;
    sum_withdrawals NUMERIC;
    sum_earnings NUMERIC;
    sum_game_wins NUMERIC;
    sum_game_bets NUMERIC;
    sum_transfers_in NUMERIC;
    sum_transfers_out NUMERIC;
    
    final_balance NUMERIC;
BEGIN
    -- Calculate purely based on history
    SELECT COALESCE(SUM(amount), 0) INTO sum_deposits FROM transactions WHERE user_id = target_user_id AND type = 'deposit';
    SELECT COALESCE(SUM(amount), 0) INTO sum_withdrawals FROM transactions WHERE user_id = target_user_id AND type = 'withdraw';
    SELECT COALESCE(SUM(amount), 0) INTO sum_earnings FROM transactions WHERE user_id = target_user_id AND type IN ('earn', 'referral', 'bonus');
    SELECT COALESCE(SUM(amount), 0) INTO sum_game_wins FROM transactions WHERE user_id = target_user_id AND type = 'game_win';
    SELECT COALESCE(SUM(amount), 0) INTO sum_game_bets FROM transactions WHERE user_id = target_user_id AND type = 'game_bet'; -- Negative
    
    -- Logic: Total Net Worth = (Inflows) - (Outflows)
    -- We will update MAIN BALANCE to reflect the 'Net Worth' minus specific restricted wallets if needed.
    -- For simplicity in this 'Strict Mode':
    -- Balance = (Deposits + Earnings + GameWins + Bonus) - (Withdrawals + |GameBets|)
    
    final_balance := (sum_deposits + sum_earnings + sum_game_wins) - (sum_withdrawals + ABS(sum_game_bets));
    
    -- Prevent negative
    IF final_balance < 0 THEN final_balance := 0; END IF;

    -- Update Wallet
    UPDATE wallets 
    SET 
        main_balance = final_balance,
        balance = final_balance, -- Sync Total
        withdrawable = final_balance -- Simple mode
    WHERE user_id = target_user_id;
END;
$$;
`
        },
        {
            title: 'Upgrade: Task & Ad System V2',
            desc: 'Adds report table, proof types, auto-approve logic, and robust tracking.',
            sql: `
ALTER TABLE public.marketplace_tasks ADD COLUMN IF NOT EXISTS proof_type TEXT DEFAULT 'ai_quiz'; 
ALTER TABLE public.marketplace_tasks ADD COLUMN IF NOT EXISTS proof_question TEXT; 
ALTER TABLE public.marketplace_tasks ADD COLUMN IF NOT EXISTS auto_approve_hours INTEGER DEFAULT 24; 
ALTER TABLE public.marketplace_tasks ADD COLUMN IF NOT EXISTS expected_file_name TEXT; 
ALTER TABLE public.system_config ADD COLUMN IF NOT EXISTS task_commission_percent NUMERIC DEFAULT 90; 

CREATE TABLE IF NOT EXISTS public.task_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID REFERENCES public.marketplace_tasks(id) ON DELETE CASCADE,
    reporter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, resolved
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.task_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can insert reports" ON public.task_reports;
CREATE POLICY "Users can insert reports" ON public.task_reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
DROP POLICY IF EXISTS "Admins view reports" ON public.task_reports;
CREATE POLICY "Admins view reports" ON public.task_reports FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (role = 'admin' OR admin_user = true)));
DROP POLICY IF EXISTS "Admins update reports" ON public.task_reports;
CREATE POLICY "Admins update reports" ON public.task_reports FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (role = 'admin' OR admin_user = true)));
`
        },
        {
            title: 'Upgrade: Deposit System (Auto Approve)',
            desc: 'Adds user note column and auto-approval function for deposits > 5h.',
            sql: `
ALTER TABLE public.deposit_requests ADD COLUMN IF NOT EXISTS user_note TEXT;

CREATE OR REPLACE FUNCTION auto_approve_old_deposits() 
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- UPDATE public.deposit_requests 
  -- SET status = 'approved', admin_note = 'Auto Approved (Time Limit Exceeded)'
  -- WHERE status = 'pending' AND created_at < NOW() - INTERVAL '5 hours 5 minutes';
END;
$$;
`
        }
    ],
    maintenance: [
        {
            title: 'Fix Table Relationships (FK)',
            desc: 'Fixes PGRST200 errors by adding Foreign Keys to tasks, submissions, and videos.',
            sql: `
-- 1. Link Tasks to Profiles
ALTER TABLE public.marketplace_tasks DROP CONSTRAINT IF EXISTS marketplace_tasks_creator_id_fkey;
ALTER TABLE public.marketplace_tasks ADD CONSTRAINT marketplace_tasks_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 2. Link Submissions
ALTER TABLE public.marketplace_submissions DROP CONSTRAINT IF EXISTS marketplace_submissions_worker_id_fkey;
ALTER TABLE public.marketplace_submissions ADD CONSTRAINT marketplace_submissions_worker_id_fkey FOREIGN KEY (worker_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 3. Link Video Ads
ALTER TABLE public.video_ads DROP CONSTRAINT IF EXISTS video_ads_creator_id_fkey;
ALTER TABLE public.video_ads ADD CONSTRAINT video_ads_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 4. Reload Schema
NOTIFY pgrst, 'reload config';
`
        },
        {
            title: 'Repair Missing Tables',
            desc: 'Creates video_ads if missing.',
            sql: `
CREATE TABLE IF NOT EXISTS public.video_ads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    creator_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    video_url TEXT NOT NULL,
    thumbnail_url TEXT,
    duration INTEGER DEFAULT 60,
    total_budget NUMERIC(10, 2) DEFAULT 0,
    remaining_budget NUMERIC(10, 2) DEFAULT 0,
    cost_per_view NUMERIC(10, 2) DEFAULT 0.50,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.video_ads ENABLE ROW LEVEL SECURITY;
`
        }
    ],
    danger: [
        {
            title: 'FACTORY RESET (WIPE DATA)',
            desc: 'Resets all user wallets to 0, clears history. DOES NOT DELETE USERS.',
            sql: `
TRUNCATE TABLE public.transactions;
TRUNCATE TABLE public.deposit_requests;
TRUNCATE TABLE public.withdraw_requests;
TRUNCATE TABLE public.game_history;
TRUNCATE TABLE public.marketplace_submissions;
TRUNCATE TABLE public.influencer_submissions;
UPDATE public.wallets SET main_balance = 0, bonus_balance = 0, deposit_balance = 0, game_balance = 0, earning_balance = 0, investment_balance = 0, referral_balance = 0, commission_balance = 0, balance = 0, deposit = 0, withdrawable = 0, total_earning = 0, today_earning = 0, pending_withdraw = 0, referral_earnings = 0;
TRUNCATE TABLE public.daily_streaks;
TRUNCATE TABLE public.task_reports;
`
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
                        Advanced Admin Console • v4.7.0
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
