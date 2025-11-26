import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
    startOfDay, 
    startOfWeek, 
    startOfMonth, 
    startOfYear,
    subDays, 
    subWeeks, 
    subMonths,
    isWithinInterval,
    parseISO
} from 'date-fns';
import { StorageService } from '../services/storage';
import { ItemCard } from './ItemCard';
import type { Item, SortOption, FilterOption } from '../types';

interface FeedProps {
    storage: StorageService;
    filterBy?: FilterOption;
    sortBy?: SortOption;
    searchQuery?: string;
}

// Parse natural language date queries
function parseDateQuery(query: string): { start: Date; end: Date } | null {
    const now = new Date();
    const today = startOfDay(now);
    const q = query.toLowerCase().trim();

    if (q === 'today') {
        return { start: today, end: now };
    }
    if (q === 'yesterday') {
        const yesterday = subDays(today, 1);
        return { start: yesterday, end: today };
    }
    if (q === 'this week' || q === 'week') {
        return { start: startOfWeek(now), end: now };
    }
    if (q === 'last week') {
        const lastWeekStart = startOfWeek(subWeeks(now, 1));
        const lastWeekEnd = startOfWeek(now);
        return { start: lastWeekStart, end: lastWeekEnd };
    }
    if (q === 'recent' || q === 'recently' || q === 'a few days ago' || q === 'few days ago') {
        return { start: subDays(now, 3), end: now };
    }
    if (q === 'a week ago' || q === 'week ago') {
        return { start: subDays(now, 10), end: subDays(now, 4) };
    }
    if (q === 'a few weeks ago' || q === 'few weeks ago' || q === 'weeks ago') {
        return { start: subWeeks(now, 4), end: subWeeks(now, 1) };
    }
    if (q === 'this month' || q === 'month') {
        return { start: startOfMonth(now), end: now };
    }
    if (q === 'last month') {
        const lastMonthStart = startOfMonth(subMonths(now, 1));
        const lastMonthEnd = startOfMonth(now);
        return { start: lastMonthStart, end: lastMonthEnd };
    }
    if (q === 'a few months ago' || q === 'few months ago' || q === 'months ago') {
        return { start: subMonths(now, 6), end: subMonths(now, 1) };
    }
    if (q === 'this year' || q === 'year') {
        return { start: startOfYear(now), end: now };
    }
    if (q === 'last year') {
        const lastYearStart = startOfYear(subMonths(now, 12));
        const lastYearEnd = startOfYear(now);
        return { start: lastYearStart, end: lastYearEnd };
    }

    const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
    const shortMonths = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    
    let monthIndex = months.indexOf(q);
    if (monthIndex === -1) monthIndex = shortMonths.indexOf(q);
    
    if (monthIndex !== -1) {
        const year = monthIndex <= now.getMonth() ? now.getFullYear() : now.getFullYear() - 1;
        const monthStart = new Date(year, monthIndex, 1);
        const monthEnd = new Date(year, monthIndex + 1, 0, 23, 59, 59);
        return { start: monthStart, end: monthEnd };
    }

    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayIndex = days.indexOf(q);
    if (dayIndex !== -1) {
        const currentDay = now.getDay();
        const daysAgo = currentDay >= dayIndex ? currentDay - dayIndex : 7 - (dayIndex - currentDay);
        const targetDay = subDays(today, daysAgo === 0 ? 7 : daysAgo);
        return { start: targetDay, end: subDays(targetDay, -1) };
    }

    return null;
}

export function Feed({ storage, filterBy = 'all', sortBy = 'date', searchQuery = '' }: FeedProps) {
    const queryClient = useQueryClient();

    const { data: items, isLoading, error, isFetching } = useQuery({
        queryKey: ['items'],
        queryFn: () => storage.getItems(),
        staleTime: 1000 * 60 * 2,
        initialData: () => {
            const cached = storage.getCachedItems();
            return cached.length > 0 ? cached : undefined;
        },
    });

    const filteredItems = useMemo(() => {
        if (!items) return [];
        let result = [...items];

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            
            const typeKeywords: Record<string, string> = {
                'image': 'image', 'images': 'image', 'photo': 'image', 'photos': 'image',
                'note': 'note', 'notes': 'note', 'text': 'note',
                'link': 'link', 'links': 'link', 'url': 'link', 'urls': 'link',
            };
            
            if (typeKeywords[query]) {
                result = result.filter(i => i.type === typeKeywords[query]);
            } else {
                const dateRange = parseDateQuery(query);
                if (dateRange) {
                    result = result.filter(i => {
                        try {
                            const itemDate = parseISO(i.createdAt);
                            return isWithinInterval(itemDate, { start: dateRange.start, end: dateRange.end });
                        } catch {
                            return false;
                        }
                    });
                } else {
                    result = result.filter(i => 
                        (i.content && i.content.toLowerCase().includes(query)) ||
                        (i.title && i.title.toLowerCase().includes(query)) ||
                        (i.description && i.description.toLowerCase().includes(query)) ||
                        (i.tags && i.tags.some(t => t.toLowerCase().includes(query))) ||
                        (i.type && i.type.toLowerCase().includes(query))
                    );
                }
            }
        }

        switch (filterBy) {
            case 'notes': result = result.filter(i => i.type === 'note'); break;
            case 'links': result = result.filter(i => i.type === 'link'); break;
            case 'images': result = result.filter(i => i.type === 'image'); break;
            case 'starred': result = result.filter(i => i.starred); break;
            case 'archived': result = result.filter(i => i.archived); break;
            default: result = result.filter(i => !i.archived);
        }

        result.sort((a, b) => {
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;

            const dateA = new Date(a.createdAt).getTime();
            const dateB = new Date(b.createdAt).getTime();

            if (sortBy === 'date') {
                return dateB - dateA;
            } else if (sortBy === 'oldest') {
                return dateA - dateB;
            }
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
                <div className="empty-state">
                    Double-click anywhere to add something
                </div>
            )}
        </div>
    );
}
