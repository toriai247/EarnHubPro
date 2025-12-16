
import React from 'react';
import GlassCard from '../../components/GlassCard';
import { Database, Lock } from 'lucide-react';

const DatabaseUltra: React.FC = () => {
    return (
        <div className="min-h-[80vh] flex items-center justify-center p-6">
            <GlassCard className="max-w-md w-full text-center border-red-500/30 bg-red-950/10">
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-red-500/50">
                    <Database size={32} className="text-red-500" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2 flex items-center justify-center gap-2">
                    <Lock size={18} /> Access Disabled
                </h2>
                <p className="text-gray-400 text-sm">
                    Direct database access and raw SQL execution tools have been removed for security compliance.
                </p>
            </GlassCard>
        </div>
    );
};

export default DatabaseUltra;
