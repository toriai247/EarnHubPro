
import React, { useEffect, useState } from 'react';
import GlassCard from '../../../components/GlassCard';
import { supabaseAdmin } from '../../../integrations/supabase/admin-client';
import { User } from '@supabase/supabase-js';
import { Key, Trash2, Mail, Shield, Search, RefreshCw, Loader2, Edit, AlertCircle, CheckCircle } from 'lucide-react';
import { useUI } from '../../../context/UIContext';
import { motion } from 'framer-motion';

const AuthManager: React.FC = () => {
    const { toast, confirm } = useUI();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Pagination (Simple)
    const [page, setPage] = useState(1);
    const PER_PAGE = 50;

    useEffect(() => {
        fetchAuthUsers();
    }, [page]);

    const fetchAuthUsers = async () => {
        setLoading(true);
        try {
            const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers({
                page: page,
                perPage: PER_PAGE
            });

            if (error) throw error;
            setUsers(users || []);
        } catch (e: any) {
            toast.error("Failed to fetch auth users: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteUser = async (userId: string) => {
        if (!await confirm("Permanently delete this user from Auth? This will also remove them from database if cascade is set.", "Confirm Delete")) return;
        
        try {
            const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
            if (error) throw error;
            
            toast.success("User deleted from Authentication");
            setUsers(prev => prev.filter(u => u.id !== userId));
        } catch (e: any) {
            toast.error(e.message);
        }
    };

    const handleSendReset = async (email: string) => {
        if (!email) return;
        if (!await confirm(`Send password reset email to ${email}?`)) return;

        try {
            const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email);
            if (error) throw error;
            toast.success("Reset email sent");
        } catch (e: any) {
            toast.error(e.message);
        }
    };

    const handleConfirmUser = async (userId: string) => {
        if (!await confirm("Manually verify this user's email?")) return;

        try {
            const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { email_confirm: true });
            if (error) throw error;
            toast.success("User email verified manually");
            fetchAuthUsers();
        } catch (e: any) {
            toast.error(e.message);
        }
    };

    const filteredUsers = users.filter(u => 
        u.email?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        u.id.includes(searchTerm)
    );

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-black text-white flex items-center gap-3">
                        <Key size={32} className="text-orange-400" /> Auth Master
                    </h2>
                    <p className="text-gray-400 text-sm mt-1">
                        Direct access to Supabase Auth. Manage accounts, resets, and deletions.
                    </p>
                </div>
                <div className="flex gap-2">
                    <div className="relative">
                         <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16}/>
                         <input 
                            type="text" 
                            placeholder="Search Email / UUID" 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-white focus:border-orange-500 outline-none w-64"
                         />
                    </div>
                    <button onClick={fetchAuthUsers} className="p-2 bg-white/10 rounded-xl hover:bg-white/20 text-white transition">
                        <RefreshCw size={20} className={loading ? 'animate-spin' : ''}/>
                    </button>
                </div>
            </div>

            <div className="bg-[#111] border border-white/10 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-400">
                        <thead className="bg-white/5 text-xs font-bold text-white uppercase border-b border-white/10">
                            <tr>
                                <th className="px-6 py-4">User</th>
                                <th className="px-6 py-4">Providers</th>
                                <th className="px-6 py-4">Created / Last Sign In</th>
                                <th className="px-6 py-4 text-center">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr><td colSpan={5} className="p-10 text-center"><Loader2 className="animate-spin mx-auto text-orange-500"/></td></tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr><td colSpan={5} className="p-10 text-center text-gray-500">No users found.</td></tr>
                            ) : (
                                filteredUsers.map(user => (
                                    <tr key={user.id} className="hover:bg-white/5 transition">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white font-bold">
                                                    {user.email?.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-white">{user.email}</p>
                                                    <p className="text-[10px] font-mono text-gray-500">{user.id}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex gap-1">
                                                {user.app_metadata.provider && (
                                                    <span className="px-2 py-1 bg-white/10 rounded text-[10px] uppercase font-bold">{user.app_metadata.provider}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-xs">
                                            <p><span className="text-gray-600">Created:</span> {new Date(user.created_at).toLocaleDateString()}</p>
                                            <p><span className="text-gray-600">Last Seen:</span> {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'Never'}</p>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {user.email_confirmed_at ? (
                                                <span className="text-green-500 bg-green-500/10 px-2 py-1 rounded text-[10px] font-bold uppercase border border-green-500/20">Verified</span>
                                            ) : (
                                                <button onClick={() => handleConfirmUser(user.id)} className="text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded text-[10px] font-bold uppercase border border-yellow-500/20 hover:bg-yellow-500/20 cursor-pointer">Unverified</button>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button 
                                                    onClick={() => handleSendReset(user.email || '')}
                                                    className="p-2 bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500/20"
                                                    title="Send Password Reset Email"
                                                >
                                                    <Mail size={16}/>
                                                </button>
                                                <button 
                                                    onClick={() => handleDeleteUser(user.id)}
                                                    className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20"
                                                    title="Delete User"
                                                >
                                                    <Trash2 size={16}/>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                
                {/* Simple Pagination Controls */}
                <div className="p-4 border-t border-white/10 flex justify-between items-center">
                    <button 
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1 || loading}
                        className="px-4 py-2 bg-white/5 rounded-lg text-xs font-bold text-gray-400 hover:text-white disabled:opacity-50"
                    >
                        Previous
                    </button>
                    <span className="text-xs text-gray-500 font-bold">Page {page}</span>
                    <button 
                        onClick={() => setPage(p => p + 1)}
                        disabled={users.length < PER_PAGE || loading}
                        className="px-4 py-2 bg-white/5 rounded-lg text-xs font-bold text-gray-400 hover:text-white disabled:opacity-50"
                    >
                        Next
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AuthManager;
