
import React from 'react';
import GlassCard from '../components/GlassCard';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const Dice: React.FC = () => {
  return (
    <div className="pb-24 sm:pl-20 sm:pt-6 space-y-6 px-4 sm:px-0">
       <header className="flex items-center gap-3 pt-4">
           <Link to="/games" className="p-2 bg-[#222] rounded-lg text-white hover:bg-[#333]"><ArrowLeft size={20}/></Link>
           <h1 className="text-xl font-bold text-white">Cyber Dice</h1>
       </header>

       <GlassCard className="text-center p-12 bg-[#111] border-[#222]">
           <h2 className="text-2xl font-bold text-gray-500 mb-2">Game Reset</h2>
           <p className="text-sm text-gray-600">This game is currently undergoing maintenance and database reset.</p>
       </GlassCard>
    </div>
  );
};

export default Dice;
