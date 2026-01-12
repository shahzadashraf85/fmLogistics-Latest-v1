-- Enable UUID extension if not generic
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. JOBS TABLE
CREATE TABLE IF NOT EXISTS public.jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_date DATE,
  lot_number TEXT,
  company_name TEXT,
  assets TEXT,
  address TEXT,
  comments TEXT,
  contact_name TEXT,
  contact_detail TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. JOB IMPORT BATCHES
CREATE TABLE IF NOT EXISTS public.job_import_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_type TEXT CHECK (source_type IN ('text', 'excel')),
  raw_text TEXT,
  status TEXT CHECK (status IN ('draft', 'approved')) DEFAULT 'draft',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. JOB IMPORT ROWS (Staging)
CREATE TABLE IF NOT EXISTS public.job_import_rows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_id UUID REFERENCES public.job_import_batches(id) ON DELETE CASCADE,
  extracted JSONB, -- Stores { job_date, lot_number, etc }
  is_selected BOOLEAN DEFAULT TRUE
);

-- 4. JOB ASSIGNMENTS (Many-to-Many)
CREATE TABLE IF NOT EXISTS public.job_assignments (
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (job_id, user_id)
);

-- RLS Enablement
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_import_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_assignments ENABLE ROW LEVEL SECURITY;

-- POLICIES (Drop first to avoid "already exists" errors)

-- Jobs
DROP POLICY IF EXISTS "Admin full access jobs" ON public.jobs;
CREATE POLICY "Admin full access jobs" ON public.jobs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Employee read assigned jobs" ON public.jobs;
CREATE POLICY "Employee read assigned jobs" ON public.jobs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.job_assignments 
      WHERE job_id = id AND user_id = auth.uid()
    )
  );

-- Import Batches & Rows
DROP POLICY IF EXISTS "Admin full access batches" ON public.job_import_batches;
CREATE POLICY "Admin full access batches" ON public.job_import_batches
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Admin full access rows" ON public.job_import_rows;
CREATE POLICY "Admin full access rows" ON public.job_import_rows
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Assignments
DROP POLICY IF EXISTS "Admin full access assignments" ON public.job_assignments;
CREATE POLICY "Admin full access assignments" ON public.job_assignments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Employee read own assignments" ON public.job_assignments;
CREATE POLICY "Employee read own assignments" ON public.job_assignments
  FOR SELECT USING (user_id = auth.uid());


-- FUNCTIONS

-- Function to approve a batch and insert into jobs
CREATE OR REPLACE FUNCTION public.approve_import_batch(batch_id_input UUID)
RETURNS VOID AS $$
DECLARE
  row_record RECORD;
  job_data JSONB;
BEGIN
  -- Verify admin
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Verify batch exists and is draft
  IF NOT EXISTS (SELECT 1 FROM public.job_import_batches WHERE id = batch_id_input AND status = 'draft') THEN
    RAISE EXCEPTION 'Batch not found or already approved';
  END IF;

  -- Loop through selected rows and insert
  FOR row_record IN 
    SELECT extracted FROM public.job_import_rows 
    WHERE batch_id = batch_id_input AND is_selected = TRUE
  LOOP
    job_data := row_record.extracted;
    
    INSERT INTO public.jobs (
      job_date, lot_number, company_name, assets, address, comments, contact_name, contact_detail, created_by
    ) VALUES (
      CAST(job_data->>'job_date' AS DATE),
      job_data->>'lot_number',
      job_data->>'company_name',
      job_data->>'assets',
      job_data->>'address',
      job_data->>'comments',
      job_data->>'contact_name',
      job_data->>'contact_detail',
      auth.uid()
    );
  END LOOP;

  -- Update batch status
  UPDATE public.job_import_batches SET status = 'approved' WHERE id = batch_id_input;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
