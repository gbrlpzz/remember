import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { StorageService } from '../services/storage';
import { ItemCard } from './ItemCard';
import type { Item, SortOption, FilterOption } from '../types';

interface FeedProps {
    storage: StorageService;
    filterBy?: FilterOption;
    sortBy?: SortOption;
    searchQuery?: string;
}

export function Feed({ storage, filterBy = 'all', sortBy = 'date', searchQuery = '' }: FeedProps) {
    const queryClient = useQueryClient();
    // Local filter state removed in favor of props
    // const [filterBy, setFilterBy] = useState<FilterOption>('all');

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

        // Search (simple implementation)
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(i => 
                (i.content && i.content.toLowerCase().includes(query)) ||
                (i.title && i.title.toLowerCase().includes(query)) ||
                (i.description && i.description.toLowerCase().includes(query)) ||
                (i.tags && i.tags.some(t => t.toLowerCase().includes(query)))
            );
        }

        // Filter
        switch (filterBy) {
            case 'notes': result = result.filter(i => i.type === 'note'); break;
            case 'links': result = result.filter(i => i.type === 'link'); break;
            case 'images': result = result.filter(i => i.type === 'image'); break;
            case 'starred': result = result.filter(i => i.starred); break;
            case 'archived': result = result.filter(i => i.archived); break;
            default: result = result.filter(i => !i.archived);
        }

        // Sort
        result.sort((a, b) => {
            // Pinned always first
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;

            const dateA = new Date(a.createdAt).getTime();
            const dateB = new Date(b.createdAt).getTime();

            // Then by sort option
            if (sortBy === 'date') {
                return dateB - dateA; // Newest first
            } else if (sortBy === 'oldest') {
                return dateA - dateB;
            }
            // Random or other sorts can be added here
            return 0;
        });

        return result;
    }, [items, filterBy, sortBy, searchQuery]);

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
        return <div className="text-mono" style={{ padding: '40px 0', opacity: 0.5, textAlign: 'center' }}>...</div>;
    }

    if (error) {
        return <div className="text-mono" style={{ color: 'red' }}>ERROR LOADING DATA</div>;
    }

    return (
        <div>
            {/* Filters now controlled by Navigation Sidebar */}

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
                <div style={{ padding: '20vh 0', textAlign: 'center', color: '#eee', fontSize: '2rem', letterSpacing: '-0.05em', fontWeight: 300 }}>
                    void
                </div>
            )}
        </div>
    );
}
