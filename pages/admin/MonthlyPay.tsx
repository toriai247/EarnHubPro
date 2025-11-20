
import React, { useEffect, useState } from 'react';
import GlassCard from '../../components/GlassCard';
import { supabase } from '../../integrations/supabase/client';
import { WalletData, UserWithdrawMethod, UserProfile } from '../../types';
import { Search, DollarSign, MessageSquare, Send, CheckCircle, Loader2, X } from 'lucide-react';
import { processMonthlyPayment } from '../../lib/actions';
import { motion, AnimatePresence } from 'framer-motion';

interface MonthlyUser {
    userId: string;
    name: string;
    email: string;
    method: string;
    number: string;
    balance: number;
    withdrawable: number;
    bonus: number;
    totalPayable: number;
}

const MonthlyPay: React.FC = () => {
  const [users, setUsers] = useState<MonthlyUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Message Modal State
  const [msgModalOpen, setMsgModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<MonthlyUser | null>(null);
  const [msgText, setMsgText] = useState('');

  useEffect(() => {
    fetchMonthlyUsers();
  }, []);

  const fetchMonthlyUsers = async () => {
    setLoading(true);
    try {
        // 1. Get Users with Auto-Withdraw Enabled
        const { data: methods } = await supabase
            .from('user_withdrawal_methods')
            .select('*')
            .eq('is_auto_enabled', true);
        
        if (!methods || methods.length === 0) {
            setUsers([]);
            setLoading(false);
            return;
        }

        const userList: MonthlyUser[] = [];

        // 2. For each user, fetch Profile and Wallet
        // Note: In a larger app, we would use a Joined Query, but fetching individually here for schema safety
        for (const m of methods) {
            const [profileRes, walletRes] = await Promise.all([
                supabase.from('profiles').select('name_1, email_1').eq('id', m.user_id).single(),
                supabase.from('wallets').select('balance, withdrawable').eq('user_id', m.user_id).single()
            ]);

            if (profileRes.data && walletRes.data) {
                const withdrawable = walletRes.data.withdrawable || 0;
                const bonus = Number((withdrawable * 0.02).toFixed(2)); // 2% Bonus
                
                // Only add if they have balance > 0
                if (withdrawable > 0) {
                    userList.push({
                        userId: m.user_id,
                        name: profileRes.data.name_1 || 'User',
                        email: profileRes.data.email_1,
                        method: m.method_name,
                        number: m.account_number,
                        balance: walletRes.data.balance,
                        withdrawable: withdrawable,
                        bonus: bonus,
                        totalPayable: withdrawable + bonus
                    });
                }
            }
        }
        setUsers(userList);
    } catch (e) {
        console.error(e);
    } finally {
        setLoading(false);
    }
  };

  const handlePay = async (user: MonthlyUser) => {
      if (!confirm(`Process payment of $${user.totalPayable.toFixed(2)} to ${user.name}? \n\nIncludes $${user.bonus.toFixed(2)} Bonus.`)) return;
      
      setProcessingId(user.userId);
      try {
          await processMonthlyPayment(user.userId, user.withdrawable, user.method);
          alert("Payment processed successfully!");
          fetchMonthlyUsers(); // Refresh list
      } catch (e: any) {
          alert("Error: " + e.message);
      }
      setProcessingId(null);
  };

  const openMessageModal = (user: MonthlyUser) => {
      setSelectedUser(user);
      setMsgText('');
      setMsgModalOpen(true);
  };

  const handleSendMessage = async () => {
      if (!selectedUser || !msgText.trim()) return;
      
      try {
          await supabase.from('notifications').insert({
              user_id: selectedUser.userId,
              title: 'Admin Message',
              message: msgText,
              type: 'info'
          });
          alert("Message sent!");
          setMsgModalOpen(false);
      } catch (e) {
          alert("Failed to send");
      }
  };

  const filteredUsers = users.filter(u => 
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.number.includes(searchTerm)
  );

  return (
    <div className="space-y-6 animate-fade-in">
        <div className="flex justify-between items-center">
            <div>
                <h2 className="text-2xl font-bold text-white">Monthly Payroll</h2>
                <p className="text-gray-400 text-sm">Auto-Withdrawal Users • 2% Bonus Applied</p>
            </div>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                <input 
                    type="text" 
                    placeholder="Search user..." 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-neon-green"
                />
            </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-left text-sm text-gray-400">
                <thead className="bg-white/5 text-xs uppercase font-bold text-white">
                    <tr>
                        <th className="px-6 py-3">User Info</th>
                        <th className="px-6 py-3">Payment Method</th>
                        <th className="px-6 py-3 text-right">Withdrawable</th>
                        <th className="px-6 py-3 text-right">2% Bonus</th>
                        <th className="px-6 py-3 text-right">Total Payout</th>
                        <th className="px-6 py-3 text-center">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {loading ? (
                        <tr><td colSpan={6} className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-neon-green" /></td></tr>
                    ) : filteredUsers.length === 0 ? (
                        <tr><td colSpan={6} className="p-8 text-center text-gray-500">No users with pending monthly payments found.</td></tr>
                    ) : (
                        filteredUsers.map(user => (
                            <tr key={user.userId} className="border-t border-white/5 hover:bg-white/5 transition">
                                <td className="px-6 py-4">
                                    <p className="font-bold text-white">{user.name}</p>
                                    <p className="text-xs">{user.email}</p>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded uppercase text-xs font-bold">{user.method}</span>
                                    </div>
                                    <p className="font-mono text-white mt-1">{user.number}</p>
                                </td>
                                <td className="px-6 py-4 text-right font-mono">
                                    ${user.withdrawable.toFixed(2)}
                                </td>
                                <td className="px-6 py-4 text-right font-mono text-neon-green">
                                    +${user.bonus.toFixed(2)}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <p className="font-bold text-white text-lg">${user.totalPayable.toFixed(2)}</p>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center justify-center gap-2">
                                        <button 
                                            onClick={() => handlePay(user)}
                                            disabled={!!processingId}
                                            className="p-2 bg-green-500/20 hover:bg-green-500 text-green-500 hover:text-black rounded-lg transition flex items-center gap-1 disabled:opacity-50"
                                            title="Process Payment"
                                        >
                                            {processingId === user.userId ? <Loader2 className="animate-spin" size={18}/> : <DollarSign size={18} />}
                                        </button>
                                        <button 
                                            onClick={() => openMessageModal(user)}
                                            className="p-2 bg-blue-500/20 hover:bg-blue-500 text-blue-500 hover:text-white rounded-lg transition"
                                            title="Send Message"
                                        >
                                            <MessageSquare size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>

        {/* Message Modal */}
        <AnimatePresence>
            {msgModalOpen && selectedUser && (
                <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
                >
                    <motion.div 
                        initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
                        className="bg-dark-900 w-full max-w-md rounded-2xl border border-white/10 p-6"
                    >
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-white">Message {selectedUser.name}</h3>
                            <button onClick={() => setMsgModalOpen(false)} className="text-gray-500 hover:text-white"><X size={24}/></button>
                        </div>
                        
                        <div className="bg-white/5 p-3 rounded-lg mb-4">
                            <p className="text-xs text-gray-400">To: {selectedUser.email}</p>
                        </div>

                        <textarea 
                            value={msgText}
                            onChange={e => setMsgText(e.target.value)}
                            className="w-full h-32 bg-black/30 border border-white/10 rounded-xl p-4 text-white text-sm focus:border-royal-500 outline-none resize-none mb-4"
                            placeholder="Type your message here (e.g., Payment Sent, Issue with Number)..."
                        ></textarea>

                        <button 
                            onClick={handleSendMessage}
                            disabled={!msgText.trim()}
                            className="w-full py-3 bg-royal-600 text-white font-bold rounded-xl hover:bg-royal-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            <Send size={18} /> Send Notification
                        </button>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    </div>
  );
};

export default MonthlyPay;
