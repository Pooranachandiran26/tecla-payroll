import { useState, useCallback } from 'react';

/**
 * Hook to manage multiple modals by ID.
 * Usage: const { isOpen, openModal, closeModal } = useModals();
 *        openModal('addClient');
 *        isOpen('addClient') // true
 */
export default function useModals() {
  const [openModals, setOpenModals] = useState({});

  const openModal = useCallback((id) => {
    setOpenModals(prev => ({ ...prev, [id]: true }));
  }, []);

  const closeModal = useCallback((id) => {
    setOpenModals(prev => ({ ...prev, [id]: false }));
  }, []);

  const toggleModal = useCallback((id) => {
    setOpenModals(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const isOpen = useCallback((id) => {
    return !!openModals[id];
  }, [openModals]);

  return { isOpen, openModal, closeModal, toggleModal };
}
