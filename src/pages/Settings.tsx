import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Button } from '../components/ui/button'
import { Label } from '../components/ui/label'
import { User, Lock, AlertCircle, CheckCircle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert'

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
                    <CardTitle>Notifications</CardTitle>
                    <CardDescription>Test your device's push notification connection</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                            <div>
                                <h4 className="font-medium text-gray-900">Push Notifications</h4>
                                <p className="text-sm text-gray-500">Send a test alert to this device</p>
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={async () => {
                                    try {
                                        const res = await fetch('/api/send-push', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                                title: 'Test Notification',
                                                body: 'This is a test message from FM Logistics',
                                                url: '/settings'
                                            })
                                        })
                                        if (res.ok) {
                                            alert('Notification Sent! Check your status bar.')
                                        } else {
                                            const err = await res.json()
                                            alert('Failed to send: ' + (err.error || 'Unknown error'))
                                        }
                                    } catch (e: any) {
                                        alert('Error: ' + e.message)
                                    }
                                }}
                            >
                                Send Test
                            </Button>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                            <div>
                                <h4 className="font-medium text-gray-900">Push Notifications</h4>
                                <p className="text-sm text-gray-500">Send a test alert to this device</p>
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={async () => {
                                    alert('Lock your screen NOW! sending in 5 seconds...');
                                    setTimeout(async () => {
                                        try {
                                            await fetch('/api/send-push', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({
                                                    title: 'Background Test',
                                                    body: 'It works! You received this while the phone was locked.',
                                                    url: '/settings'
                                                })
                                            })
                                        } catch (e) {
                                            console.error(e)
                                        }
                                    }, 5000)
                                }}
                            >
                                Test with 5s Delay (Lock Screen)
                            </Button>
                        </div>
                        <p className="text-xs text-gray-400 px-4">
                            *If you don't receive notifications, check iPhone Settings {'>'} FM Logistics {'>'} Notifications.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div >
    )
}
