-- Enable Row Level Security on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS users_user_select ON users;
DROP POLICY IF EXISTS users_user_update ON users;
DROP POLICY IF EXISTS users_admin_all ON users;

-- Policy for regular users: can only see and update their own record
CREATE POLICY users_user_select ON users
    FOR SELECT
    TO PUBLIC
    USING (
        current_setting('rls.current_user_role', true) = 'admin' 
        OR 
        (current_setting('rls.current_user_role', true) = 'user' 
         AND id::text = current_setting('rls.current_user_id', true))
    );

-- Policy for regular users: can only update their own record (excluding role and is_admin)
CREATE POLICY users_user_update ON users
    FOR UPDATE
    TO PUBLIC
    USING (
        current_setting('rls.current_user_role', true) = 'admin'
        OR
        (current_setting('rls.current_user_role', true) = 'user' 
         AND id::text = current_setting('rls.current_user_id', true))
    )
    WITH CHECK (
        current_setting('rls.current_user_role', true) = 'admin'
        OR
        (current_setting('rls.current_user_role', true) = 'user' 
         AND id::text = current_setting('rls.current_user_id', true)
         AND role = 'user' 
         AND is_admin = false)
    );

-- Policy for admins: full access to all records
CREATE POLICY users_admin_all ON users
    FOR ALL
    TO PUBLIC
    USING (current_setting('rls.current_user_role', true) = 'admin')
    WITH CHECK (current_setting('rls.current_user_role', true) = 'admin');

-- Policy for insert (signup): anyone can insert but role/is_admin are controlled
CREATE POLICY users_insert ON users
    FOR INSERT
    TO PUBLIC
    WITH CHECK (
        -- Admin signup: must have admin role and is_admin = true
        (current_setting('rls.current_user_role', true) = 'admin' AND role = 'admin' AND is_admin = true)
        OR
        -- User signup: must have user role and is_admin = false
        (role = 'user' AND is_admin = false)
    );