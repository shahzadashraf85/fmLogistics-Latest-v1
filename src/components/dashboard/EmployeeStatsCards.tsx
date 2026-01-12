import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Navigation, User } from 'lucide-react'
import { cn } from '../../lib/utils'
import type { EmployeeStats } from '../../lib/types'

interface EmployeeStatsCardsProps {
    stats: EmployeeStats[]
}

export function EmployeeStatsCards({ stats }: EmployeeStatsCardsProps) {
    if (stats.length === 0) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                <Card className="col-span-full border-2 border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                        <User className="h-12 w-12 text-gray-300 mb-3" />
                        <p className="text-gray-500 font-medium">No employees assigned to jobs today</p>
                        <p className="text-sm text-gray-400 mt-1">Employee stats will appear here when jobs are assigned</p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {stats.map(employee => (
                <Card key={employee.user_id} className="border-2 hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-white to-gray-50">
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                                <User className="h-5 w-5 text-white" />
                            </div>
                            <div className="flex flex-col">
                                <span className="font-bold leading-none">{employee.full_name}</span>
                                {employee.contact_number && (
                                    <a
                                        href={`tel:${employee.contact_number}`}
                                        className="text-xs font-normal text-blue-600 hover:underline mt-1 flex items-center gap-1"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        {employee.contact_number}
                                    </a>
                                )}
                            </div>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 p-3 pt-0">
                        {/* Stats Line */}
                        <div className="flex items-center justify-between gap-1 text-center">
                            <div className="flex-1 bg-blue-50 rounded border border-blue-100 p-1">
                                <div className="text-lg font-bold text-blue-600 leading-none">{employee.total_jobs}</div>
                                <div className="text-[9px] font-bold text-blue-400 uppercase">Total</div>
                            </div>
                            <div className="flex-1 bg-gray-50 rounded border border-gray-100 p-1">
                                <div className="text-lg font-bold text-gray-600 leading-none">{employee.pending}</div>
                                <div className="text-[9px] font-bold text-gray-400 uppercase">Pend</div>
                            </div>
                            <div className="flex-1 bg-amber-50 rounded border border-amber-100 p-1">
                                <div className="text-lg font-bold text-amber-600 leading-none">{employee.picked_up}</div>
                                <div className="text-[9px] font-bold text-amber-500 uppercase">Pick</div>
                            </div>
                            <div className="flex-1 bg-green-50 rounded border border-green-100 p-1">
                                <div className="text-lg font-bold text-green-600 leading-none">{employee.delivered}</div>
                                <div className="text-[9px] font-bold text-green-500 uppercase">Done</div>
                            </div>
                        </div>

                        {/* Active Job Status - "Pop" Effect */}
                        {employee.active_job && (
                            <div className={cn(
                                "rounded-lg p-2.5 border-2 shadow-md transition-all duration-500 animate-[pulse_3s_ease-in-out_infinite]",
                                employee.active_job.status === 'on_way'
                                    ? "bg-gradient-to-r from-blue-50 to-blue-100 border-blue-400"
                                    : "bg-gradient-to-r from-purple-50 to-purple-100 border-purple-400"
                            )}>
                                <div className="flex items-start gap-2">
                                    <div className={cn(
                                        "mt-0.5 p-1 rounded-full text-white shadow-sm shrink-0",
                                        employee.active_job.status === 'on_way' ? "bg-blue-500" : "bg-purple-500"
                                    )}>
                                        <Navigation className="h-3 w-3" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className={cn(
                                            "text-[10px] font-black uppercase tracking-wider mb-0.5 flex items-center gap-1",
                                            employee.active_job.status === 'on_way' ? "text-blue-700" : "text-purple-700"
                                        )}>
                                            {employee.active_job.status === 'on_way' ? 'ON THE WAY' : 'ON SITE'}
                                            <span className="relative flex h-2 w-2">
                                                <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", employee.active_job.status === 'on_way' ? "bg-blue-500" : "bg-purple-500")}></span>
                                                <span className={cn("relative inline-flex rounded-full h-2 w-2", employee.active_job.status === 'on_way' ? "bg-blue-500" : "bg-purple-500")}></span>
                                            </span>
                                        </div>
                                        <div className="text-xs font-bold text-gray-800 leading-tight">
                                            Lot #{employee.active_job.lot_number}
                                        </div>
                                        <div className="text-[10px] text-gray-600 truncate mt-0.5 font-medium">
                                            {employee.active_job.address}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}
