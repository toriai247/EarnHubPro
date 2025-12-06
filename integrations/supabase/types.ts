
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
          admin_response: string | null
          resolved_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          email: string
          message: string
          status?: 'pending' | 'resolved'
          admin_response?: string | null
          resolved_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          email?: string
          message?: string
          status?: 'pending' | 'resolved'
          admin_response?: string | null
          resolved_at?: string | null
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
        Insert: {
          id?: string
          user_id: string
          method_name: string
          account_number: string
          is_auto_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          method_name?: string
          account_number?: string
          is_auto_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          name_1: string | null
          email_1: string
          avatar_1: string | null
          bio_1: string | null
          level_1: number
          ref_code_1: string
          referred_by: string | null
          is_kyc_1: boolean
          is_withdraw_blocked: boolean
          is_suspended: boolean
          is_account_active: boolean
          is_dealer: boolean
          role: 'admin' | 'moderator' | 'user'
          admin_notes: string | null
          risk_score: number
          rank_1: string
          xp_1: number
          phone_1: string | null
          socials_1: Json | null
          badges_1: string[] | null
          sec_2fa_1: boolean
          admin_user: boolean
          user_uid: number
          created_at: string
        }
        Insert: {
          id: string
          name_1?: string | null
          email_1: string
          avatar_1?: string | null
          bio_1?: string | null
          level_1?: number
          ref_code_1?: string
          referred_by?: string | null
          is_kyc_1?: boolean
          is_withdraw_blocked?: boolean
          is_suspended?: boolean
          is_account_active?: boolean
          is_dealer?: boolean
          role?: 'admin' | 'moderator' | 'user'
          admin_notes?: string | null
          risk_score?: number
          rank_1?: string
          xp_1?: number
          phone_1?: string | null
          socials_1?: Json | null
          badges_1?: string[] | null
          sec_2fa_1?: boolean
          admin_user?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name_1?: string | null
          email_1?: string
          avatar_1?: string | null
          bio_1?: string | null
          level_1?: number
          ref_code_1?: string
          referred_by?: string | null
          is_kyc_1?: boolean
          is_withdraw_blocked?: boolean
          is_suspended?: boolean
          is_account_active?: boolean
          is_dealer?: boolean
          role?: 'admin' | 'moderator' | 'user'
          admin_notes?: string | null
          risk_score?: number
          rank_1?: string
          xp_1?: number
          phone_1?: string | null
          socials_1?: Json | null
          badges_1?: string[] | null
          sec_2fa_1?: boolean
          admin_user?: boolean
          created_at?: string
        }
      }
      wallets: {
        Row: {
          id: string
          user_id: string
          main_balance: number
          bonus_balance: number
          deposit_balance: number
          game_balance: number
          earning_balance: number
          investment_balance: number
          referral_balance: number
          commission_balance: number
          balance: number
          deposit: number
          withdrawable: number
          total_earning: number
          today_earning: number
          pending_withdraw: number
          referral_earnings: number
          currency: string
        }
        Insert: {
          id?: string
          user_id: string
          main_balance?: number
          bonus_balance?: number
          deposit_balance?: number
          game_balance?: number
          earning_balance?: number
          investment_balance?: number
          referral_balance?: number
          commission_balance?: number
          balance?: number
          deposit?: number
          withdrawable?: number
          total_earning?: number
          today_earning?: number
          pending_withdraw?: number
          referral_earnings?: number
          currency?: string
        }
        Update: {
          id?: string
          user_id?: string
          main_balance?: number
          bonus_balance?: number
          deposit_balance?: number
          game_balance?: number
          earning_balance?: number
          investment_balance?: number
          referral_balance?: number
          commission_balance?: number
          balance?: number
          deposit?: number
          withdrawable?: number
          total_earning?: number
          today_earning?: number
          pending_withdraw?: number
          referral_earnings?: number
          currency?: string
        }
      }
      transactions: {
        Row: {
          id: string
          user_id: string
          type: string
          amount: number
          status: string
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          amount: number
          status?: string
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          amount?: number
          status?: string
          description?: string | null
          created_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          title: string
          message: string
          type: string
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          message: string
          type: string
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          message?: string
          type?: string
          is_read?: boolean
          created_at?: string
        }
      }
      referrals: {
        Row: {
          id: string
          referrer_id: string
          referred_id: string
          status: string
          earned: number
          created_at: string
        }
        Insert: {
          id?: string
          referrer_id: string
          referred_id: string
          status?: string
          earned?: number
          created_at?: string
        }
        Update: {
          id?: string
          referrer_id?: string
          referred_id?: string
          status?: string
          earned?: number
          created_at?: string
        }
      }
      investments: {
        Row: {
          id: string
          user_id: string
          plan_id: string
          plan_name: string
          amount: number
          daily_return: number
          total_profit_percent: number
          start_date: string
          end_date: string
          status: string
          total_earned: number
          last_claim_at: string | null
          next_claim_at: string
        }
        Insert: {
          id?: string
          user_id: string
          plan_id: string
          plan_name: string
          amount: number
          daily_return: number
          total_profit_percent: number
          start_date: string
          end_date: string
          status?: string
          total_earned?: number
          last_claim_at?: string | null
          next_claim_at: string
        }
        Update: {
          id?: string
          user_id?: string
          plan_id?: string
          plan_name?: string
          amount?: number
          daily_return?: number
          total_profit_percent?: number
          start_date?: string
          end_date?: string
          status?: string
          total_earned?: number
          last_claim_at?: string | null
          next_claim_at?: string
        }
      }
      investment_plans: {
        Row: {
          id: string
          name: string
          daily_return: number
          duration: number
          min_invest: number
          total_roi: number
          badge_tag: string | null
          description: string | null
          is_active: boolean
        }
        Insert: {
          id?: string
          name: string
          daily_return: number
          duration: number
          min_invest: number
          total_roi: number
          badge_tag?: string | null
          description?: string | null
          is_active?: boolean
        }
        Update: {
          id?: string
          name?: string
          daily_return?: number
          duration?: number
          min_invest?: number
          total_roi?: number
          badge_tag?: string | null
          description?: string | null
          is_active?: boolean
        }
      }
      marketplace_tasks: {
        Row: {
          id: string
          creator_id: string
          title: string
          description: string | null
          category: string
          target_url: string
          total_quantity: number
          remaining_quantity: number
          price_per_action: number
          worker_reward: number
          proof_type: string
          quiz_config: Json | null
          ai_reference_data: Json | null
          requirements: Json | null
          timer_seconds: number
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          creator_id: string
          title: string
          description?: string | null
          category: string
          target_url: string
          total_quantity: number
          remaining_quantity: number
          price_per_action: number
          worker_reward: number
          proof_type?: string
          quiz_config?: Json | null
          ai_reference_data?: Json | null
          requirements?: Json | null
          timer_seconds?: number
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          creator_id?: string
          title?: string
          description?: string | null
          category?: string
          target_url?: string
          total_quantity?: number
          remaining_quantity?: number
          price_per_action?: number
          worker_reward?: number
          proof_type?: string
          quiz_config?: Json | null
          ai_reference_data?: Json | null
          requirements?: Json | null
          timer_seconds?: number
          status?: string
          created_at?: string
        }
      }
      marketplace_submissions: {
        Row: {
          id: string
          task_id: string
          worker_id: string
          submission_data: Json
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          task_id: string
          worker_id: string
          submission_data: Json
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          task_id?: string
          worker_id?: string
          submission_data?: Json
          status?: string
          created_at?: string
        }
      }
      task_attempts: {
        Row: {
          id: string
          task_id: string
          user_id: string
          attempts_count: number
          last_attempt_at: string
          is_locked: boolean
        }
        Insert: {
          id?: string
          task_id: string
          user_id: string
          attempts_count?: number
          last_attempt_at?: string
          is_locked?: boolean
        }
        Update: {
          id?: string
          task_id?: string
          user_id?: string
          attempts_count?: number
          last_attempt_at?: string
          is_locked?: boolean
        }
      }
      user_tasks: {
        Row: {
          id: string
          user_id: string
          task_id: string
          completed_at: string
        }
        Insert: {
          id?: string
          user_id: string
          task_id: string
          completed_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          task_id?: string
          completed_at?: string
        }
      }
      payment_methods: {
        Row: {
          id: string
          name: string
          account_number: string
          type: string
          instruction: string | null
          logo_url: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          account_number: string
          type: string
          instruction?: string | null
          logo_url?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          account_number?: string
          type?: string
          instruction?: string | null
          logo_url?: string | null
          is_active?: boolean
          created_at?: string
        }
      }
      deposit_bonuses: {
        Row: {
          id: string
          title: string
          tier_level: number
          method_name: string | null
          bonus_percent: number
          bonus_fixed: number
          min_deposit: number
          is_active: boolean
        }
        Insert: {
          id?: string
          title: string
          tier_level: number
          method_name?: string | null
          bonus_percent: number
          bonus_fixed: number
          min_deposit: number
          is_active?: boolean
        }
        Update: {
          id?: string
          title?: string
          tier_level?: number
          method_name?: string | null
          bonus_percent?: number
          bonus_fixed?: number
          min_deposit?: number
          is_active?: boolean
        }
      }
      crash_game_state: {
        Row: {
          id: number
          status: string
          current_round_id: string
          start_time: string
          crash_point: number
          total_bets_current_round: number
          last_crash_point: number
        }
        Insert: {
          id?: number
          status?: string
          current_round_id?: string
          start_time?: string
          crash_point?: number
          total_bets_current_round?: number
          last_crash_point?: number
        }
        Update: {
          id?: number
          status?: string
          current_round_id?: string
          start_time?: string
          crash_point?: number
          total_bets_current_round?: number
          last_crash_point?: number
        }
      }
      game_history: {
        Row: {
          id: string
          user_id: string
          game_id: string
          game_name: string
          bet: number
          payout: number
          profit: number
          details: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          game_id: string
          game_name: string
          bet: number
          payout: number
          profit: number
          details?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          game_id?: string
          game_name?: string
          bet?: number
          payout?: number
          profit?: number
          details?: string
          created_at?: string
        }
      }
      deposit_requests: {
        Row: {
          id: string
          user_id: string
          method_name: string
          amount: number
          transaction_id: string
          sender_number: string
          screenshot_url: string | null
          status: string
          admin_note: string | null
          created_at: string
          processed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          method_name: string
          amount: number
          transaction_id: string
          sender_number: string
          screenshot_url?: string | null
          status?: string
          admin_note?: string | null
          created_at?: string
          processed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          method_name?: string
          amount?: number
          transaction_id?: string
          sender_number?: string
          screenshot_url?: string | null
          status?: string
          admin_note?: string | null
          created_at?: string
          processed_at?: string | null
        }
      }
      withdraw_requests: {
        Row: {
          id: string
          user_id: string
          amount: number
          method: string
          account_number: string | null
          status: string
          created_at: string
          processed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          amount: number
          method: string
          account_number?: string | null
          status?: string
          created_at?: string
          processed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          amount?: number
          method?: string
          account_number?: string | null
          status?: string
          created_at?: string
          processed_at?: string | null
        }
      }
      kyc_requests: {
        Row: {
          id: string
          user_id: string
          full_name: string
          id_type: string
          id_number: string
          front_image_url: string
          back_image_url: string
          status: string
          admin_note: string | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          full_name: string
          id_type: string
          id_number: string
          front_image_url: string
          back_image_url: string
          status?: string
          admin_note?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          full_name?: string
          id_type?: string
          id_number?: string
          front_image_url?: string
          back_image_url?: string
          status?: string
          admin_note?: string | null
          created_at?: string
          updated_at?: string | null
        }
      }
      game_configs: {
        Row: {
          id: string
          name: string
          is_active: boolean
        }
        Insert: {
          id: string
          name: string
          is_active?: boolean
        }
        Update: {
          id?: string
          name?: string
          is_active?: boolean
        }
      }
      bot_profiles: {
        Row: {
          id: string
          name: string
          avatar: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          avatar: string
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          avatar?: string
          is_active?: boolean
          created_at?: string
        }
      }
      spin_items: {
        Row: {
          id: string
          label: string
          value: number
          probability: number
          color: string
          is_active: boolean
        }
        Insert: {
          id?: string
          label: string
          value: number
          probability: number
          color: string
          is_active?: boolean
        }
        Update: {
          id?: string
          label?: string
          value?: number
          probability?: number
          color?: string
          is_active?: boolean
        }
      }
      ludo_cards: {
        Row: {
          id: string
          amount: number
          players: number
          is_active: boolean
        }
        Insert: {
          id?: string
          amount: number
          players: number
          is_active?: boolean
        }
        Update: {
          id?: string
          amount?: number
          players?: number
          is_active?: boolean
        }
      }
      referral_tiers: {
        Row: {
          id: string
          level: number
          commission_percent: number
          type: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          level: number
          commission_percent: number
          type: string
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          level?: number
          commission_percent?: number
          type?: string
          is_active?: boolean
          created_at?: string
        }
      }
      player_rigging: {
        Row: {
          user_id: string
          force_loss_count: number
          updated_at: string
        }
        Insert: {
          user_id: string
          force_loss_count: number
          updated_at?: string
        }
        Update: {
          user_id?: string
          force_loss_count?: number
          updated_at?: string
        }
      }
      user_biometrics: {
        Row: {
          user_id: string
          credential_id: string
          email_enc: string
          password_enc: string
          device_name: string
          created_at: string
        }
        Insert: {
          user_id: string
          credential_id: string
          email_enc: string
          password_enc: string
          device_name: string
          created_at?: string
        }
        Update: {
          user_id?: string
          credential_id?: string
          email_enc?: string
          password_enc?: string
          device_name?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
