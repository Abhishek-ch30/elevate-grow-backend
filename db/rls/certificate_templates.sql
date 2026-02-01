-- Enable Row Level Security on certificate_templates table
ALTER TABLE certificate_templates ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS certificate_templates_select ON certificate_templates;
DROP POLICY IF EXISTS certificate_templates_admin_all ON certificate_templates;

-- Policy for select: users can see active templates, admins can see all
CREATE POLICY certificate_templates_select ON certificate_templates
    FOR SELECT
    TO PUBLIC
    USING (
        current_setting('rls.current_user_role', true) = 'admin'
        OR
        (current_setting('rls.current_user_role', true) = 'user' AND is_active = true)
    );

-- Policy for admins: full access (insert, update, delete)
CREATE POLICY certificate_templates_admin_all ON certificate_templates
    FOR ALL
    TO PUBLIC
    USING (current_setting('rls.current_user_role', true) = 'admin')
    WITH CHECK (current_setting('rls.current_user_role', true) = 'admin');