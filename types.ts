
export interface Lottery {
    id: string;
    title: string;
    description: string;
    prize_value: number;
    ticket_price: number;
    total_tickets: number;
    sold_tickets: number;
    image_url?: string;
    status: 'active' | 'ended' | 'drawn';
    winner_id?: string;
    winner_name?: string;
    end_date: string;
    created_at: string;
}

export interface LotteryTicket {
    id: string;
    lottery_id: string;
    user_id: string;
    ticket_number: string;
    created_at: string;
}

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
    profile?: UserProfile; 
}

export interface UnlimitedEarnLog {
    id: string;
    referrer_id: string;
    action_type: 'view' | 'click';
    visitor_ip: string;
    device_info: string;
    country: string;
    amount: number;
    source?: string; 
    created_at: string;
}

export type AssetType = 'commodity' | 'currency' | 'business';

export interface Asset {
    id: string;
    type: AssetType;
    name: string;
    description?: string;
    image_url?: string;
    current_price: number;
    previous_price?: number;
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
    asset?: Asset; 
    created_at: string;
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
  proof_type: 'ai_quiz' | 'text_input' | 'screenshot' | 'file_check'; 
  proof_question?: string; 
  expected_file_name?: string; 
  quiz_config?: QuizConfig; 
  ai_reference_data?: any; 
  timer_seconds?: number; 
  status: 'active' | 'paused' | 'completed' | 'banned';
  company_name?: string;
  is_featured?: boolean;
  auto_approve_hours?: number; 
  created_at: string;
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
  today_earning: number;
  pending_withdraw: number;
  referral_earnings: number;
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
  socials_1?: any;
  badges_1?: string[];
  sec_2fa_1?: boolean;
  admin_user?: boolean;
  theme_id?: string;
  created_at: string;
}

export interface Game { 
  id: string; 
  name: string; 
  players: number; 
  type: 'crash' | 'wheel' | 'slots'; 
  status?: string;
  image?: string;
  description?: string;
  icon?: any;
  color?: string;
  bgColor?: string;
  path?: string;
}

export interface DepositRequest { 
    id: string; 
    user_id: string; 
    method_name: string; 
    amount: number; 
    transaction_id: string; 
    sender_number: string; 
    screenshot_url?: string; 
    user_note?: string;
    status: 'pending' | 'approved' | 'rejected'; 
    admin_note?: string; 
    created_at: string; 
    processed_at?: string; 
}

export interface WithdrawRequest { id: string; user_id: string; amount: number; method: string; account_number?: string; status: 'pending' | 'approved' | 'rejected'; created_at: string; processed_at?: string; }
export interface WithdrawalSettings { id: string; min_withdraw: number; max_withdraw: number; daily_limit: number; monthly_limit: number; id_change_fee: number; withdraw_fee_percent: number; kyc_required: boolean; }
export interface AppNotification { id: string; title: string; message: string; type: 'info' | 'success' | 'warning' | 'error'; created_at: string; is_read?: boolean; read?: boolean; }

export interface InvestmentPlan {
  id: string;
  name: string;
  daily_return: number;
  duration: number;
  min_invest: number;
  total_roi: number;
  badge_tag?: string;
  is_active?: boolean;
}

export interface Task {
  id: string;
  title: string;
  reward: number;
  sponsor_rate: number;
  icon: string;
  difficulty: string;
  status: string;
  type: string;
  frequency: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  type: string;
  amount: number;
  created_at: string;
  status: string;
  description: string;
  from_wallet?: string;
  to_wallet?: string;
  balance_before?: number;
  balance_after?: number;
  wallet_affected?: string;
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
  type: string;
  amount?: number;
  time: string;
  timestamp: number;
  status?: string;
}

export interface ReferralStats {
    code: string;
    invitedUsers: number;
    totalEarned: number;
}

export interface VideoAd {
  id: string;
  creator_id: string;
  title: string;
  video_url: string;
  thumbnail_url?: string;
  duration: number;
  total_budget: number;
  remaining_budget: number;
  cost_per_view: number;
  status: 'active' | 'paused' | 'completed';
  created_at: string;
  profiles?: {
    name_1: string;
    avatar_1: string | null;
  };
}

export interface BotProfile {
    id: string;
    name: string;
    avatar: string;
    is_active: boolean;
    created_at?: string;
}

export interface DepositBonus {
    id: string;
    title: string;
    tier_level: number;
    method_name: string | null;
    bonus_percent: number;
    bonus_fixed: number;
    min_deposit: number;
    is_active: boolean;
}

export interface PaymentMethod {
    id: string;
    name: string;
    account_number: string;
    type: string;
    instruction: string | null;
    logo_url: string | null;
    is_active: boolean;
    created_at?: string;
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
  is_activation_enabled?: boolean;
  activation_amount?: number;
  is_pwa_enabled?: boolean;
  hero_title?: string;
  hero_description?: string;
  hero_image_url?: string;
  task_commission_percent?: number;
  adsterra_api_token?: string;
  gplinks_api_token?: string;
}

export interface SpinItem {
    id?: string;
    label: string;
    value: number;
    probability: number;
    color: string;
    is_active: boolean;
}

export interface UserWithdrawMethod {
    user_id: string;
    method_name: string;
    account_number: string;
    is_auto_enabled: boolean;
}

export interface GameResult {
    id: string;
    gameId: string;
    gameName: string;
    bet: number;
    payout: number;
    profit: number;
    details: string;
    timestamp: number;
}

export interface GameConfig {
    id: string;
    name: string;
    is_active: boolean;
}

export interface HelpRequest {
    id: string;
    user_id: string | null;
    email: string;
    message: string;
    status: 'pending' | 'resolved';
    admin_response?: string;
    created_at: string;
    resolved_at?: string;
}

export interface ReferralTier {
    id: string;
    level: number;
    commission_percent: number;
    type: string;
    is_active: boolean;
}

export interface KycRequest {
    id: string;
    user_id: string;
    full_name: string;
    id_type: string;
    id_number: string;
    front_image_url: string;
    back_image_url: string;
    status: 'pending' | 'approved' | 'rejected';
    admin_note?: string;
    created_at: string;
    profile?: UserProfile;
}

export interface InfluencerCampaign {
    id: string;
    title: string;
    platform: string;
    requirements: string;
    media_link: string;
    payout: number;
    status: 'active' | 'completed';
    created_at: string;
}

export interface UserInvestment {
    id: string;
    user_id: string;
    plan_id: string;
    plan_name: string;
    amount: number;
    daily_return: number;
    start_date: string;
    end_date: string;
    status: 'active' | 'completed';
    total_earned: number;
    next_claim_at: string;
    last_claim_at?: string;
}
