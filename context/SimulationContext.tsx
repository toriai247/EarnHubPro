
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// --- FAKE DATA GENERATORS ---
const NAMES = [
    'Rahim', 'Karim', 'Sultan', 'King', 'Tiger', 'Lion', 'Shakib', 'Tamim', 'Mash', 'Rubel', 
    'Riya', 'Nila', 'Tania', 'Sumon', 'Akash', 'BatMan', 'CryptoKing', 'TakaMaker', 'ProGamer', 
    'Dreamer', 'Boss77', 'VipBoy', 'GoldDigger', 'LuckyMan', 'SpeedX'
];

const ACTIONS = [
    { type: 'withdraw', label: 'Withdrew', color: 'text-red-400', icon: '💸' },
    { type: 'deposit', label: 'Deposited', color: 'text-green-400', icon: '💰' },
    { type: 'game_win', label: 'Won in Crash', color: 'text-purple-400', icon: '🚀' },
    { type: 'game_win', label: 'Won in Plinko', color: 'text-pink-400', icon: '🎯' },
    { type: 'task', label: 'Completed Task', color: 'text-blue-400', icon: '✅' },
    { type: 'vip', label: 'Bought VIP', color: 'text-yellow-400', icon: '👑' },
];

export interface FakeActivity {
    id: string;
    user: string;
    action: string;
    amount: string;
    time: string;
    icon: string;
    color: string;
}

interface SimulationContextType {
    onlineUsers: number;
    liveFeed: FakeActivity[];
    topWinners: any[];
}

const SimulationContext = createContext<SimulationContextType | undefined>(undefined);

export const SimulationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [onlineUsers, setOnlineUsers] = useState(1240);
    const [liveFeed, setLiveFeed] = useState<FakeActivity[]>([]);
    const [topWinners, setTopWinners] = useState<any[]>([]);

    // 1. Live Users Counter Simulation (Fluctuates)
    useEffect(() => {
        const interval = setInterval(() => {
            setOnlineUsers(prev => {
                const change = Math.floor(Math.random() * 15) - 7; // -7 to +7
                let next = prev + change;
                if (next < 800) next = 800; // Min users
                if (next > 3500) next = 3500; // Max users
                return next;
            });
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    // 2. Live Activity Feed Generator
    useEffect(() => {
        const generateActivity = () => {
            const name = `${NAMES[Math.floor(Math.random() * NAMES.length)]}${Math.floor(Math.random() * 99)}`;
            const actionObj = ACTIONS[Math.floor(Math.random() * ACTIONS.length)];
            
            let amount = 0;
            if (actionObj.type === 'withdraw') amount = Math.floor(Math.random() * 5000) + 500;
            else if (actionObj.type === 'deposit') amount = Math.floor(Math.random() * 10000) + 1000;
            else if (actionObj.type === 'game_win') amount = Math.floor(Math.random() * 2000) + 50;
            else if (actionObj.type === 'task') amount = Math.floor(Math.random() * 20) + 5;
            else if (actionObj.type === 'vip') amount = Math.floor(Math.random() * 15000) + 2000;

            const newItem: FakeActivity = {
                id: Math.random().toString(),
                user: name,
                action: actionObj.label,
                amount: `৳${amount}`,
                time: 'Just now',
                icon: actionObj.icon,
                color: actionObj.color
            };

            setLiveFeed(prev => [newItem, ...prev.slice(0, 5)]); // Keep last 6
        };

        // Initial fill
        for(let i=0; i<5; i++) generateActivity();

        const interval = setInterval(generateActivity, 2500); // New activity every 2.5s
        return () => clearInterval(interval);
    }, []);

    // 3. Generate Fake Top Winners (For Leaderboard)
    useEffect(() => {
        const fakeWinners = Array.from({ length: 15 }, (_, i) => ({
            id: `bot-${i}`,
            name: `${NAMES[i % NAMES.length]}_Pro`,
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${NAMES[i % NAMES.length]}`,
            amount: Math.floor(Math.random() * 50000) + 10000,
            rank: i + 1,
            tier: i === 0 ? 'GOD' : i < 3 ? 'LEGEND' : 'DIAMOND',
            winRate: Math.floor(Math.random() * 30) + 60,
            isBot: true
        })).sort((a,b) => b.amount - a.amount);
        
        // Re-assign ranks after sort
        setTopWinners(fakeWinners.map((w, i) => ({...w, rank: i+1})));
    }, []);

    return (
        <SimulationContext.Provider value={{ onlineUsers, liveFeed, topWinners }}>
            {children}
        </SimulationContext.Provider>
    );
};

export const useSimulation = () => {
    const context = useContext(SimulationContext);
    if (!context) {
        throw new Error('useSimulation must be used within a SimulationProvider');
    }
    return context;
};
