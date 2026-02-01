-- Enable Row Level Security on admin_activity_logs table
ALTER TABLE admin_activity_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS admin_activity_logs_admin_only ON admin_activity_logs;

-- Policy for admins only: only admins can see and manage activity logs
CREATE POLICY admin_activity_logs_admin_only ON admin_activity_logs
    FOR ALL
    TO PUBLIC
    USING (current_setting('rls.current_user_role', true) = 'admin')
    WITH CHECK (current_setting('rls.current_user_role', true) = 'admin');