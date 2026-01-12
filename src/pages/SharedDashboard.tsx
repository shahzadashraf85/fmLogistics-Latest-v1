import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { Truck, Calendar, AlertCircle } from 'lucide-react'
import { calculateEmployeeStats } from '../lib/dashboardUtils'
import { EmployeeStatsCards } from '../components/dashboard/EmployeeStatsCards'
import { JobsTable } from '../components/dashboard/JobsTable'
import type { Job, EmployeeStats } from '../lib/types'
import { Button } from '../components/ui/button'

export default function SharedDashboard() {
    const { token } = useParams<{ token: string }>()
    const [jobs, setJobs] = useState<Job[]>([])
    const [employeeStats, setEmployeeStats] = useState<EmployeeStats[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [dateFilter, setDateFilter] = useState<string>(new Date().toISOString().split('T')[0])

    useEffect(() => {
        if (token) {
            fetchSharedData()
        }
    }, [token, dateFilter])

    const fetchSharedData = async () => {
        setLoading(true)
        setError(null)
        try {
            // Call the secure RPC function
            const { data, error } = await supabase
                .rpc('get_shared_dashboard_data', {
                    share_token: token,
                    target_date: dateFilter
                })

            if (error) {
                console.error("RPC Error:", error)
                throw new Error(error.message)
            }

            // Data comes back as JSON, need to cast it
            // The RPC returns { id, ..., assigned_users: [...] }[]
            const jobsData = data as Job[]

            if (jobsData && jobsData.length > 0) {
                setJobs(jobsData)
                const stats = calculateEmployeeStats(jobsData)
                setEmployeeStats(stats)
            } else {
                setJobs([])
                setEmployeeStats([])
            }

        } catch (err: any) {
            console.error("Error fetching shared data:", err)
            setError(err.message || 'Failed to load dashboard. The link may be invalid or expired.')
        } finally {
            setLoading(false)
        }
    }

    if (error) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
                <div className="text-center space-y-4 max-w-md">
                    <div className="mx-auto h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                        <AlertCircle className="h-6 w-6 text-red-600" />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900">Access Denied</h2>
                    <p className="text-gray-500">{error}</p>
                    <Button onClick={() => window.location.reload()}>Try Again</Button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Minimal Header for Shared View */}
            <header className="bg-white border-b shadow-sm sticky top-0 z-10">
                <div className="max-w-[1920px] mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                            <Truck className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">FM Logistics Services</h1>
                            <p className="text-xs text-gray-500 font-medium">Shared View • Read Only</p>
                        </div>
                    </div>
                </div>
            </header>

            <main className="p-6 max-w-[1920px] mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
                        <p className="text-gray-500 mt-1 flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            Overview for {new Date(dateFilter).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                ) : (
                    <>
                        <EmployeeStatsCards stats={employeeStats} />
                        <JobsTable
                            jobs={jobs}
                            dateFilter={dateFilter}
                            onDateChange={setDateFilter}
                            isReadOnly={true}
                        />
                    </>
                )}
            </main>
        </div>
    )
}
