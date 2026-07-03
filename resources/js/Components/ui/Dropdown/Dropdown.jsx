import { useState, useRef, useEffect } from 'react';

export default function Dropdown({ trigger, items = [], align = 'right' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <div onClick={() => setOpen(!open)} style={{ cursor: 'pointer' }}>
        {trigger}
      </div>
      {open && (
        <div className="dropdown-menu" style={align === 'left' ? { left: 0, right: 'auto' } : {}}>
          {items.map((item, i) => {
            if (item.divider) return <div key={i} className="dropdown-divider" />;
            return (
              <button
                key={i}
                className="dropdown-item"
                onClick={() => { item.onClick?.(); setOpen(false); }}
              >
                {item.icon && <item.icon size={14} />}
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
