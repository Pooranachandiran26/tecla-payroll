import { useState, useCallback } from 'react';

/**
 * Hook to manage tab state.
 * Usage: const { activeTab, setActiveTab } = useTabs('overview');
 */
export default function useTabs(defaultTab = '') {
  const [activeTab, setActiveTab] = useState(defaultTab);

  const changeTab = useCallback((tab) => {
    setActiveTab(tab);
  }, []);

  return { activeTab, setActiveTab: changeTab };
}
