import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '../ui/table'
import { Package, Calendar, X } from 'lucide-react'
import { useState } from 'react'
import type { Job } from '../../lib/types'
import { cn } from '../../lib/utils'
import { JobDetailsDialog } from './JobDetailsDialog'

interface JobsTableProps {
    jobs: Job[]
    dateFilter: string
    onDateChange: (date: string) => void
    isReadOnly?: boolean
}

export function JobsTable({ jobs, dateFilter, onDateChange, isReadOnly = false }: JobsTableProps) {
    // isReadOnly can be used to hide actions or sensitive data if needed in future
    const _ignore = isReadOnly;
    const [selectedJob, setSelectedJob] = useState<Job | null>(null)

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
        <>
            <Card className="border-2">
                <CardHeader>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <CardTitle className="flex items-center gap-2">
                            <Package className="h-5 w-5 text-blue-600" />
                            All Jobs
                            <Badge variant="secondary" className="ml-2">{jobs.length}</Badge>
                        </CardTitle>

                        {/* Date Filter for Table */}
                        <div className="flex gap-2 items-center bg-gray-50 px-3 py-2 rounded-lg border">
                            <Calendar className="h-4 w-4 text-gray-500" />
                            <Input
                                type="date"
                                value={dateFilter}
                                onChange={(e) => onDateChange(e.target.value)}
                                className="w-40 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 p-0 h-auto font-medium text-sm"
                            />
                            {dateFilter !== new Date().toISOString().split('T')[0] && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onDateChange(new Date().toISOString().split('T')[0])}
                                    className="h-6 px-2 text-xs hover:bg-white"
                                >
                                    <X className="h-3 w-3 mr-1" />
                                    Today
                                </Button>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-lg border overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-gray-50">
                                    <TableHead className="font-bold">Lot #</TableHead>
                                    <TableHead className="font-bold">Company</TableHead>
                                    <TableHead className="font-bold">Address</TableHead>
                                    <TableHead className="font-bold">Assigned To</TableHead>
                                    <TableHead className="font-bold">Status</TableHead>
                                    <TableHead className="font-bold text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {jobs.map(job => (
                                    <TableRow key={job.id} className="hover:bg-blue-50/50 transition-colors">
                                        <TableCell className="font-bold text-red-600">#{job.lot_number}</TableCell>
                                        <TableCell className="font-semibold">{job.company_name}</TableCell>
                                        <TableCell className="max-w-xs truncate text-sm text-gray-600">
                                            {job.address}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1">
                                                {job.assigned_users && job.assigned_users.length > 0 ? (
                                                    job.assigned_users.map((user, idx) => (
                                                        <Badge key={idx} variant="outline" className="text-xs">
                                                            {user.full_name}
                                                        </Badge>
                                                    ))
                                                ) : (
                                                    <span className="text-xs text-gray-400 italic">Unassigned</span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>{getStatusBadge(job.status)}</TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => setSelectedJob(job)}
                                                className="hover:bg-blue-600 hover:text-white transition-colors"
                                            >
                                                View Details
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <JobDetailsDialog
                job={selectedJob}
                open={!!selectedJob}
                onOpenChange={(open: boolean) => !open && setSelectedJob(null)}
            />
        </>
    )
}
