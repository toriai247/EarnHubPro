
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      // ... existing tables ...
      daily_bonus_config: {
        Row: {
          day: number
          reward_amount: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          day: number
          reward_amount: number
          is_active?: boolean
          created_at?: string
        }
        Update: {
          day?: number
          reward_amount?: number
          is_active?: boolean
          created_at?: string
        }
      }
      daily_streaks: {
        Row: {
          user_id: string
          current_streak: number
          last_claimed_at: string
          total_claimed: number
        }
        Insert: {
          user_id: string
          current_streak?: number
          last_claimed_at?: string
          total_claimed?: number
        }
        Update: {
          user_id?: string
          current_streak?: number
          last_claimed_at?: string
          total_claimed?: number
        }
      }
      help_requests: {
        Row: {
          id: string
          user_id: string | null
          email: string
          message: string
          status: 'pending' | 'resolved'
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          email: string
          message: string
          status?: 'pending' | 'resolved'
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          email?: string
          message?: string
          status?: 'pending' | 'resolved'
          created_at?: string
        }
      }
      system_config: {
        Row: {
          id: string
          is_tasks_enabled: boolean
          is_games_enabled: boolean
          is_invest_enabled: boolean
          is_invite_enabled: boolean
          is_video_enabled: boolean
          is_deposit_enabled: boolean
          is_withdraw_enabled: boolean
          maintenance_mode: boolean
          global_alert: string | null
          p2p_transfer_fee_percent: number
          p2p_min_transfer: number
          is_activation_enabled: boolean
          activation_amount: number
          is_pwa_enabled: boolean
        }
        Insert: {
          id?: string
          is_tasks_enabled?: boolean
          is_games_enabled?: boolean
          is_invest_enabled?: boolean
          is_invite_enabled?: boolean
          is_video_enabled?: boolean
          is_deposit_enabled?: boolean
          is_withdraw_enabled?: boolean
          maintenance_mode?: boolean
          global_alert?: string | null
          p2p_transfer_fee_percent?: number
          p2p_min_transfer?: number
          is_activation_enabled?: boolean
          activation_amount?: number
          is_pwa_enabled?: boolean
        }
        Update: {
          id?: string
          is_tasks_enabled?: boolean
          is_games_enabled?: boolean
          is_invest_enabled?: boolean
          is_invite_enabled?: boolean
          is_video_enabled?: boolean
          is_deposit_enabled?: boolean
          is_withdraw_enabled?: boolean
          maintenance_mode?: boolean
          global_alert?: string | null
          p2p_transfer_fee_percent?: number
          p2p_min_transfer?: number
          is_activation_enabled?: boolean
          activation_amount?: number
          is_pwa_enabled?: boolean
        }
      }
      withdrawal_settings: {
        Row: {
          id: string
          min_withdraw: number
          max_withdraw: number
          daily_limit: number
          monthly_limit: number
          id_change_fee: number
          withdraw_fee_percent: number
          kyc_required: boolean
          created_at: string
        }
        Insert: {
            id?: string
            min_withdraw?: number
            max_withdraw?: number
            daily_limit?: number
            monthly_limit?: number
            id_change_fee?: number
            withdraw_fee_percent?: number
            kyc_required?: boolean
            created_at?: string
        }
        Update: {
            id?: string
            min_withdraw?: number
            max_withdraw?: number
            daily_limit?: number
            monthly_limit?: number
            id_change_fee?: number
            withdraw_fee_percent?: number
            kyc_required?: boolean
            created_at?: string
        }
      }
      user_withdrawal_methods: {
        Row: {
          id: string
          user_id: string
          method_name: string
          account_number: string
          is_auto_enabled: boolean
          created_at: string
          updated_at: string
        }
        