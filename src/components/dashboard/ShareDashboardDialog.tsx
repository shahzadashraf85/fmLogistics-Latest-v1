import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Alert, AlertDescription } from '../ui/alert'
import { Share2, Copy, Check, Link as LinkIcon } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'

export function ShareDashboardDialog() {
    const [isOpen, setIsOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [name, setName] = useState('')
    const [expiration, setExpiration] = useState('24') // hours
    const [generatedLink, setGeneratedLink] = useState<string | null>(null)
    const [copied, setCopied] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleGenerate = async () => {
        setLoading(true)
        setError(null)
        setGeneratedLink(null)

        try {
            const { data, error } = await supabase.rpc('create_dashboard_share', {
                share_name: name || 'Untitled Share',
                expiration_hours: parseInt(expiration)
            })

            if (error) throw error

            const link = `${window.location.origin}/shared/${data}`
            setGeneratedLink(link)
        } catch (err: any) {
            console.error('Error generating link:', err)
            setError(err.message || 'Failed to generate link')
        } finally {
            setLoading(false)
        }
    }

    const copyToClipboard = () => {
        if (generatedLink) {
            navigator.clipboard.writeText(generatedLink)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        }
    }

    const resetState = () => {
        setGeneratedLink(null)
        setName('')
        setExpiration('24')
        setError(null)
        setCopied(false)
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            setIsOpen(open)
            if (!open) resetState()
        }}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                    <Share2 className="h-4 w-4" />
                    Share
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Share Dashboard</DialogTitle>
                    <DialogDescription>
                        Create a secure, read-only link to share the dashboard.
                    </DialogDescription>
                </DialogHeader>

                {!generatedLink ? (
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Link Name (Optional)</Label>
                            <Input
                                id="name"
                                placeholder="e.g., Client Review"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="expiration">Expiration</Label>
                            <select
                                id="expiration"
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                value={expiration}
                                onChange={(e) => setExpiration(e.target.value)}
                            >
                                <option value="24">24 Hours</option>
                                <option value="168">7 Days</option>
                                <option value="720">30 Days</option>
                            </select>
                        </div>
                        {error && (
                            <Alert variant="destructive">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}
                        <Button onClick={handleGenerate} disabled={loading} className="w-full">
                            {loading ? 'Generating...' : 'Generate Link'}
                        </Button>
                    </div>
                ) : (
                    <div className="grid gap-4 py-4">
                        <div className="flex items-center space-x-2">
                            <div className="grid flex-1 gap-2">
                                <Label htmlFor="link" className="sr-only">
                                    Link
                                </Label>
                                <Input
                                    id="link"
                                    defaultValue={generatedLink}
                                    readOnly
                                    className="h-9"
                                />
                            </div>
                            <Button type="submit" size="sm" className="px-3" onClick={copyToClipboard}>
                                <span className="sr-only">Copy</span>
                                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            </Button>
                        </div>
                        <Alert className="bg-muted/50">
                            <LinkIcon className="h-4 w-4" />
                            <AlertDescription className="text-xs">
                                This link grants read-only access until it expires. Anyone with the link can view the dashboard.
                            </AlertDescription>
                        </Alert>
                        <Button variant="ghost" onClick={resetState} className="w-full text-xs">
                            Generate New Link
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
