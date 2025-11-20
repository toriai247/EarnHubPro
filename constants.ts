

import { InvestmentPlan, Task, Transaction, Game, VideoShort, Activity } from './types';

export const PLANS: InvestmentPlan[] = [
  {
    id: '1',
    name: 'Starter Pack',
    daily_return: 2.5,
    duration: 7,
    min_invest: 50,
    total_roi: 117.5,
  },
  {
    id: '2',
    name: 'Golden Growth',
    daily_return: 3.2,
    duration: 15,
    min_invest: 200,
    total_roi: 148,
    badge_tag: 'POPULAR'
  },
  {
    id: '3',
    name: 'Royal Estate',
    daily_return: 4.5,
    duration: 30,
    min_invest: 1000,
    total_roi: 235,
  }
];

export const TASKS: Task[] = [
  { id: '1', title: 'Join Telegram Channel', reward: 5.00, sponsor_rate: 8.00, icon: 'send', difficulty: 'Easy', status: 'available', type: 'social', frequency: 'once' },
  { id: '2', title: 'Watch Promo Video', reward: 2.50, sponsor_rate: 4.00, icon: 'play', difficulty: 'Easy', status: 'available', type: 'video', frequency: 'daily' },
  { id: '3', title: 'Install Partner App', reward: 15.00, sponsor_rate: 20.00, icon: 'download', difficulty: 'Medium', status: 'available', type: 'app', frequency: 'once' },
  { id: '4', title: 'Invite 3 Friends', reward: 50.00, sponsor_rate: 50.00, icon: 'users', difficulty: 'Hard', status: 'available', type: 'social', frequency: 'once' },
];

export const GAMES: Game[] = [
  { id: '1', name: 'Space Crash', image: 'https://picsum.photos/100/100?random=1', players: 4203, type: 'crash' },
  { id: '2', name: 'Royal Wheel', image: 'https://picsum.photos/100/100?random=2', players: 1205, type: 'wheel' },
  { id: '3', name: 'Mystery Box', image: 'https://picsum.photos/100/100?random=3', players: 850, type: 'slots' },
];

export const TRANSACTIONS: Transaction[] = [
  { id: '1', user_id: 'user_1', type: 'deposit', amount: 500, created_at: '2023-10-25T10:00:00Z', status: 'success', description: 'Initial Deposit' },
  { id: '2', user_id: 'user_1', type: 'earn', amount: 12.5, created_at: '2023-10-26T14:30:00Z', status: 'success', description: 'Daily Task Reward' },
  { id: '3', user_id: 'user_1', type: 'withdraw', amount: 200, created_at: '2023-10-27T09:15:00Z', status: 'pending', description: 'Withdrawal Request' },
];

export const VIDEOS: VideoShort[] = [
  { id: '1', username: '@crypto_king', description: 'How I made $500 today! 🚀 #earning #crypto', likes: '12K', comments: '450', videoUrl: '#1e3a8a' },
  { id: '2', username: '@invest_daily', description: 'Don\'t miss this opportunity! 🔥', likes: '8.5K', comments: '210', videoUrl: '#10b981' },
  { id: '3', username: '@lucky_spinner', description: 'Jackpot winner! 🎰', likes: '22K', comments: '1.2K', videoUrl: '#7c3aed' },
];

export const RECENT_ACTIVITIES: Activity[] = [
  { id: '1', title: 'Video Task Reward', type: 'earn', amount: 2.50, time: '10 min ago', timestamp: Date.now() - 600000 },
  { id: '2', title: 'Daily Login Bonus', type: 'earn', amount: 0.50, time: '2 hours ago', timestamp: Date.now() - 7200000 },
  { id: '3', title: 'USDT Withdrawal', type: 'withdraw', amount: 150.00, time: 'Yesterday', timestamp: Date.now() - 86400000 },
  { id: '4', title: 'Space Crash Game', type: 'game_win', amount: 25.00, time: 'Yesterday', timestamp: Date.now() - 90000000 },
];

export const BADGES = [
  { id: 'early_adopter', name: 'Early Adopter', icon: '🚀', description: 'Joined in the first month.' },
  { id: 'high_roller', name: 'High Roller', icon: '💎', description: 'Deposited over $1000.' },
  { id: 'top_inviter', name: 'Influencer', icon: '👑', description: 'Invited 50+ active users.' },
  { id: 'verified', name: 'KYC Verified', icon: '🛡️', description: 'Identity verified successfully.' },
];
