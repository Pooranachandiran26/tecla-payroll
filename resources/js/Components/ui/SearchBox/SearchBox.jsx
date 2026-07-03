import { Search, X } from 'lucide-react';

export default function SearchBox({
  value, onChange, placeholder = 'Search...', onClear, className = '',
}) {
  return (
    <div className={`search-box-wrapper ${className}`}>
      <Search size={16} className="search-box-icon" />
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="form-control search-box-input"
      />
      {value && (
        <button className="search-box-clear" onClick={onClear} type="button">
          <X size={14} />
        </button>
      )}
    </div>
  );
}
