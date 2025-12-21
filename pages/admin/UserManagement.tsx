
import React, { useEffect, useState } from 'react';
import { 
  Search, RefreshCw, Copy, 
  ShieldCheck, Lock, Users, UserX, CheckCircle2, Ban, Briefcase, Star, Activity, Crown, Zap, DollarSign, Calendar, Trophy, ChevronRight
} from 'lucide-react';
import GlassCard from '../../components/GlassCard';
import { supabase } from '../../integrations/supabase/client';
import { UserProfile } from '../../types';
import Skeleton from '../../components/Skeleton';
import { useUI } from '../../context/UIContext';
import BalanceDisplay from '../../components/BalanceDisplay';

interface UserManagementProps {
    onSelectUser?: (userId: string) => void;
}

interface EnrichedProfile extends UserProfile {
    balance?: number;
    total_withdraw?: number;
}

const UserManagement: React.FC<UserManagementProps> = ({ onSelectUser }) => {
  const { toast } = useUI();
  const [users, setUsers] = useState<EnrichedProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'verified' | 'blocked' | 'suspended' | 'dealer' | 'staff'>('all');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
        const { data: profiles, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (profileError) throw profileError;

        const { data: wallets } = await supabase.from('wallets').select('user_id, balance');
        const walletMap = new Map((wallets || []).map((w: any) => [w.user_id, w.balance]));

        if (profiles) {
            const userList: EnrichedProfile[] = profiles.map((p: any) => ({
                ...p,
                balance: walletMap.get(p.id) || 0
            }));
            setUsers(userList);
        }
    } catch (err: any) {
        console.error(err);
    } finally {
        setIsLoading(false);
    }
  };

  const handleCopy = (text: string, label: string = "ID") => {
      navigator.clipboard.writeText(text);
      toast.success(`${label} copied`);
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = 
        u.email_1?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        u.name_1?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(u.user_uid).includes(searchTerm);
    
    if (!matchesSearch) return false;
    if (filter === 'verified') return u.is_kyc_1;
    if (filter === 'blocked') return u.is_withdraw_blocked;
    if (filter === 'suspended') return u.is_suspended;
    if (filter === 'dealer') return u.is_dealer;
    if (filter === 'staff') return (u.role === 'staff' || u.role === 'admin' || u.admin_user);
    return true;
  });

  return (
    <div className="space-y-6 pb-20">
      
      {/* FILTER BAR - BASIC STYLE */}
      <div className="bg-[#0a0a0a] p-3 rounded-2xl border border-white/5 space-y-3">
          <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={18} />
              <input 
                type="text" 
                placeholder="Search Identity, Email, or Network UID..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-black border border-white/5 rounded-xl pl-12 pr-4 py-3.5 text-xs text-white focus:border-blue-500 outline-none transition-all font-mono" 
              />
          </div>
          
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {(['all', 'verified', 'dealer', 'staff', 'blocked', 'suspended'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                        filter === f 
                        ? 'bg-blue-600 text-white border-blue-500 shadow-lg' 
                        : 'bg-white/5 text-gray-500 border-white/5 hover:border-white/10'
                    }`}
                  >
                      {f}
                  </button>
              ))}
          </div>
      </div>

      <div className="space-y-2">
        {isLoading ? (
            <div className="space-y-2">
                {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-20 rounded-2xl" />)}
            </div>
        ) : filteredUsers.length === 0 ? (
            <div className="text-center py-20 text-gray-700 bg-white/[0.02] rounded-3xl border border-dashed border-white/10 uppercase font-black tracking-widest text-xs">
                No Node Records Found
            </div>
        ) : (
            <div className="grid grid-cols-1 gap-2">
                {filteredUsers.map(u => {
                    const isBan = u.is_suspended;
                    const isKYC = u.is_kyc_1;
                    const isBlock = u.is_withdraw_blocked;

                    return (
                        <div 
                            key={u.id} 
                            onClick={() => onSelectUser && onSelectUser(u.id)}
                            className={`bg-[#0a0a0a] border rounded-2xl p-4 cursor-pointer hover:bg-blue-600/[0.02] transition-all group relative overflow-hidden ${
                                isBan ? 'border-red-500/30' : 'border-white/5 hover:border-blue-500/30'
                            }`}
                        >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                                <div className="flex items-center gap-5">
                                    <div className="relative shrink-0">
                                        <div className="w-14 h-14 rounded-2xl bg-black border border-white/10 overflow-hidden shadow-inner">
                                            <img src={u.avatar_1 || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.name_1}`} className="w-full h-full object-cover" />
                                        </div>
                                        {isKYC && <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white p-1 rounded-lg border-2 border-black"><ShieldCheck size={10} strokeWidth={3}/></div>}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                                            <p className="font-black text-sm text-white uppercase tracking-tighter truncate">{u.name_1 || 'Unidentified Node'}</p>
                                            {u.is_dealer && <span className="text-[8px] bg-amber-500 text-black px-1.5 py-0.5 rounded font-black uppercase">PARTNER</span>}
                                            {u.admin_user && <span className="text-[8px] bg-indigo-500 text-black px-1.5 py-0.5 rounded font-black uppercase">CORE_STAFF</span>}
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <button onClick={(e) => { e.stopPropagation(); handleCopy(String(u.user_uid), "UID"); }} className="hover:text-blue-400 transition font-mono text-[9px] text-gray-500 bg-black px-2 py-1 rounded border border-white/5 font-black">
                                                ID-{u.user_uid}
                                            </button>
                                            <span className="text-[9px] text-gray-600 font-bold truncate max-w-[150px] uppercase tracking-wider">{u.email_1}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between sm:justify-end gap-10 pl-16 sm:pl-0 border-t sm:border-t-0 border-white/5 pt-4 sm:pt-0">
                                    <div className="text-right">
                                        <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-1">AGGREGATE BALANCE</p>
                                        <p className="font-mono font-black text-white text-base leading-none tracking-tighter">
                                            <BalanceDisplay amount={u.balance || 0} compact />
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-1">STATUS_HEX</p>
                                        <div className="flex gap-1.5 justify-end">
                                            {isBan ? <span className="text-[9px] bg-red-600/20 text-red-500 px-2 py-0.5 rounded font-black uppercase border border-red-500/20">BANNED</span> :
                                             isBlock ? <span className="text-[9px] bg-orange-600/20 text-orange-500 px-2 py-0.5 rounded font-black uppercase border border-orange-500/20">LOCKED</span> :
                                             <span className="text-[9px] bg-green-600/20 text-green-500 px-2 py-0.5 rounded font-black uppercase border border-green-500/20">OPERATIONAL</span>}
                                        </div>
                                    </div>
                                    <div className="hidden sm:block">
                                        <ChevronRight size={20} className="text-gray-800" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        )}
      </div>
    </div>
  );
};

export default UserManagement;
