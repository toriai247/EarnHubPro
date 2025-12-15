
import React, { useState } from 'react';
import GlassCard from '../../../components/GlassCard';
import { supabaseAdmin } from '../../../integrations/supabase/admin-client';
import { Terminal, Play, AlertTriangle, CheckCircle, Copy, AlertCircle, Loader2 } from 'lucide-react';
import { useUI } from '../../../context/UIContext';

const SqlRunner: React.FC = () => {
    const { toast, confirm } = useUI();
    const [query, setQuery] = useState('');
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const SETUP_SQL = `
CREATE OR REPLACE FUNCTION admin_run_sql(sql text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  json_result json;
BEGIN
  EXECUTE 'SELECT json_agg(t) FROM (' || sql || ') t' INTO json_result;
  RETURN json_result;
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('error', SQLERRM);
END;
$$;
`;

    const executeSql = async () => {
        if (!query.trim()) return;
        setLoading(true);
        setError(null);
        setResult(null);

        try {
            // Attempt to use the RPC function.
            // Note: Even with supabaseAdmin (service key), we can't run raw SQL directly via client library 
            // unless we have this helper function in the DB.
            const { data, error } = await supabaseAdmin.rpc('admin_run_sql', { sql: query });

            if (error) {
                // If RPC doesn't exist, this error will be thrown
                if (error.message.includes('function admin_run_sql') && error.message.includes('does not exist')) {
                    throw new Error("RPC_MISSING");
                }
                throw error;
            }

            // Check if the SQL execution itself returned an error object
            if (data && typeof data === 'object' && 'error' in data) {
                throw new Error(data.error);
            }

            setResult(data || "Success (No Rows Returned)");
            toast.success("Query Executed Successfully");

        } catch (e: any) {
            if (e.message === 'RPC_MISSING') {
                setError("SETUP REQUIRED: The helper function 'admin_run_sql' is missing in your database. Please copy the setup SQL below and run it in the Supabase SQL Editor once.");
            } else {
                setError(e.message);
                toast.error("Execution Failed");
            }
        } finally {
            setLoading(false);
        }
    };

    const copySetup = () => {
        navigator.clipboard.writeText(SETUP_SQL);
        toast.success("Setup SQL copied to clipboard");
    };

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            <header>
                <h1 className="text-3xl font-black text-white flex items-center gap-3">
                    <Terminal size={32} className="text-red-500" /> SQL Command Center
                </h1>
                <p className="text-gray-400 text-sm mt-1">
                    Execute raw SQL queries directly against your database. <span className="text-red-400 font-bold">Use with extreme caution.</span>
                </p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* EDITOR */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="relative group">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-red-600 to-orange-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
                        <GlassCard className="relative bg-[#0a0a0a] border-white/10 p-0 overflow-hidden">
                            <div className="bg-[#1a1a1a] px-4 py-2 border-b border-white/10 flex justify-between items-center">
                                <span className="text-xs font-mono text-gray-500">psql-console</span>
                                <div className="flex gap-1.5">
                                    <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50"></div>
                                    <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
                                    <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50"></div>
                                </div>
                            </div>
                            <textarea 
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                className="w-full h-64 bg-transparent p-4 text-sm font-mono text-green-400 focus:outline-none resize-none placeholder-gray-800"
                                placeholder="SELECT * FROM profiles LIMIT 5;"
                                spellCheck="false"
                            />
                            <div className="p-4 border-t border-white/10 bg-[#151515] flex justify-end">
                                <button 
                                    onClick={executeSql}
                                    disabled={loading || !query.trim()}
                                    className="bg-red-600 hover:bg-red-500 text-white px-6 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition disabled:opacity-50"
                                >
                                    {loading ? <Loader2 className="animate-spin" size={16}/> : <Play size={16} fill="currentColor"/>}
                                    RUN QUERY
                                </button>
                            </div>
                        </GlassCard>
                    </div>

                    {/* RESULTS */}
                    {error && (
                        <div className="bg-red-900/20 border border-red-500/30 p-4 rounded-xl text-red-300 text-sm font-mono whitespace-pre-wrap">
                            <AlertCircle size={16} className="inline mr-2 -mt-0.5"/>
                            {error}
                            {error.includes("SETUP REQUIRED") && (
                                <button onClick={copySetup} className="block mt-3 bg-red-500/20 hover:bg-red-500/30 text-white px-3 py-1.5 rounded text-xs transition border border-red-500/30 flex items-center gap-2 w-fit">
                                    <Copy size={12}/> Copy Setup Code
                                </button>
                            )}
                        </div>
                    )}

                    {result && (
                        <div className="bg-[#111] border border-white/10 rounded-xl overflow-hidden">
                            <div className="bg-white/5 px-4 py-2 border-b border-white/10 flex justify-between items-center">
                                <span className="text-xs font-bold text-gray-400 uppercase">Query Result</span>
                                <span className="text-[10px] text-green-400 font-mono">200 OK</span>
                            </div>
                            <div className="p-4 overflow-x-auto">
                                {Array.isArray(result) && result.length > 0 ? (
                                    <table className="w-full text-left text-xs font-mono text-gray-300">
                                        <thead className="text-gray-500 border-b border-white/10">
                                            <tr>
                                                {Object.keys(result[0]).map(key => <th key={key} className="p-2">{key}</th>)}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {result.map((row, i) => (
                                                <tr key={i} className="hover:bg-white/5">
                                                    {Object.values(row).map((val: any, j) => (
                                                        <td key={j} className="p-2 whitespace-nowrap">
                                                            {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap">
                                        {JSON.stringify(result, null, 2)}
                                    </pre>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* SIDEBAR HELP */}
                <div className="space-y-6">
                    <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-xl">
                        <h4 className="text-yellow-400 font-bold text-sm mb-2 flex items-center gap-2">
                            <AlertTriangle size={16}/> Warning
                        </h4>
                        <p className="text-xs text-yellow-200/70 leading-relaxed">
                            This tool bypasses Row Level Security (RLS) if configured correctly.
                            You can modify or delete any data. There is no undo.
                        </p>
                    </div>

                    <GlassCard className="space-y-3">
                        <h4 className="text-white font-bold text-sm">Common Snippets</h4>
                        
                        <div className="space-y-2">
                            <button onClick={() => setQuery("SELECT * FROM profiles ORDER BY created_at DESC LIMIT 10;")} className="w-full text-left p-2 bg-white/5 hover:bg-white/10 rounded text-xs font-mono text-gray-400 truncate">
                                Last 10 Users
                            </button>
                            <button onClick={() => setQuery("SELECT * FROM transactions WHERE amount > 1000;")} className="w-full text-left p-2 bg-white/5 hover:bg-white/10 rounded text-xs font-mono text-gray-400 truncate">
                                High Value Tx
                            </button>
                            <button onClick={() => setQuery("UPDATE profiles SET is_suspended = true WHERE email_1 = 'target@email.com';")} className="w-full text-left p-2 bg-white/5 hover:bg-white/10 rounded text-xs font-mono text-red-400 truncate">
                                Ban User by Email
                            </button>
                            <button onClick={() => setQuery("SELECT tablename FROM pg_tables WHERE schemaname='public';")} className="w-full text-left p-2 bg-white/5 hover:bg-white/10 rounded text-xs font-mono text-blue-400 truncate">
                                List All Tables
                            </button>
                        </div>
                    </GlassCard>
                </div>
            </div>
        </div>
    );
};

export default SqlRunner;
