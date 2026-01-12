import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { User, Mail, Calendar, Save, Lock, Eye, EyeOff } from 'lucide-react'

export default function ProfilePage() {
    const { profile, refreshProfile } = useAuth()
    const [name, setName] = useState('')

    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [updating, setUpdating] = useState(false)
    const [updatingPassword, setUpdatingPassword] = useState(false)
    const [msg, setMsg] = useState('')
    const [passwordMsg, setPasswordMsg] = useState('')

    useEffect(() => {
        if (profile) setName(profile.full_name || '')
    }, [profile])

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!profile) return
        setUpdating(true)
        setMsg('')
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ full_name: name })
                .eq('id', profile.id)
            if (error) throw error
            await refreshProfile()
            setMsg('Profile updated successfully')
            setTimeout(() => setMsg(''), 3000)
        } catch (error: any) {
            setMsg(error.message)
        } finally {
            setUpdating(false)
        }
    }

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault()
        setUpdatingPassword(true)
        setPasswordMsg('')

        // Validate passwords match
        if (newPassword !== confirmPassword) {
            setPasswordMsg('New passwords do not match')
            setUpdatingPassword(false)
            return
        }

        // Validate password length
        if (newPassword.length < 6) {
            setPasswordMsg('Password must be at least 6 characters')
            setUpdatingPassword(false)
            return
        }

        try {
            const { error } = await supabase.auth.updateUser({
                password: newPassword
            })

            if (error) throw error

            setPasswordMsg('Password updated successfully')

            setNewPassword('')
            setConfirmPassword('')
            setTimeout(() => setPasswordMsg(''), 3000)
        } catch (error: any) {
            setPasswordMsg(error.message)
        } finally {
            setUpdatingPassword(false)
        }
    }

    if (!profile) return null

    return (
        <div className="p-6 max-w-4xl mx-auto animate-in space-y-6">
            {/* Profile Information Card */}
            <Card className="shadow-lg">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <CardTitle>Profile Information</CardTitle>
                            <CardDescription>Update your personal details</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    {msg && (
                        <div className={`p-3 rounded-md text-sm ${msg.includes('success')
                            ? 'bg-green-50 text-green-800 border border-green-200'
                            : 'bg-red-50 text-red-800 border border-red-200'
                            }`}>
                            {msg}
                        </div>
                    )}

                    <form onSubmit={handleUpdateProfile} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium flex items-center gap-2">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                Email Address
                            </label>
                            <Input
                                value={profile.email}
                                disabled
                                className="bg-muted cursor-not-allowed"
                            />
                            <p className="text-xs text-muted-foreground">
                                Email cannot be changed
                            </p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                Full Name
                            </label>
                            <Input
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="Enter your full name"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Role</label>
                                <div>
                                    <Badge variant={profile.role === 'admin' ? 'default' : 'secondary'}>
                                        {profile.role === 'admin' ? '👑 Admin' : '👤 Employee'}
                                    </Badge>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Status</label>
                                <div>
                                    <Badge variant={profile.status === 'active' ? 'success' : 'secondary'}>
                                        {profile.status === 'active' ? '✓ Active' : '⏳ Pending'}
                                    </Badge>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                Member Since
                            </label>
                            <Input
                                value={new Date(profile.created_at).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                })}
                                disabled
                                className="bg-muted cursor-not-allowed"
                            />
                        </div>

                        <Button type="submit" disabled={updating} className="w-full">
                            {updating ? (
                                'Saving...'
                            ) : (
                                <>
                                    <Save className="mr-2 h-4 w-4" />
                                    Save Changes
                                </>
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* Change Password Card */}
            <Card className="shadow-lg">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center">
                            <Lock className="h-6 w-6 text-orange-600" />
                        </div>
                        <div>
                            <CardTitle>Change Password</CardTitle>
                            <CardDescription>Update your account password</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    {passwordMsg && (
                        <div className={`p-3 rounded-md text-sm ${passwordMsg.includes('success')
                            ? 'bg-green-50 text-green-800 border border-green-200'
                            : 'bg-red-50 text-red-800 border border-red-200'
                            }`}>
                            {passwordMsg}
                        </div>
                    )}

                    <form onSubmit={handleUpdatePassword} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">New Password</label>
                            <div className="relative">
                                <Input
                                    type={showPassword ? 'text' : 'password'}
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                    placeholder="Enter new password"
                                    required
                                    minLength={6}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Must be at least 6 characters
                            </p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Confirm New Password</label>
                            <Input
                                type={showPassword ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                placeholder="Confirm new password"
                                required
                                minLength={6}
                            />
                        </div>

                        <Button type="submit" disabled={updatingPassword} className="w-full" variant="secondary">
                            {updatingPassword ? (
                                'Updating...'
                            ) : (
                                <>
                                    <Lock className="mr-2 h-4 w-4" />
                                    Update Password
                                </>
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
