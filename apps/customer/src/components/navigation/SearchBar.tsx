'use client'

import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  X,
  Filter,
  Mic,
  TrendingUp,
  Clock
} from 'lucide-react'

interface SearchBarProps {
  placeholder?: string
  onSearch?: (query: string) => void
  onFilter?: () => void
  onVoiceSearch?: () => void
  showRecentSearches?: boolean
  recentSearches?: string[]
  className?: string
  autoFocus?: boolean
}

const SearchBar: React.FC<SearchBarProps> = ({
  placeholder = "Search delicious food...",
  onSearch,
  onFilter,
  onVoiceSearch,
  showRecentSearches = true,
  recentSearches = [],
  className = '',
  autoFocus = false
}) => {
  const [query, setQuery] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const popularSearches = [
    'Pizza', 'Burger', 'Pasta', 'Salad', 'Dessert', 'Coffee'
  ]

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus()
    }
  }, [autoFocus])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setQuery(value)
    setShowSuggestions(true)

    if (onSearch) {
      onSearch(value)
    }
  }

  const handleClear = () => {
    setQuery('')
    setShowSuggestions(false)
    if (onSearch) {
      onSearch('')
    }
    inputRef.current?.focus()
  }

  const handleFocus = () => {
    setIsFocused(true)
    if (query.length === 0) {
      setShowSuggestions(true)
    }
  }

  const handleBlur = () => {
    setIsFocused(false)
    // Delay hiding suggestions to allow clicking on them
    setTimeout(() => setShowSuggestions(false), 200)
  }

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion)
    setShowSuggestions(false)
    if (onSearch) {
      onSearch(suggestion)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim() && onSearch) {
      onSearch(query.trim())
    }
    setShowSuggestions(false)
    inputRef.current?.blur()
  }

  return (
    <div className={`relative w-full ${className}`}>
      {/* Search Input Container */}
      <motion.form
        onSubmit={handleSubmit}
        className="relative"
        animate={{
          scale: isFocused ? 1.02 : 1,
        }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        <div className="relative flex items-center">
          {/* Search Input */}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={placeholder}
            className={`w-full h-12 pl-12 pr-20 rounded-2xl bg-surface border transition-all duration-200 text-body placeholder:text-content-tertiary ${
              isFocused
                ? 'border-border-focus shadow-lg bg-surface-elevated'
                : 'border-border shadow-sm hover:border-border-secondary'
            }`}
          />

          {/* Search Icon */}
          <div className="absolute left-4 flex items-center">
            <Search
              size={20}
              className={`transition-colors duration-200 ${
                isFocused ? 'text-primary' : 'text-content-tertiary'
              }`}
            />
          </div>

          {/* Action Buttons */}
          <div className="absolute right-3 flex items-center gap-1">
            {/* Clear Button */}
            <AnimatePresence>
              {query && (
                <motion.button
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  type="button"
                  onClick={handleClear}
                  className="p-1.5 rounded-full hover:bg-interactive-hover transition-colors duration-200"
                >
                  <X size={16} className="text-content-tertiary" />
                </motion.button>
              )}
            </AnimatePresence>

            {/* Voice Search Button */}
            {onVoiceSearch && (
              <motion.button
                type="button"
                onClick={onVoiceSearch}
                whileTap={{ scale: 0.95 }}
                className="p-1.5 rounded-full hover:bg-interactive-hover transition-colors duration-200"
              >
                <Mic size={16} className="text-content-tertiary" />
              </motion.button>
            )}

            {/* Filter Button */}
            {onFilter && (
              <motion.button
                type="button"
                onClick={onFilter}
                whileTap={{ scale: 0.95 }}
                className="p-1.5 rounded-full hover:bg-interactive-hover transition-colors duration-200"
              >
                <Filter size={16} className="text-content-tertiary" />
              </motion.button>
            )}
          </div>
        </div>
      </motion.form>

      {/* Search Suggestions Dropdown */}
      <AnimatePresence>
        {showSuggestions && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="absolute top-full left-0 right-0 mt-2 bg-surface-elevated border border-border rounded-2xl shadow-lg z-50 overflow-hidden"
          >
            {/* Recent Searches */}
            {showRecentSearches && recentSearches.length > 0 && query.length === 0 && (
              <div className="p-4 border-b border-border">
                <div className="flex items-center gap-2 mb-3">
                  <Clock size={16} className="text-content-tertiary" />
                  <span className="text-caption font-medium text-content-secondary">
                    Recent Searches
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recentSearches.slice(0, 4).map((search, index) => (
                    <motion.button
                      key={index}
                      onClick={() => handleSuggestionClick(search)}
                      whileTap={{ scale: 0.95 }}
                      className="px-3 py-1.5 rounded-full bg-background-secondary text-caption text-content-secondary hover:bg-interactive-hover transition-colors duration-200"
                    >
                      {search}
                    </motion.button>
                  ))}
                </div>
              </div>
            )}

            {/* Popular Searches */}
            {query.length === 0 && (
              <div className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp size={16} className="text-content-tertiary" />
                  <span className="text-caption font-medium text-content-secondary">
                    Popular Searches
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {popularSearches.map((search, index) => (
                    <motion.button
                      key={index}
                      onClick={() => handleSuggestionClick(search)}
                      whileTap={{ scale: 0.95 }}
                      className="flex items-center gap-2 p-3 rounded-xl hover:bg-interactive-hover transition-colors duration-200 text-left"
                    >
                      <Search size={14} className="text-content-tertiary flex-shrink-0" />
                      <span className="text-body-sm text-content-primary truncate">
                        {search}
                      </span>
                    </motion.button>
                  ))}
                </div>
              </div>
            )}

            {/* Search Results Preview */}
            {query.length > 0 && (
              <div className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Search size={16} className="text-content-tertiary" />
                  <span className="text-caption font-medium text-content-secondary">
                    Search for "{query}"
                  </span>
                </div>
                <button
                  onClick={() => handleSuggestionClick(query)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-interactive-hover transition-colors duration-200 text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                    <Search size={16} className="text-primary-foreground" />
                  </div>
                  <div>
                    <div className="text-body-sm font-medium text-content-primary">
                      Search for "{query}"
                    </div>
                    <div className="text-caption text-content-tertiary">
                      Find delicious items
                    </div>
                  </div>
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default SearchBar