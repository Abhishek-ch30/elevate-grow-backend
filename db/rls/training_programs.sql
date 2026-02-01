-- Enable Row Level Security on training_programs table
ALTER TABLE training_programs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS training_programs_select ON training_programs;
DROP POLICY IF EXISTS training_programs_admin_all ON training_programs;

-- Policy for select: users can see active training programs, admins can see all
CREATE POLICY training_programs_select ON training_programs
    FOR SELECT
    TO PUBLIC
    USING (
        current_setting('rls.current_user_role', true) = 'admin'
        OR
        (current_setting('rls.current_user_role', true) = 'user' AND is_active = true)
    );

-- Policy for admins: full access (insert, update, delete)
CREATE POLICY training_programs_admin_all ON training_programs
    FOR ALL
    TO PUBLIC
    USING (current_setting('rls.current_user_role', true) = 'admin')
    WITH CHECK (current_setting('rls.current_user_role', true) = 'admin');