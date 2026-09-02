import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Music } from 'lucide-react';
import { searchSongsApi } from '../services/api';

export default function GuessAutocomplete({ value, onChange, onSelect, onSubmit }) {
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!value || value.trim().length === 0) {
      setSuggestions([]);
      setIsOpen(false);
      setSelectedIndex(-1);
      return;
    }

    setIsLoading(true);
    const handler = setTimeout(async () => {
      try {
        const results = await searchSongsApi(value.trim());
        setSuggestions(results || []);
        setIsOpen((results && results.length > 0) || false);
        setSelectedIndex(-1);
      } catch (err) {
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, 150);

    return () => clearTimeout(handler);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (suggestions.length > 0) {
        setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
        setIsOpen(true);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (suggestions.length > 0) {
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
        setIsOpen(true);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (isOpen && selectedIndex >= 0 && suggestions[selectedIndex]) {
        handleSelectItem(suggestions[selectedIndex]);
      } else if (onSubmit) {
        onSubmit();
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleSelectItem = (item) => {
    const formatted = `${item.title} - ${item.artist}`;
    onSelect(formatted, item);
    setIsOpen(false);
    setSelectedIndex(-1);
  };

  return (
    <div className="guess-section" ref={containerRef}>
      <div className="search-input-wrapper">
        <input
          ref={inputRef}
          type="text"
          className="input-field"
          placeholder="Search Ethiopian song title or artist..."
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
          }}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
        />
        {value ? (
          <button
            type="button"
            className="search-icon-btn"
            onClick={() => {
              onChange('');
              setSuggestions([]);
              setIsOpen(false);
              inputRef.current?.focus();
            }}
            title="Clear search"
          >
            <X size={16} />
          </button>
        ) : (
          <Search size={18} className="search-icon" />
        )}
      </div>

      {isOpen && suggestions.length > 0 && (
        <div className="autocomplete-dropdown">
          {suggestions.map((item, index) => (
            <div
              key={item.id}
              className={`autocomplete-item ${index === selectedIndex ? 'selected' : ''}`}
              onClick={() => handleSelectItem(item)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <div style={{ flex: 1 }}>
                <div className="item-title">{item.title}</div>
                <div className="item-artist">{item.artist} {item.album ? `• ${item.album}` : ''}</div>
              </div>
              <span className="select-badge">Select</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
