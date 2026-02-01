-- Enable Row Level Security on enrollments table
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS enrollments_user_own ON enrollments;
DROP POLICY IF EXISTS enrollments_admin_all ON enrollments;

-- Policy for users: can only see and manage their own enrollments
CREATE POLICY enrollments_user_own ON enrollments
    FOR ALL
    TO PUBLIC
    USING (
        current_setting('rls.current_user_role', true) = 'admin'
        OR
        (current_setting('rls.current_user_role', true) = 'user' 
         AND user_id::text = current_setting('rls.current_user_id', true))
    )
    WITH CHECK (
        current_setting('rls.current_user_role', true) = 'admin'
        OR
        (current_setting('rls.current_user_role', true) = 'user' 
         AND user_id::text = current_setting('rls.current_user_id', true))
    );

-- Policy for admins: full access to all enrollments
CREATE POLICY enrollments_admin_all ON enrollments
    FOR ALL
    TO PUBLIC
    USING (current_setting('rls.current_user_role', true) = 'admin')
    WITH CHECK (current_setting('rls.current_user_role', true) = 'admin');