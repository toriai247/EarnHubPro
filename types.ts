
export interface PublishedSite {
    id: string;
    name: string;
    slug: string;
    target_url: string;
    source_type?: 'url' | 'html'; 
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

export interface WebsiteReview {
    id: string;
    user_id: string;
    rating: number;
    category: 'bug' | 'suggestion' | 'compliment' | 'other';
    comment: string;
    is_public: boolean;
    admin_reply?: string;
    created_at: string;
    profile?: UserProfile; // Joined
}

// NEW INVESTMENT TYPES
export type AssetType = 'commodity' | 'currency' | 'business';

export interface Asset {
    id: string;
    type: AssetType;
    name: string;
    description?: string;
    image_url?: string;
    current_price: number;
    previous_price?: number;
    
    // Business Specific
    target_fund?: number;
    collected_fund?: number;
    profit_rate?: number;
    duration_days?: number;
    
    is_active: boolean;
    created_at?: string;
}

export interface UserAsset {
    id: string;
    user_id: string;
    asset_id: string;
    quantity: number;
    average_buy_price: number;
    status: 'holding' | 'sold' | 'delivery_requested';
    delivery_details?: string;
    asset?: Asset; // Joined
    created_at: string;
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
  quiz_config?: QuizConfig; 
  ai_reference_data?: any; 
  requirements?: TaskRequirement[]; 
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

export interface Transaction {
  id: string;
  user_id: string;
  type: 'deposit' | 'withdraw' | 'earn' | 'bonus' | 'invest' | 'game_win' | 'game_loss' | 'referral' | 'penalty' | 'transfer' | 'sponsorship' | 'asset_buy' | 'asset_sell' | 'fee';
  amount: number;
  status: 'success' | 'pending' | 'failed';
  description?: string;
  metadata?: any;
  created_at: string;
  time?: string;
  title?: string;
  timestamp?: number;
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
  is_dealer?: boolean;
  role?: 'admin' | 'moderator' | 'user' | 'staff';
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

export interface InfluencerCampaign {
    id: string;
    title: string;
    platform: 'facebook' | 'youtube' | 'instagram' | 'tiktok';
    media_link: string;
    requirements: string;
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
export interface GameResult { id: string; gameId: string; gameName: string; bet: number; payout: number; profit: number; timestamp: number; details: string; }
export interface AppNotification { id: string; title: string; message: string; type: 'info' | 'success' | 'warning' | 'error'; created_at: string; read: boolean; is_read?: boolean; }
export interface BotProfile { id: string; name: string; avatar: string; is_active: boolean; }
export interface SpinItem { id: string; label: string; value: number; probability: number; color: string; is_active: boolean; }
export interface SystemConfig { id: string; is_tasks_enabled: boolean; is_games_enabled: boolean; is_invest_enabled: boolean; is_invite_enabled: boolean; is_video_enabled: boolean; is_deposit_enabled: boolean; is_withdraw_enabled: boolean; maintenance_mode: boolean; global_alert: string | null; p2p_transfer_fee_percent?: number; p2p_min_transfer?: number; is_activation_enabled?: boolean; activation_amount?: number; is_pwa_enabled?: boolean; }
export interface HelpRequest { id: string; user_id?: string; email: string; message: string; status: 'pending' | 'resolved'; admin_response?: string; resolved_at?: string; created_at: string; }
export interface KycRequest { id: string; user_id: string; full_name: string; id_type: string; id_number: string; front_image_url: string; back_image_url: string; status: 'pending' | 'approved' | 'rejected'; admin_note?: string; created_at: string; profile?: UserProfile; }
export interface ReferralTier { id: string; level: number; commission_percent: number; type: 'deposit' | 'earning'; is_active: boolean; created_at?: string; }
// Legacy / Placeholder
export interface InvestmentPlan { id: string; name: string; daily_return: number; duration: number; min_invest: number; total_roi: number; badge_tag?: string; description?: string; is_active?: boolean; }
export interface Task { id: string; title: string; description?: string; reward: number; sponsor_rate?: number; icon: string; url?: string; difficulty: 'Easy' | 'Medium' | 'Hard'; frequency: 'once' | 'daily'; type: 'social' | 'video' | 'app' | 'website'; status?: 'available' | 'completed' | 'cooldown'; is_active?: boolean; created_at?: string; }
