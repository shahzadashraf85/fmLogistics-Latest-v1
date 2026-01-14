import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Check, AlertTriangle, Loader2, X, MapPin, Sparkles, UserPlus } from 'lucide-react'
import { Badge } from '../components/ui/badge'
import { extractJobsWithGemini, type ExtractedJob } from '../lib/geminiService'
import { supabase } from '../lib/supabaseClient'
import { toast } from 'sonner'

interface JobDraft extends ExtractedJob {
    temp_id: string
    issues: string[]
    status: 'pending' | 'saving'
}

interface SavedJob {
    id: string
    job_date: string
    lot_number: string
    company_name: string
    address: string
    assets: string
    comments: string
    contact_name: string
    contact_detail: string
    assigned_users?: { full_name: string }[]
}

interface UserProfile {
    id: string
    full_name: string
    role: string
}

export default function ImportJobs() {
    const [rawText, setRawText] = useState('')
    const [processing, setProcessing] = useState(false)
    const [jobs, setJobs] = useState<JobDraft[]>([])
    const [showPreview, setShowPreview] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0])

    // Database State
    const [savedJobs, setSavedJobs] = useState<SavedJob[]>([])
    const [loadingList, setLoadingList] = useState(false)
    const [users, setUsers] = useState<UserProfile[]>([])

    // Assignment Modal State
    const [assignJobId, setAssignJobId] = useState<string | null>(null)
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
    const [isAssigning, setIsAssigning] = useState(false)

    // Initialization
    useEffect(() => {
        fetchSavedJobs()
        fetchUsers()
    }, [selectedDate])

    const fetchSavedJobs = async () => {
        setLoadingList(true)

        // 1. Fetch Jobs
        let query = supabase
            .from('jobs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100)

        if (selectedDate) {
            query = query.eq('job_date', selectedDate)
        }

        const { data: jobsData, error: jobsError } = await query

        if (jobsError || !jobsData) {
            console.error("Error fetching jobs:", jobsError)
            setLoadingList(false)
            return
        }

        // 2. Fetch Assignments manually (Bypasses join issues)
        const jobIds = jobsData.map(j => j.id)
        let assignmentsData: any[] = []

        if (jobIds.length > 0) {
            const { data } = await supabase
                .from('job_assignments')
                .select('job_id, user_id')
                .in('job_id', jobIds)
            if (data) assignmentsData = data
        }

        // 3. Fetch User Profiles manually
        let userMap: Record<string, string> = {}
        if (assignmentsData.length > 0) {
            const userIds = [...new Set(assignmentsData.map(a => a.user_id))]
            const { data: profilesData } = await supabase
                .from('profiles')
                .select('id, full_name')
                .in('id', userIds)

            if (profilesData) {
                profilesData.forEach(p => {
                    userMap[p.id] = p.full_name || 'Unknown'
                })
            }
        }

        // 4. Merge Data in Memory
        const formatted = jobsData.map(job => {
            const jobAssignments = assignmentsData.filter(a => a.job_id === job.id)
            const assignedUsers = jobAssignments.map(ja => ({
                full_name: userMap[ja.user_id] || 'Loading...'
            }))

            return {
                ...job,
                assigned_users: assignedUsers
            }
        })

        setSavedJobs(formatted)
        setLoadingList(false)
    }

    const fetchUsers = async () => {
        const { data } = await supabase
            .from('profiles')
            .select('id, full_name, role')
            .eq('status', 'active')
            .order('full_name')

        if (data) setUsers(data)
    }

    const handleProcess = async () => {
        setProcessing(true)
        setError(null)
        try {
            const extractedJobs = await extractJobsWithGemini(rawText)
            const jobDrafts: JobDraft[] = extractedJobs.map((job, index) => {
                const issues: string[] = []

                // Auto-fill date if missing
                if (!job.date) {
                    job.date = new Date().toLocaleDateString('en-US');
                }

                // Validate if it's still invalid (unlikely now)
                if (!job.date) issues.push('missing_date')
                if (!job.lot_number) issues.push('missing_lot')

                return { ...job, temp_id: `J${index + Date.now()}`, issues, status: 'pending' }
            })
            setJobs(jobDrafts)
            setShowPreview(true)
        } catch (err: any) {
            setError(err instanceof Error ? err.message : 'Failed to extract jobs.')
        } finally {
            setProcessing(false)
        }
    }

    // INSTANT ACTION: Save single row
    const handleApproveRow = async (job: JobDraft) => {
        try {
            // Optimistic update
            setJobs(prev => prev.map(j => j.temp_id === job.temp_id ? { ...j, status: 'saving' } : j))

            const { data: { user } } = await supabase.auth.getUser()

            const dbRow = {
                job_date: job.date ? new Date(job.date).toISOString().split('T')[0] : null,
                lot_number: job.lot_number,
                created_by: user?.id,
                company_name: job.company_name || null,
                address: job.address || null,
                assets: job.assets || null,
                comments: job.comments || null,
                contact_name: job.contact_name || null,
                contact_detail: job.contact_detail || null
            }

            const { error } = await supabase.from('jobs').insert(dbRow)
            if (error) throw error

            // Remove from draft list
            setJobs(prev => prev.filter(j => j.temp_id !== job.temp_id))

            // Refresh saved list
            fetchSavedJobs()

        } catch (err: any) {
            alert("Error saving job: " + err.message)
            setJobs(prev => prev.map(j => j.temp_id === job.temp_id ? { ...j, status: 'pending' } : j))
        }
    }

    const handleRejectRow = (id: string) => {
        setJobs(prev => prev.filter(j => j.temp_id !== id))
    }

    // Bulk save all remaining
    const handleApproveAll = async () => {
        const pending = jobs.filter(j => j.status === 'pending')
        if (pending.length === 0) return

        if (!confirm(`Are you sure you want to approve and import all ${pending.length} remaining jobs?`)) return

        setProcessing(true)
        for (const job of pending) {
            await handleApproveRow(job)
        }
        setProcessing(false)
        setShowPreview(false)
        setRawText('')
    }

    // Open modal and pre-fill selections
    const openAssignModal = async (jobId: string) => {
        setAssignJobId(jobId)
        setSelectedUserIds([]) // clear first

        // Fetch current assignments for this job to pre-fill
        const { data } = await supabase
            .from('job_assignments')
            .select('user_id')
            .eq('job_id', jobId)

        if (data) {
            setSelectedUserIds(data.map(a => a.user_id))
        }
    }

    const handleAssign = async () => {
        console.log("Handle Assign Triggered", { assignJobId, selectedUserIds })
        if (!assignJobId) return
        setIsAssigning(true)
        try {
            // 1. Get current assignments
            const { data: current } = await supabase
                .from('job_assignments')
                .select('user_id')
                .eq('job_id', assignJobId)

            const currentIds = current?.map(c => c.user_id) || []
            console.log("Current Assignments:", currentIds)

            // 2. Diff
            const toAdd = selectedUserIds.filter(id => !currentIds.includes(id))
            const toRemove = currentIds.filter(id => !selectedUserIds.includes(id))

            console.log("Diff:", { toAdd, toRemove })

            // 3. Sync
            if (toRemove.length > 0) {
                await supabase.from('job_assignments').delete().eq('job_id', assignJobId).in('user_id', toRemove)
            }

            if (toAdd.length > 0) {
                const inserts = toAdd.map(uid => ({ job_id: assignJobId, user_id: uid }))
                const { error } = await supabase.from('job_assignments').insert(inserts)
                if (error) throw error

                // Send Notifications to newly assigned users
                const job = savedJobs.find(j => j.id === assignJobId)
                if (job) {
                    toast.info(`Sending ${toAdd.length} notifications...`)

                    const promises = toAdd.map(userId => {
                        console.log(`Sending assignment notification to ${userId}`)

                        const shortAddress = job.address ? job.address.split(',')[0] : '';
                        const notificationBody = `You have been assigned to ${job.company_name || 'a new job'}${shortAddress ? ' at ' + shortAddress : ''}`;

                        return fetch('/api/send-push', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                title: 'New Job Assigned',
                                body: notificationBody,
                                url: '/active-jobs',
                                targetUserId: userId
                            })
                        })
                            .then(res => res.json())
                            .then(data => {
                                console.log('Push API Response:', data);
                                if (data.sent === 0) toast.warning(`User ${userId.slice(0, 4)}... has no active push subscription.`);
                            })
                            .catch(err => {
                                console.error("Failed to send assignment push:", err);
                                toast.error("Push failed: " + err.message);
                            })
                    })

                    await Promise.all(promises);
                }
            } else {
                console.log("No new users to assign, skipping notification")
            }

            setAssignJobId(null)
            setSelectedUserIds([])
            fetchSavedJobs()
            toast.success("Assignment updated")
        } catch (err: any) {
            console.error("Assignment Error:", err)
            alert('Assignment update failed: ' + err.message)
        } finally {
            setIsAssigning(false)
        }
    }

    const handleUnassignAll = async () => {
        if (!selectedDate) return
        if (!confirm(`Are you sure you want to REMOVE ALL assignments for ${selectedDate}? This cannot be undone.`)) return

        setLoadingList(true)
        try {
            // Find jobs for this date
            const { data: jobs } = await supabase.from('jobs').select('id').eq('job_date', selectedDate)

            if (jobs && jobs.length > 0) {
                const jobIds = jobs.map(j => j.id)
                const { error } = await supabase.from('job_assignments').delete().in('job_id', jobIds)
                if (error) throw error
                toast.success(`Unassigned ${jobs.length} jobs for ${selectedDate}`)
                fetchSavedJobs()
            } else {
                toast.info("No jobs found for this date")
            }
        } catch (err: any) {
            alert("Error: " + err.message)
        } finally {
            setLoadingList(false)
        }
    }

    const toggleUserSelection = (userId: string) => {
        setSelectedUserIds(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId])
    }

    return (
        <div className="p-6 max-w-[1600px] mx-auto space-y-8 pb-32">

            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-2">
                        <Sparkles className="h-8 w-8 text-purple-600" />
                        Import Jobs
                    </h1>
                    <p className="text-muted-foreground">Extract &rarr; Approve &rarr; Assign</p>
                </div>
            </div>

            {/* INPUT AREA */}
            {!showPreview ? (
                <Card className="border-2 border-dashed shadow-sm">
                    <CardHeader>
                        <CardTitle>Step 1: Paste Email Data</CardTitle>
                        <CardDescription>Paste the messy job text below. The AI will clean and organize it.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {error && (
                            <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg flex gap-2 items-center">
                                <AlertTriangle className="h-5 w-5" /> {error}
                            </div>
                        )}
                        <textarea
                            className="flex min-h-[300px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 font-mono"
                            placeholder="Paste unstructured text here..."
                            value={rawText}
                            onChange={(e) => setRawText(e.target.value)}
                        />
                    </CardContent>
                    <CardFooter>
                        <Button onClick={handleProcess} disabled={!rawText || processing} size="lg" className="w-full">
                            {processing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</> : <><Sparkles className="mr-2 h-4 w-4" /> Extract Data</>}
                        </Button>
                    </CardFooter>
                </Card>
            ) : (
                /* PREVIEW & APPROVE AREA */
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                    <div className="flex justify-between items-center bg-blue-50 p-4 rounded-lg border border-blue-100">
                        <div>
                            <h2 className="text-xl font-bold text-blue-900">Step 2: Review & Approve ({jobs.length})</h2>
                            <p className="text-sm text-blue-700">Check the data below. Click <Check className="inline h-4 w-4 bg-green-100 p-0.5 rounded text-green-700" /> to save to database instantly.</p>
                        </div>
                        <div className="space-x-2">
                            <Button variant="outline" onClick={() => setShowPreview(false)}>Back</Button>
                            <Button onClick={handleApproveAll} variant="default">Approve All Remaining</Button>
                        </div>
                    </div>

                    <div className="border rounded-lg bg-white shadow-sm overflow-x-auto">
                        <table className="w-full text-sm border-collapse">
                            <thead className="bg-gray-100 text-gray-700">
                                <tr>
                                    <th className="p-3 text-left border-b w-[100px]">Date</th>
                                    <th className="p-3 text-left border-b w-[100px]">Lot #</th>
                                    <th className="p-3 text-left border-b w-[200px]">Company</th>
                                    <th className="p-3 text-left border-b w-[250px]">Address</th>
                                    <th className="p-3 text-left border-b w-[250px]">Assets</th>
                                    <th className="p-3 text-left border-b w-[200px]">Comments</th>
                                    <th className="p-3 text-left border-b w-[200px]">Contact</th>
                                    <th className="p-3 text-right border-b w-[100px] sticky right-0 bg-gray-100">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {jobs.map((job) => (
                                    <tr key={job.temp_id} className="hover:bg-gray-50 group">
                                        <td className="p-3 align-top whitespace-nowrap font-mono">{job.date}</td>
                                        <td className="p-3 align-top font-bold text-blue-600">{job.lot_number}</td>
                                        <td className="p-3 align-top font-medium">{job.company_name}</td>
                                        <td className="p-3 align-top text-xs text-gray-600">{job.address}</td>
                                        <td className="p-3 align-top text-xs">{job.assets}</td>
                                        <td className="p-3 align-top text-xs italic text-gray-500">{job.comments}</td>
                                        <td className="p-3 align-top text-xs">
                                            <div className="font-semibold">{job.contact_name}</div>
                                            <div className="text-gray-500">{job.contact_detail}</div>
                                        </td>
                                        <td className="p-3 align-top text-right sticky right-0 bg-white group-hover:bg-gray-50">
                                            {job.status === 'saving' ? (
                                                <Loader2 className="h-5 w-5 animate-spin text-blue-500 ml-auto" />
                                            ) : (
                                                <div className="flex justify-end gap-2">
                                                    <Button size="icon" variant="outline" className="h-8 w-8 text-green-600 border-green-200 hover:bg-green-100" onClick={() => handleApproveRow(job)} title="Approve & Save">
                                                        <Check className="h-4 w-4" />
                                                    </Button>
                                                    <Button size="icon" variant="outline" className="h-8 w-8 text-red-600 border-red-200 hover:bg-red-100" onClick={() => handleRejectRow(job.temp_id)} title="Discard">
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {jobs.length === 0 && (
                                    <tr><td colSpan={8} className="p-8 text-center text-gray-400">All filtered jobs approved!</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* SAVED JOBS LIST */}
            <div className="space-y-4 pt-10 border-t-2 border-dashed">
                <div className="flex justify-between items-end flex-wrap gap-4">
                    <div>
                        <h2 className="text-2xl font-bold">Imported Jobs (Database)</h2>
                        <p className="text-muted-foreground">Assign these jobs to employees</p>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="flex items-center space-x-2 bg-white p-1 rounded-lg border">
                            <span className="text-xs font-medium pl-2 text-gray-500">Filter Date:</span>
                            <input
                                type="date"
                                className="border-none text-sm focus:ring-0"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                            />
                            {selectedDate && (
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSelectedDate('')}>
                                    <X className="h-3 w-3" />
                                </Button>
                            )}
                        </div>

                        <Button variant="outline" size="sm" onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}>
                            Today
                        </Button>

                        <Button variant="outline" size="sm" onClick={fetchSavedJobs} disabled={loadingList}>
                            {loadingList ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Refresh'}
                        </Button>

                        {selectedDate && (
                            <Button variant="destructive" size="sm" onClick={handleUnassignAll} disabled={loadingList}>
                                <X className="h-4 w-4 mr-1" /> Reset Assignments
                            </Button>
                        )}
                    </div>
                </div>

                <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-900 text-white">
                                <tr>
                                    <th className="p-3 text-left font-medium w-[120px]">Date</th>
                                    <th className="p-3 text-left font-medium w-[100px]">Lot #</th>
                                    <th className="p-3 text-left font-medium w-[200px]">Company</th>
                                    <th className="p-3 text-left font-medium w-[300px]">Address & Contact</th>
                                    <th className="p-3 text-left font-medium">Assets & Comments</th>
                                    <th className="p-3 text-left font-medium w-[200px]">Assigned To</th>
                                    <th className="p-3 text-right font-medium w-[120px]">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {savedJobs.map(job => (
                                    <tr key={job.id} className="hover:bg-gray-50/50">
                                        <td className="p-3 whitespace-nowrap font-mono text-gray-600">{new Date(job.job_date).toLocaleDateString()}</td>
                                        <td className="p-3 font-bold text-blue-700">{job.lot_number}</td>
                                        <td className="p-3 font-bold">{job.company_name}</td>
                                        <td className="p-3 text-xs">
                                            <div className="flex items-start gap-1 mb-1">
                                                <MapPin className="h-3 w-3 mt-0.5 text-gray-400" /> {job.address}
                                            </div>
                                            <div className="bg-gray-50 p-1 rounded border text-gray-600 inline-block">
                                                {job.contact_name} {job.contact_detail ? `• ${job.contact_detail}` : ''}
                                            </div>
                                        </td>
                                        <td className="p-3 text-xs space-y-1">
                                            <div className="font-medium">{job.assets}</div>
                                            {job.comments && <div className="text-gray-500 italic">"{job.comments}"</div>}
                                        </td>
                                        <td className="p-3">
                                            <div className="flex flex-wrap gap-1">
                                                {job.assigned_users && job.assigned_users.length > 0 ? (
                                                    job.assigned_users.map((u, i) => (
                                                        <Badge key={i} className="bg-blue-100 text-blue-800 hover:bg-blue-200">{u.full_name}</Badge>
                                                    ))
                                                ) : (
                                                    <span className="text-xs text-gray-400 border border-dashed px-2 py-1 rounded">Unassigned</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-3 text-right">
                                            <Button size="sm" onClick={() => openAssignModal(job.id)} className="bg-gray-900 hover:bg-gray-800">
                                                <UserPlus className="h-3 w-3 mr-1" /> Assign
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* ASSIGN MODAL */}
            {assignJobId && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
                    <Card className="w-full max-w-md shadow-2xl border-gray-200">
                        <CardHeader className="bg-gray-50 border-b pb-4">
                            <CardTitle>Assign Job</CardTitle>
                            <CardDescription>Who should handle this job?</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <div className="max-h-[300px] overflow-y-auto space-y-2">
                                {users.map(user => (
                                    <div key={user.id}
                                        onClick={() => toggleUserSelection(user.id)}
                                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${selectedUserIds.includes(user.id) ? 'bg-blue-50 border-blue-500 shadow-sm' : 'border-transparent hover:bg-gray-100'}`}>
                                        <div className={`h-5 w-5 rounded-full border flex items-center justify-center ${selectedUserIds.includes(user.id) ? 'bg-blue-600 border-blue-600' : 'border-gray-300 bg-white'}`}>
                                            {selectedUserIds.includes(user.id) && <Check className="h-3 w-3 text-white" />}
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">{user.full_name}</p>
                                            <p className="text-xs text-gray-500 capitalize">{user.role}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                        <CardFooter className="flex justify-between border-t bg-gray-50 p-4 rounded-b-lg">
                            <Button variant="ghost" onClick={() => { setAssignJobId(null); setSelectedUserIds([]); }}>Cancel</Button>
                            <Button onClick={handleAssign} disabled={selectedUserIds.length === 0 || isAssigning}>
                                {isAssigning ? <Loader2 className="h-4 w-4 animate-spin" /> : `Confirm Assignment (${selectedUserIds.length})`}
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            )}

        </div>
    )
}
