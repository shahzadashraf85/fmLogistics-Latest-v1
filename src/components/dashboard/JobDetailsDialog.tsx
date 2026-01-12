import {
    Package,
    Calendar,
    MapPin,
    Phone,
    MessageSquare,
    User
} from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '../ui/dialog'
import { Badge } from '../ui/badge'
import { cn } from '../../lib/utils'
import type { Job } from '../../lib/types'

interface JobDetailsDialogProps {
    job: Job | null
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function JobDetailsDialog({ job, open, onOpenChange }: JobDetailsDialogProps) {
    if (!job) return null

    const getStatusBadge = (status: string) => {
        const styles = {
            pending: 'bg-gray-100 text-gray-700 border-gray-300',
            on_way: 'bg-blue-100 text-blue-700 border-blue-300',
            on_site: 'bg-purple-100 text-purple-700 border-purple-300',
            picked_up: 'bg-amber-100 text-amber-700 border-amber-300',
            delivered: 'bg-green-100 text-green-700 border-green-300'
        }
        return (
            <Badge variant="outline" className={cn("font-semibold", styles[status as keyof typeof styles] || styles.pending)}>
                {status.replace('_', ' ').toUpperCase()}
            </Badge>
        )
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <Package className="h-6 w-6 text-blue-600" />
                        Job Details - Lot #{job.lot_number}
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                    {/* Status */}
                    <div>
                        <label className="text-sm font-semibold text-gray-600">Status</label>
                        <div className="mt-1">
                            {getStatusBadge(job.status)}
                        </div>
                    </div>

                    {/* Company */}
                    <div>
                        <label className="text-sm font-semibold text-gray-600">Company</label>
                        <div className="mt-1 text-lg font-bold">{job.company_name}</div>
                    </div>

                    {/* Address */}
                    <div>
                        <label className="text-sm font-semibold text-gray-600 flex items-center gap-1">
                            <MapPin className="h-4 w-4" /> Address
                        </label>
                        <div className="mt-1 p-3 bg-gray-50 rounded-lg border">
                            <a
                                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(job.address)}`}
                                target="_blank"
                                className="text-blue-600 hover:underline"
                            >
                                {job.address}
                            </a>
                        </div>
                    </div>

                    {/* Date */}
                    <div>
                        <label className="text-sm font-semibold text-gray-600 flex items-center gap-1">
                            <Calendar className="h-4 w-4" /> Job Date
                        </label>
                        <div className="mt-1">{new Date(job.job_date).toLocaleDateString()}</div>
                    </div>

                    {/* Assets */}
                    <div>
                        <label className="text-sm font-semibold text-gray-600">Assets</label>
                        <div className="mt-1 p-3 bg-gray-50 rounded-lg border whitespace-pre-wrap">
                            {job.assets || <span className="text-gray-400 italic">No assets listed</span>}
                        </div>
                    </div>

                    {/* Contact */}
                    <div>
                        <label className="text-sm font-semibold text-gray-600 flex items-center gap-1">
                            <User className="h-4 w-4" /> Contact
                        </label>
                        <div className="mt-1 p-3 bg-gray-50 rounded-lg border">
                            <div className="font-semibold">{job.contact_name || 'No contact'}</div>
                            {job.contact_detail && (
                                <a href={`tel:${job.contact_detail}`} className="text-blue-600 hover:underline flex items-center gap-1 mt-1">
                                    <Phone className="h-3 w-3" /> {job.contact_detail}
                                </a>
                            )}
                        </div>
                    </div>

                    {/* Comments */}
                    {job.comments && (
                        <div>
                            <label className="text-sm font-semibold text-gray-600 flex items-center gap-1">
                                <MessageSquare className="h-4 w-4" /> Comments
                            </label>
                            <div className="mt-1 p-3 bg-yellow-50 rounded-lg border border-yellow-200 italic">
                                "{job.comments}"
                            </div>
                        </div>
                    )}

                    {/* Assigned Users */}
                    <div>
                        <label className="text-sm font-semibold text-gray-600">Assigned To</label>
                        <div className="mt-1 flex flex-wrap gap-2">
                            {job.assigned_users && job.assigned_users.length > 0 ? (
                                job.assigned_users.map((user, idx) => (
                                    <Badge key={idx} variant="outline" className="px-3 py-1">
                                        <User className="h-3 w-3 mr-1" />
                                        {user.full_name}
                                    </Badge>
                                ))
                            ) : (
                                <span className="text-gray-400 italic">No assignments</span>
                            )}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
