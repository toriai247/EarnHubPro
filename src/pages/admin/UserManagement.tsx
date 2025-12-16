
import React, { useEffect, useState } from 'react';
import { 
  Search, RefreshCw, AlertCircle, ArrowRight, Copy, 
  ShieldCheck, Lock, Users, Filter, UserX, CheckCircle2, MoreVertical, Ban, ShieldAlert, BadgeAlert, StickyNote, Briefcase, Eye, Star, Activity, Crown, Zap, DollarSign, Calendar, Trophy
} from 'lucide-react';
import GlassCard from '../../components/GlassCard';
import { supabase } from '../../integrations/supabase/client';
import { UserProfile } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';
import Skeleton from '../../components/Skeleton';
import { useUI } from '../../context/UIContext';
import BalanceDisplay from '../../components/BalanceDisplay';

interface UserManagementProps {
    onSelectUser?: (userId: string) => void;
}

interface EnrichedProfile extends UserProfile {
    balance?: number;
}

const UserManagement: React.FC<UserManagementProps> = ({ onSelectUser }) => {
  const { toast, confirm } = useUI();
  const [users, setUsers] = useState<EnrichedProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'verified' | 'blocked' | 'suspended' | 'dealer' | 'staff'>('all');
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
        // 1. Fetch Profiles
        const { data: profiles, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (profileError) throw profileError;

        // 2. Fetch Wallets (for Main Balance)
        const { data: wallets } = await supabase.from('wallets').select('user_id, main_balance');
        
        // Create a Map for fast lookup
        const walletMap = new Map((wallets || []).map((w: any) => [w.user_id, w.main_balance]));

        if (profiles) {
            const userList: EnrichedProfile[] = profiles.map((p: any) => ({
                ...p,
                balance: walletMap.get(p.id) || 0
            }));

            setUsers(userList);
            setStats({
                total: userList.length,
                verified: userList.filter((u: any) => u.is_kyc_1).length,
                blocked: userList.filter((u: any) => u.is_withdraw_blocked).length,
                suspended: userList.filter((u: any) => u.is_suspended).length
            });
        }
    } catch (err: any) {
        setError(err.message);
    } finally {
        setIsLoading(false);
    }
  };

  const handleCopy = (text: string, label: string = "ID") => {
      navigator.clipboard.writeText(text);
      toast.success(`${label} copied`);
  };

  const filteredUsers = users.filter(u => {
    const userAny = u as any;
    const matchesSearch = 
        u.email_1?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        u.name_1?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(u.user_uid).includes(searchTerm);
    
    if (!matchesSearch) return false;
    
    if (filter === 'verified') return userAny.is_kyc_1;
    if (filter === 'blocked') return userAny.is_withdraw_blocked;
    if (filter === 'suspended') return userAny.is_suspended;
    if (filter === 'dealer') return userAny.is_dealer;
    if (filter === 'staff') return (u.role === 'staff' || u.role === 'admin' || u.admin_user);
    
    return true;
  });

  return (
    <div className="space-y-4 animate-fade-in pb-20">
      
      {/* --- STATS HEADER --- */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-blue-900/10 border border-blue-500/20 p-3 rounded-xl">
              <p className="text-[10px] text-blue-300 font-bold uppercase">Total Users</p>
              <p className="text-xl font-bold text-white">{stats.total}</p>
          </div>
          <div className="bg-green-900/10 border border-green-500/20 p-3 rounded-xl">
              <p className="text-[10px] text-green-300 font-bold uppercase">Verified</p>
              <p className="text-xl font-bold text-white">{stats.verified}</p>
          </div>
          <div className="bg-orange-900/10 border border-orange-500/20 p-3 rounded-xl">
              <p className="text-[10px] text-orange-300 font-bold uppercase">Blocked</p>
              <p className="text-xl font-bold text-white">{stats.blocked}</p>
          </div>
          <div className="bg-red-900/10 border border-red-500/20 p-3 rounded-xl">
              <p className="text-[10px] text-red-300 font-bold uppercase">Suspended</p>
              <p className="text-xl font-bold text-white">{stats.suspended}</p>
          </div>
      </div>

      {/* --- SEARCH & FILTER BAR --- */}
      <div className="sticky top-0 z-20 bg-[#050505]/90 backdrop-blur-xl py-2 space-y-2">
          <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
              <input 
                type="text" 
                placeholder="Search name, email, or ID..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#111] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:border-blue-500 outline-none" 
              />
          </div>
          
          <div className="flex overflow-x-auto no-scrollbar gap-2 pb-1">
              {(['all', 'verified', 'dealer', 'staff', 'blocked', 'suspended'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase whitespace-nowrap border transition ${
                        filter === f 
                        ? 'bg-white text-black border-white' 
                        : 'bg-[#111] text-gray-500 border-[#222]'
                    }`}
                  >
                      {f}
                  </button>
              ))}
          </div>
      </div>

      {/* --- USER LIST (RESPONSIVE) --- */}
      <div className="space-y-3">
        {isLoading ? (
            <div className="p-4 space-y-3">
                {[1,2,3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
            </div>
        ) : filteredUsers.length === 0 ? (
            <div className="text-center py-10 text-gray-500 bg-white/5 rounded-xl border border-white/5">
                No users found.
            </div>
        ) : (
            <div className="grid grid-cols-1 gap-2">
                {/* Desktop Header */}
                <div className="hidden lg:grid grid-cols-12 gap-4 bg-white/5 p-3 rounded-t-xl text-[10px] font-bold text-gray-400 uppercase border-b border-white/5 tracking-wider">
                    <div className="col-span-4">User Identity</div>
                    <div className="col-span-3">Financial & Stats</div>
                    <div className="col-span-3">Risk & Status</div>
                    <div className="col-span-2 text-right">Actions</div>
                </div>

                {/* Rows */}
                {filteredUsers.map(u => {
                    const riskScore = u.risk_score || 0;
                    const riskColor = riskScore > 70 ? 'text-red-500' : riskScore > 30 ? 'text-yellow-500' : 'text-green-500';
                    const riskBg = riskScore > 70 ? 'bg-red-500/10' : riskScore > 30 ? 'bg-yellow-500/10' : 'bg-green-500/10';

                    return (
                        <motion.div 
                            layout
                            key={u.id} 
                            className="bg-[#111] border border-white/5 rounded-xl lg:rounded-none lg:first:rounded-t-none p-4 lg:p-3 lg:grid lg:grid-cols-12 lg:gap-4 lg:items-center hover:bg-white/5 transition group"
                        >
                            {/* 1. Identity Column */}
                            <div className="flex items-start gap-3 lg:col-span-4 mb-4 lg:mb-0">
                                <div className="relative">
                                    <div className="w-10 h-10 rounded-full bg-black/30 border border-white/10 overflow-hidden shrink-0">
                                        <img src={u.avatar_1 || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.name_1}`} className="w-full h-full object-cover" />
                                    </div>
                                    {u.is_suspended && <div className="absolute -top-1 -right-1 bg-red-500 rounded-full p-0.5 border border-black"><Ban size={10} className="text-black"/></div>}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="font-bold text-sm text-white truncate">{u.name_1 || 'Unknown'}</p>
                                        
                                        {/* Role Badges */}
                                        {u.admin_user && <span className="text-[9px] bg-purple-500 text-black px-1.5 py-0.5 rounded font-black uppercase flex items-center gap-1"><Crown size={8} fill="black"/> Admin</span>}
                                        {u.is_dealer && <span className="text-[9px] bg-amber-500 text-black px-1.5 py-0.5 rounded font-black uppercase flex items-center gap-1"><Briefcase size={8} fill="black"/> Dealer</span>}
                                        {u.role === 'staff' && <span className="text-[9px] bg-blue-500 text-black px-1.5 py-0.5 rounded font-black uppercase flex items-center gap-1"><Star size={8} fill="black"/> Staff</span>}
                                    </div>
                                    
                                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                                        <button onClick={() => handleCopy(String(u.user_uid), "User ID")} className="hover:text-blue-400 flex items-center gap-1 transition font-mono bg-white/5 px-1.5 rounded">
                                            {u.user_uid} <Copy size={10} />
                                        </button>
                                        <span className="truncate max-w-[120px]" title={u.email_1}>{u.email_1}</span>
                                    </div>
                                </div>
                            </div>

                            {/* 2. Financial & Stats */}
                            <div className="flex flex-row lg:flex-col lg:items-start gap-4 lg:gap-1 lg:col-span-3 mb-3 lg:mb-0 text-sm">
                                <div className="flex items-center gap-2">
                                    <div className="p-1 bg-green-500/10 rounded text-green-500"><DollarSign size={12}/></div>
                                    <span className="font-mono font-bold text-white"><BalanceDisplay amount={u.balance || 0} /></span>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-gray-400">
                                    <span className="flex items-center gap-1"><Zap size={12} className="text-purple-400"/> Lvl {u.level_1}</span>
                                    <span className="flex items-center gap-1"><Trophy size={12} className="text-yellow-400"/> {u.rank_1 || 'Rookie'}</span>
                                </div>
                            </div>

                            {/* 3. Risk & Status */}
                            <div className="flex flex-row lg:flex-col lg:items-start gap-3 lg:gap-1 lg:col-span-3 mb-3 lg:mb-0">
                                <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold border border-transparent ${riskBg}`}>
                                    <Activity size={12} className={riskColor} />
                                    <span className={riskColor}>{riskScore}% Risk Score</span>
                                </div>
                                
                                <div className="flex items-center gap-2 mt-1">
                                    {u.is_kyc_1 ? (
                                        <span className="text-[10px] text-green-400 flex items-center gap-1 bg-green-900/20 px-1.5 rounded border border-green-500/20"><ShieldCheck size={10}/> KYC Verified</span>
                                    ) : (
                                        <span className="text-[10px] text-gray-500 flex items-center gap-1 bg-white/5 px-1.5 rounded border border-white/5"><UserX size={10}/> Unverified</span>
                                    )}
                                    
                                    {u.is_withdraw_blocked && <span className="text-[10px] text-orange-400 bg-orange-900/20 px-1.5 rounded border border-orange-500/20">Blocked</span>}
                                    {u.is_suspended && <span className="text-[10px] text-red-400 bg-red-900/20 px-1.5 rounded border border-red-500/20">Suspended</span>}
                                </div>
                                
                                <div className="text-[9px] text-gray-600 flex items-center gap-1 mt-0.5">
                                    <Calendar size={10}/> Joined: {new Date(u.created_at).toLocaleDateString()}
                                </div>
                            </div>

                            {/* 4. Actions */}
                            <div className="flex gap-2 lg:col-span-2 lg:justify-end border-t border-white/5 pt-3 lg:pt-0 lg:border-0">
                                {currentUserRole === 'admin' || currentUserRole === 'moderator' ? (
                                    <>
                                        <button 
                                            onClick={() => onSelectUser && onSelectUser(u.id)}
                                            className="flex-1 lg:flex-none py-2 lg:py-1.5 px-4 bg-white text-black hover:bg-gray-200 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg"
                                        >
                                            Manage
                                        </button>
                                    </>
                                ) : (
                                    <span className="text-xs text-gray-600 italic w-full text-center lg:text-right">Read Only</span>
                                )}
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        )}
      </div>
    </div>
  );
};

export default UserManagement;
