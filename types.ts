
export interface PublishedSite {
    id: string;
    name: string;
    slug: string; // The URL path part
    target_url: string;
    page_title?: string;
    meta_desc?: string;
    is_active: boolean;
    views: number;
    created_at: string;
}

export interface DailyBonusConfig {
    day: number;
    reward_amount: number;
    is_active: boolean;
}

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

export interface TaskRequirement {
  id: string;
  type: 'text' | 'image' | 'code';
  label: string;
  required: boolean;
}

export interface QuizConfig {
    question: string;
    options: string[];
    correct_index: number;
}

// NEW: Marketplace Task Interface V4 (AI Quiz)
export interface MarketTask {
  id: string;
  creator_id: string;
  title: string;
  description?: string;
  category: 'social' | 'video' | 'app' | 'website' | 'review' | 'seo';
  target_url: string;
  total_quantity: number;
  remaining_quantity: number;
  price_per_action: number;
  worker_reward: number; 
  proof_type: 'ai_quiz' | 'manual'; 
  quiz_config?: QuizConfig; // AI Generated Question
  ai_reference_data?: any; // NEW: Stores Visual DNA for matching
  requirements?: TaskRequirement[]; // Legacy manual reqs
  timer_seconds?: number; 
  status: 'active' | 'paused' | 'completed' | 'banned';
  created_at: string;
}

