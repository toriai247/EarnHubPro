
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import GlassCard from '../components/GlassCard';
import { Gamepad2, Disc, Rocket, Dices, Grid, Trophy, Lock, AlertTriangle, Coins, EyeOff, Apple, Pyramid, GitGraph, Play, Sparkles, Users, Zap, Swords, ChevronRight, Flame } from 'lucide-react';
import { Game } from '../types';
import { supabase } from '../integrations/supabase/client';
import SmartAd from '../components/SmartAd';
import { motion } from 'framer-motion';

const GAMES_META: Game[] = [
    {
      id: 'dragon-spin',
      name: 'Dragon Spin',
      description: 'Imperial multipliers up to x20. High stakes wheel.',
      icon: Swords,
      color: 'text-amber-400',
      bgColor: 'from-amber-900/40 to-orange-600/10',
      path: '/games/dragon-spin',
      status: 'active',
      players: 5402,
      type: 'wheel'
    },
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
              const status = cfg ? (cfg.is_active ? 'active' : 'maintenance') : game.status;
              return { ...game, status };
          });
          setGames(updatedGames);
      }
      setLoading(false);
  };

  return (
    <div className="pb-32 sm:pl-20 sm:pt-6 space-y-8 px-4 sm:px-0 font-sans selection:bg-brand selection:text-black">
      
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pt-4">
        <div className="space-y-1">
            <h1 className="text-4xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                <Gamepad2 className="text-brand" size={38} /> BATTLE <span className="text-brand">HUB</span>
            </h1>
            <p className="text-muted text-[10px] font-black uppercase tracking-[0.3em] pl-1">Provably Fair Arena v5.0</p>
        </div>
        
        <div className="flex bg-panel p-1 rounded-2xl border border-border-base relative w-full md:w-auto shadow-xl">
             <div className="bg-success/10 border border-success/20 px-6 py-2.5 rounded-xl flex items-center gap-3">
                 <div className="w-2 h-2 rounded-full bg-success animate-pulse"></div>
                 <span className="text-[10px] font-black text-success uppercase tracking-widest">14,204 Nodes Battling</span>
             </div>
        </div>
      </header>

      {/* TRENDING SPOTLIGHT */}
      <section className="relative overflow-hidden rounded-[3rem] border border-brand/20 bg-black group">
          <div className="absolute inset-0 bg-gradient-to-r from-brand/20 via-transparent to-transparent z-10"></div>
          <div className="p-8 sm:p-12 relative z-20 flex flex-col md:flex-row justify-between items-center gap-8">
              <div className="space-y-4 text-center md:text-left flex-1">
                  <div className="inline-flex items-center gap-2 bg-brand text-black px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter shadow-lg">
                      <Flame size={12} fill="currentColor"/> TRENDING PROTOCOL
                  </div>
                  <h2 className="text-4xl sm:text-5xl font-black text-white uppercase tracking-tighter leading-none">
                      DRAGON <span className="text-brand">SPIN</span>
                  </h2>
                  <p className="text-gray-400 text-sm max-w-sm leading-relaxed font-medium">
                      Master the Imperial Wheel and secure multipliers up to 20x. High-payout sectors are now active.
                  </p>
                  <Link to="/games/dragon-spin" className="inline-flex items-center gap-3 px-10 py-4 bg-brand text-black font-black uppercase rounded-2xl active:scale-95 transition-all text-sm shadow-[0_0_40px_rgba(250,204,21,0.3)]">
                      ENTER ARENA <ChevronRight size={20} strokeWidth={3}/>
                  </Link>
              </div>
              <div className="relative shrink-0 flex items-center justify-center">
                  <motion.div 
                    animate={{ rotate: 360 }} 
                    transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
                    className="w-48 h-48 sm:w-64 sm:h-64 rounded-full border-8 border-brand/20 border-dashed relative flex items-center justify-center"
                  >
                      <div className="w-32 h-32 sm:w-40 sm:h-40 bg-brand rounded-full flex items-center justify-center text-black shadow-glow">
                          <Swords size={60} strokeWidth={2.5}/>
                      </div>
                  </motion.div>
                  {/* Decorative Elements */}
                  <div className="absolute -top-10 -right-10 w-32 h-32 bg-brand/5 blur-[100px] pointer-events-none"></div>
              </div>
          </div>
      </section>

      <SmartAd slot="4491147378" className="rounded-[3rem] border border-border-base" />

      <div className="bg-red-500/5 border border-red-500/20 p-6 rounded-[2.5rem] flex items-start gap-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 bottom-0 bg-red-600"></div>
          <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={24} />
          <div>
              <h4 className="text-red-400 font-black text-sm mb-1 uppercase tracking-wider">Algorithmic Risk Warning</h4>
              <p className="text-xs text-gray-500 leading-relaxed font-medium">
                  Participation in Battle Arena modules involves significant financial risk. Results are dictated by cryptographically secure random number generation. The house edge ensures system sustainability. Play responsibly.
              </p>
          </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {games.map((game, index) => (
          <div key={game.id} className="h-full">
            {game.status === 'active' ? (
              <Link to={game.path || '#'}>
                <div className="h-full bg-panel border border-border-base rounded-[2.5rem] overflow-hidden group hover:border-brand/40 transition-all duration-500 relative shadow-xl hover:shadow-brand/5">
                  <div className={`absolute inset-0 bg-gradient-to-br ${game.bgColor} opacity-0 group-hover:opacity-40 transition-opacity`}></div>
                  <div className="p-7 relative z-10 flex flex-col h-full gap-6">
                      <div className="flex justify-between items-start">
                          <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center bg-black border border-white/10 ${game.color} shadow-2xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-500`}>
                              {game.icon && <game.icon size={32} strokeWidth={2.5}/>}
                          </div>
                          <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-full border border-white/5 backdrop-blur-sm shadow-inner">
                              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_#10b981]"></span>
                              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">LIVE</span>
                          </div>
                      </div>
                      
                      <div className="space-y-2">
                          <h3 className="text-2xl font-black text-white uppercase tracking-tighter group-hover:text-brand transition-colors">{game.name}</h3>
                          <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 font-medium">{game.description}</p>
                      </div>

                      <div className="mt-auto pt-6 border-t border-white/5 flex items-center justify-between">
                          {game.players && (
                              <div className="flex items-center gap-2 text-[10px] font-black text-gray-600 uppercase tracking-widest">
                                  <Users size={12} className="text-gray-700"/> {game.players.toLocaleString()} ACTIVE
                              </div>
                          )}
                          <div className="bg-brand text-black p-2.5 rounded-2xl shadow-lg opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                              <Play size={18} fill="currentColor" className="ml-0.5" />
                          </div>
                      </div>
                  </div>
                </div>
              </Link>
            ) : (
              <div className="h-full relative cursor-not-allowed grayscale">
                <div className="h-full bg-[#0a0a0a] border border-white/5 rounded-[2.5rem] p-7 flex flex-col opacity-60">
                    <div className="flex justify-between items-start mb-6">
                        <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center bg-gray-800 text-gray-600`}>
                            {game.icon && <game.icon size={32} />}
                        </div>
                         <div className="flex items-center gap-1.5 bg-red-900/20 px-3 py-1.5 rounded-full border border-red-500/20">
                            <Lock size={12} className="text-red-500"/>
                            <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">OFFLINE</span>
                        </div>
                    </div>
                    <h3 className="text-2xl font-black text-gray-600 uppercase tracking-tighter">{game.name}</h3>
                    <p className="text-xs text-gray-700 font-bold mt-2 uppercase tracking-widest">Under Maintenance</p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <style>{`
        .shadow-glow { box-shadow: 0 0 30px rgba(250, 190, 11, 0.2); }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        @keyframes marquee {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
        }
        .animate-marquee {
            animation: marquee 40s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default Games;
