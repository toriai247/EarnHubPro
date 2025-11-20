
export interface InvestmentPlan {
  id: string;
  name: string;
  daily_return: number;
  duration: number;
  min_invest: number;
  total_roi: number;
  badge_tag?: string;
  description?: string;
  is_active?: boolean;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  reward: number;
  sponsor_rate?: number; // Amount the admin gets paid by advertiser
  icon: string;
  url?: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  frequency: 'once' | 'daily';
  type: 'social' | 'video' | 'app' | 'website';
  status?: 'available' | 'completed' | 'cooldown';
  is_active?: boolean;
  created_at?: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  type: 'deposit' | 'withdraw' | 'earn' | 'bonus' | 'invest' | 'game_win' | 'game_loss' | 'referral' | 'penalty';
  amount: number;
  status: 'success' | 'pending' | 'failed';
  description?: string;
  metadata?: any;
  created_at: string;
  time?: string; // UI helper
  title?: string; // UI helper
  timestamp?: number; // UI helper
}

export interface WalletData {
  id: string;
  user_id: string;
  balance: number;
  deposit: number;
  withdrawable: number;
  total_earning: number;
  referral_earnings?: number;
  today_earning: number;
  pending_withdraw: number;
}

export interface WalletMeta {
  minWithdraw: number;
  withdrawFeePercent: number;
  currency: string;
}

export interface UserProfile {
  id: string;
  email_1: string;
  name_1: string | null;
  avatar_1?: string | null;
  bio_1?: string | null;
  level_1: number;
  ref_code_1: string;
  referred_by?: string | null;
  is_kyc_1: boolean;
  is_withdraw_blocked?: boolean;
  rank_1?: string;
  xp_1: number;
  phone_1?: string | null;
  socials_1?: {
    twitter?: string;
    telegram?: string;
    discord?: string;
  };
  badges_1?: string[]; // Array of badge IDs
  sec_2fa_1?: boolean;
  admin_user?: boolean;
  created_at: string;
}

export interface Game {
  id: string;
  name: string;
  image: string;
  players: number;
  type: 'crash' | 'wheel' | 'slots';
}

export interface VideoShort {
  id: string;
  username: string;
  description: string;
  likes: string;
  comments: string;
  videoUrl: string;
}

export interface Activity {
  id: string;
  title: string;
  type: Transaction['type'];
  amount: number;
  time: string;
  timestamp: number;
  status?: string;
}

export interface ReferralStats {
    code: string;
    invitedUsers: number;
    totalEarned: number;
}

export interface AdminStats {
    totalUsers: number;
    totalDeposits: number;
    totalWithdrawals: number;
    pendingWithdrawals: number;
    revenue: number;
}

export interface DepositRequest {
    id: string;
    user_id: string;
    method_name: string;
    amount: number;
    transaction_id: string;
    sender_number: string;
    screenshot_url?: string;
    status: 'pending' | 'approved' | 'rejected';
    admin_note?: string;
    created_at: string;
    processed_at?: string;
}

export interface WithdrawRequest {
    id: string;
    user_id: string;
    amount: number;
    method: string;
    status: 'pending' | 'approved' | 'rejected';
    created_at: string;
    processed_at?: string;
}

export interface WithdrawalSettings {
    id: string;
    min_withdraw: number;
    max_withdraw: number;
    daily_limit: number;
    monthly_limit: number;
    id_change_fee: number;
    withdraw_fee_percent: number; // New: Admin profit on withdraw
    kyc_required: boolean;
}

export interface UserWithdrawMethod {
    id: string;
    user_id: string;
    method_name: string;
    account_number: string;
    is_auto_enabled: boolean;
}

export interface DepositBonus {
    id: string;
    title: string;
    tier_level: number; // 0 = all, 1 = 1st, 2 = 2nd...
    method_name?: string | null;
    bonus_percent: number;
    bonus_fixed: number;
    min_deposit: number;
    is_active: boolean;
}

export interface PaymentMethod {
    id: string;
    name: string;
    account_number: string;
    type: 'mobile_banking' | 'crypto' | 'bank';
    instruction?: string;
    logo_url?: string;
    is_active: boolean;
}

export interface ActiveInvestment {
    id: string;
    user_id: string;
    plan_id: string;
    plan_name: string;
    amount: number;
    daily_return: number;
    total_profit_percent: number;
    start_date: string;
    end_date: string;
    status: 'active' | 'completed' | 'cancelled';
    total_earned: number;
    last_claim_at?: string;
    next_claim_at: string;
}

export interface SpinItem {
    id?: string;
    label: string;
    value: number;
    probability: number;
    color: string;
    is_active: boolean;
}

export interface GameResult {
    id: string;
    gameId: string;
    gameName: string;
    bet: number;
    payout: number;
    profit: number;
    timestamp: number;
    details: string;
}

export interface AppNotification {
    id: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    created_at: string;
    read: boolean;
    is_read?: boolean; // DB field
}
