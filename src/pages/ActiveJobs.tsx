import { useEffect, useState, useRef } from 'react'
import { Card, CardContent, CardFooter } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { MapPin, Calendar, Truck, User, Phone, CheckCircle, Navigation, Package, RefreshCw, MessageSquare, Locate, X } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { cn } from '../lib/utils'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog'

interface Job {
    id: string
    job_date: string
    lot_number: string
    company_name: string
    address: string
    assets: string
    comments: string
    contact_name: string
    contact_detail: string
    assigned_at?: string
    status: string
    last_updated_by?: string
    assigned_users?: { full_name: string, user_id: string, status?: string }[]
    distance?: number | null
}

interface UserLocation {
    lat: number
    lng: number
}

export default function ActiveJobs() {
    const [jobs, setJobs] = useState<Job[]>([])
    const [loading, setLoading] = useState(true)
    const [filterMode, setFilterMode] = useState<'mine' | 'all'>('mine')
    const [dateFilter, setDateFilter] = useState<string>(new Date().toISOString().split('T')[0]) // Default to today
    const [userId, setUserId] = useState<string | null>(null)

    const [userLocation, setUserLocation] = useState<UserLocation | null>(null)
    const [calculatingDistances, setCalculatingDistances] = useState(false)
    const [distancesCalculated, setDistancesCalculated] = useState(false)
    const [conflict, setConflict] = useState<{ newJob: Job, newStatus: string, oldJob: Job } | null>(null)
    const calculationInProgress = useRef(false)
    const distanceCache = useRef<Record<string, number | null>>({})

    const lastDateFilter = useRef(dateFilter)

    useEffect(() => {
        fetchUserAndJobs() // Preserve distances when only filter mode changes
    }, [filterMode])

    useEffect(() => {
        const dateChanged = lastDateFilter.current !== dateFilter
        lastDateFilter.current = dateFilter

        fetchUserAndJobs() // Don't preserve distances when date changes

        // Always request location on mount or when date changes
        // checking !distancesCalculated helps to avoid loop but initially it is false
        if (dateChanged || !userLocation) {
            requestUserLocation()
        }

        if (dateChanged) {
            setDistancesCalculated(false) // Reset when date changes
            calculationInProgress.current = false // Reset calculation flag
            distanceCache.current = {} // Clear distance cache for new date
        }
    }, [dateFilter])

    // Real-time updates for jobs
    useEffect(() => {
        const channel = supabase
            .channel('active-jobs-updates')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'jobs' },
                (payload) => {
                    console.log('Job update received:', payload)

                    if (payload.eventType === 'UPDATE') {
                        // Update the job in the list
                        setJobs(prevJobs =>
                            prevJobs.map(job =>
                                job.id === payload.new.id
                                    ? { ...job, ...payload.new }
                                    : job
                            )
                        )
                    } else if (payload.eventType === 'INSERT') {
                        // Refresh the entire list to check if this job should be shown
                        fetchUserAndJobs()
                    } else if (payload.eventType === 'DELETE') {
                        // Remove the job from the list
                        setJobs(prevJobs => prevJobs.filter(job => job.id !== payload.old.id))
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [filterMode, dateFilter])

    useEffect(() => {
        // When location is obtained and jobs are loaded, calculate distances
        if (userLocation && jobs.length > 0 && !calculatingDistances && !distancesCalculated && !calculationInProgress.current) {
            console.log("Triggering distance calculation")
            calculationInProgress.current = true
            setDistancesCalculated(true)

            calculateDistancesForJobs(jobs).then(updatedJobs => {
                console.log("Distance calculation complete, updating jobs")
                console.log("Updated jobs with distances:", updatedJobs.map(j => ({ name: j.company_name, distance: j.distance })))
                setJobs(updatedJobs)
                calculationInProgress.current = false
            }).catch(error => {
                console.error("Distance calculation error:", error)
                calculationInProgress.current = false
            })
        }
    }, [userLocation, jobs.length, calculatingDistances, distancesCalculated])

    const requestUserLocation = () => {
        if (!navigator.geolocation) {
            alert("Your browser doesn't support location services")
            return
        }

        console.log("Requesting user location...")
        navigator.geolocation.getCurrentPosition(
            (position) => {
                console.log("Location obtained:", position.coords.latitude, position.coords.longitude)
                const newLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                }
                setUserLocation(newLocation)
                // Let useEffect handle the distance calculation to avoid race conditions
            },
            (error) => {
                console.error("Location error:", error)
                let errorMsg = "Location access denied"
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMsg = "Location permission denied. Please enable location access in your browser settings."
                        break
                    case error.POSITION_UNAVAILABLE:
                        errorMsg = "Location information unavailable"
                        break
                    case error.TIMEOUT:
                        errorMsg = "Location request timed out"
                        break
                }
                alert(errorMsg)
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        )
    }

    // Haversine formula (Straight line backup)
    const calculateHaversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
        const R = 6371 // Radius of the Earth in km
        const dLat = (lat2 - lat1) * Math.PI / 180
        const dLon = (lon2 - lon1) * Math.PI / 180
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2)
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
        return R * c
    }

    // Fetch driving distance using OSRM (Open Source Routing Machine)
    const fetchDrivingDistance = async (lat1: number, lon1: number, lat2: number, lon2: number): Promise<number | null> => {
        try {
            // OSRM expects coordinates in "lon,lat" format
            const url = `https://router.project-osrm.org/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=false`

            // Add a slight delay to prevent flooding
            await new Promise(resolve => setTimeout(resolve, 500))

            const response = await fetch(url)
            const data = await response.json()

            if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
                // OSRM returns distance in meters, convert to km
                return data.routes[0].distance / 1000
            }
            return null
        } catch (error) {
            console.error("OSRM Routing error:", error)
            return null
        }
    }

    // Clean and simplify address for better geocoding results
    const cleanAddress = (address: string): string => {
        return address
            // Remove floor/suite numbers aggressively
            .replace(/[-–]?\s*\d+(st|nd|rd|th)?\s*(FLR|Fl|Floor|Suite|Unit|Ste)\.?\s*\d*/gi, '')
            .replace(/#\d+/, '')
            // Normalize Canadian postal codes
            .replace(/\s+CA\s+/gi, ', Canada ')
            .replace(/\s+ON\s+/gi, ' Ontario ')
            .trim()
    }

    // Geocode address using Nominatim (OpenStreetMap) with Postal Code Priority
    const geocodeAddress = async (address: string): Promise<{ lat: number, lng: number } | null> => {
        try {
            // Rate limit delay
            await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 500))

            // Extract parts
            const postalMatch = address.match(/([A-Z]\d[A-Z])\s?(\d[A-Z]\d)/i) // Matches M5V 3K7 or M5V3K7
            const postalCode = postalMatch ? `${postalMatch[1]} ${postalMatch[2]}`.toUpperCase() : null

            const streetMatch = address.match(/^([^,]+)/)
            const street = streetMatch ? streetMatch[1].replace(/(-|\s)\d+(th|rd|nd|st).*/i, '').trim() : ''

            // Search Strategy: Most specific to least specific
            const searchQueries = []

            // 1. Postal Code with Province (More specific to avoid false positives)
            if (postalCode) {
                searchQueries.push(`${postalCode}, Ontario, Canada`)
                searchQueries.push(`${postalCode}, Canada`)
            }

            // 2. Try to find city in address, otherwise default to cleaned address
            // Avoid hardcoding Toronto as it breaks other cities like Oakville
            const cleaned = cleanAddress(address)
            searchQueries.push(cleaned)

            // 3. Fallback: Street + Ontario (if no city found in cleaned address, this might help)
            if (street) {
                searchQueries.push(`${street}, Ontario, Canada`)
            }

            for (const query of searchQueries) {
                console.log("Trying geocoding:", query)
                const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&countrycodes=ca`

                let attempts = 0;
                let success = false;

                // Simple retry loop for 503/429 errors
                while (attempts < 2 && !success) {
                    try {
                        attempts++;
                        if (attempts > 1) await new Promise(r => setTimeout(r, 2500 * attempts)); // Exponential Backoff

                        const response = await fetch(url, { headers: { 'User-Agent': 'FM-Logistics-App/2.0' } })

                        if (!response.ok) {
                            console.warn(`Geocoding failed: ${response.status} ${response.statusText}`)
                            continue;
                        }

                        const text = await response.text();
                        try {
                            const data = JSON.parse(text);
                            if (data && data.length > 0) {
                                const lat = parseFloat(data[0].lat)
                                const lng = parseFloat(data[0].lon)
                                console.log(`✓ Found: ${data[0].display_name} at (${lat}, ${lng})`)

                                // Validation: Must be roughly in Southern Ontario (Wide bounds)
                                // roughly 42.0 to 46.0 Lat, -83.0 to -75.0 Lng
                                if (lat >= 42.0 && lat <= 46.0 && lng >= -83.0 && lng <= -75.0) {
                                    return { lat, lng }
                                } else {
                                    console.warn("⚠ Location outside Ontario bounds, ignoring.")
                                }
                            }
                            success = true; // Request succeeded even if no result found
                        } catch (e) {
                            console.warn("Invalid JSON from Nominatim:", text.substring(0, 50) + "...")
                        }
                    } catch (err) {
                        console.error("Fetch error during geocoding:", err)
                    }
                }
            }

            console.warn("✗ No valid results for:", address)
            return null
        } catch (error) {
            console.error("Geocoding error:", error)
            return null
        }
    }

    const calculateDistancesForJobs = async (jobsList: Job[]) => {
        if (!userLocation) {
            console.log("No user location available")
            return jobsList
        }

        console.log("Starting distance calculation for", jobsList.length, "jobs")
        setCalculatingDistances(true)
        setDistancesCalculated(true)

        const updatedJobs = []
        for (const job of jobsList) {
            // Check if we already have coordinates from previous runs (optimization could be added here)
            // For now, re-geocode to ensure accuracy or use stored logic if we had it. 
            // Since we don't store lat/lng in DB, we fetch again.

            const coords = await geocodeAddress(job.address)
            if (coords) {
                let distance: number | null = null
                let method = "straight-line"

                // 1. Try Driving Distance (OSRM)
                distance = await fetchDrivingDistance(userLocation.lat, userLocation.lng, coords.lat, coords.lng)

                // 2. Fallback to Haversine if driving distance fails
                if (distance !== null) {
                    method = "driving (OSRM)"
                } else {
                    distance = calculateHaversineDistance(userLocation.lat, userLocation.lng, coords.lat, coords.lng)
                    console.warn(`Fallback to Haversine for ${job.company_name}`)
                }

                console.log(`Distance to ${job.company_name} (${method}):`, distance.toFixed(1), "km")
                const roundedDistance = Math.round(distance * 10) / 10
                distanceCache.current[job.id] = roundedDistance
                updatedJobs.push({ ...job, distance: roundedDistance })
            } else {
                distanceCache.current[job.id] = null
                updatedJobs.push({ ...job, distance: null })
            }
        }

        setCalculatingDistances(false)
        console.log("Distance calculation complete")
        return updatedJobs
    }

    const fetchUserAndJobs = async () => {
        setLoading(true)
        try {
            // 1. Get User & Role
            const { data: { user } } = await supabase.auth.getUser()
            setUserId(user?.id || null)



            // 2. Determine Job IDs to fetch based on filter mode
            let targetJobIds: string[] | null = null

            if (filterMode === 'mine' && user) {
                const { data: myAssignments } = await supabase
                    .from('job_assignments')
                    .select('job_id')
                    .eq('user_id', user.id)

                if (!myAssignments || myAssignments.length === 0) {
                    setJobs([])
                    setLoading(false)
                    return
                }
                targetJobIds = myAssignments.map(a => a.job_id)
            }

            // 3. Query Jobs
            let query = supabase
                .from('jobs')
                .select('*')
                .order('job_date', { ascending: true })

            if (targetJobIds) {
                query = query.in('id', targetJobIds)
            }

            if (dateFilter) {
                query = query.eq('job_date', dateFilter)
            }

            const { data: jobsData, error: jobsError } = await query

            if (jobsError) throw jobsError

            // 4. Manual Join Fetch
            if (jobsData && jobsData.length > 0) {
                const jobIds = jobsData.map((j: any) => j.id)

                const { data: assignments } = await supabase
                    .from('job_assignments')
                    .select('job_id, user_id, status')
                    .in('job_id', jobIds)

                let userMap: Record<string, string> = {}
                if (assignments) {
                    const uids = [...new Set(assignments.map((a: any) => a.user_id))]
                    const { data: profiles } = await supabase
                        .from('profiles')
                        .select('id, full_name')
                        .in('id', uids)
                    profiles?.forEach((p: any) => { userMap[p.id] = p.full_name })
                }

                const formatted = jobsData.map((job: any) => {
                    const jobAssignments = assignments?.filter((a: any) => a.job_id === job.id) || []
                    const assignedUsers = jobAssignments.map((ja: any) => ({
                        full_name: userMap[ja.user_id] || 'Unknown',
                        user_id: ja.user_id,
                        status: ja.status
                    }))

                    // Always use cache if available, otherwise null
                    const distance = distanceCache.current[job.id] !== undefined ? distanceCache.current[job.id] : null

                    return {
                        ...job,
                        assigned_users: assignedUsers,
                        status: job.status || 'pending',
                        distance: distance
                    }
                })

                setJobs(formatted)
            } else {
                setJobs([])
            }
        } catch (error) {
            console.error("Error fetching jobs:", error)
        } finally {
            setLoading(false)
        }
    }

    const canUpdateStatus = (_: Job) => {
        // Allow everyone to view buttons; permission logic is now in updateStatus
        return true
    }

    const executeStatusUpdate = async (job: Job, newStatus: string) => {
        const isAssigned = job.assigned_users?.some(u => u.user_id === userId)

        // "allow all user to change status of job but if job is not assign to him... ask a pop up"
        if (!isAssigned) {
            const confirmed = window.confirm("This job is not assigned to you. Do you want to proceed?")
            if (!confirmed) return

            // "if he proceed then assign this job him also"
            if (userId) {
                const { error: assignError } = await supabase
                    .from('job_assignments')
                    .insert({ job_id: job.id, user_id: userId })

                if (assignError) {
                    console.error("Assignment error:", assignError)
                    alert("Failed to assign job. Please try again.")
                    return
                }

                // Refresh to show assignment immediately
                fetchUserAndJobs()
            }
        }

        // Optimistic update
        setJobs(prev => prev.map(j => {
            if (j.id !== job.id) return j;
            // Update local assignment status
            const newAssignments = j.assigned_users?.map(u =>
                u.user_id === userId ? { ...u, status: newStatus } : u
            );
            // If I wasn't assigned before, I am now (handled by fetch usually, but helpful for optimistic)
            // For now, simple optimistic update of status
            return { ...j, status: newStatus, last_updated_by: userId || undefined, assigned_users: newAssignments };
        }))

        // 1. Update Global Job Status (Legacy/Admin View)
        const { error } = await supabase
            .from('jobs')
            .update({ status: newStatus, last_updated_by: userId })
            .eq('id', job.id)

        // 2. Update My Personal Assignment Status (New Logic)
        if (userId) {
            await supabase
                .from('job_assignments')
                .update({ status: newStatus })
                .eq('job_id', job.id)
                .eq('user_id', userId)
        }

        if (error) {
            alert("Failed to update status")
            fetchUserAndJobs()
        }
    }

    const updateStatus = async (job: Job, newStatus: string) => {
        if (newStatus === 'on_way' || newStatus === 'on_site') {
            const conflictingJob = jobs.find(j =>
                j.id !== job.id &&
                j.assigned_users?.some(u => u.user_id === userId && (u.status === 'on_way' || u.status === 'on_site'))
            );

            if (conflictingJob) {
                // Check if ANY OTHER user is active on this job
                const isCoveredByOthers = conflictingJob.assigned_users?.some(u =>
                    u.user_id !== userId && (u.status === 'on_way' || u.status === 'on_site')
                );

                if (isCoveredByOthers) {
                    // Auto-resolve: Reset my status on the old job to 'pending'
                    await executeStatusUpdate(conflictingJob, 'pending');
                } else {
                    setConflict({ newJob: job, newStatus, oldJob: conflictingJob });
                    return;
                }
            }
        }
        executeStatusUpdate(job, newStatus)
    }

    const resolveConflict = async (action: 'picked_up' | 'pending') => {
        if (!conflict) return
        setConflict(null)
        await executeStatusUpdate(conflict.oldJob, action)
        await executeStatusUpdate(conflict.newJob, conflict.newStatus)
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'on_way': return 'text-blue-700 bg-blue-50 border-blue-200'
            case 'on_site': return 'text-purple-700 bg-purple-50 border-purple-200'
            case 'picked_up': return 'text-amber-700 bg-amber-50 border-amber-200'
            case 'delivered': return 'text-green-700 bg-green-50 border-green-200'
            default: return 'text-gray-600 bg-gray-50 border-gray-200'
        }
    }

    return (
        <div className="p-4 max-w-[1920px] mx-auto pb-32">

            {/* COMPACT FILTER BAR */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5 border-b pb-4">
                <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Truck className="h-5 w-5 text-blue-600" />
                    Active Jobs <Badge variant="secondary" className="px-1.5 py-0 h-5 text-xs">{jobs.length}</Badge>
                </h1>

                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between bg-white p-3 rounded-lg border shadow-sm">
                    <div className="flex gap-2 w-full sm:w-auto">
                        <Button
                            variant={filterMode === 'mine' ? 'default' : 'outline'}
                            onClick={() => setFilterMode('mine')}
                            className={cn("flex-1 sm:flex-none", filterMode === 'mine' ? "bg-blue-600 hover:bg-blue-700" : "")}
                        >
                            My Jobs
                        </Button>
                        <Button
                            variant={filterMode === 'all' ? 'default' : 'outline'}
                            onClick={() => setFilterMode('all')}
                            className={cn("flex-1 sm:flex-none", filterMode === 'all' ? "bg-slate-800 hover:bg-slate-900" : "")}
                        >
                            All Jobs
                        </Button>
                    </div>

                    <div className="flex gap-2 w-full sm:w-auto">
                        <Input
                            type="date"
                            className="w-full sm:w-48 bg-white"
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                        />
                        {dateFilter && (
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setDateFilter('')}
                                title="Clear date filter"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={requestUserLocation}
                        title="Refresh Location"
                        className="h-8 w-8 text-gray-500 hover:text-blue-600"
                    >
                        <Locate className="h-4 w-4" />
                    </Button>
                    {calculatingDistances && (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 flex items-center gap-1">
                            <RefreshCw className="h-3 w-3 animate-spin" /> Calculating Distances...
                        </Badge>
                    )}
                    {userLocation && !calculatingDistances && (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 flex items-center gap-1">
                            <Locate className="h-3 w-3" /> Distances Updated
                        </Badge>
                    )}
                </div>
            </div>

            {/* COMPACT GRID */}
            {jobs.length === 0 && !loading ? (
                <div className="text-center py-20 text-gray-400 bg-gray-50 rounded-lg border-2 border-dashed">
                    No jobs found matching your filters.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                    {jobs.map(job => {
                        const isAllowed = canUpdateStatus(job);
                        const statusColor = getStatusColor(job.status);

                        return (
                            <Card key={job.id} className="group border border-slate-300 hover:border-blue-500 transition-all duration-300 flex flex-col shadow-sm hover:shadow-md bg-white rounded-xl overflow-hidden">
                                {/* Header Section - Very subtle background */}
                                <div className="p-4 pb-3 border-b border-slate-100 bg-slate-50/30">
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="flex items-center gap-2 text-slate-500 text-[10px] font-semibold tracking-wide bg-white px-2 py-0.5 rounded-full border border-slate-100 shadow-sm">
                                            <Calendar className="h-3 w-3 text-blue-400" />
                                            <span>{new Date(job.job_date).toLocaleDateString()}</span>
                                        </div>
                                        <Badge variant="outline" className={cn("text-[10px] px-2 py-0.5 font-semibold uppercase tracking-wide border shadow-sm backdrop-blur-sm", statusColor)}>
                                            {job.status.replace('_', ' ')}
                                        </Badge>
                                    </div>

                                    <div className="flex justify-between items-start">
                                        <div className="w-full">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <span className="text-[10px] font-extrabold text-red-500 bg-red-50 px-1.5 py-0.5 rounded border border-red-100">Lot #{job.lot_number}</span>
                                            </div>
                                            <div className="text-[15px] font-bold text-slate-800 truncate leading-tight mt-1" title={job.company_name}>
                                                {job.company_name}
                                            </div>

                                            <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(job.address)}`} target="_blank" className="flex items-start gap-2 mt-2 group/addr hover:bg-blue-50/50 p-1.5 -ml-1.5 rounded-lg transition-colors">
                                                <div className="bg-white p-1 rounded-full border border-slate-100 shadow-sm shrink-0">
                                                    <MapPin className="h-3.5 w-3.5 text-red-500" />
                                                </div>
                                                <div className="text-xs leading-snug">
                                                    <div className="text-slate-600 font-medium group-hover/addr:text-blue-700 transition-colors line-clamp-2">{job.address}</div>

                                                    {/* Smart Distance Display */}
                                                    <div className="text-[11px] font-bold text-blue-600 mt-1 flex items-center gap-1.5 h-4">
                                                        {(job.distance !== null && job.distance !== undefined && typeof job.distance === 'number') ? (
                                                            <div className="flex items-center gap-1 bg-blue-50 px-1.5 py-0.5 rounded text-blue-700">
                                                                <Navigation className="h-3 w-3" /> {job.distance} km
                                                            </div>
                                                        ) : calculatingDistances ? (
                                                            <div className="flex items-center gap-1 text-slate-400">
                                                                <RefreshCw className="h-2.5 w-2.5 animate-spin" /> <span className="text-[10px]">Calculating...</span>
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                </div>
                                            </a>
                                        </div>
                                    </div>
                                </div>

                                <CardContent className="p-4 pt-3 space-y-4 text-xs flex-1 bg-white">
                                    {/* Assets Section */}
                                    <div className="relative">
                                        <span className="absolute -top-2 left-2 bg-white px-1 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Assets</span>
                                        <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3 text-slate-700 font-medium leading-relaxed">
                                            {job.assets || <span className="opacity-40 italic font-normal">No assets listed</span>}
                                        </div>
                                    </div>

                                    {/* Contact Section */}
                                    <div className="flex items-center gap-3 bg-white border border-slate-100 rounded-lg p-2.5 shadow-sm">
                                        <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                                            <User className="h-4 w-4 text-slate-500" />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="font-semibold text-slate-700 truncate">{job.contact_name || 'No Contact'}</div>
                                            {job.contact_detail && (
                                                <a href={`tel:${job.contact_detail}`} className="flex items-center gap-1.5 text-blue-500 hover:text-blue-700 hover:underline text-[11px] mt-0.5">
                                                    <Phone className="h-3 w-3" /> {job.contact_detail}
                                                </a>
                                            )}
                                        </div>
                                    </div>

                                    {/* Comments Section (Bottom) */}
                                    {job.comments && (
                                        <div className="relative group/comment">
                                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-yellow-400 rounded-l-lg"></div>
                                            <div className="bg-yellow-50/50 border border-yellow-100/50 border-l-0 rounded-r-lg p-3 pl-3.5 flex gap-2.5 items-start">
                                                <MessageSquare className="h-3.5 w-3.5 mt-0.5 shrink-0 text-yellow-500/80" />
                                                <span className="font-medium text-slate-700 italic leading-snug">"{job.comments}"</span>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>

                                <CardFooter className="p-2.5 border-t border-slate-100 bg-slate-50/30">
                                    <div className="grid grid-cols-5 gap-1 w-full">
                                        <Button
                                            size="sm"
                                            disabled={!isAllowed}
                                            onClick={() => updateStatus(job, 'pending')}
                                            className={cn("h-8 text-[9px] font-bold rounded-lg transition-all duration-200 shadow-sm",
                                                job.status === 'pending'
                                                    ? "bg-slate-600 text-white shadow-slate-200 shadow-md ring-1 ring-slate-600"
                                                    : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:text-slate-600 hover:bg-slate-50"
                                            )}
                                        >
                                            <div className="flex flex-col items-center gap-0.5">
                                                <RefreshCw className="h-3 w-3" />
                                                <span className="scale-75 sm:scale-90">PENDING</span>
                                            </div>
                                        </Button>
                                        <Button
                                            size="sm"
                                            disabled={!isAllowed}
                                            onClick={() => updateStatus(job, 'on_way')}
                                            className={cn("h-8 text-[9px] font-bold rounded-lg transition-all duration-200 shadow-sm",
                                                job.status === 'on_way'
                                                    ? "bg-blue-600 text-white shadow-blue-200 shadow-md ring-1 ring-blue-600"
                                                    : "bg-white text-slate-600 border border-slate-200 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50"
                                            )}
                                        >
                                            <div className="flex flex-col items-center gap-0.5">
                                                <Navigation className="h-3 w-3" />
                                                <span className="scale-90">ON WAY</span>
                                            </div>
                                        </Button>
                                        <Button
                                            size="sm"
                                            disabled={!isAllowed}
                                            onClick={() => updateStatus(job, 'on_site')}
                                            className={cn("h-8 text-[9px] font-bold rounded-lg transition-all duration-200 shadow-sm",
                                                job.status === 'on_site'
                                                    ? "bg-purple-600 text-white shadow-purple-200 shadow-md ring-1 ring-purple-600"
                                                    : "bg-white text-slate-600 border border-slate-200 hover:border-purple-300 hover:text-purple-600 hover:bg-purple-50"
                                            )}
                                        >
                                            <div className="flex flex-col items-center gap-0.5">
                                                <MapPin className="h-3 w-3" />
                                                <span className="scale-90">ON SITE</span>
                                            </div>
                                        </Button>
                                        <Button
                                            size="sm"
                                            disabled={!isAllowed}
                                            onClick={() => updateStatus(job, 'picked_up')}
                                            className={cn("h-8 text-[9px] font-bold rounded-lg transition-all duration-200 shadow-sm",
                                                job.status === 'picked_up'
                                                    ? "bg-amber-500 text-white shadow-amber-200 shadow-md ring-1 ring-amber-500"
                                                    : "bg-white text-slate-600 border border-slate-200 hover:border-amber-300 hover:text-amber-600 hover:bg-amber-50"
                                            )}
                                        >
                                            <div className="flex flex-col items-center gap-0.5">
                                                <Package className="h-3 w-3" />
                                                <span className="scale-90">PICKED</span>
                                            </div>
                                        </Button>
                                        <Button
                                            size="sm"
                                            disabled={!isAllowed}
                                            onClick={() => updateStatus(job, 'delivered')}
                                            className={cn("h-8 text-[9px] font-bold rounded-lg transition-all duration-200 shadow-sm",
                                                job.status === 'delivered'
                                                    ? "bg-emerald-600 text-white shadow-emerald-200 shadow-md ring-1 ring-emerald-600"
                                                    : "bg-white text-slate-600 border border-slate-200 hover:border-emerald-300 hover:text-emerald-600 hover:bg-emerald-50"
                                            )}
                                        >
                                            <div className="flex flex-col items-center gap-0.5">
                                                <CheckCircle className="h-3 w-3" />
                                                <span className="scale-90">DONE</span>
                                            </div>
                                        </Button>
                                    </div>
                                </CardFooter>
                            </Card>
                        )
                    })}
                </div>
            )}

            <Dialog open={!!conflict} onOpenChange={(open) => !open && setConflict(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Unfinished Job Detected</DialogTitle>
                        <DialogDescription>
                            You currently have <strong>{conflict?.oldJob.company_name}</strong> marked as "{conflict?.oldJob.status?.replace('_', ' ')}".
                            <br /><br />
                            What should happen to this job?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex-col sm:flex-row gap-2">
                        <Button variant="outline" onClick={() => setConflict(null)}>
                            Cancel
                        </Button>
                        <Button variant="secondary" onClick={() => resolveConflict('pending')}>
                            Reset to Pending
                        </Button>
                        <Button onClick={() => resolveConflict('picked_up')} className="bg-amber-600 hover:bg-amber-700 text-white">
                            Mark Picked Up
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
