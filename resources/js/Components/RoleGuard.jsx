import { useEffect } from 'react';
import { router } from '@inertiajs/react';
import { useRole, ROLE_DASHBOARDS } from '../Contexts/RoleContext.jsx';

/**
 * RoleGuard — prevents unauthorized role access to a page.
 * 
 * Usage:
 *   <RoleGuard allowedRoles={['admin', 'executive']}>
 *     <MyAdminPage />
 *   </RoleGuard>
 * 
 * If the current role is NOT in allowedRoles, it redirects the user
 * to their role's dashboard (e.g. client → /client/dashboard).
 */
export default function RoleGuard({ allowedRoles = [], children }) {
  const { role } = useRole();
  const isAllowed = allowedRoles.includes(role);

  useEffect(() => {
    if (!isAllowed) {
      const redirectTo = ROLE_DASHBOARDS[role] || '/dashboard';
      router.visit(redirectTo);
    }
  }, [isAllowed, role]);

  if (!isAllowed) {
    // Return null while redirecting to avoid flash of unauthorized content
    return null;
  }

  return children;
}
