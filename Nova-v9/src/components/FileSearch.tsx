import React, { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';

interface FileSearchProps {
  onSearch: (query: string) => void;
}

export default function FileSearch({ onSearch }: FileSearchProps) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const debounceTimeout = setTimeout(() => {
      onSearch(query);
    }, 300);

    return () => clearTimeout(debounceTimeout);
  }, [query, onSearch]);

  return (
    <div className="relative">
      <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6e6e6e]" />
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search files..."
        className="w-full bg-[#252526] rounded pl-8 pr-8 py-1.5 text-sm border border-[#2d2d2d] focus:outline-none focus:border-[#007acc] placeholder-[#6e6e6e]"
      />
      {query && (
        <button
          onClick={() => setQuery('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 hover:bg-[#2d2d2d] rounded"
        >
          <X className="w-3 h-3 text-[#6e6e6e]" />
        </button>
      )}
    </div>
  );
}