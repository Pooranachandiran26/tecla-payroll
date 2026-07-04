import { useCallback } from 'react';
import { usePage } from '@inertiajs/react';

const ROLE_DASHBOARDS = {
  admin: '/dashboard',
  manager: '/dashboard',
  client: '/client/dashboard',
  employee: '/employee/dashboard',
};

// We leave this exported for backwards compatibility with any file that
// might be importing it, though it just renders children now.
export function RoleProvider({ children }) {
  return children;
}

export function useRole() {
  const { auth } = usePage().props;
  const role = auth?.user?.role || 'guest';

  const setRole = useCallback((newRole) => {
    console.warn("setRole is deprecated. Roles are now managed via server authentication.");
  }, []);

  return { role, setRole };
}

export { ROLE_DASHBOARDS };
// Exporting an empty object as default for backwards compatibility if anyone imported it
export default {};
