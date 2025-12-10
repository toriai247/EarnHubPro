
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import GlassCard from '../components/GlassCard';
import { Gamepad2, Disc, Rocket, Dices, Grid, Trophy, Lock, AlertTriangle } from 'lucide-react';
import { Game } from '../types';
import { supabase } from '../integrations/supabase/client';

const GAMES_META: Game[] = [
    {
      id: 'dice',
      name: 'Lucky Dice',
      description: 'Predict High/Low/7. Win up to x5.8 your bet!',
      icon: Dices,
      color: 'text-green-400',
      bgColor: 'bg-green-900/20',
      path: '/games/dice',
      status: 'active', 
      players: 850,
      type: 'slots' 
    },
    {
      id: 'spin',
      name: 'Lucky Spin',
      description: 'Spin the wheel to win cash prizes instantly.',
      icon: Disc,
      color: 'text-purple-400',
      bgColor: 'bg-purple-900/20',
      path: '/games/spin',
      status: 'maintenance', // User asked for 1 game, let's keep others maint
      players: 1205,
      type: 'wheel'
    },
    {
      id: 'crash',
      name: 'Space Crash',
      description: 'Eject before the rocket crashes! High risk, high reward.',
      icon: Rocket,
      color: 'text-red-400',
      bgColor: 'bg-red-900/20',
      path: '/games/crash',
      status: 'maintenance', 
      players: 4203,
      type: 'crash'
    },
    {
      id: 'ludo',
      name: 'Ludo King',
      description: 'Classic board game. PvP with Bot. Win 70% of pot.',
      icon: Grid,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-900/20',
      path: '/games/ludo',
      status: 'maintenance',
      players: 310,
      type: 'ludo'
    }
];

const Games: React.FC = () => {
  const [games, setGames] = useState<Game[]>(GAMES_META);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
      fetchGameStatus();
  }, []);

  const fetchGameStatus = async () => {
      const { data: configs } = await supabase.from('game_configs').select('*');
      
      if (configs && configs.length > 0) {
          const updatedGames = GAMES_META.map(game => {
              const cfg = configs.find((c: any) => c.id === game.id);
              // If config exists, use it. If not, default to current meta status.
              const status = cfg ? (cfg.is_active ? 'active' : 'maintenance') : game.status;
              return { ...game, status };
          });
          setGames(updatedGames);
      }
      setLoading(false);
  };

  return (
    <div className="pb-24 sm:pl-20 sm:pt-6 space-y-6 px-4 sm:px-0">
      <header>
        <h1 className="text-2xl font-display font-bold text-white mb-1 flex items-center gap-2">
          <Gamepad2 className="text-green-500" /> Game Hub
        </h1>
        <p className="text-gray-400 text-sm">Play, compete, and earn real money.</p>
      </header>

      {/* WARNING BANNER */}
      <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-start gap-3">
          <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={18} />
          <div>
              <h4 className="text-white font-bold text-sm mb-1 uppercase">Risk Warning</h4>
              <p className="text-xs text-gray-400 leading-relaxed">
                  These games involve financial risk. Results are random or algorithm-based. 
                  <br/>
                  <span className="text-red-400 font-bold">You play at your own risk.</span> The admin is not liable for losses.
              </p>
          </div>
      </div>

      <GlassCard className="bg-[#111] border-[#222] p-6 relative overflow-hidden">
         <div className="relative z-10">
            <div className="inline-flex items-center gap-1 bg-green-900/20 text-green-400 px-2 py-1 rounded-lg text-[10px] font-bold uppercase mb-2 border border-green-500/30">
                <Trophy size={12} /> Featured Game
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Lucky Dice is LIVE!</h2>
            <p className="text-gray-300 text-sm mb-4 max-w-xs">Predict the roll and win big. Instant payouts to your main wallet.</p>
            <Link to="/games/dice" className="inline-block bg-white text-black px-6 py-2.5 rounded-xl font-bold hover:scale-105 transition">
                Play Now
            </Link>
         </div>
      </GlassCard>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {games.map((game, index) => (
          <div key={game.id}>
            {game.status === 'active' ? (
              <Link to={game.path || '#'}>
                <GlassCard className="h-full flex flex-col group hover:bg-[#1a1a1a] transition duration-300 border border-[#222] hover:border-[#333]">
                  <div className="flex justify-between items-start mb-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${game.bgColor} ${game.color}`}>
                      {game.icon && <game.icon size={24} />}
                    </div>
                    <div className="bg-[#111] px-2 py-1 rounded-lg text-[10px] text-gray-400 flex items-center gap-1 border border-[#222]">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                      Live
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1 group-hover:text-green-400 transition">{game.name}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{game.description}</p>
                </GlassCard>
              </Link>
            ) : (
              <div className="relative h-full cursor-not-allowed group">
                <GlassCard className="h-full flex flex-col opacity-60 grayscale border-red-900/20 bg-red-900/5">
                   <div className="absolute top-3 right-3 bg-red-900/20 text-red-400 text-[10px] font-bold px-2 py-1 rounded border border-red-500/30 flex items-center gap-1">
                       <Lock size={10} /> OFFLINE
                   </div>
                  <div className="flex justify-between items-start mb-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-gray-800 text-gray-500`}>
                      {game.icon && <game.icon size={24} />}
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">{game.name}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">Currently under maintenance.</p>
                </GlassCard>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Games;
