import React, { useEffect, useState } from 'react';

export default function Toast({ message }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (message) {
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  return (
    <div id="toast" style={{
      position: 'fixed', bottom: '1.5rem', right: '1.5rem',
      background: 'var(--primary-navy)', color: 'white',
      padding: '0.75rem 1.25rem', borderRadius: 'var(--radius-md)',
      fontSize: '0.875rem', fontWeight: '500', boxShadow: 'var(--shadow-lg)',
      transform: visible ? 'translateY(0)' : 'translateY(100px)',
      opacity: visible ? '1' : '0', transition: 'all 0.3s', zIndex: 9999,
    }}>
      {message || '✅ Changes saved!'}
    </div>
  );
}
