import type { Item } from '../types';

const CACHE_KEY = 'mnemosyne_items_cache';
const CACHE_TTL = 1000 * 60 * 5; // 5 minutes

interface CacheData {
    items: Item[];
    timestamp: number;
}

export class CacheService {
    private memoryCache: Map<string, Item> = new Map();
    private lastSync: number = 0;

    load(): Item[] | null {
        try {
            const data = localStorage.getItem(CACHE_KEY);
            if (!data) return null;
            
            const parsed: CacheData = JSON.parse(data);
            
            // Check if cache is still valid and has items
            if (Date.now() - parsed.timestamp > CACHE_TTL) {
                return null;
            }
            
            // Don't return empty caches - treat them as invalid
            if (!parsed.items || parsed.items.length === 0) {
                return null;
            }
            
            // Populate memory cache
            parsed.items.forEach(item => this.memoryCache.set(item.id, item));
            this.lastSync = parsed.timestamp;
            
            return parsed.items;
        } catch {
            return null;
        }
    }

    save(items: Item[]): void {
        this.memoryCache.clear();
        items.forEach(item => this.memoryCache.set(item.id, item));
        this.lastSync = Date.now();
        
        const data: CacheData = {
            items,
            timestamp: this.lastSync,
        };
        
        try {
            localStorage.setItem(CACHE_KEY, JSON.stringify(data));
        } catch (e) {
            console.warn('Failed to save to localStorage cache', e);
        }
    }

    get(id: string): Item | undefined {
        return this.memoryCache.get(id);
    }

    set(item: Item): void {
        this.memoryCache.set(item.id, item);
        this.persistToStorage();
    }

    update(id: string, updates: Partial<Item>): Item | undefined {
        const existing = this.memoryCache.get(id);
        if (!existing) return undefined;
        
        const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
        this.memoryCache.set(id, updated);
        this.persistToStorage();
        return updated;
    }

    delete(id: string): boolean {
        const deleted = this.memoryCache.delete(id);
        if (deleted) {
            this.persistToStorage();
        }
        return deleted;
    }

    getAll(): Item[] {
        return Array.from(this.memoryCache.values());
    }

    clear(): void {
        this.memoryCache.clear();
        localStorage.removeItem(CACHE_KEY);
    }

    isStale(): boolean {
        return Date.now() - this.lastSync > CACHE_TTL;
    }

    private persistToStorage(): void {
        const items = this.getAll();
        const data: CacheData = {
            items,
            timestamp: Date.now(),
        };
        
        try {
            localStorage.setItem(CACHE_KEY, JSON.stringify(data));
        } catch (e) {
            console.warn('Failed to persist cache', e);
        }
    }
}

// Singleton instance
export const cache = new CacheService();

