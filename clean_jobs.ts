
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase URL or Key");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanJobsData() {
    console.log("Logging in as Admin...");
    const { error: loginError } = await supabase.auth.signInWithPassword({
        email: 'shahzadashraf85@gmail.com',
        password: 'forbidden'
    });

    if (loginError) {
        console.error("Login failed:", loginError.message);
        return;
    }
    console.log("Login successful.");

    console.log("Deleting all jobs...");
    // 1. Delete Jobs (Assignments will cascade)
    const { error: jobsError, count: jobsCount } = await supabase
        .from('jobs')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all not equal to zero UUID (effectively all)

    if (jobsError) {
        console.error("Error deleting jobs:", jobsError.message);
    } else {
        console.log(`Jobs deleted.`);
    }

    console.log("Deleting import batches...");
    // 2. Delete Import Batches (Rows will cascade)
    const { error: batchError } = await supabase
        .from('job_import_batches')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

    if (batchError) {
        console.error("Error deleting batches:", batchError.message);
    } else {
        console.log(`Import batches deleted.`);
    }

    console.log("Cleanup complete.");
}

cleanJobsData();
