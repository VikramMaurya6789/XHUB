'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SearchIcon } from './Icons';
import { trackSearch } from '@/lib/discovery';

/**
 * Search input with debounced (300ms) title autocomplete.
 * Suggestions come from /api/suggest (lightweight catalog title index).
 * Submitting tracks the term in xhub_searches for Trending searches.
 */
export default function SearchAutocomplete({ autoFocus = false }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const timerRef = useRef(null);
  const wrapRef = useRef(null);

  // Debounced suggestion fetch
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const q = query.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    timerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/suggest?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setSuggestions(data.suggestions || []);
        setOpen(true);
        setHighlight(-1);
      } catch {
        setSuggestions([]);
      }
    }, 300);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query]);

  // Close dropdown on outside click
  useEffect(() => {
    const onDocClick = e => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const submit = term => {
    const t = String(term ?? query).trim();
    if (!t) return;
    trackSearch(t);
    setOpen(false);
    setQuery(t);
    router.push(`/search?q=${encodeURIComponent(t)}`);
  };

  const handleKeyDown = e => {
    if (e.key === 'ArrowDown' && open && suggestions.length > 0) {
      e.preventDefault();
      setHighlight(h => (h + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp' && open && suggestions.length > 0) {
      e.preventDefault();
      setHighlight(h => (h - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter' && open && highlight >= 0 && suggestions[highlight]) {
      e.preventDefault();
      submit(suggestions[highlight].title);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={wrapRef} className="search-autocomplete-wrap">
      <form
        onSubmit={e => {
          e.preventDefault();
          submit();
        }}
        className="search-form"
      >
        <SearchIcon className="search-icon" size={17} />
        <input
          type="text"
          className="search-input"
          placeholder="Search videos, categories, models..."
          value={query}
          autoFocus={autoFocus}
          onChange={e => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            if (suggestions.length > 0) setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          aria-label="Search videos"
        />
        <button type="submit" className="search-btn-icon" aria-label="Search">
          <SearchIcon size={14} />
        </button>
      </form>

      {open && query.trim().length >= 2 && (
        <div className="search-suggest-dropdown" role="listbox">
          <button
            type="button"
            className="search-suggest-item search-suggest-query"
            onClick={() => submit()}
          >
            <SearchIcon size={14} />
            <span>Search for &ldquo;{query.trim()}&rdquo;</span>
          </button>
          {suggestions.map((s, i) => (
            <button
              type="button"
              key={`${s.vkey}-${i}`}
              className={`search-suggest-item ${highlight === i ? 'highlighted' : ''}`}
              onMouseEnter={() => setHighlight(i)}
              onClick={() => submit(s.title)}
              role="option"
              aria-selected={highlight === i}
            >
              <SearchIcon size={13} />
              <span className="search-suggest-title">{s.title}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
