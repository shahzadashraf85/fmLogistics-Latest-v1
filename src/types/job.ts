export interface Job {
    id: string;
    job_date: string;
    lot_no: string;
    company_name: string;
    assets: string;
    comments: string;
    contact_name: string;
    contact_detail: string;
    created_at: string;
}

export interface JobAssignment {
    job_id: string;
    user_id: string;
}

export interface JobImportRow {
    id: string;
    batch_id: string;
    extracted: Partial<Job>;
    is_selected: boolean;
}
