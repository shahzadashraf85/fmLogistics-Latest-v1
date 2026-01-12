import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import * as XLSX from 'xlsx';
import type { JobImportRow } from '../../types/job';

export default function ImportJobs() {
    const [text, setText] = useState('');
    const [loading, setLoading] = useState(false);
    const [batchId, setBatchId] = useState<string | null>(null);
    const [rows, setRows] = useState<JobImportRow[]>([]);
    const [error, setError] = useState('');

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];

        // Convert to simple text representation for AI to parse logic or CSV
        const csv = XLSX.utils.sheet_to_csv(sheet);
        setText(csv);
    };

    const handleExtract = async () => {
        setLoading(true);
        setError('');
        try {
            const { data, error } = await supabase.functions.invoke('extract-jobs', {
                body: { text, source_type: 'text' }
            });

            if (error) throw error;
            if (data.error) throw new Error(data.error);

            setBatchId(data.batchId);
            fetchRows(data.batchId);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchRows = async (id: string) => {
        const { data } = await supabase
            .from('job_import_rows')
            .select('*')
            .eq('batch_id', id)
            .order('id');
        if (data) setRows(data);
    };

    const toggleRow = async (id: string, current: boolean) => {
        await supabase.from('job_import_rows').update({ is_selected: !current }).eq('id', id);
        setRows(rows.map(r => r.id === id ? { ...r, is_selected: !current } : r));
    };

    const handleApprove = async () => {
        if (!batchId) return;
        setLoading(true);
        try {
            const { error } = await supabase.rpc('approve_import_batch', { batch_id_input: batchId });
            if (error) throw error;
            alert('Jobs approved successfully!');
            setBatchId(null);
            setRows([]);
            setText('');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">Import Jobs</h1>

            {!batchId ? (
                <div className="space-y-4">
                    <div className="border p-4 rounded bg-white dark:bg-gray-800">
                        <label className="block mb-2 font-medium">Paste Text or Upload Excel</label>
                        <textarea
                            className="w-full h-40 p-2 border rounded dark:bg-gray-700"
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder="Paste email content, message logs, etc."
                        />
                        <div className="mt-2">
                            <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} />
                        </div>
                    </div>
                    <button
                        disabled={loading || !text}
                        onClick={handleExtract}
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                        {loading ? 'Analyzing with AI...' : 'Extract Jobs'}
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl">Preview & Approve</h2>
                        <div className="space-x-2">
                            <button onClick={() => setBatchId(null)} className="px-3 py-1 text-gray-600">Cancel</button>
                            <button
                                onClick={handleApprove}
                                disabled={loading}
                                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                            >
                                {loading ? 'Processing...' : 'Approve Selected'}
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded shadow">
                        <table className="min-w-full text-sm">
                            <thead>
                                <tr className="bg-gray-100 dark:bg-gray-700">
                                    <th className="p-2">Select</th>
                                    <th className="p-2">Date</th>
                                    <th className="p-2">Lot No</th>
                                    <th className="p-2">Company</th>
                                    <th className="p-2">Assets</th>
                                    <th className="p-2">Comments</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map(row => (
                                    <tr key={row.id} className="border-t dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700">
                                        <td className="p-2 text-center">
                                            <input
                                                type="checkbox"
                                                checked={row.is_selected}
                                                onChange={() => toggleRow(row.id, row.is_selected)}
                                            />
                                        </td>
                                        <td className="p-2">{row.extracted.job_date || '-'}</td>
                                        <td className="p-2">{row.extracted.lot_no || '-'}</td>
                                        <td className="p-2">{row.extracted.company_name || '-'}</td>
                                        <td className="p-2 truncate max-w-xs">{row.extracted.assets || '-'}</td>
                                        <td className="p-2 truncate max-w-xs">{row.extracted.comments || '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {error && <p className="text-red-500 mt-4">{error}</p>}
        </div>
    );
}
