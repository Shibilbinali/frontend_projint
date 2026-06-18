import { useState } from 'react';
import { Search, X } from 'lucide-react';

/**
 * SearchInput — only fires onSearch when:
 *   - The Search button is clicked, OR
 *   - Enter key is pressed
 *
 * Typing freely updates the local input without triggering any API call.
 */
export default function SearchInput({
  value,          // committed search term (from parent state)
  onSearch,       // called with the search string when user submits
  placeholder = 'Search...',
  style,
}) {
  // Internal draft: what the user is currently typing
  const [draft, setDraft] = useState(value || '');

  const performSearch = () => {
    if (onSearch) onSearch(draft);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      performSearch();
    }
  };

  const handleClear = () => {
    setDraft('');
    if (onSearch) onSearch('');
  };

  return (
    <div className="input-wrapper" style={{ minWidth: 240, ...style }}>
      <span className="input-icon">
        <Search size={16} />
      </span>
      <input
        type="text"
        className="input"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        style={{ paddingRight: draft ? 72 : 44 }}
      />
      {/* Clear button — only when there's text */}
      {draft && (
        <button
          type="button"
          onClick={handleClear}
          title="Clear search"
          style={{
            position: 'absolute',
            right: 40,
            background: 'none',
            border: 'none',
            color: 'var(--color-text-muted)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            padding: '0 4px',
            lineHeight: 1,
          }}
        >
          <X size={14} />
        </button>
      )}
      {/* Search button */}
      <button
        type="button"
        onClick={performSearch}
        title="Search"
        style={{
          position: 'absolute',
          right: 6,
          background: 'var(--color-primary)',
          border: 'none',
          borderRadius: 'var(--radius-sm)',
          color: '#fff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 28,
          height: 28,
          flexShrink: 0,
          transition: 'background 0.15s ease',
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-primary-dark, #c0392b)'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'var(--color-primary)'}
      >
        <Search size={13} />
      </button>
    </div>
  );
}