export interface MarketSubmission {
  id: string;
  task_id: string;
  worker_id: string;
  submission_data?: Record<string, string>; 
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export interface TaskAttempt {
    id: string;
    task_id: string;
    user_id: string;
    attempts_count: number;
    last_attempt_at: string;
    is_locked: boolean;
}

export interface Transaction {
  id: string;
  user_id: string;
  type: 'deposit' | 'withdraw' | 'earn' | 'bonus' | 'invest' | 'game_win' | 'game_loss' | 'referral' | 'penalty' | 'transfer' | 'sponsorship';
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
  main_balance: number; 
  game_balance: number;
  earning_balance: number;
  investment_balance: number;
  referral_balance: number;
  commission_balance: number;
  deposit_balance: number;
  bonus_balance: number;
  balance: number; 
  deposit: number;
  withdrawable: number;
  total_earning: number;
  referral_earnings?: number;
  today_earning: number;
  pending_withdraw: number;
  currency?: string;
}

export interface UserProfile {
  id: string;
  user_uid?: number;
  email_1: string;
  name_1: string | null;
  avatar_1?: string | null;
  bio_1?: string | null;
  level_1: number;
  ref_code_1: string;
  referred_by?: string | null;
  is_kyc_1: boolean;
  is_withdraw_blocked?: boolean;
  is_suspended?: boolean;
  is_account_active?: boolean;
  is_dealer?: boolean; // Dealer/Partner Role
  role?: 'admin' | 'moderator' | 'user' | 'staff'; // Added 'staff'
  admin_notes?: string;
  risk_score?: number;
  rank_1?: string;
  xp_1: number;
  phone_1?: string | null;
  socials_1?: {
    twitter?: string;
    telegram?: string;
    discord?: string;
  };
  badges_1?: string[];
  sec_2fa_1?: boolean;
  admin_user?: boolean;
  created_at: string;
}

// Influencer Campaign Interface
export interface InfluencerCampaign {
    id: string;
    title: string;
    platform: 'facebook' | 'youtube' | 'instagram' | 'tiktok';
    media_link: string; // The link to Naxxivo content they need to share
    requirements: string; // "Must have 10k views"
    payout: number;
    status: 'active' | 'completed';
    created_at: string;
}

export interface InfluencerSubmission {
    id: string;
    campaign_id: string;
    user_id: string;
    proof_link: string;
    views_count: number;
    status: 'pending' | 'approved' | 'rejected';
    created_at: string;
}

export interface Game { 
  id: string; 
  name: string; 
  players: number; 
  type: 'crash' | 'wheel' | 'slots' | 'ludo'; 
  status?: string;
  image?: string;
  description?: string;
  icon?: any;
  color?: string;
  bgColor?: string;
  path?: string;
}
export interface GameConfig { id: string; name: string; is_active: boolean; }
export interface VideoShort { id: string; username: string; description: string; likes: string; comments: string; videoUrl: string; }
export interface Activity { id: string; title: string; type: Transaction['type']; amount: number; time: string; timestamp: number; status?: string; }
export interface ReferralStats { code: string; invitedUsers: number; totalEarned: number; }
export interface AdminStats { totalUsers: number; totalDeposits: number; totalWithdrawals: number; pendingWithdrawals: number; revenue: number; }
export interface DepositRequest { id: string; user_id: string; method_name: string; amount: number; transaction_id: string; sender_number: string; screenshot_url?: string; status: 'pending' | 'approved' | 'rejected'; admin_note?: string; created_at: string; processed_at?: string; }
export interface WithdrawRequest { id: string; user_id: string; amount: number; method: string; account_number?: string; status: 'pending' | 'approved' | 'rejected'; created_at: string; processed_at?: string; }
export interface WithdrawalSettings { id: string; min_withdraw: number; max_withdraw: number; daily_limit: number; monthly_limit: number; id_change_fee: number; withdraw_fee_percent: number; kyc_required: boolean; }
export interface UserWithdrawMethod { id: string; user_id: string; method_name: string; account_number: string; is_auto_enabled: boolean; }
export interface DepositBonus { id: string; title: string; tier_level: number; method_name?: string | null; bonus_percent: number; bonus_fixed: number; min_deposit: number; is_active: boolean; }
export interface PaymentMethod { id: string; name: string; account_number: string; type: 'mobile_banking' | 'crypto' | 'bank'; instruction?: string; logo_url?: string; is_active: boolean; }
export interface ActiveInvestment { id: string; user_id: string; plan_id: string; plan_name: string; amount: number; daily_return: number; total_profit_percent: number; start_date: string; end_date: string; status: 'active' | 'completed' | 'cancelled'; total_earned: number; last_claim_at?: string; next_claim_at: string; }
export interface SpinItem { id?: string; label: string; value: number; probability: number; color: string; is_active: boolean; }
export interface GameResult { id: string; gameId: string; gameName: string; bet: number; payout: number; profit: number; timestamp: number; details: string; }
export interface AppNotification { id: string; title: string; message: string; type: 'info' | 'success' | 'warning' | 'error'; created_at: string; read: boolean; is_read?: boolean; }
export interface BotProfile { id: string; name: string; avatar: string; is_active: boolean; }
export interface SystemConfig { id: string; is_tasks_enabled: boolean; is_games_enabled: boolean; is_invest_enabled: boolean; is_invite_enabled: boolean; is_video_enabled: boolean; is_deposit_enabled: boolean; is_withdraw_enabled: boolean; maintenance_mode: boolean; global_alert: string | null; p2p_transfer_fee_percent?: number; p2p_min_transfer?: number; is_activation_enabled?: boolean; activation_amount?: number; is_pwa_enabled?: boolean; }
export interface HelpRequest { id: string; user_id?: string; email: string; message: string; status: 'pending' | 'resolved'; admin_response?: string; resolved_at?: string; created_at: string; }
export interface KycRequest { id: string; user_id: string; full_name: string; id_type: string; id_number: string; front_image_url: string; back_image_url: string; status: 'pending' | 'approved' | 'rejected'; admin_note?: string; created_at: string; profile?: UserProfile; }
export interface CrashGameState { id: number; status: 'BETTING' | 'FLYING' | 'CRASHED'; current_round_id: string; start_time: string; crash_point: number; total_bets_current_round: number; last_crash_point: number; }
export interface CrashBet { id: string; round_id: string; user_id: string; amount: number; cashed_out_at: number | null; profit: number; avatar_url?: string; user_name?: string; wallet_type?: string; }
export interface ReferralTier { id: string; level: number; commission_percent: number; type: 'deposit' | 'earning'; is_active: boolean; created_at?: string; }
// Legacy Task Interface
export interface Task { id: string; title: string; description?: string; reward: number; sponsor_rate?: number; icon: string; url?: string; difficulty: 'Easy' | 'Medium' | 'Hard'; frequency: 'once' | 'daily'; type: 'social' | 'video' | 'app' | 'website'; status?: 'available' | 'completed' | 'cooldown'; is_active?: boolean; created_at?: string; }
