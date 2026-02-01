-- Enable Row Level Security on certificates table
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS certificates_user_own ON certificates;
DROP POLICY IF EXISTS certificates_admin_all ON certificates;

-- Policy for users: can only see their own certificates
CREATE POLICY certificates_user_own ON certificates
    FOR SELECT
    TO PUBLIC
    USING (
        current_setting('rls.current_user_role', true) = 'admin'
        OR
        (current_setting('rls.current_user_role', true) = 'user' 
         AND user_id::text = current_setting('rls.current_user_id', true))
    );

-- Policy for admins: full access to all certificates
CREATE POLICY certificates_admin_all ON certificates
    FOR ALL
    TO PUBLIC
    USING (current_setting('rls.current_user_role', true) = 'admin')
    WITH CHECK (current_setting('rls.current_user_role', true) = 'admin');