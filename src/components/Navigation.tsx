import React, { useState, useEffect, useRef } from 'react';

interface NavigationProps {
    onSearch: (query: string) => void;
}

export function Navigation({ onSearch }: NavigationProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isHovering, setIsHovering] = useState(false);
    
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
        onSearch(e.target.value);
    };

    const closeSearch = () => {
        setIsOpen(false);
        setSearchQuery('');
        onSearch('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            closeSearch();
            inputRef.current?.blur();
        }
    };

    const handleMouseEnter = () => {
        setIsHovering(true);
        setIsOpen(true);
    };

    const handleMouseLeave = () => {
        setIsHovering(false);
        // Close if no search query
        if (!searchQuery) {
            setIsOpen(false);
        }
    };

    const handleBlur = () => {
        // Close if not hovering and no search query
        setTimeout(() => {
            if (!isHovering && !searchQuery) {
                setIsOpen(false);
            }
        }, 100);
    };

    return (
        <div 
            ref={containerRef}
            className={`nav-trigger ${isOpen ? 'expanded' : ''}`} 
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <input 
                ref={inputRef}
                type="text" 
                className="nav-search-pill"
                placeholder="Search..." 
                value={searchQuery}
                onChange={handleSearchChange}
                onKeyDown={handleKeyDown}
                onBlur={handleBlur}
            />
            
            {isOpen && searchQuery && (
                <div className="pill-close" onClick={(e) => { e.stopPropagation(); closeSearch(); }}>
                    <div className="magic-cue cue-x" />
                </div>
            )}
        </div>
    );
}
