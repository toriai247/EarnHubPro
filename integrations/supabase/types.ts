
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
          is_account_active: boolean
          is_dealer: boolean
          role: 'admin' | 'moderator' | 'user' | 'staff'
          admin_notes: string | null
          risk_score: number
          rank_1: string
          xp_1: number
          phone_1: string | null
          socials_1: Json | null
          badges_1: string[] | null
          sec_2fa_1: boolean
          admin_user: boolean
          theme_id: string | null
          created_at: string
        }
        Insert: {
          id: string
          user_uid?: number
          email_1: string
          name_1?: string | null
          avatar_1?: string | null
          bio_1?: string | null
          level_1?: number
          ref_code_1: string
          referred_by?: string | null
          is_kyc_1?: boolean
          is_withdraw_blocked?: boolean
          is_suspended?: boolean
          is_account_active?: boolean
          is_dealer?: boolean
          role?: 'admin' | 'moderator' | 'user' | 'staff'
          admin_notes?: string | null
          risk_score?: number
          rank_1?: string
          xp_1?: number
          phone_1?: string | null
          socials_1?: Json | null
          badges_1?: string[] | null
          sec_2fa_1?: boolean
          admin_user?: boolean
          theme_id?: string | null
          created_at?: string
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
          is_account_active?: boolean
          is_dealer?: boolean
          role?: 'admin' | 'moderator' | 'user' | 'staff'
          admin_notes?: string | null
          risk_score?: number
          rank_1?: string
          xp_1?: number
          phone_1?: string | null
          socials_1?: Json | null
          badges_1?: string[] | null
          sec_2fa_1?: boolean
          admin_user?: boolean
          theme_id?: string | null
          created_at?: string
        }
      }
      transactions: {
        Row: {
          id: string
          user_id: string
          type: 'DEPOSIT' | 'WITHDRAW' | 'BET_PLACE' | 'BET_WIN' | 'BET_LOSS' | 'TASK_EARN' | 'BONUS_ADD' | 'COMMISSION_ADD' | 'TRANSFER'
          from_wallet: string | null
          to_wallet: string | null
          amount: number
          balance_before: number | null
          balance_after: number | null
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: 'DEPOSIT' | 'WITHDRAW' | 'BET_PLACE' | 'BET_WIN' | 'BET_LOSS' | 'TASK_EARN' | 'BONUS_ADD' | 'COMMISSION_ADD' | 'TRANSFER'
          from_wallet?: string | null
          to_wallet?: string | null
          amount: number
          balance_before?: number | null
          balance_after?: number | null
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: 'DEPOSIT' | 'WITHDRAW' | 'BET_PLACE' | 'BET_WIN' | 'BET_LOSS' | 'TASK_EARN' | 'BONUS_ADD' | 'COMMISSION_ADD' | 'TRANSFER'
          from_wallet?: string | null
          to_wallet?: string | null
          amount?: number
          balance_before?: number | null
          balance_after?: number | null
          description?: string | null
          created_at?: string
        }
      }
      wallets: {
        Row: {
          id: string
          user_id: string
          main_balance: number
          game_balance: number
          deposit_balance: number
          earning_balance: number
          bonus_balance: number
          referral_balance: number
          commission_balance: number
          balance: number
          withdrawable: number
          deposit: number
          total_earning: number
          today_earning: number
          pending_withdraw: number
          referral_earnings: number
          currency: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          main_balance?: number
          game_balance?: number
          deposit_balance?: number
          earning_balance?: number
          bonus_balance?: number
          referral_balance?: number
          commission_balance?: number
          balance?: number
          withdrawable?: number
          deposit?: number
          total_earning?: number
          today_earning?: number
          pending_withdraw?: number
          referral_earnings?: number
          currency?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          main_balance?: number
          game_balance?: number
          deposit_balance?: number
          earning_balance?: number
          bonus_balance?: number
          referral_balance?: number
          commission_balance?: number
          balance?: number
          withdrawable?: number
          deposit?: number
          total_earning?: number
          today_earning?: number
          pending_withdraw?: number
          referral_earnings?: number
          currency?: string | null
          updated_at?: string
        }
      }
    }
  }
}
