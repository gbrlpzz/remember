import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { StorageService } from '../services/storage';
import { ItemCard } from './ItemCard';
import type { Item, SortOption, FilterOption } from '../types';

interface FeedProps {
    storage: StorageService;
}

export function Feed({ storage }: FeedProps) {
    const queryClient = useQueryClient();
    const [filterBy, setFilterBy] = useState<FilterOption>('all');
    // Tag filtering can be added later as a specific feature, for now standard filters

    const { data: items, isLoading, error, isFetching } = useQuery({
        queryKey: ['items'],
        queryFn: () => storage.getItems(),
        staleTime: 1000 * 60 * 2,
        // Only use initialData if we actually have cached items
        initialData: () => {
            const cached = storage.getCachedItems();
            return cached.length > 0 ? cached : undefined;
        },
    });

    const filteredItems = useMemo(() => {
        if (!items) return [];
        let result = [...items];

        // Filter
        switch (filterBy) {
            case 'notes': result = result.filter(i => i.type === 'note'); break;
            case 'links': result = result.filter(i => i.type === 'link'); break;
            case 'images': result = result.filter(i => i.type === 'image'); break;
            case 'starred': result = result.filter(i => i.starred); break;
            case 'archived': result = result.filter(i => i.archived); break;
            default: result = result.filter(i => !i.archived);
        }

        // Always sort by pinned then date (Swiss design prefers structure over user choice sometimes)
        result.sort((a, b) => {
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

        return result;
    }, [items, filterBy]);

    const handleUpdate = (updatedItem: Item) => {
        queryClient.setQueryData<Item[]>(['items'], (old) => {
            if (!old) return [updatedItem];
            return old.map(i => i.id === updatedItem.id ? updatedItem : i);
        });
    };

    const handleDelete = (deletedItem: Item) => {
        queryClient.setQueryData<Item[]>(['items'], (old) => {
            if (!old) return [];
            return old.filter(i => i.id !== deletedItem.id);
        });
    };

    if (isLoading || (isFetching && !items?.length)) {
        return <div className="text-mono" style={{ padding: '40px 0', opacity: 0.5 }}>LOADING DATA...</div>;
    }

    if (error) {
        return <div className="text-mono" style={{ color: 'red' }}>ERROR LOADING DATA</div>;
    }

    return (
        <div>
            <div className="feed-toolbar">
                <div className="filter-group">
                    {['all', 'notes', 'links', 'images', 'starred', 'archived'].map(f => (
                        <button 
                            key={f}
                            className={`filter-btn ${filterBy === f ? 'active' : ''}`}
                            onClick={() => setFilterBy(f as FilterOption)}
                        >
                            {f.toUpperCase()}
                        </button>
                    ))}
                </div>
                <div className="text-mono" style={{ fontSize: '0.75rem' }}>
                    {filteredItems.length} ITEMS
                </div>
            </div>

            <div className="grid-swiss">
                {filteredItems.map((item) => (
                    <ItemCard 
                        key={item.id} 
                        item={item} 
                        storage={storage}
                        onUpdate={handleUpdate}
                        onDelete={handleDelete}
                    />
                ))}
            </div>
            
            {filteredItems.length === 0 && (
                <div style={{ padding: '80px 0', textAlign: 'center', color: '#999' }}>
                    NO ITEMS FOUND
                </div>
            )}
        </div>
    );
}
