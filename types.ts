
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

// NEW: Marketplace Task Interface
export interface MarketTask {
  id: string;
  creator_id: string;
  title: string;
  description?: string;
  category: 'social' | 'video' | 'app' | 'website' | 'survey' | 'review' | 'seo' | 'content';
  target_url: string;
  total_quantity: number;
  remaining_quantity: number;
  price_per_action: number;
  worker_reward: number; // The 70% share
  proof_type: 'screenshot' | 'text' | 'auto';
  timer_seconds?: number; // Minimum time user must wait
  status: 'active' | 'paused' | 'completed' | 'banned';
  created_at: string;
}

export interface MarketSubmission {
  id: string;
  task_id: string;
  worker_id: string;
  proof_data?: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

// Legacy Task (Kept for compatibility if needed, but UI will use MarketTask)
export interface Task {
  id: string;
  title: string;
  description?: string;
  reward: number;
  sponsor_rate?: number; 
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
  // REMOVED 'fee', 'task_create', 'task_payout' to match DB constraint
  type: 'deposit' | 'withdraw' | 'earn' | 'bonus' | 'invest' | 'game_win' | 'game_loss' | 'referral' | 'penalty' | 'transfer';
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
  
  // Aggregates
  total_assets?: number; // Calculated on frontend usually
  
  // The Main Withdrawable Wallet
  main_balance: number; 
  
  // Sub Wallets
  game_balance: number;
  earning_balance: number;
  investment_balance: number;
  referral_balance: number;
  commission_balance: number;
  deposit_balance: number;
  bonus_balance: number;

  // Legacy / Stats fields
  balance: number; // Keeping for backward compatibility map to main_balance
  deposit: number; // Keeping for backward compatibility map to deposit_balance
  withdrawable: number; // Usually maps to main_balance - pending
  total_earning: number;
  referral_earnings?: number;
  today_earning: number;
  pending_withdraw: number;
  currency?: string;
}

export interface WalletMeta {
  minWithdraw: number;
  withdrawFeePercent: number;
  currency: string;
}

export interface UserProfile {
  id: string;
  user_uid?: number; // New 8 digit ID
  email_1: string;
  name_1: string | null;
  avatar_1?: string | null;
  bio_1?: string | null;
  level_1: number;
  ref_code_1: string;
  referred_by?: string | null;
  is_kyc_1: boolean;
  is_withdraw_blocked?: boolean;
  is_suspended?: boolean; // NEW: Banned status
  admin_notes?: string;   // NEW: Private notes
  risk_score?: number;    // NEW: Risk Analysis (0-100)
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
  image?: string;
  players: number;
  type: 'crash' | 'wheel' | 'slots' | 'ludo';
  path?: string;
  color?: string;
  bgColor?: string;
  status?: string;
  description?: string;
  icon?: any;
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

export interface BotProfile {
    id: string;
    name: string;
    avatar: string;
    is_active: boolean;
}

export interface SystemConfig {
    id: string;
    is_tasks_enabled: boolean;
    is_games_enabled: boolean;
    is_invest_enabled: boolean;
    is_invite_enabled: boolean;
    is_video_enabled: boolean;
    is_deposit_enabled: boolean;
    is_withdraw_enabled: boolean;
    maintenance_mode: boolean;
    global_alert: string | null;
    p2p_transfer_fee_percent?: number;
    p2p_min_transfer?: number;
}

export interface HelpRequest {
    id: string;
    user_id?: string;
    email: string;
    message: string;
    status: 'pending' | 'resolved';
    admin_response?: string;
    resolved_at?: string;
    created_at: string;
}

// REALTIME CRASH GAME TYPES
export interface CrashGameState {
    id: number;
    status: 'BETTING' | 'FLYING' | 'CRASHED';
    current_round_id: string;
    start_time: string; // ISO String
    crash_point: number;
    total_bets_current_round: number;
    last_crash_point: number;
}

export interface CrashBet {
    id: string;
    round_id: string;
    user_id: string;
    amount: number;
    cashed_out_at: number | null;
    profit: number;
    avatar_url?: string;
    user_name?: string;
}
