
-- 1. Add contact_number to profiles if it doesn't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS contact_number TEXT;

-- 2. Update the handle_new_user function to include phone and contact_number
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, status, contact_number)
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name', 
    'employee', 
    'pending',
    new.raw_user_meta_data->>'contact_number'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
