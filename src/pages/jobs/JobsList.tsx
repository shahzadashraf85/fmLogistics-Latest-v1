import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Job } from '../../types/job';
import { Link } from 'react-router-dom';

export default function JobsList() {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkUser();
        fetchJobs();
    }, []);

    const checkUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single();
            setIsAdmin(data?.role === 'admin');
        }
    };

    const fetchJobs = async () => {
        const { data } = await supabase.from('jobs').select('*').order('created_at', { ascending: false });
        if (data) setJobs(data);
        setLoading(false);
    };

    if (loading) return <div className="p-6">Loading...</div>;

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Jobs</h1>
                {isAdmin && (
                    <div className="space-x-2">
                        <Link to="/jobs/import" className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
                            Import Jobs
                        </Link>
                        <Link to="/jobs/assign" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                            Assign Jobs
                        </Link>
                    </div>
                )}
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {jobs.map(job => (
                    <div key={job.id} className="bg-white dark:bg-gray-800 p-4 rounded shadow border dark:border-gray-700">
                        <div className="flex justify-between items-start mb-2">
                            <span className="font-bold text-lg">{job.company_name || 'No Company'}</span>
                            <span className="text-sm bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{job.job_date}</span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">Lot: {job.lot_no}</p>
                        <div className="mb-2">
                            <p className="text-xs font-semibold uppercase text-gray-500">Assets</p>
                            <p className="text-sm">{job.assets}</p>
                        </div>
                        {job.comments && (
                            <div className="mb-2">
                                <p className="text-xs font-semibold uppercase text-gray-500">Comments</p>
                                <p className="text-sm italic">{job.comments}</p>
                            </div>
                        )}
                        <div className="mt-4 pt-2 border-t dark:border-gray-700 text-sm">
                            <p>Contact: {job.contact_name}</p>
                            <p className="text-gray-500">{job.contact_detail}</p>
                        </div>
                    </div>
                ))}
                {jobs.length === 0 && <p className="text-gray-500">No jobs found.</p>}
            </div>
        </div>
    );
}
