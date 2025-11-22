
import React, { useEffect, useState } from 'react';
import GlassCard from '../components/GlassCard';
import { Grid, Users, Trophy, ArrowRight, Wallet, History, Play } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../integrations/supabase/client';
import { WalletData, GameResult } from '../types';
import { useUI } from '../context/UIContext';
import BalanceDisplay from '../components/BalanceDisplay';
import Loader from '../components/Loader';
import { motion } from 'framer-motion';

const LudoLobby: React.FC = () => {
  const { toast } = useUI();
  const navigate = useNavigate();
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<GameResult[]>([]);
  
  // Default Cards if DB is empty
  const [cards, setCards] = useState<any[]>([
      { id: '1', amount: 10, players: 4 },
      { id: '2', amount: 50, players: 4 },
      { id: '3', amount: 100, players: 4 },
      { id: '4', amount: 500, players: 2 },
  ]);

  useEffect(() => {
      const fetchData = async () => {
          const { data: { session } } = await supabase.auth.getSession();
          
          // Fetch configured cards from DB if available
          const { data: cardData } = await supabase.from('ludo_cards').select('*').eq('is_active', true).order('amount', {ascending: true});
          if (cardData && cardData.length > 0) setCards(cardData);

          if (session) {
              const [wRes, hRes] = await Promise.all([
                  supabase.from('wallets').select('*').eq('user_id', session.user.id).single(),
                  supabase.from('game_history').select('*').eq('user_id', session.user.id).eq('game_id', 'ludo').order('created_at', {ascending: false}).limit(10),
              ]);
              
              setWallet(wRes.data as WalletData);
              
              if (hRes.data) {
                  setHistory(hRes.data.map((g: any) => ({
                      id: g.id, gameId: g.game_id, gameName: g.game_name, bet: g.bet, payout: g.payout, profit: g.profit, details: g.details, timestamp: new Date(g.created_at).getTime()
                  })));
              }
          }
          setLoading(false);
      };
      fetchData();
  }, []);

  const handleJoin = (amount: number, players: number) => {
      if (!wallet) return;
      const available = (wallet.main_balance || 0) + (wallet.game_balance || 0) + (wallet.deposit_balance || 0);
      
      if (available < amount) {
          toast.error("Insufficient balance. Please deposit.");
          navigate('/deposit');
          return;
      }

      // Pass stake and mode to the game page
      navigate(`/games/ludo/play/${amount}?mode=${players === 2 ? '1v1' : '4p'}`);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader /></div>;

  return (
    <div className="pb-24 sm:pl-20 sm:pt-6 space-y-6 px-4 sm:px-0">
        <header className="flex items-center justify-between pt-4">
           <div>
               <h1 className="text-3xl font-display font-black text-white italic flex items-center gap-2">
                   LUDO <span className="text-yellow-400">KING</span> <Grid className="text-yellow-400" /> 
               </h1>
               <p className="text-xs text-gray-400 font-medium tracking-wide">MULTIPLAYER ARENA</p>
           </div>
           <div className="bg-dark-900/80 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 flex flex-col items-end shadow-lg">
               <p className="text-[10px] text-gray-400 font-bold uppercase">Balance</p>
               <div className="flex items-center gap-2 text-neon-green">
                   <Wallet size={16} />
                   <span className="font-mono font-bold text-lg"><BalanceDisplay amount={wallet?.balance || 0} /></span>
               </div>
           </div>
        </header>

        {/* GAME TABLES */}
        <div>
            <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                <Play size={18} className="text-neon-green fill-current" /> Select Table
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {cards.map((card) => {
                    // Estimated Prize (Platform fee ~10-20%)
                    const prizePool = (card.amount * (card.players || 4)) * 0.85;
                    return (
                    <motion.div 
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        key={card.id}
                        onClick={() => handleJoin(card.amount, card.players || 4)}
                    >
                        <GlassCard className="relative overflow-hidden border border-white/10 bg-gradient-to-br from-blue-900/20 to-purple-900/20 p-0 group cursor-pointer hover:border-neon-green/50 transition">
                            <div className="absolute -right-8 -bottom-8 opacity-10 transform rotate-12 transition group-hover:scale-110 group-hover:opacity-20">
                                <Grid size={140} className="text-white" />
                            </div>
                            
                            <div className="p-5 relative z-10 flex justify-between items-center">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className={`text-xs font-black px-2 py-0.5 rounded bg-black/30 text-white border border-white/10 uppercase`}>
                                            {card.players || 4} Players
                                        </span>
                                    </div>
                                    <h3 className="text-3xl font-black text-white flex items-end gap-1 leading-none">
                                        <span className="text-lg text-gray-400 font-bold mr-1">$</span>{card.amount}
                                    </h3>
                                    <p className="text-xs text-gray-400 mt-1 font-bold">Entry Fee</p>
                                </div>

                                <div className="text-right">
                                    <p className="text-[10px] text-yellow-200 font-bold uppercase mb-1 flex items-center justify-end gap-1">
                                        <Trophy size={12} /> Win
                                    </p>
                                    <p className="text-2xl font-black text-neon-green">
                                        <BalanceDisplay amount={prizePool} />
                                    </p>
                                    <div className="mt-3 bg-white text-black px-4 py-2 rounded-lg font-bold text-xs hover:bg-gray-200 transition shadow-lg inline-flex items-center gap-2">
                                        Play <ArrowRight size={14} />
                                    </div>
                                </div>
                            </div>
                        </GlassCard>
                    </motion.div>
                )})}
            </div>
        </div>

        {/* HISTORY LOG */}
        <div className="space-y-3">
            <h3 className="text-white font-bold flex items-center gap-2">
                <History size={18} className="text-gray-400" /> Match History
            </h3>
            {history.length === 0 ? (
                <div className="text-center py-10 text-gray-500 text-sm bg-white/5 rounded-xl border border-white/5">
                    No matches played yet.
                </div>
            ) : (
                history.map((game) => (
                    <GlassCard key={game.id} className="flex items-center justify-between p-3 border-white/5 hover:bg-white/5 transition">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${game.profit > 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                {game.profit > 0 ? 'W' : 'L'}
                            </div>
                            <div>
                                <p className="text-xs text-gray-400">{new Date(game.timestamp).toLocaleDateString()}</p>
                                <p className="text-sm font-bold text-white">Entry: <BalanceDisplay amount={game.bet} /></p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className={`font-mono font-bold text-sm ${game.profit > 0 ? 'text-neon-green' : 'text-red-400'}`}>
                                {game.profit > 0 ? '+' : ''}<BalanceDisplay amount={game.profit > 0 ? game.payout : -game.bet} />
                            </p>
                            <p className="text-[10px] text-gray-500 uppercase">{game.profit > 0 ? 'Won' : 'Lost'}</p>
                        </div>
                    </GlassCard>
                ))
            )}
        </div>
    </div>
  );
};

export default LudoLobby;
