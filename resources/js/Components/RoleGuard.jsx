import { usePage } from '@inertiajs/react';
import { useRole } from '../Contexts/RoleContext.jsx';
import Error from '../Pages/Error';

/**
 * RoleGuard — prevents unauthorized role or module permission access to a page.
 * Renders the 403 Error page design if access is restricted.
 */
export default function RoleGuard({ allowedRoles = [], moduleKey = null, children }) {
  const { role } = useRole();
  const { auth } = usePage().props;

  const safeAllowedRoles = Array.isArray(allowedRoles) ? allowedRoles : [];
  let isAllowed = safeAllowedRoles.includes(role);

  if (isAllowed && moduleKey && role === 'manager') {
    const userPermissions = auth?.user?.module_permissions;
    if (userPermissions && Array.isArray(userPermissions) && userPermissions.length > 0) {
      isAllowed = userPermissions.includes(moduleKey);
    }
  }

  if (!isAllowed) {
    const moduleName = moduleKey ? moduleKey.charAt(0).toUpperCase() + moduleKey.slice(1) : null;
    const msg = moduleName
      ? `Access Restricted: Your account role does not have permission to access the ${moduleName} module.`
      : 'Access Restricted: You do not have permission to view this page.';

    return <Error status={403} message={msg} />;
  }

  return children;
}
