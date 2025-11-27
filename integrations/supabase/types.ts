
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
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          tier_level?: number
          method_name?: string | null
          bonus_percent?: number
          bonus_fixed?: number
          min_deposit?: number
          is_active?: boolean
          created_at?: string
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
          created_at?: string
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
      deposit_requests: {
        Row: {
          id: string
          user_id: string
          method_name: string
          amount: number
          transaction_id: string | null
          sender_number: string | null
          screenshot_url: string | null
          status: 'pending' | 'approved' | 'rejected'
          admin_note: string | null
          created_at: string
          processed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          method_name: string
          amount: number
          transaction_id?: string | null
          sender_number?: string | null
          screenshot_url?: string | null
          status?: 'pending' | 'approved' | 'rejected'
          admin_note?: string | null
          created_at?: string
          processed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          method_name?: string
          amount?: number
          transaction_id?: string | null
          sender_number?: string | null
          screenshot_url?: string | null
          status?: 'pending' | 'approved' | 'rejected'
          admin_note?: string | null
          created_at?: string
          processed_at?: string | null
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
            description: string | null
            badge_tag: string | null
            is_active: boolean
            created_at: string
        }
        Insert: {
            id?: string
            name: string
            daily_return: number
            duration: number
            min_invest: number
            total_roi: number
            description?: string | null
            badge_tag?: string | null
            is_active?: boolean
            created_at?: string
        }
        Update: {
            id?: string
            name?: string
            daily_return?: number
            duration?: number
            min_invest?: number
            total_roi?: number
            description?: string | null
            badge_tag?: string | null
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
          created_at: string
        }
        Insert: {
          id?: string
          label: string
          value: number
          probability: number
          color: string
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          label?: string
          value?: number
          probability?: number
          color?: string
          is_active?: boolean
          created_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          user_uid: number
          email_1: string
          name_1: string | null
          avatar_1: string | null
          bio_1: string | null
          level_1: number
          ref_code_1: string
          referred_by: string | null
          is_kyc_1: boolean
          is_withdraw_blocked: boolean
          is_suspended: boolean
          admin_notes: string | null
          risk_score: number
          rank_1: string
          xp_1: number
          phone_1: string | null
          socials_1: Json | null
          badges_1: Json | null
          sec_2fa_1: boolean
          admin_user: boolean
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id: string
          user_uid?: number
          email_1: string
          name_1?: string | null
          avatar_1?: string | null
          bio_1?: string | null
          level_1?: number
          ref_code_1?: string
          referred_by?: string | null
          is_kyc_1?: boolean
          is_withdraw_blocked?: boolean
          is_suspended?: boolean
          admin_notes?: string | null
          risk_score?: number
          rank_1?: string
          xp_1?: number
          phone_1?: string | null
          socials_1?: Json | null
          badges_1?: Json | null
          sec_2fa_1?: boolean
          admin_user?: boolean
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_uid?: number
          email_1?: string
          name_1?: string | null
          avatar_1?: string | null
          bio_1?: string | null
          level_1?: number
          ref_code_1?: string
          referred_by?: string | null
          is_kyc_1?: boolean
          is_withdraw_blocked?: boolean
          is_suspended?: boolean
          admin_notes?: string | null
          risk_score?: number
          rank_1?: string
          xp_1?: number
          phone_1?: string | null
          socials_1?: Json | null
          badges_1?: Json | null
          sec_2fa_1?: boolean
          admin_user?: boolean
          created_at?: string
          updated_at?: string | null
        }
      }
      wallets: {
        Row: {
          id: string
          user_id: string
          balance: number
          deposit: number
          withdrawable: number
          total_earning: number
          referral_earnings: number
          today_earning: number
          pending_withdraw: number
          main_balance: number
          deposit_balance: number
          game_balance: number
          earning_balance: number
          investment_balance: number
          referral_balance: number
          commission_balance: number
          bonus_balance: number
          currency: string
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          balance?: number
          deposit?: number
          withdrawable?: number
          total_earning?: number
          referral_earnings?: number
          today_earning?: number
          pending_withdraw?: number
          main_balance?: number
          deposit_balance?: number
          game_balance?: number
          earning_balance?: number
          investment_balance?: number
          referral_balance?: number
          commission_balance?: number
          bonus_balance?: number
          currency?: string
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          balance?: number
          deposit?: number
          withdrawable?: number
          total_earning?: number
          referral_earnings?: number
          today_earning?: number
          pending_withdraw?: number
          main_balance?: number
          deposit_balance?: number
          game_balance?: number
          earning_balance?: number
          investment_balance?: number
          referral_balance?: number
          commission_balance?: number
          bonus_balance?: number
          currency?: string
          created_at?: string
          updated_at?: string | null
        }
      }
      transactions: {
        Row: {
          id: string
          user_id: string
          type: 'deposit' | 'withdraw' | 'earn' | 'bonus' | 'invest' | 'game_win' | 'game_loss' | 'referral' | 'penalty' | 'transfer'
          amount: number
          status: 'success' | 'pending' | 'failed'
          description: string | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: 'deposit' | 'withdraw' | 'earn' | 'bonus' | 'invest' | 'game_win' | 'game_loss' | 'referral' | 'penalty' | 'transfer'
          amount: number
          status?: 'success' | 'pending' | 'failed'
          description?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: 'deposit' | 'withdraw' | 'earn' | 'bonus' | 'invest' | 'game_win' | 'game_loss' | 'referral' | 'penalty' | 'transfer'
          amount?: number
          status?: 'success' | 'pending' | 'failed'
          description?: string | null
          metadata?: Json | null
          created_at?: string
        }
      }
      tasks: {
        Row: {
            id: string
            title: string
            description: string | null
            reward: number
            sponsor_rate: number
            icon: string
            url: string | null
            type: 'social' | 'video' | 'app' | 'website'
            difficulty: 'Easy' | 'Medium' | 'Hard'
            frequency: 'once' | 'daily'
            is_active: boolean
            created_at: string
        }
        Insert: {
            id?: string
            title: string
            description?: string | null
            reward: number
            sponsor_rate?: number
            icon?: string
            url?: string | null
            type: 'social' | 'video' | 'app' | 'website'
            difficulty: 'Easy' | 'Medium' | 'Hard'
            frequency?: 'once' | 'daily'
            is_active?: boolean
            created_at?: string
        }
        Update: {
            id?: string
            title?: string
            description?: string | null
            reward?: number
            sponsor_rate?: number
            icon?: string
            url?: string | null
            type?: 'social' | 'video' | 'app' | 'website'
            difficulty?: 'Easy' | 'Medium' | 'Hard'
            frequency?: 'once' | 'daily'
            is_active?: boolean
            created_at?: string
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
      withdraw_requests: {
        Row: {
          id: string
          user_id: string
          amount: number
          method: string
          status: 'pending' | 'approved' | 'rejected'
          created_at: string
          processed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          amount: number
          method: string
          status?: 'pending' | 'approved' | 'rejected'
          created_at?: string
          processed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          amount?: number
          method?: string
          status?: 'pending' | 'approved' | 'rejected'
          created_at?: string
          processed_at?: string | null
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
          status: 'active' | 'completed' | 'cancelled'
          total_earned: number
          last_claim_at: string | null
          next_claim_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          plan_id: string
          plan_name: string
          amount: number
          daily_return: number
          total_profit_percent: number
          start_date?: string
          end_date: string
          status?: 'active' | 'completed' | 'cancelled'
          total_earned?: number
          last_claim_at?: string | null
          next_claim_at?: string
          created_at?: string
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
          status?: 'active' | 'completed' | 'cancelled'
          total_earned?: number
          last_claim_at?: string | null
          next_claim_at?: string
          created_at?: string
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
          details: string | null
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
          details?: string | null
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
          details?: string | null
          created_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          title: string
          message: string
          type: 'info' | 'success' | 'warning' | 'error'
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          message: string
          type?: 'info' | 'success' | 'warning' | 'error'
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          message?: string
          type?: 'info' | 'success' | 'warning' | 'error'
          is_read?: boolean
          created_at?: string
        }
      }
      referrals: {
        Row: {
          id: string
          referrer_id: string
          referred_id: string
          status: 'pending' | 'completed'
          earned: number
          created_at: string
        }
        Insert: {
          id?: string
          referrer_id: string
          referred_id: string
          status?: 'pending' | 'completed'
          earned?: number
          created_at?: string
        }
        Update: {
          id?: string
          referrer_id?: string
          referred_id?: string
          status?: 'pending' | 'completed'
          earned?: number
          created_at?: string
        }
      }
      ludo_cards: {
        Row: {
          id: string
          amount: number
          players: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          amount: number
          players?: number
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          amount?: number
          players?: number
          is_active?: boolean
          created_at?: string
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
          id: string
          user_id: string
          credential_id: string
          email_enc: string
          password_enc: string
          device_name: string | null
          last_used: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          credential_id: string
          email_enc: string
          password_enc: string
          device_name?: string | null
          last_used?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          credential_id?: string
          email_enc?: string
          password_enc?: string
          device_name?: string | null
          last_used?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      p2p_transfer_funds: {
        Args: {
          p_sender_id: string
          p_receiver_uid: number
          p_amount: number
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}
