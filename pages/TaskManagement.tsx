import React from 'react';
import GlassCard from '../components/GlassCard';
import { TASKS } from '../constants';

const TaskManagement: React.FC = () => {
  return (
    <div className="space-y-4 animate-fade-in">
        <h2 className="text-2xl font-bold text-white">Task Coordination</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {TASKS.map(task => (
                <GlassCard key={task.id} className="flex justify-between items-center">
                    <div>
                        <h4 className="font-bold text-white">{task.title}</h4>
                        <p className="text-xs text-gray-400">Reward: ${task.reward} • Type: {task.type}</p>
                    </div>
                    <div className="flex gap-2">
                        <button className="px-3 py-1 bg-blue-500/20 text-blue-400 text-xs rounded hover:bg-blue-500/30">Edit</button>
                        <button className="px-3 py-1 bg-red-500/20 text-red-400 text-xs rounded hover:bg-red-500/30">Delete</button>
                    </div>
                </GlassCard>
            ))}
            <GlassCard className="flex flex-col items-center justify-center border-dashed border-white/20 hover:border-neon-green/50 cursor-pointer group">
                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mb-2 group-hover:bg-neon-green/20 group-hover:text-neon-green transition">
                    <span className="text-xl font-bold">+</span>
                </div>
                <p className="text-sm font-bold text-gray-400 group-hover:text-white">Create New Task</p>
            </GlassCard>
        </div>
    </div>
  );
};

export default TaskManagement;