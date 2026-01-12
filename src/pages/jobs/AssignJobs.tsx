import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Job } from '../../types/job';

interface Profile {
    id: string;
    email: string;
    full_name: string;
}

export default function AssignJobs() {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [assignments, setAssignments] = useState<Record<string, string[]>>({}); // job_id -> user_ids
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const [jobsRes, profilesRes, assignmentsRes] = await Promise.all([
            supabase.from('jobs').select('*').order('created_at', { ascending: false }),
            supabase.from('profiles').select('*').eq('role', 'employee'), // Only assign to employees
            supabase.from('job_assignments').select('*')
        ]);

        if (jobsRes.data) setJobs(jobsRes.data);
        if (profilesRes.data) setProfiles(profilesRes.data);

        const map: Record<string, string[]> = {};
        assignmentsRes.data?.forEach((a: any) => {
            if (!map[a.job_id]) map[a.job_id] = [];
            map[a.job_id].push(a.user_id);
        });
        setAssignments(map);
        setLoading(false);
    };

    const toggleAssignment = async (jobId: string, userId: string, isAssigned: boolean) => {
        // Optimistic update
        const currentAssigned = assignments[jobId] || [];
        const newAssigned = isAssigned
            ? [...currentAssigned, userId]
            : currentAssigned.filter(id => id !== userId);

        setAssignments({ ...assignments, [jobId]: newAssigned });

        if (isAssigned) {
            await supabase.from('job_assignments').insert({ job_id: jobId, user_id: userId });
        } else {
            await supabase.from('job_assignments').delete().match({ job_id: jobId, user_id: userId });
        }
    };

    if (loading) return <div className="p-6">Loading...</div>;

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6">Assign Jobs</h1>

            <div className="overflow-x-auto bg-white dark:bg-gray-800 shadow rounded">
                <table className="min-w-full text-sm">
                    <thead className="bg-gray-100 dark:bg-gray-700">
                        <tr>
                            <th className="p-3 text-left">Job Details</th>
                            <th className="p-3 text-left">Assign Employees</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y dark:divide-gray-600">
                        {jobs.map(job => (
                            <tr key={job.id}>
                                <td className="p-3 align-top">
                                    <div className="font-bold">{job.company_name}</div>
                                    <div className="text-xs text-gray-500">{job.job_date} | Let: {job.lot_no}</div>
                                    <div className="text-xs truncate max-w-xs">{job.assets}</div>
                                </td>
                                <td className="p-3">
                                    <div className="flex flex-wrap gap-2">
                                        {profiles.map(user => {
                                            const isAssigned = (assignments[job.id] || []).includes(user.id);
                                            return (
                                                <button
                                                    key={user.id}
                                                    onClick={() => toggleAssignment(job.id, user.id, !isAssigned)}
                                                    className={`px-3 py-1 rounded-full text-xs transition-colors duration-200 ${isAssigned
                                                            ? 'bg-blue-600 text-white'
                                                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300'
                                                        }`}
                                                >
                                                    {user.full_name || user.email}
                                                    {isAssigned && ' ✓'}
                                                </button>
                                            );
                                        })}
                                        {profiles.length === 0 && <span className="text-gray-400 text-xs">No employees found</span>}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
