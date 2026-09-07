import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Music } from 'lucide-react';
import { getAllSongsApi, searchSongsApi } from '../services/api';
import { searchSongsClient } from '../utils/searchSongs';

export default function GuessAutocomplete({ value, onChange, onSelect, onSubmit }) {
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [allSongs, setAllSongs] = useState([]);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Preload songs on component mount for instant 0ms searches
  useEffect(() => {
    getAllSongsApi().then((songs) => {
      if (songs && songs.length > 0) {
        setAllSongs(songs);
      }
    });
  }, []);

  useEffect(() => {
    if (!value || value.trim().length === 0) {
      setSuggestions([]);
      setIsOpen(false);
      setSelectedIndex(-1);
      return;
    }

    const trimmed = value.trim();

    // 1. Instant client-side search (0ms)
    if (allSongs && allSongs.length > 0) {
      const results = searchSongsClient(allSongs, trimmed);
      setSuggestions(results);
      setIsOpen(results.length > 0);
      setSelectedIndex(-1);
      return;
    }

    // 2. Fallback to API if catalog is still downloading
    const handler = setTimeout(async () => {
      try {
        const results = await searchSongsApi(trimmed);
        setSuggestions(results || []);
        setIsOpen((results && results.length > 0) || false);
        setSelectedIndex(-1);
      } catch (err) {
        setSuggestions([]);
      }
    }, 100);

    return () => clearTimeout(handler);
  }, [value, allSongs]);

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

  useEffect(() => {
    function handleGlobalKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

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
        {value && (
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
        )}
      </div>

      {isOpen && suggestions.length > 0 && (
        <div className="autocomplete-dropdown">
          {suggestions.map((item, index) => (
            <div
              key={item.id}
              className={`autocomplete-item ${index === selectedIndex ? 'selected' : ''}`}
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelectItem(item);
              }}
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
