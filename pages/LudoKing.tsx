
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const LudoKing: React.FC = () => {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-3xl font-bold text-white mb-4">Ludo Maintenance</h1>
        <p className="text-gray-500 mb-8">The game board has been reset.</p>
        <Link to="/games" className="px-6 py-3 bg-white text-black rounded-xl font-bold">Back to Games</Link>
    </div>
  );
};

export default LudoKing;
