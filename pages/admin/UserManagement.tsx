
import React, { useEffect, useState } from 'react';
import { Search, Settings, Lock, RefreshCw, AlertCircle, ArrowRight, Edit } from 'lucide-react';
import { supabase } from '../../integrations/supabase/client';
import { UserProfile } from '../../types';

interface UserManagementProps {
    onSelectUser?: (userId: string) => void;
}

const UserManagement: React.FC<UserManagementProps> = ({ onSelectUser }) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchUsers = async () => {
    setIsLoading(true);
    setError(null);
    const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    
    if (error) {
        console.error("Error fetching users:", error);
        setError(error.message || "Failed to load users.");
    } else if (data) {
        setUsers(data as UserProfile[]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = users.filter(u => 
    u.email_1?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.name_1?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">User Administration</h2>
        <div className="flex items-center gap-2">
            <button onClick={fetchUsers} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition">
                <RefreshCw size={18} />
            </button>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                <input 
                type="text" 
                placeholder="Search user ID, email..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-royal-500 w-40 sm:w-60" 
                />
            </div>
        </div>
      </div>

      {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm mb-4 flex items-start gap-3">
              <AlertCircle size={20} className="mt-0.5 shrink-0" />
              <div className="flex-1">
                  <span className="font-bold block mb-1">Access Restricted</span>
                  <p>{error}</p>
              </div>
          </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-left text-sm text-gray-400">
            <thead className="bg-white/5 text-xs uppercase font-bold text-white">
                <tr>
                    <th className="px-6 py-3">User</th>
                    <th className="px-6 py-3">Email / ID</th>
                    <th className="px-6 py-3">Rank</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Action</th>
                </tr>
            </thead>
            <tbody>
                {isLoading ? (
                    <tr><td colSpan={5} className="p-8 text-center text-gray-500">Loading users...</td></tr>
                ) : filteredUsers.length === 0 && !error ? (
                    <tr><td colSpan={5} className="p-8 text-center text-gray-500">No users found.</td></tr>
                ) : (
                 filteredUsers.map(u => (
                    <tr key={u.id} className="border-t border-white/5 hover:bg-white/5 transition">
                        <td className="px-6 py-4">
                            <p className="font-bold text-white">{u.name_1 || 'Unknown'}</p>
                            <p className="text-xs">Joined: {new Date(u.created_at).toLocaleDateString()}</p>
                        </td>
                        <td className="px-6 py-4">
                            <p className="text-white">{u.email_1}</p>
                            <p className="text-xs font-mono bg-white/5 inline-block px-1 rounded mt-1">{u.id.slice(0,8)}...</p>
                        </td>
                        <td className="px-6 py-4">
                            <div className="flex items-center gap-1">
                                <span className="text-white font-bold">Lvl {u.level_1}</span>
                                <span className="text-xs text-royal-400">({u.rank_1 || 'User'})</span>
                            </div>
                        </td>
                        <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded text-xs font-bold ${u.is_kyc_1 ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                {u.is_kyc_1 ? 'Verified' : 'KYC Pending'}
                            </span>
                            {u.is_withdraw_blocked && (
                                <span className="ml-2 px-2 py-1 rounded text-xs font-bold bg-red-500/20 text-red-400">Blocked</span>
                            )}
                        </td>
                        <td className="px-6 py-4 text-right">
                            <button 
                                onClick={() => onSelectUser && onSelectUser(u.id)}
                                className="px-4 py-2 bg-royal-600/20 text-royal-400 border border-royal-500/30 rounded-lg text-xs font-bold hover:bg-royal-600 hover:text-white transition flex items-center gap-2 ml-auto"
                            >
                                Manage <ArrowRight size={14}/>
                            </button>
                        </td>
                    </tr>
                 ))
                )}
            </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserManagement;
