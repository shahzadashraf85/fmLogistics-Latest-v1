import { createContext, useContext, useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'

export type Profile = {
    id: string
    email: string
    full_name: string | null
    contact_number?: string | null
    role: 'admin' | 'employee'
    status: 'pending' | 'active'
    created_at: string
}

type AuthContextType = {
    session: Session | null
    user: User | null
    profile: Profile | null
    loading: boolean
    signOut: () => Promise<void>
    refreshProfile: () => Promise<void>
    isAdmin: boolean
    isActive: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [session, setSession] = useState<Session | null>(null)
    const [user, setUser] = useState<User | null>(null)
    const [profile, setProfile] = useState<Profile | null>(null)
    const [loading, setLoading] = useState(true)

    // Helper to get profile, but NOT blocking
    const fetchProfile = async (userId: string) => {
        const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
        if (data) setProfile(data as Profile)
    }

    useEffect(() => {
        // 1. Check active session immediately
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session)
            setUser(session?.user ?? null)

            // IMMEDIATE UNBLOCK: Don't wait for profile
            setLoading(false)

            // Background fetch
            if (session?.user) {
                fetchProfile(session.user.id)
            }
        })

        // 2. Listen for changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session)
            setUser(session?.user ?? null)
            setLoading(false)

            if (session?.user) {
                fetchProfile(session.user.id)
            } else {
                setProfile(null)
            }
        })

        return () => subscription.unsubscribe()
    }, [])

    const signOut = async () => {
        await supabase.auth.signOut()
        setSession(null)
        setUser(null)
        setProfile(null)
    }

    const refreshProfile = async () => {
        if (user) await fetchProfile(user.id)
    }

    // Default to safe values if profile isn't loaded yet
    const isAdmin = profile ? profile.role === 'admin' : false
    // Assume active if logged in but profile loading, to prevent blocking
    const isActive = profile ? profile.status === 'active' : true

    const value = {
        session,
        user,
        profile,
        loading,
        signOut,
        refreshProfile,
        isAdmin,
        isActive
    }

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}
