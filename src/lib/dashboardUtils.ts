import type { Job, EmployeeStats } from './types'

export const calculateEmployeeStats = (jobsList: Job[]): EmployeeStats[] => {
    const statsMap: Record<string, EmployeeStats> = {}

    jobsList.forEach(job => {
        job.assigned_users?.forEach(user => {
            if (!statsMap[user.user_id]) {
                const initUser: any = user // Type assertion to bypass strict check for now
                statsMap[user.user_id] = {
                    user_id: user.user_id,
                    full_name: user.full_name,
                    contact_number: initUser.contact_number, // We will ensure this is passed in Dashboard.tsx
                    total_jobs: 0,
                    pending: 0,
                    on_way: 0,
                    on_site: 0,
                    picked_up: 0,
                    delivered: 0
                }
            }

            const stats = statsMap[user.user_id]
            stats.total_jobs++

            switch (job.status) {
                case 'pending':
                    stats.pending++
                    break
                case 'on_way':
                    stats.on_way++
                    if (!stats.active_job) {
                        stats.active_job = {
                            lot_number: job.lot_number,
                            address: job.address,
                            status: 'on_way'
                        }
                    }
                    break
                case 'on_site':
                    stats.on_site++
                    if (!stats.active_job) {
                        stats.active_job = {
                            lot_number: job.lot_number,
                            address: job.address,
                            status: 'on_site'
                        }
                    }
                    break
                case 'picked_up':
                    stats.picked_up++
                    break
                case 'delivered':
                    stats.delivered++
                    break
            }
        })
    })

    return Object.values(statsMap)
}
