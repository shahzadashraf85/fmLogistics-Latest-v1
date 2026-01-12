import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Button } from '../components/ui/button'
import { Label } from '../components/ui/label'
import { User, Lock, AlertCircle, CheckCircle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert'
import { toast } from 'sonner'

export default function Settings() {
    const { profile } = useAuth()
    const [fullName, setFullName] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    useEffect(() => {
        if (profile) {
            setFullName(profile.full_name || '')
        }
    }, [profile])

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setMessage(null)

        try {
            let passwordUpdated = false

            // Update Name
            if (fullName !== profile?.full_name) {
                const { error: profileError } = await supabase
                    .from('profiles')
                    .update({ full_name: fullName })
                    .eq('id', profile?.id)

                if (profileError) throw profileError
            }

            // Update Password
            if (password) {
                if (password.length < 6) {
                    throw new Error('Password must be at least 6 characters')
                }
                if (password !== confirmPassword) {
                    throw new Error('Passwords do not match')
                }

                const { error: passwordError } = await supabase.auth.updateUser({
                    password: password
                })

                if (passwordError) throw passwordError
                passwordUpdated = true
            }

            setMessage({
                type: 'success',
                text: passwordUpdated
                    ? 'Profile and password updated successfully'
                    : 'Profile updated successfully'
            })

            if (passwordUpdated) {
                setPassword('')
                setConfirmPassword('')
            }
        } catch (error: any) {
            console.error('Error updating profile:', error)
            setMessage({ type: 'error', text: error.message || 'Failed to update profile' })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="p-6 max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-xl bg-gray-900 flex items-center justify-center">
                    <User className="h-6 w-6 text-white" />
                </div>
                Account Settings
            </h1>

            <Card>
                <CardHeader>
                    <CardTitle>Profile Information</CardTitle>
                    <CardDescription>Update your personal details and password</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleUpdateProfile} className="space-y-6">
                        {message && (
                            <Alert variant={message.type === 'error' ? 'destructive' : 'default'} className={message.type === 'success' ? 'bg-green-50 text-green-800 border-green-200' : ''}>
                                {message.type === 'error' ? <AlertCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                                <AlertTitle>{message.type === 'error' ? 'Error' : 'Success'}</AlertTitle>
                                <AlertDescription>{message.text}</AlertDescription>
                            </Alert>
                        )}

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email Address</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={profile?.email || ''}
                                    disabled
                                    className="bg-gray-100 text-gray-500"
                                />
                                <p className="text-xs text-gray-500">Email cannot be changed</p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="fullName">Full Name</Label>
                                <div className="relative">
                                    <User className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                                    <Input
                                        id="fullName"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        className="pl-9"
                                        placeholder="John Doe"
                                    />
                                </div>
                            </div>

                            <div className="pt-4 border-t">
                                <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                                    <Lock className="h-4 w-4" /> Change Password
                                </h3>

                                <div className="grid gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="password">New Password</Label>
                                        <Input
                                            id="password"
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="Leave blank to keep current"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="confirmPassword">Confirm New Password</Label>
                                        <Input
                                            id="confirmPassword"
                                            type="password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="Confirm new password"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end pt-4">
                            <Button type="submit" disabled={loading}>
                                {loading ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>


            <Card className="mt-6">
                <CardHeader>
                    <CardTitle>Push Notifications</CardTitle>
                    <CardDescription>Receive real-time updates when job status changes</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                </svg>
                            </div>
                            <div>
                                <h4 className="font-medium text-gray-900">Mobile Notifications</h4>
                                <p className="text-sm text-gray-500">Get notified on this device</p>
                            </div>
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={async () => {
                                try {
                                    toast.info('Enabling notifications...')
                                    const { registerPushNotifications } = await import('../lib/pushNotifications');
                                    if (profile?.id) {
                                        await registerPushNotifications(profile.id);
                                        toast.success('Notifications enabled! You will receive alerts when job status changes.')
                                    } else {
                                        toast.error('Error: Please log out and log back in.')
                                    }
                                } catch (error: any) {
                                    toast.error('Failed to enable notifications: ' + error.message)
                                }
                            }}
                        >
                            Enable
                        </Button>
                    </div>
                    <p className="text-xs text-gray-400 mt-4 px-1">
                        Note: On iPhone, you must add this app to your Home Screen for notifications to work.
                        Tap Share → Add to Home Screen, then open from the home screen icon.
                    </p>
                </CardContent>
            </Card>
        </div >
    )
}
