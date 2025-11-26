import React, { useState, useEffect, useRef } from 'react';
import type { FilterOption, SortOption } from '../types';

interface NavigationProps {
    currentFilter: FilterOption;
    onFilterChange: (filter: FilterOption) => void;
    onSortChange: (sort: SortOption) => void;
    onSearch: (query: string) => void;
    onAdd: () => void;
    onLogout: () => void;
}

export function Navigation({ currentFilter, onFilterChange, onSortChange, onSearch, onAdd, onLogout }: NavigationProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 300); // Delay focus for animation
        }
    }, [isOpen]);

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
        onSearch(e.target.value);
    };

    const toggleOpen = () => {
        if (isOpen) {
            setIsOpen(false);
            setSearchQuery('');
            onSearch('');
        } else {
            setIsOpen(true);
        }
    };

    return (
        <div 
            className={`nav-trigger ${isOpen ? 'expanded' : ''}`} 
            onClick={!isOpen ? toggleOpen : undefined}
        >
            <input 
                ref={inputRef}
                type="text" 
                className="nav-search-pill"
                placeholder="Search archive..." 
                value={searchQuery}
                onChange={handleSearchChange}
                disabled={!isOpen}
            />
            
            {isOpen && (
                <div className="pill-close" onClick={(e) => { e.stopPropagation(); toggleOpen(); }}>
                    <div className="magic-cue cue-x" />
                </div>
            )}
        </div>
    );
}