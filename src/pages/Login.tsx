import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Button } from '../components/ui/button'
import { LogIn, UserPlus } from 'lucide-react'

export default function Login() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [isSignUp, setIsSignUp] = useState(false)
    const [msg, setMsg] = useState('')
    const navigate = useNavigate()
    const { session } = useAuth()

    useEffect(() => {
        if (session) {
            navigate('/')
        }
    }, [session, navigate])

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setMsg('')

        try {
            if (isSignUp) {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                })
                if (error) throw error
                setMsg('Signup successful! Check your email (if enabled) or sign in.')
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                })
                if (error) throw error
            }
        } catch (error: any) {
            setMsg(error.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
            <Card className="w-full max-w-md shadow-xl animate-in">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-3xl font-bold text-center">
                        {isSignUp ? 'Create Account' : 'Welcome Back'}
                    </CardTitle>
                    <CardDescription className="text-center">
                        {isSignUp
                            ? 'Sign up to get started with your account'
                            : 'Enter your credentials to access your account'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {msg && (
                        <div className={`mb-4 p-3 rounded-md text-sm ${msg.includes('success')
                            ? 'bg-green-50 text-green-800 border border-green-200'
                            : 'bg-red-50 text-red-800 border border-red-200'
                            }`}>
                            {msg}
                        </div>
                    )}
                    <form onSubmit={handleAuth} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Email</label>
                            <Input
                                type="email"
                                placeholder="name@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Password</label>
                            <Input
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? (
                                'Processing...'
                            ) : (
                                <>
                                    {isSignUp ? <UserPlus className="mr-2 h-4 w-4" /> : <LogIn className="mr-2 h-4 w-4" />}
                                    {isSignUp ? 'Sign Up' : 'Sign In'}
                                </>
                            )}
                        </Button>
                    </form>
                    <div className="mt-4 text-center">
                        <Button
                            variant="ghost"
                            onClick={() => setIsSignUp(!isSignUp)}
                            className="text-sm"
                        >
                            {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
