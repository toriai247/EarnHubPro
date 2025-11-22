import React from 'react';
import { Link } from 'react-router-dom';
import GlassCard from '../components/GlassCard';
import { Gamepad2, Disc, Rocket, Dices, Grid, Trophy } from 'lucide-react';
import { motion } from 'framer-motion';
import { Game } from '../types';

const MotionDiv = motion.div as any;

const Games: React.FC = () => {
  const games: Game[] = [
    {
      id: 'spin',
      name: 'Lucky Spin',
      description: 'Spin the wheel to win cash prizes instantly.',
      icon: Disc,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/20',
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
      color: 'text-red-400',
      bgColor: 'bg-red-500/20',
      path: '/games/crash',
      status: 'active', 
      players: 4203,
      type: 'crash'
    },
    {
      id: 'dice',
      name: 'Cyber Dice',
      description: 'Roll the dice and multiply your earnings.',
      icon: Dices,
      color: 'text-neon-green',
      bgColor: 'bg-neon-green/20',
      path: '/games/dice',
      status: 'active', 
      players: 850,
      type: 'slots' // Using slots type as placeholder for dice
    },
    {
      id: 'ludo',
      name: 'Ludo King',
      description: 'Classic board game. PvP with Bot. Win 70% of pot.',
      icon: Grid,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/20',
      path: '/games/ludo',
      status: 'active',
      players: 310,
      type: 'ludo'
    }
  ];

  return (
    <div className="pb-24 sm:pl-20 sm:pt-6 space-y-6 px-4 sm:px-0">
      <header>
        <h1 className="text-2xl font-display font-bold text-white mb-1 flex items-center gap-2">
          <Gamepad2 className="text-neon-glow" /> Game Hub
        </h1>
        <p className="text-gray-400 text-sm">Play, compete, and earn real money.</p>
      </header>

      {/* Featured Banner */}
      <GlassCard className="bg-gradient-to-r from-royal-900 to-purple-900 relative overflow-hidden border-royal-500/50 p-6">
         <div className="relative z-10">
            <div className="inline-flex items-center gap-1 bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-lg text-[10px] font-bold uppercase mb-2 border border-yellow-500/30">
                <Trophy size={12} /> Tournament Live
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Win the $500 Jackpot!</h2>
            <p className="text-gray-300 text-sm mb-4 max-w-xs">Top players this week share the prize pool. Start playing Lucky Spin now.</p>
            <Link to="/games/spin" className="inline-block bg-white text-black px-6 py-2.5 rounded-xl font-bold hover:scale-105 transition">
                Play Now
            </Link>
         </div>
         <div className="absolute right-0 bottom-0 opacity-20">
             <Gamepad2 size={140} className="text-white transform rotate-12 translate-x-4 translate-y-4" />
         </div>
      </GlassCard>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {games.map((game, index) => (
          <MotionDiv
            key={game.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            {game.status === 'active' ? (
              <Link to={game.path || '#'}>
                <GlassCard className="h-full flex flex-col group hover:bg-white/5 transition duration-300 border border-white/5 hover:border-royal-500/50">
                  <div className="flex justify-between items-start mb-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${game.bgColor} ${game.color}`}>
                      {game.icon && <game.icon size={24} />}
                    </div>
                    <div className="bg-black/30 px-2 py-1 rounded-lg text-[10px] text-gray-400 flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                      {game.players} playing
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1 group-hover:text-neon-green transition">{game.name}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{game.description}</p>
                </GlassCard>
              </Link>
            ) : (
              <div className="relative h-full opacity-70 grayscale cursor-not-allowed">
                <GlassCard className="h-full flex flex-col">
                   <div className="absolute top-3 right-3 bg-white/10 text-white text-[10px] font-bold px-2 py-1 rounded border border-white/10">
                       COMING SOON
                   </div>
                  <div className="flex justify-between items-start mb-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${game.bgColor} ${game.color}`}>
                      {game.icon && <game.icon size={24} />}
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">{game.name}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{game.description}</p>
                </GlassCard>
              </div>
            )}
          </MotionDiv>
        ))}
      </div>
    </div>
  );
};

export default Games;