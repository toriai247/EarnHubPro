
import React, { useEffect, useState } from 'react';
import { 
  Search, RefreshCw, AlertCircle, ArrowRight, Copy, 
  ShieldCheck, Lock, Users, Filter, UserX, CheckCircle2, MoreVertical, Ban, ShieldAlert, BadgeAlert, StickyNote, Briefcase, Eye
} from 'lucide-react';
import GlassCard from '../../components/GlassCard';
import { supabase } from '../../integrations/supabase/client';
import { UserProfile } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';
import Skeleton from '../../components/Skeleton';
import { useUI } from '../../context/UIContext';

interface UserManagementProps {
    onSelectUser?: (userId: string) => void;
}

const UserManagement: React.FC<UserManagementProps> = ({ onSelectUser }) => {
  const { toast } = useUI();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'verified' | 'blocked' | 'suspended'>('all');
  const [currentUserRole, setCurrentUserRole] = useState<'admin' | 'moderator' | 'user'>('user');

  // Stats
  const [stats, setStats] = useState({ total: 0, verified: 0, blocked: 0, suspended: 0 });

  useEffect(() => {
    fetchUsers();
    checkRole();
  }, []);

  const checkRole = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
          // Safer to select * incase 'role' missing
          const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
          if (data) {
              if (data.admin_user || data.role === 'admin') setCurrentUserRole('admin');
              else if (data.role === 'moderator') setCurrentUserRole('moderator');
          }
      }
  };

  const fetchUsers = async () => {
    setIsLoading(true);
    setError(null);
    try {
        const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
        
        if (error) throw error;
        
        if (data) {
            const userList = data as UserProfile[];
            setUsers(userList);
            setStats({
                total: userList.length,
                verified: userList.filter(u => u.is_kyc_1).length,
                blocked: userList.filter(u => u.is_withdraw_blocked).length,
                suspended: userList.filter(u => u.is_suspended).length
            });
        }
    } catch (err: any) {
        console.error("Error fetching users:", err);
        setError(err.message || "Failed to load users. Ensure RLS policies are updated.");
    } finally {
        setIsLoading(false);
    }
  };

  const handleCopyId = (id: string) => {
      navigator.clipboard.writeText(id);
      toast.success("User ID copied to clipboard");
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = 
        u.email_1?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        u.name_1?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;

    if (filter === 'verified') return u.is_kyc_1;
    if (filter === 'blocked') return u.is_withdraw_blocked;
    if (filter === 'suspended') return u.is_suspended;
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      
      {/* --- HEADER & STATS --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Users className="text-blue-500" /> User Database
            </h2>
            <p className="text-gray-400 text-sm">Real-time user monitoring and access control.</p>
        </div>
        <button 
            onClick={fetchUsers} 
            className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition border border-white/5 shadow-sm"
            title="Refresh Data"
        >
            <RefreshCw size={20} className={isLoading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <GlassCard className="p-4 flex items-center justify-between bg-blue-900/10 border-blue-500/20 relative overflow-hidden group">
              <div className="relative z-10">
                  <p className="text-[10px] text-blue-300 font-bold uppercase">Total Users</p>
                  <p className="text-2xl font-bold text-white">{stats.total}</p>
              </div>
              <Users size={24} className="text-blue-500 opacity-50 group-hover:scale-110 transition" />
          </GlassCard>
          <GlassCard className="p-4 flex items-center justify-between bg-green-900/10 border-green-500/20 relative overflow-hidden group">
              <div className="relative z-10">
                  <p className="text-[10px] text-green-300 font-bold uppercase">Verified (KYC)</p>
                  <p className="text-2xl font-bold text-white">{stats.verified}</p>
              </div>
              <ShieldCheck size={24} className="text-green-500 opacity-50 group-hover:scale-110 transition" />
          </GlassCard>
          <GlassCard className="p-4 flex items-center justify-between bg-orange-900/10 border-orange-500/20 relative overflow-hidden group">
              <div className="relative z-10">
                  <p className="text-[10px] text-orange-300 font-bold uppercase">Blocked WD</p>
                  <p className="text-2xl font-bold text-white">{stats.blocked}</p>
              </div>
              <Lock size={24} className="text-orange-500 opacity-50 group-hover:scale-110 transition" />
          </GlassCard>
          <GlassCard className="p-4 flex items-center justify-between bg-red-900/10 border-red-500/20 relative overflow-hidden group">
              <div className="relative z-10">
                  <p className="text-[10px] text-red-300 font-bold uppercase">Suspended</p>
                  <p className="text-2xl font-bold text-white">{stats.suspended}</p>
              </div>
              <Ban size={24} className="text-red-500 opacity-50 group-hover:scale-110 transition" />
          </GlassCard>
      </div>

      {/* --- TOOLBAR --- */}
      <GlassCard className="p-2 flex flex-col lg:flex-row gap-3 items-center sticky top-0 z-20 backdrop-blur-xl bg-dark-900/90 shadow-lg border-b border-white/5">
          <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input 
                type="text" 
                placeholder="Search by Name, Email or ID..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition" 
              />
          </div>
          
          <div className="flex overflow-x-auto no-scrollbar bg-black/40 p-1 rounded-xl border border-white/10 w-full lg:w-auto">
              {(['all', 'verified', 'blocked', 'suspended'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`flex-1 lg:flex-none px-4 py-2 rounded-lg text-xs font-bold uppercase transition flex items-center justify-center gap-2 whitespace-nowrap ${
                        filter === f 
                        ? 'bg-white/10 text-white shadow-sm border border-white/10' 
                        : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                      {f === 'verified' && <ShieldCheck size={12} />}
                      {f === 'blocked' && <Lock size={12} />}
                      {f === 'suspended' && <Ban size={12} />}
                      {f}
                  </button>
              ))}
          </div>
      </GlassCard>

      {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-start gap-3">
              <AlertCircle size={20} className="mt-0.5 shrink-0" />
              <div>
                  <span className="font-bold block mb-1">Error Loading Data</span>
                  <p>{error}</p>
              </div>
          </div>
      )}

      {/* --- USER LIST --- */}
      <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden min-h-[400px]">
        {isLoading ? (
            <div className="p-6 space-y-4">
                {[1,2,3,4,5].map(i => (
                    <div key={i} className="flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <Skeleton variant="circular" className="w-10 h-10" />
                            <div className="space-y-2">
                                <Skeleton variant="text" className="w-32" />
                                <Skeleton variant="text" className="w-24" />
                            </div>
                        </div>
                        <Skeleton variant="rectangular" className="w-20 h-8" />
                    </div>
                ))}
            </div>
        ) : filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <UserX size={48} className="mb-4 opacity-50" />
                <p>No users found matching your criteria.</p>
            </div>
        ) : (
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-400">
                    <thead className="bg-black/20 text-xs uppercase font-bold text-white border-b border-white/5">
                        <tr>
                            <th className="px-6 py-4">User Identity</th>
                            <th className="px-6 py-4">Risk & Status</th>
                            <th className="px-6 py-4">Contact</th>
                            <th className="px-6 py-4">Admin Notes</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {filteredUsers.map(u => (
                            <motion.tr 
                                layout
                                key={u.id} 
                                className={`hover:bg-white/5 transition group ${u.is_suspended ? 'bg-red-900/10' : ''}`}
                            >
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-black/30 border border-white/10 overflow-hidden shrink-0 relative">
                                            <img 
                                                src={u.avatar_1 || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.name_1}`} 
                                                alt="" 
                                                className={`w-full h-full object-cover ${u.is_suspended ? 'grayscale opacity-50' : ''}`} 
                                            />
                                            {u.is_suspended && (
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-red-500">
                                                    <Ban size={20} />
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <p className={`font-bold text-sm ${u.is_suspended ? 'text-red-400 line-through' : 'text-white'}`}>
                                                {u.name_1 || 'Unknown'}
                                            </p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[10px] font-mono bg-white/5 px-1.5 rounded text-gray-500 border border-white/5 max-w-[80px] truncate select-all">
                                                    {u.id}
                                                </span>
                                                <button 
                                                    onClick={() => handleCopyId(u.id)}
                                                    className="text-gray-600 hover:text-white transition"
                                                    title="Copy ID"
                                                >
                                                    <Copy size={10} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col items-start gap-1.5">
                                        <div className="flex gap-1 flex-wrap">
                                            {u.admin_user && (
                                                <span className="bg-purple-500/20 text-purple-400 text-[10px] font-bold px-2 py-0.5 rounded border border-purple-500/30">ADMIN</span>
                                            )}
                                            {u.is_dealer && (
                                                <span className="bg-amber-500/20 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-500/30 flex items-center gap-1">
                                                    <Briefcase size={8} /> DEALER
                                                </span>
                                            )}
                                            {u.is_suspended ? (
                                                <span className="bg-red-500 text-black text-[10px] font-bold px-2 py-0.5 rounded border border-red-600 shadow-sm flex items-center gap-1">
                                                    <Ban size={10}/> BANNED
                                                </span>
                                            ) : (
                                                <span className="bg-blue-500/10 text-blue-400 text-[10px] font-bold px-2 py-0.5 rounded border border-blue-500/20">
                                                    LVL {u.level_1}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex gap-2 text-xs flex-wrap">
                                            {u.is_kyc_1 ? (
                                                <span className="flex items-center gap-1 text-neon-green font-medium" title="KYC Verified"><ShieldCheck size={12}/> Verified</span>
                                            ) : (
                                                <span className="flex items-center gap-1 text-gray-500 opacity-50" title="No KYC"><ShieldCheck size={12}/> Unverified</span>
                                            )}
                                            {u.is_withdraw_blocked && (
                                                <span className="flex items-center gap-1 text-orange-500 font-medium" title="Withdrawals Blocked"><Lock size={12}/> Blocked</span>
                                            )}
                                            {(u.risk_score || 0) > 50 && (
                                                <span className="flex items-center gap-1 text-red-400 font-bold" title="High Risk User"><ShieldAlert size={12}/> Risk: {u.risk_score}</span>
                                            )}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <p className="text-white text-xs select-all hover:text-blue-400 cursor-pointer">{u.email_1}</p>
                                    <p className="text-[10px] mt-1 text-gray-500">Joined: {new Date(u.created_at).toLocaleDateString()}</p>
                                </td>
                                <td className="px-6 py-4">
                                    {u.admin_notes ? (
                                        <div className="text-xs text-yellow-200/70 italic bg-yellow-500/5 p-2 rounded border border-yellow-500/10 max-w-[150px] truncate" title={u.admin_notes}>
                                            <StickyNote size={10} className="inline mr-1 opacity-70"/> {u.admin_notes}
                                        </div>
                                    ) : (
                                        <span className="text-xs text-gray-600 italic">No notes</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    {currentUserRole === 'admin' ? (
                                        <button 
                                            onClick={() => onSelectUser && onSelectUser(u.id)}
                                            className="bg-white/5 hover:bg-royal-600 hover:text-white text-royal-400 border border-royal-500/30 hover:border-royal-500 px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ml-auto shadow-sm active:scale-95 group-hover:bg-white/10"
                                        >
                                            Manage <ArrowRight size={14}/>
                                        </button>
                                    ) : (
                                        <div className="flex items-center justify-end gap-1 text-gray-500 text-xs">
                                            <Eye size={14}/> <span className="text-[10px] uppercase font-bold">Read Only</span>
                                        </div>
                                    )}
                                </td>
                            </motion.tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}
      </div>
    </div>
  );
};

export default UserManagement;
