import React, { createContext, useContext, useState, useCallback } from 'react';
import { router } from '@inertiajs/react';

const RoleContext = createContext(null);

// Dashboard redirect map — mirrors legacy script.js role switcher behavior
const ROLE_DASHBOARDS = {
  admin: '/dashboard',
  executive: '/dashboard',
  client: '/client/dashboard',
  candidate: '/employee/dashboard',
};

export function RoleProvider({ children }) {
  const [role, setRoleState] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('tecla_simulator_role') || 'admin';
    }
    return 'admin';
  });

  const setRole = useCallback((newRole) => {
    setRoleState(newRole);
    localStorage.setItem('tecla_simulator_role', newRole);

    // Redirect to the correct portal dashboard (same as legacy script.js)
    const targetDashboard = ROLE_DASHBOARDS[newRole] || '/dashboard';
    router.visit(targetDashboard);
  }, []);

  return (
    <RoleContext.Provider value={{ role, setRole }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
}

export { ROLE_DASHBOARDS };
export default RoleContext;
