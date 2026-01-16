export interface Job {
    id: string
    job_date: string
    lot_number: string
    company_name: string
    address: string
    assets: string
    comments: string
    contact_name: string
    contact_detail: string
    status: string
    last_updated_by?: string
    assigned_users?: { full_name: string, user_id: string }[]
}

export interface EmployeeStats {
    user_id: string
    full_name: string
    contact_number?: string
    total_jobs: number
    pending: number
    on_way: number
    on_site: number
    picked_up: number
    delivered: number
    active_job?: {
        lot_number: string
        address: string
        status: 'on_way' | 'on_site'
        is_priority?: boolean
    }
}
