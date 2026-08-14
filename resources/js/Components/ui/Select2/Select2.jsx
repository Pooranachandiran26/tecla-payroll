import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';

export default function Select2({
  value,
  onChange,
  options = [],
  placeholder = 'Select option...',
  searchable = true,
  disabled = false,
  className = '',
  id,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Find currently selected option
  const selectedOption = useMemo(() => {
    return options.find(opt => String(opt.value) === String(value));
  }, [options, value]);

  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return options;
    const query = searchTerm.toLowerCase();
    return options.filter(opt =>
      (opt.label && opt.label.toLowerCase().includes(query)) ||
      (opt.group && opt.group.toLowerCase().includes(query))
    );
  }, [options, searchTerm]);

  // Group filtered options
  const groupedOptions = useMemo(() => {
    const groups = {};
    const ungrouped = [];

    filteredOptions.forEach(opt => {
      if (opt.group) {
        if (!groups[opt.group]) groups[opt.group] = [];
        groups[opt.group].push(opt);
      } else {
        ungrouped.push(opt);
      }
    });

    return { groups, ungrouped };
  }, [filteredOptions]);

  const handleSelect = (val) => {
    onChange(val);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div
      ref={containerRef}
      id={id}
      style={{ position: 'relative', width: '100%' }}
      className={`select2-container ${className}`}
    >
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.55rem 0.85rem',
          fontSize: '0.875rem',
          lineHeight: '1.25rem',
          color: selectedOption ? '#1E293B' : '#94A3B8',
          backgroundColor: disabled ? '#F1F5F9' : '#FFFFFF',
          border: '1px solid #CBD5E1',
          borderRadius: '6px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          outline: 'none',
          boxShadow: isOpen ? '0 0 0 2px rgba(31, 56, 100, 0.2)' : 'none',
          borderColor: isOpen ? '#1F3864' : '#CBD5E1',
          transition: 'all 0.15s ease-in-out',
          textAlign: 'left'
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          size={16}
          style={{
            color: '#64748B',
            flexShrink: 0,
            marginLeft: '0.5rem',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease'
          }}
        />
      </button>

      {/* Dropdown Menu (Always Drops DOWN) */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            zIndex: 9999,
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '8px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            maxHeight: '260px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Search Box if list is long enough */}
          {searchable && options.length > 5 && (
            <div style={{ padding: '6px 8px', borderBottom: '1px solid #F1F5F9', backgroundColor: '#F8FAFC' }}>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Search size={14} style={{ position: 'absolute', left: '8px', color: '#94A3B8' }} />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search days..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '4px 8px 4px 28px',
                    fontSize: '0.8rem',
                    border: '1px solid #CBD5E1',
                    borderRadius: '4px',
                    outline: 'none',
                    backgroundColor: '#FFFFFF'
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setIsOpen(false);
                  }}
                />
              </div>
            </div>
          )}

          {/* Options List */}
          <div style={{ overflowY: 'auto', flex: 1, padding: '4px 0' }}>
            {filteredOptions.length === 0 ? (
              <div style={{ padding: '12px', textAlign: 'center', color: '#94A3B8', fontSize: '0.85rem' }}>
                No options found
              </div>
            ) : (
              <>
                {/* Ungrouped items */}
                {groupedOptions.ungrouped.map(opt => {
                  const isSelected = String(opt.value) === String(value);
                  return (
                    <div
                      key={opt.value}
                      onClick={() => handleSelect(opt.value)}
                      style={{
                        padding: '7px 12px',
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: isSelected ? '#EFF6FF' : 'transparent',
                        color: isSelected ? '#1E40AF' : '#334155',
                        fontWeight: isSelected ? 600 : 400,
                        transition: 'background-color 0.1s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = '#F8FAFC';
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <span>{opt.label}</span>
                      {isSelected && <Check size={14} style={{ color: '#1E40AF' }} />}
                    </div>
                  );
                })}

                {/* Grouped items */}
                {Object.entries(groupedOptions.groups).map(([groupName, groupItems]) => (
                  <div key={groupName}>
                    <div
                      style={{
                        padding: '6px 12px 4px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        color: '#64748B',
                        backgroundColor: '#F8FAFC',
                        borderTop: '1px solid #F1F5F9',
                        borderBottom: '1px solid #F1F5F9',
                        position: 'sticky',
                        top: 0,
                        zIndex: 1
                      }}
                    >
                      {groupName}
                    </div>
                    {groupItems.map(opt => {
                      const isSelected = String(opt.value) === String(value);
                      return (
                        <div
                          key={opt.value}
                          onClick={() => handleSelect(opt.value)}
                          style={{
                            padding: '7px 12px 7px 18px',
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            backgroundColor: isSelected ? '#EFF6FF' : 'transparent',
                            color: isSelected ? '#1E40AF' : '#334155',
                            fontWeight: isSelected ? 600 : 400,
                            transition: 'background-color 0.1s ease'
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) e.currentTarget.style.backgroundColor = '#F8FAFC';
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          <span>{opt.label}</span>
                          {isSelected && <Check size={14} style={{ color: '#1E40AF' }} />}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
