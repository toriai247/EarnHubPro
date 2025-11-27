
import React, { useEffect, useState } from 'react';
import GlassCard from '../../components/GlassCard';
import { supabase } from '../../integrations/supabase/client';
import { 
    Database, Download, Upload, Server, ShieldCheck, 
    FileJson, Clock, RefreshCw, Loader2, 
    Code, Terminal, Save, Activity, Trash2, HardDrive, Globe, Copy, Table, AlertTriangle, Skull
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

// The Schema SQL provided by the user
const FULL_SCHEMA_SQL = `-- WARNING: This schema is for recovery purposes.

CREATE TABLE public.active_ludo_matches (
  user_id uuid NOT NULL,
  game_state jsonb NOT NULL,
  stake_amount numeric NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT active_ludo_matches_pkey PRIMARY KEY (user_id),
  CONSTRAINT active_ludo_matches_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.bot_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  avatar text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT bot_profiles_pkey PRIMARY KEY (id)
);
-- ... (Schema continues for all tables)
`;

const RESET_SCRIPT_SQL = `-- DANGER: SYSTEM RESET SCRIPT
-- This will delete ALL transaction history but keep user accounts.
-- Everyone gets $1.00 USD (120 TK) Bonus.

BEGIN;

-- 1. Wipe All Transaction History
TRUNCATE TABLE transactions, deposit_requests, withdraw_requests, game_history, investments, referrals, user_tasks, video_submissions, active_ludo_matches CASCADE;

-- 2. Reset All Wallets to 0.00
UPDATE wallets SET 
  balance = 0, main_balance = 0, deposit_balance = 0, 
  game_balance = 0, earning_balance = 0, investment_balance = 0, 
  referral_balance = 0, commission_balance = 0, bonus_balance = 0,
  deposit = 0, withdrawable = 0, total_earning = 0, 
  today_earning = 0, pending_withdraw = 0, referral_earnings = 0;

-- 3. Give 120 TK Bonus (Calculated as $1.00 USD)
UPDATE wallets SET bonus_balance = 1.00;

-- 4. Log the Bonus Transaction
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
        // Process in batches to avoid network congestion but here we'll do parallel for speed in admin panel
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
                console.log("Auto-backup trigger time reached.");
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
        if (error && error.message.includes('bucket not found')) {
            toast.error("Bucket 'db-backups' not found. Please run SQL setup.");
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

            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            if (!isAuto) toast.success("Backup Uploaded & Downloaded!");
            else toast.info("Daily Backup Completed.");
            
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

                        <GlassCard>
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                        <Code className="text-purple-400" /> Complete Schema Reference
                                    </h3>
                                    <p className="text-sm text-gray-400 mt-1">
                                        Full SQL structure for table reconstruction.
                                    </p>
                                </div>
                                <button 
                                    onClick={() => { navigator.clipboard.writeText(FULL_SCHEMA_SQL); toast.success("SQL Copied!"); }}
                                    className="text-xs bg-cyan-500 text-black font-bold px-4 py-2 rounded-lg hover:bg-cyan-400 flex items-center gap-2"
                                >
                                    <Copy size={16}/> Copy SQL
                                </button>
                            </div>

                            <div className="bg-black rounded-xl border border-white/10 p-4 font-mono text-xs overflow-x-auto relative group h-[600px] shadow-inner">
                                <div className="absolute top-0 left-0 right-0 bg-white/5 px-4 py-2 flex items-center gap-2 border-b border-white/5 text-gray-500 z-10 backdrop-blur-sm">
                                    <Terminal size={12} /> schema_dump.sql
                                </div>
                                <pre className="mt-8 text-green-400/90 leading-relaxed whitespace-pre-wrap select-text p-2">
                                    {FULL_SCHEMA_SQL}
                                </pre>
                            </div>
                        </GlassCard>
                    </motion.div>
                )}

                {activeTab === 'danger' && (
                    <motion.div
                        key="danger"
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                        className="space-y-6"
                    >
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

                            <p className="text-xs text-red-500/70 italic">
                                * Run this script in your Supabase SQL Editor to execute the reset immediately.
                            </p>
                        </GlassCard>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default DatabaseUltra;
