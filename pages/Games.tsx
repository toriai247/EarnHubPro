
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import GlassCard from '../components/GlassCard';
import { Gamepad2, Disc, Rocket, Dices, Grid, Trophy, Lock, AlertTriangle, Coins, EyeOff, Apple, Pyramid, GitGraph, Play } from 'lucide-react';
import { Game } from '../types';
import { supabase } from '../integrations/supabase/client';
import SmartAd from '../components/SmartAd';

const GAMES_META: Game[] = [
    {
      id: 'plinko',
      name: 'Plinko',
      description: 'Drop the ball through the pyramid for high multipliers.',
      icon: GitGraph,
      color: 'text-purple-400',
      bgColor: 'from-purple-900/40 to-purple-600/10',
      path: '/games/plinko',
      status: 'active',
      players: 3200,
      type: 'crash'
    },
    {
      id: 'reels',
      name: 'Reels of Gods',
      description: 'Spin the ancient slots. Match 3 symbols for divine riches.',
      icon: Pyramid,
      color: 'text-amber-400',
      bgColor: 'from-amber-900/40 to-amber-600/10',
      path: '/games/reels-of-gods',
      status: 'active',
      players: 1054,
      type: 'slots'
    },
    {
      id: 'dice',
      name: 'Lucky Dice',
      description: 'Predict High/Low/7. Win up to x5.8 your bet!',
      icon: Dices,
      color: 'text-green-400',
      bgColor: 'from-green-900/40 to-green-600/10',
      path: '/games/dice',
      status: 'active', 
      players: 850,
      type: 'slots' 
    },
    {
      id: 'headtail',
      name: 'Head & Tail',
      description: 'Classic coin flip. Double your money instantly.',
      icon: Coins,
      color: 'text-yellow-400',
      bgColor: 'from-yellow-900/40 to-yellow-600/10',
      path: '/games/head-tail',
      status: 'active',
      players: 1420,
      type: 'slots'
    },
    {
      id: 'thimbles',
      name: 'Thimbles',
      description: 'Find the ball under the cup. High stakes shuffle.',
      icon: EyeOff,
      color: 'text-red-400',
      bgColor: 'from-red-900/40 to-red-600/10',
      path: '/games/thimbles',
      status: 'active',
      players: 560,
      type: 'slots'
    },
    {
      id: 'apple',
      name: 'Apple Fortune',
      description: 'Climb the ladder, avoid the bad apples. High risk!',
      icon: Apple,
      color: 'text-pink-400',
      bgColor: 'from-pink-900/40 to-pink-600/10',
      path: '/games/apple-fortune',
      status: 'active',
      players: 980,
      type: 'slots'
    },
    {
      id: 'spin',
      name: 'Lucky Spin',
      description: 'Spin the wheel to win cash prizes instantly.',
      icon: Disc,
      color: 'text-purple-400',
      bgColor: 'from-purple-900/40 to-purple-600/10',
      path: '/games/spin',
      status: 'active', 
      players: 1205,
      type: 'wheel'
    },
    {
      id: 'crash',
      name: 'Space Crash',
      description: 'Eject before the rocket crashes! High risk, high reward.',
      icon: Rocket,
      color: 'text-blue-400',
      bgColor: 'from-blue-900/40 to-blue-600/10',
      path: '/games/crash',
      status: 'active', 
      players: 4203,
      type: 'crash'
    },
    {
      id: 'ludo',
      name: 'Ludo King',
      description: 'Classic board game. PvP with Bot. Win 70% of pot.',
      icon: Grid,
      color: 'text-orange-400',
      bgColor: 'from-orange-900/40 to-orange-600/10',
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

      {/* AD PLACEMENT: IN-FEED */}
      <SmartAd slot="4491147378" />

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

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {games.map((game, index) => (
          <div key={game.id} className="h-full">
            {game.status === 'active' ? (
              <Link to={game.path || '#'}>
                <div className="h-full bg-[#111] border border-white/5 rounded-2xl overflow-hidden group hover:border-white/20 transition-all duration-300 relative">
                  
                  {/* Card Background Gradient */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${game.bgColor} opacity-30 group-hover:opacity-50 transition-opacity`}></div>

                  <div className="p-5 relative z-10 flex flex-col h-full">
                      <div className="flex justify-between items-start mb-3">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-white/5 border border-white/10 ${game.color} shadow-lg group-hover:scale-110 transition-transform`}>
                              {game.icon && <game.icon size={24} />}
                          </div>
                          {/* Online Indicator */}
                          <div className="flex items-center gap-1 bg-black/40 px-2 py-1 rounded-full border border-white/5 backdrop-blur-sm">
                              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                              <span className="text-[9px] font-bold text-gray-400">Live</span>
                          </div>
                      </div>

                      <h3 className="text-base font-bold text-white mb-1 group-hover:text-green-400 transition">{game.name}</h3>
                      <p className="text-[10px] text-gray-400 leading-relaxed line-clamp-2 mb-4 flex-1">{game.description}</p>
                      
                      {/* Player Count */}
                      {game.players && (
                          <div className="flex items-center gap-1 text-[9px] text-gray-500 mb-2">
                              <Users size={10} /> {game.players.toLocaleString()} Players
                          </div>
                      )}

                      <div className="mt-auto">
                          <button className="w-full py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 group-hover:bg-white group-hover:text-black">
                              <Play size={12} fill="currentColor" /> Play Now
                          </button>
                      </div>
                  </div>
                </div>
              </Link>
            ) : (
              <div className="h-full relative cursor-not-allowed group">
                <div className="h-full bg-[#0a0a0a] border border-white/5 rounded-2xl overflow-hidden p-5 flex flex-col opacity-60 grayscale">
                    <div className="flex justify-between items-start mb-3">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gray-800 text-gray-500`}>
                            {game.icon && <game.icon size={24} />}
                        </div>
                         <div className="flex items-center gap-1 bg-red-900/30 px-2 py-1 rounded-full border border-red-500/20">
                            <Lock size={10} className="text-red-400"/>
                            <span className="text-[9px] font-bold text-red-400 uppercase">Offline</span>
                        </div>
                    </div>
                    <h3 className="text-base font-bold text-gray-300 mb-1">{game.name}</h3>
                    <p className="text-[10px] text-gray-500 leading-relaxed mb-4">Currently under maintenance.</p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* AD PLACEMENT: MULTIPLEX */}
      <SmartAd slot="8977187296" />
    </div>
  );
};

// Simple User Icon component if not imported
const Users = ({size, className}: {size:number, className?:string}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
      <circle cx="9" cy="7" r="4"></circle>
      <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
    </svg>
);

export default Games;
