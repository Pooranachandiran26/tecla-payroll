import { useEffect } from 'react';
import { router, usePage } from '@inertiajs/react';
import { useRole, ROLE_DASHBOARDS } from '../Contexts/RoleContext.jsx';

/**
 * RoleGuard — prevents unauthorized role or module permission access to a page.
 */
export default function RoleGuard({ allowedRoles = [], moduleKey = null, children }) {
  const { role } = useRole();
  const { auth } = usePage().props;

  let isAllowed = allowedRoles.includes(role);

  if (isAllowed && moduleKey && role === 'manager') {
    const userPermissions = auth?.user?.module_permissions;
    if (userPermissions && Array.isArray(userPermissions) && userPermissions.length > 0) {
      isAllowed = userPermissions.includes(moduleKey);
    }
  }

  useEffect(() => {
    if (!isAllowed) {
      const redirectTo = ROLE_DASHBOARDS[role] || '/dashboard';
      router.visit(redirectTo);
    }
  }, [isAllowed, role]);

  if (!isAllowed) {
    return null;
  }

  return children;
}
