import { useAuth } from '../context/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Clock, LogOut } from 'lucide-react'

export default function Pending() {
    const { signOut } = useAuth()

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yellow-50 via-white to-orange-50 p-4">
            <Card className="w-full max-w-md shadow-xl animate-in">
                <CardHeader className="text-center space-y-2">
                    <div className="mx-auto h-16 w-16 rounded-full bg-yellow-100 flex items-center justify-center mb-2">
                        <Clock className="h-8 w-8 text-yellow-600" />
                    </div>
                    <CardTitle className="text-2xl">Account Pending Approval</CardTitle>
                    <CardDescription>
                        Your account is currently awaiting admin approval
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200">
                        <p className="text-sm text-yellow-800">
                            An administrator will review your account shortly. You'll receive access once approved.
                        </p>
                    </div>
                    <Button onClick={signOut} variant="outline" className="w-full">
                        <LogOut className="mr-2 h-4 w-4" />
                        Logout
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}
