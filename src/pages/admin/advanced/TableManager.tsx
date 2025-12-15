
import React, { useEffect, useState } from 'react';
import GlassCard from '../../../components/GlassCard';
import { supabaseAdmin } from '../../../integrations/supabase/admin-client';
import { Table, Database, RefreshCw, Loader2, List, Code } from 'lucide-react';
import { useUI } from '../../../context/UIContext';

interface ColumnInfo {
    column_name: string;
    data_type: string;
    is_nullable: string;
    column_default: string;
}

const TableManager: React.FC = () => {
    const { toast } = useUI();
    const [tables, setTables] = useState<string[]>([]);
    const [selectedTable, setSelectedTable] = useState<string>('');
    const [columns, setColumns] = useState<ColumnInfo[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingCols, setLoadingCols] = useState(false);

    useEffect(() => {
        fetchTables();
    }, []);

    useEffect(() => {
        if (selectedTable) fetchColumns(selectedTable);
    }, [selectedTable]);

    const runSql = async (query: string) => {
        const { data, error } = await supabaseAdmin.rpc('admin_run_sql', { sql: query });
        if (error) {
            console.error(error);
            return null;
        }
        return data;
    };

    const fetchTables = async () => {
        setLoading(true);
        const query = `
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name;
        `;
        const data = await runSql(query);
        if (data && Array.isArray(data)) {
            setTables(data.map((r: any) => r.table_name));
            if (data.length > 0 && !selectedTable) setSelectedTable(data[0].table_name);
        }
        setLoading(false);
    };

    const fetchColumns = async (tableName: string) => {
        setLoadingCols(true);
        const query = `
            SELECT column_name, data_type, is_nullable, column_default 
            FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = '${tableName}'
            ORDER BY ordinal_position;
        `;
        const data = await runSql(query);
        if (data && Array.isArray(data)) {
            setColumns(data as ColumnInfo[]);
        } else {
            setColumns([]);
        }
        setLoadingCols(false);
    };

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            <header>
                <h2 className="text-3xl font-black text-white flex items-center gap-3">
                    <Table size={32} className="text-blue-400" /> Schema Explorer
                </h2>
                <p className="text-gray-400 text-sm mt-1">View database structure and column types.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[70vh]">
                
                {/* TABLE LIST */}
                <div className="lg:col-span-1 bg-[#111] border border-white/10 rounded-2xl flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-white/10 bg-white/5 flex justify-between items-center">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Public Tables</span>
                        <button onClick={fetchTables}><RefreshCw size={14} className={loading ? 'animate-spin text-white' : 'text-gray-500 hover:text-white'}/></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 custom-scrollbar space-y-1">
                        {tables.map(t => (
                            <button
                                key={t}
                                onClick={() => setSelectedTable(t)}
                                className={`w-full text-left px-4 py-3 rounded-lg text-sm font-mono transition flex items-center gap-3 ${selectedTable === t ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
                            >
                                <Database size={14} /> {t}
                            </button>
                        ))}
                    </div>
                </div>

                {/* SCHEMA VIEW */}
                <div className="lg:col-span-3 bg-black/40 border border-white/10 rounded-2xl flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-white/10 bg-white/5">
                        <h3 className="font-bold text-white text-lg font-mono flex items-center gap-2">
                            <List size={20} className="text-blue-400"/> public.{selectedTable}
                        </h3>
                    </div>

                    <div className="flex-1 overflow-auto custom-scrollbar">
                        {loadingCols ? (
                            <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-blue-400"/></div>
                        ) : columns.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-gray-500">Select a table to view schema.</div>
                        ) : (
                            <table className="w-full text-left text-sm text-gray-400">
                                <thead className="bg-[#111] text-xs font-bold text-white uppercase sticky top-0">
                                    <tr>
                                        <th className="px-6 py-3">Column Name</th>
                                        <th className="px-6 py-3">Data Type</th>
                                        <th className="px-6 py-3">Nullable</th>
                                        <th className="px-6 py-3">Default</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 font-mono text-xs">
                                    {columns.map((col, idx) => (
                                        <tr key={idx} className="hover:bg-white/5 transition">
                                            <td className="px-6 py-3 text-white font-bold">{col.column_name}</td>
                                            <td className="px-6 py-3 text-blue-300">{col.data_type}</td>
                                            <td className="px-6 py-3">
                                                <span className={`px-2 py-0.5 rounded ${col.is_nullable === 'YES' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-green-500/10 text-green-500'}`}>
                                                    {col.is_nullable}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3 text-gray-500 truncate max-w-[200px]" title={col.column_default}>
                                                {col.column_default || 'NULL'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default TableManager;
