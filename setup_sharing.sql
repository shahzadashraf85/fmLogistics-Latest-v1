-- Create table for storing magic links
CREATE TABLE IF NOT EXISTS public.dashboard_shares (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    token TEXT NOT NULL UNIQUE,
    name TEXT,
    created_by UUID REFERENCES public.profiles(id),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.dashboard_shares ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can do everything
DROP POLICY IF EXISTS "Admins can manage dashboard shares" ON public.dashboard_shares;
CREATE POLICY "Admins can manage dashboard shares" ON public.dashboard_shares
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- SECURE TOKEN ACCESS FUNCTION
-- This function allows anyone (including anonymous) to read data IF they have a valid token
CREATE OR REPLACE FUNCTION public.get_shared_dashboard_data(share_token TEXT, target_date DATE DEFAULT CURRENT_DATE)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    share_record RECORD;
    result JSON;
BEGIN
    -- 1. Verify Token
    SELECT * INTO share_record
    FROM public.dashboard_shares
    WHERE token = share_token
    AND expires_at > NOW();

    IF share_record IS NULL THEN
        RAISE EXCEPTION 'Invalid or expired token';
    END IF;

    -- 2. Fetch Data (Jobs for Target Date)
    -- We construct a JSON object containing jobs and their assignments
    SELECT COALESCE(json_agg(
        json_build_object(
            'id', j.id,
            'job_date', j.job_date,
            'lot_number', j.lot_number,
            'company_name', j.company_name,
            'address', j.address,
            'status', j.status,
            'assets', j.assets,
            'comments', j.comments,
            'contact_name', j.contact_name,
            'contact_detail', j.contact_detail,
            'assigned_users', (
                SELECT COALESCE(json_agg(json_build_object('full_name', p.full_name, 'user_id', p.id)), '[]'::json)
                FROM public.job_assignments ja
                JOIN public.profiles p ON ja.user_id = p.id
                WHERE ja.job_id = j.id
            )
        )
        ORDER BY j.lot_number ASC
    ), '[]'::json) INTO result
    FROM public.jobs j
    WHERE j.job_date = target_date;

    RETURN result;
END;
$$;

-- Function to create a share link
CREATE OR REPLACE FUNCTION public.create_dashboard_share(share_name TEXT, expiration_hours INT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_token TEXT;
BEGIN
    -- Check if user is admin (security check)
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Only admins can create share links';
    END IF;

    -- Generate a random token (using UUID for simplicity)
    new_token := gen_random_uuid()::text;

    INSERT INTO public.dashboard_shares (token, name, created_by, expires_at)
    VALUES (
        new_token,
        share_name,
        auth.uid(),
        NOW() + (expiration_hours || ' hours')::INTERVAL
    );

    RETURN new_token;
END;
$$;
