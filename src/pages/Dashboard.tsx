import { useEffect, useState } from 'react'
import { Truck, Calendar, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import type { Job, EmployeeStats } from '../lib/types'
import { calculateEmployeeStats } from '../lib/dashboardUtils'
import { EmployeeStatsCards } from '../components/dashboard/EmployeeStatsCards'
import { JobsTable } from '../components/dashboard/JobsTable'
import { ShareDashboardDialog } from '../components/dashboard/ShareDashboardDialog'
import { useAuth } from '../context/AuthContext'

export default function Dashboard() {
    const { profile } = useAuth()
    const [tableJobs, setTableJobs] = useState<Job[]>([]) // For table (filtered by date)
    const [employeeStats, setEmployeeStats] = useState<EmployeeStats[]>([])
    const [loading, setLoading] = useState(true)
    const [tableDateFilter, setTableDateFilter] = useState<string>(new Date().toISOString().split('T')[0])

    useEffect(() => {
        fetchTodayData()
        fetchTableData()
    }, [])

    useEffect(() => {
        fetchTableData()
    }, [tableDateFilter])

    const fetchTodayData = async () => {
        setLoading(true)
        try {
            const today = new Date().toISOString().split('T')[0]

            // Fetch today's jobs for employee cards
            const { data: jobsData, error: jobsError } = await supabase
                .from('jobs')
                .select('*')
                .eq('job_date', today)
                .order('lot_number', { ascending: true })

            if (jobsError) throw jobsError

            if (jobsData && jobsData.length > 0) {
                const jobIds = jobsData.map((j: any) => j.id)

                // Fetch assignments
                const { data: assignments } = await supabase
                    .from('job_assignments')
                    .select('job_id, user_id')
                    .in('job_id', jobIds)

                // Fetch user profiles
                let userMap: Record<string, string> = {}
                if (assignments) {
                    const uids = [...new Set(assignments.map((a: any) => a.user_id))]
                    const { data: profiles } = await supabase
                        .from('profiles')
                        .select('id, full_name')
                        .in('id', uids)
                    profiles?.forEach((p: any) => { userMap[p.id] = p.full_name })
                }

                // Format jobs with assignments
                const formatted = jobsData.map((job: any) => {
                    const jobAssignments = assignments?.filter((a: any) => a.job_id === job.id) || []
                    const assignedUsers = jobAssignments.map((ja: any) => ({
                        full_name: userMap[ja.user_id] || 'Unknown',
                        user_id: ja.user_id
                    }))

                    return {
                        ...job,
                        assigned_users: assignedUsers,
                        status: job.status || 'pending'
                    }
                })



                // Calculate employee statistics
                const stats = calculateEmployeeStats(formatted)
                setEmployeeStats(stats)
            } else {

                setEmployeeStats([])
            }
        } catch (error) {
            console.error("Error fetching dashboard data:", error)
        } finally {
            setLoading(false)
        }
    }

    const fetchTableData = async () => {
        try {
            // Fetch jobs for table based on filter
            const { data: jobsData, error: jobsError } = await supabase
                .from('jobs')
                .select('*')
                .eq('job_date', tableDateFilter)
                .order('lot_number', { ascending: true })

            if (jobsError) throw jobsError

            if (jobsData && jobsData.length > 0) {
                const jobIds = jobsData.map((j: any) => j.id)

                // Fetch assignments
                const { data: assignments } = await supabase
                    .from('job_assignments')
                    .select('job_id, user_id')
                    .in('job_id', jobIds)

                // Fetch user profiles
                let userMap: Record<string, string> = {}
                if (assignments) {
                    const uids = [...new Set(assignments.map((a: any) => a.user_id))]
                    const { data: profiles } = await supabase
                        .from('profiles')
                        .select('id, full_name')
                        .in('id', uids)
                    profiles?.forEach((p: any) => { userMap[p.id] = p.full_name })
                }

                // Format jobs with assignments
                const formatted = jobsData.map((job: any) => {
                    const jobAssignments = assignments?.filter((a: any) => a.job_id === job.id) || []
                    const assignedUsers = jobAssignments.map((ja: any) => ({
                        full_name: userMap[ja.user_id] || 'Unknown',
                        user_id: ja.user_id
                    }))

                    return {
                        ...job,
                        assigned_users: assignedUsers,
                        status: job.status || 'pending'
                    }
                })

                setTableJobs(formatted)
            } else {
                setTableJobs([])
            }
        } catch (error) {
            console.error("Error fetching table data:", error)
        }
    }

    if (loading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
        )
    }

    return (
        <div className="p-6 max-w-[1920px] mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                            <Truck className="h-6 w-6 text-white" />
                        </div>
                        Dashboard
                    </h1>
                    <p className="text-gray-500 mt-1 flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Today's Overview - {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                </div>
                {profile?.role === 'admin' && <ShareDashboardDialog />}
            </div>

            {/* Employee Stats Cards */}
            <EmployeeStatsCards stats={employeeStats} />

            {/* Jobs Table */}
            <JobsTable
                jobs={tableJobs}
                dateFilter={tableDateFilter}
                onDateChange={setTableDateFilter}
            />
        </div>
    )
}
