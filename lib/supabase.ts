import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          username: string
          password: string
          role: string
          created_at: string
        }
      }
      products: {
        Row: {
          id: string
          name: string
          sku: string
          category_id: string
          brand_id: string
          cost_price: number
          selling_price: number
          stock_quantity: number
          min_stock_level: number
          description: string
          created_at: string
        }
      }
      customers: {
        Row: {
          id: string
          name: string
          phone: string
          email: string
          address: string
          credit_balance: number
          created_at: string
        }
      }
      sales: {
        Row: {
          id: string
          sale_number: string
          customer_id: string
          total_amount: number
          paid_amount: number
          change_amount: number
          payment_method: string
          status: string
          sale_date: string
          created_by: string
        }
      }
    }
  }
}
