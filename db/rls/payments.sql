-- Enable Row Level Security on payments table
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS payments_user_own ON payments;
DROP POLICY IF EXISTS payments_admin_all ON payments;

-- Policy for users: can only see and manage their own payments
CREATE POLICY payments_user_own ON payments
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

-- Policy for admins: full access to all payments
CREATE POLICY payments_admin_all ON payments
    FOR ALL
    TO PUBLIC
    USING (current_setting('rls.current_user_role', true) = 'admin')
    WITH CHECK (current_setting('rls.current_user_role', true) = 'admin');