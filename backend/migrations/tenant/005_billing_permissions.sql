INSERT INTO permissions (code, description, category) VALUES
('billing:read', 'View subscription and usage billing', 'billing'),
('billing:write', 'Manage subscription changes', 'billing')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'admin' AND p.code IN ('billing:read', 'billing:write')
ON CONFLICT DO NOTHING;
