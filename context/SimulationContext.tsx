
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// --- BENGALI IDENTITY DATABASE ---
const BD_NAMES = [
    'Arif Hossain', 'Sagor Ahmed', 'Sabbir Khan', 'Rifat Islam', 'Mitu Akter', 
    'Sumaiya Jaman', 'Anwar Hossain', 'Hasan Ali', 'Rokib Hasan', 'Sultan Mahmud', 
    'Jamil Ahmed', 'Faruk Hossain', 'Nipa Sultana', 'Keya Akter', 'Liton Mia', 
    'Rubel Rana', 'Shakil Khan', 'Tanvir Islam', 'Zahid Hasan', 'Bithi Akter', 
    'Poly Khatun', 'Sonia Begum', 'Alamin Hossain', 'Foysal Ahmed', 'Shohel Rana',
    'Munni Akter', 'Ratna Islam', 'Nahid Hasan', 'Kamrul Islam', 'Selim Reza'
];

const ACTIONS = [
    { type: 'withdraw', label: 'Withdrew via Bkash', color: 'text-red-400', icon: '💸' },
    { type: 'withdraw', label: 'Withdrew via Nagad', color: 'text-orange-400', icon: '📱' },
    { type: 'deposit', label: 'Deposited Funds', color: 'text-green-400', icon: '💰' },
    { type: 'game_win', label: 'Won in Crash', color: 'text-purple-400', icon: '🚀' },
    { type: 'game_win', label: 'Won in Plinko', color: 'text-pink-400', icon: '🎯' },
    { type: 'task', label: 'Earned from Task', color: 'text-blue-400', icon: '✅' },
    { type: 'vip', label: 'Upgraded to VIP', color: 'text-yellow-400', icon: '👑' },
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
    totalPaid: number;
    totalUsers: number;
    liveFeed: FakeActivity[];
    topWinners: any[];
    nextUpdate: string;
}

const SimulationContext = createContext<SimulationContextType | undefined>(undefined);

// Deterministic random based on hour
const getSeededRandom = (seed: number) => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
};

export const SimulationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [onlineUsers, setOnlineUsers] = useState(1420);
    const [totalUsers, setTotalUsers] = useState(48290);
    const [totalPaid, setTotalPaid] = useState(1254320);
    const [liveFeed, setLiveFeed] = useState<FakeActivity[]>([]);
    const [topWinners, setTopWinners] = useState<any[]>([]);
    const [nextUpdate, setNextUpdate] = useState('');

    // 1. Live Stats Simulation
    useEffect(() => {
        const interval = setInterval(() => {
            setOnlineUsers(prev => {
                const change = Math.floor(Math.random() * 21) - 10;
                return Math.max(800, Math.min(4500, prev + change));
            });
            setTotalPaid(prev => prev + (Math.random() * 50));
            setTotalUsers(prev => prev + (Math.random() > 0.7 ? 1 : 0));
        }, 4000);
        return () => clearInterval(interval);
    }, []);

    // 2. Live Activity Feed (High Frequency)
    useEffect(() => {
        const generateActivity = () => {
            const name = BD_NAMES[Math.floor(Math.random() * BD_NAMES.length)];
            const actionObj = ACTIONS[Math.floor(Math.random() * ACTIONS.length)];
            
            let amount = 0;
            if (actionObj.type === 'withdraw') amount = Math.floor(Math.random() * 4500) + 500;
            else if (actionObj.type === 'deposit') amount = Math.floor(Math.random() * 10000) + 500;
            else if (actionObj.type === 'game_win') amount = Math.floor(Math.random() * 1500) + 20;
            else if (actionObj.type === 'task') amount = Math.floor(Math.random() * 15) + 2;
            else if (actionObj.type === 'vip') amount = Math.floor(Math.random() * 10000) + 2000;

            const newItem: FakeActivity = {
                id: Math.random().toString(),
                user: name,
                action: actionObj.label,
                amount: `৳${amount.toLocaleString()}`,
                time: 'Just now',
                icon: actionObj.icon,
                color: actionObj.color
            };

            setLiveFeed(prev => [newItem, ...prev.slice(0, 7)]);
        };

        const interval = setInterval(generateActivity, 3000);
        return () => clearInterval(interval);
    }, []);

    // 3. Hourly Leaderboard Sync Logic
    useEffect(() => {
        const updateLeaderboard = () => {
            const now = new Date();
            const currentHour = now.getHours();
            const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);
            const seed = dayOfYear + currentHour;

            // Generate 20 top earners based on this hour's seed
            const leaders = Array.from({ length: 20 }, (_, i) => {
                const itemSeed = seed + i;
                const nameIdx = Math.floor(getSeededRandom(itemSeed) * BD_NAMES.length);
                const baseAmount = 85000 - (i * 3000);
                const variance = getSeededRandom(itemSeed + 99) * 2000;
                
                return {
                    id: `bot-${itemSeed}`,
                    name: BD_NAMES[nameIdx],
                    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${BD_NAMES[nameIdx]}`,
                    amount: baseAmount + variance,
                    level: 15 - Math.floor(i / 2),
                    rank: i + 1,
                    isBot: true,
                    is_kyc_1: true
                };
            });

            setTopWinners(leaders);

            // Calculate next update time
            const next = new Date();
            next.setHours(currentHour + 1, 0, 0, 0);
            const diff = next.getTime() - now.getTime();
            const mins = Math.floor(diff / 60000);
            setNextUpdate(`${mins}m`);
        };

        updateLeaderboard();
        const int = setInterval(updateLeaderboard, 60000); // Check every minute
        return () => clearInterval(int);
    }, []);

    return (
        <SimulationContext.Provider value={{ 
            onlineUsers, 
            totalPaid, 
            totalUsers, 
            liveFeed, 
            topWinners,
            nextUpdate
        }}>
            {children}
        </SimulationContext.Provider>
    );
};

export const useSimulation = () => {
    const context = useContext(SimulationContext);
    if (!context) throw new Error('useSimulation must be used within SimulationProvider');
    return context;
};
