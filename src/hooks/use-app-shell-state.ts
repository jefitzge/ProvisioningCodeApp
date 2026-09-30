import { useEffect, useState } from 'react';

export const useAppShellState = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => window.localStorage.getItem('provisioning-hub-sidebar-collapsed') === 'true',
  );


  useEffect(() => {
    window.localStorage.setItem('provisioning-hub-sidebar-collapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  return { sidebarCollapsed, setSidebarCollapsed };
};
