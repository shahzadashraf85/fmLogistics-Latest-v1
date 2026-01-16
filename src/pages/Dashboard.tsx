import { useEffect, useState } from 'react'
import { Truck, Calendar, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import type { Job, EmployeeStats } from '../lib/types'
import { calculateEmployeeStats } from '../lib/dashboardUtils'
import { EmployeeStatsCards } from '../components/dashboard/EmployeeStatsCards'
import { JobsTable } from '../components/dashboard/JobsTable'
import { ShareDashboardDialog } from '../components/dashboard/ShareDashboardDialog'
import { useAuth } from '../context/AuthContext'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'

export default function Dashboard() {
    const { profile } = useAuth()
    const [jobs, setJobs] = useState<Job[]>([])
    const [employeeStats, setEmployeeStats] = useState<EmployeeStats[]>([])
    const [loading, setLoading] = useState(true)

    // Default to today in local time (Toronto/EST friendly)
    const [selectedDate, setSelectedDate] = useState<string>(() => {
        const now = new Date();
        // Use CA locale to get YYYY-MM-DD format which implies local time
        return now.toLocaleDateString('en-CA');
    })

    useEffect(() => {
        fetchDashboardData()
    }, [selectedDate])

    // Real-time updates
    useEffect(() => {
        const channel = supabase
            .channel('dashboard-updates')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'jobs' },
                () => {
                    console.log('Dashboard job update')
                    fetchDashboardData()
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [selectedDate])

    const fetchDashboardData = async () => {
        setLoading(true)
        try {
            // Fetch jobs for SELECTED date
            const { data: jobsData, error: jobsError } = await supabase
                .from('jobs')
                .select('*')
                .eq('job_date', selectedDate)
                .order('lot_number', { ascending: true })

            if (jobsError) throw jobsError

            if (jobsData && jobsData.length > 0) {
                const jobIds = jobsData.map((j: any) => j.id)

                // Fetch assignments
                const { data: assignments } = await supabase
                    .from('job_assignments')
                    .select('job_id, user_id, status')
                    .in('job_id', jobIds)

                // Fetch user profiles
                let userMap: Record<string, { name: string, contact: string | undefined }> = {}
                if (assignments && assignments.length > 0) {
                    const uids = [...new Set(assignments.map((a: any) => a.user_id))]
                    const { data: profiles } = await supabase
                        .from('profiles')
                        .select('id, full_name, contact_number')
                        .in('id', uids)
                    profiles?.forEach((p: any) => {
                        userMap[p.id] = { name: p.full_name, contact: p.contact_number }
                    })
                }

                // Format jobs with assignments
                const formatted = jobsData.map((job: any) => {
                    const jobAssignments = assignments?.filter((a: any) => a.job_id === job.id) || []
                    const assignedUsers = jobAssignments.map((ja: any) => ({
                        full_name: userMap[ja.user_id]?.name || 'Unknown',
                        contact_number: userMap[ja.user_id]?.contact || undefined,
                        user_id: ja.user_id,
                        status: ja.status
                    }))

                    return {
                        ...job,
                        assigned_users: assignedUsers,
                        status: job.status || 'pending'
                    }
                })

                setJobs(formatted)

                // Calculate stats based on the same dataset
                const stats = calculateEmployeeStats(formatted)
                setEmployeeStats(stats)
            } else {
                setJobs([])
                setEmployeeStats([])
            }
        } catch (error) {
            console.error("Error fetching dashboard data:", error)
        } finally {
            setLoading(false)
        }
    }

    /* 
       Helper to format date display.
       We act as if the selectedDate string (YYYY-MM-DD) is the truth,
       parsing it explicitly to avoid timezone shifts in display title.
    */
    const getFormattedDateTitle = (dateStr: string) => {
        if (!dateStr) return '';
        const [y, m, d] = dateStr.split('-').map(Number);
        const dateObj = new Date(y, m - 1, d); // Construct local date safe
        return dateObj.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }

    if (loading && !jobs.length) {
        return (
            <div className="flex h-96 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
        )
    }

    return (
        <div className="p-6 max-w-[1920px] mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                            <Truck className="h-6 w-6 text-white" />
                        </div>
                        Dashboard
                    </h1>
                    <p className="text-gray-500 mt-1 flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Overview for {getFormattedDateTitle(selectedDate)}
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    {/* Global Date Filter */}
                    <div className="flex items-center gap-2 bg-white p-1 rounded-md border shadow-sm">
                        <Input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="border-none focus-visible:ring-0 w-auto"
                        />
                        <Button variant="ghost" size="sm" onClick={() => setSelectedDate(new Date().toLocaleDateString('en-CA'))}>
                            Today
                        </Button>
                    </div>

                    {profile?.role === 'admin' && <ShareDashboardDialog />}
                </div>
            </div>

            {/* Employee Stats Cards - Controlled by Global Date */}
            <EmployeeStatsCards stats={employeeStats} />

            {/* Jobs Table - Controlled by Global Date */}
            <JobsTable
                jobs={jobs}
                dateFilter={selectedDate}
                onDateChange={setSelectedDate}
                isReadOnly={true} // It's just a view on dashboard usually
            />
        </div>
    )
}
