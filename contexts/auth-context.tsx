"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import type { AuthChangeEvent, Session, User as SupabaseUser } from "@supabase/supabase-js"

// This interface combines the Supabase user with your custom profile data
interface User extends SupabaseUser {
  username: string
  role: string
}

interface AuthContextType {
  user: User | null
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // This listener handles all authentication events (login, logout, session refresh)
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        setLoading(true)
        if (session?.user) {
          // If a user is logged in, fetch their profile from your public.users table
          const { data: profile } = await supabase
            .from("users")
            .select("id, username, role")
            .eq("id", session.user.id)
            .single()

          // Create a complete user object with all necessary details
          setUser({
            ...session.user,
            username: profile?.username || "N/A",
            role: profile?.role || "user",
          })
        } else {
          setUser(null)
        }
        setLoading(false)
      },
    )

    // Cleanup the listener when the component unmounts
    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [])

  const login = async (username: string, password: string) => {
    // First, find the user's email address using their unique username
    const { data: userRecord, error: userError } = await supabase
        .from('users')
        .select('email')
        .eq('username', username)
        .single();
    
    if (userError || !userRecord) {
        return { success: false, error: 'Invalid username or password' };
    }

    // Now, use the found email to sign in with Supabase's secure method
    const { error } = await supabase.auth.signInWithPassword({
      email: userRecord.email,
      password: password,
    })

    if (error) {
      return { success: false, error: error.message }
    }
    return { success: true }
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  return <AuthContext.Provider value={{ user, login, logout, loading }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
