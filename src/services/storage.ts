import { GitHubService } from './github';
import { cache } from './cache';
import type { Item } from '../types';

const REPO_NAME = 'mnemosyne-db';

export class StorageService {
    private github: GitHubService;
    private filePathMap: Map<string, string> = new Map(); // id -> filepath

    constructor(github: GitHubService) {
        this.github = github;
        this.github.setRepo(REPO_NAME);
    }

    async init() {
        const repo = await this.github.getRepo(REPO_NAME);
        if (!repo) {
            await this.github.createRepo(REPO_NAME);
        }
    }

    private getFilePath(item: Item): string {
        return `data/${item.createdAt}-${item.id}.json`;
    }

    async saveItem(item: Item): Promise<void> {
        const path = this.getFilePath(item);
        const content = JSON.stringify(item, null, 2);
        await this.github.createFile(path, content, `Save ${item.type}: ${item.title || item.id}`);
        
        // Update cache
        cache.set(item);
        this.filePathMap.set(item.id, path);
    }

    async updateItem(item: Item): Promise<void> {
        const path = this.filePathMap.get(item.id) || this.getFilePath(item);
        const updatedItem = { ...item, updatedAt: new Date().toISOString() };
        const content = JSON.stringify(updatedItem, null, 2);
        
        await this.github.updateFile(path, content, `Update ${item.type}: ${item.title || item.id}`);
        
        // Update cache
        cache.set(updatedItem);
    }

    async deleteItem(itemOrId: Item | string): Promise<void> {
        const id = typeof itemOrId === 'string' ? itemOrId : itemOrId.id;
        const item = typeof itemOrId === 'string' ? null : itemOrId;
        
        const path = this.filePathMap.get(id);
        if (!path) {
            console.error(`[Storage] No file path found for item ${id}`);
            // Still remove from cache
            cache.delete(id);
            return;
        }
        
        await this.github.deleteFile(path, `Delete item: ${id}`);
        
        // Remove from cache
        cache.delete(id);
        this.filePathMap.delete(id);
        
        // If it has an image, try to delete that too
        if (item?.image) {
            try {
                await this.github.deleteFile(item.image, `Delete asset for ${id}`);
            } catch {
                // Asset deletion is best effort
            }
        }
    }

    async togglePinned(item: Item): Promise<Item> {
        const updated = { ...item, pinned: !item.pinned };
        await this.updateItem(updated);
        return updated;
    }

    async toggleStarred(item: Item): Promise<Item> {
        const updated = { ...item, starred: !item.starred };
        await this.updateItem(updated);
        return updated;
    }

    async toggleArchived(item: Item): Promise<Item> {
        const updated = { ...item, archived: !item.archived };
        await this.updateItem(updated);
        return updated;
    }

    async uploadAsset(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async () => {
                const base64Content = (reader.result as string).split(',')[1];
                const ext = file.name.split('.').pop();
                const id = Math.random().toString(36).substring(2, 15);
                const path = `assets/${id}.${ext}`;

                await this.github.createFile(path, base64Content, `Upload asset: ${file.name}`, true);
                resolve(path);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    async getItems(forceRefresh = false): Promise<Item[]> {
        // Try cache first for instant display
        if (!forceRefresh) {
            const cached = cache.load();
            if (cached && !cache.isStale()) {
                console.log(`[Storage] Using cached items: ${cached.length}`);
                return this.sortItems(cached);
            }
        }

        console.log(`[Storage] Fetching items from GitHub...`);
        
        // Fetch from GitHub
        const files = await this.github.listFiles('data');
        console.log(`[Storage] Raw files from GitHub:`, files);
        
        const sortedFiles = files
            .filter((f: { name: string }) => f.name.endsWith('.json'))
            .sort((a: { name: string }, b: { name: string }) => b.name.localeCompare(a.name));

        console.log(`[Storage] JSON files to fetch: ${sortedFiles.length}`);

        // Fetch all items in parallel
        const items = await Promise.all(
            sortedFiles.map(async (file: { path: string; name: string }) => {
                const content = await this.github.getFile(file.path);
                if (content) {
                    try {
                        const item = JSON.parse(content) as Item;
                        this.filePathMap.set(item.id, file.path);
                        return item;
                    } catch (e) {
                        console.error(`[Storage] Failed to parse ${file.path}:`, e);
                        return null;
                    }
                }
                return null;
            })
        );

        const validItems = items.filter((i): i is Item => i !== null);
        console.log(`[Storage] Valid items loaded: ${validItems.length}`);
        
        // Update cache
        if (validItems.length > 0) {
            cache.save(validItems);
        }

        return this.sortItems(validItems);
    }

    private sortItems(items: Item[]): Item[] {
        return [...items].sort((a, b) => {
            // Pinned items first
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;
            // Then by date
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
    }

    async getAsset(path: string): Promise<string | null> {
        return await this.github.getFileRaw(path);
    }

    async getAssetUrl(path: string): Promise<string | null> {
        // Return a data URL for the image
        const raw = await this.github.getFileRaw(path);
        if (raw) {
            // Determine mime type from extension
            const ext = path.split('.').pop()?.toLowerCase();
            const mimeTypes: Record<string, string> = {
                'jpg': 'image/jpeg',
                'jpeg': 'image/jpeg',
                'png': 'image/png',
                'gif': 'image/gif',
                'webp': 'image/webp',
                'svg': 'image/svg+xml'
            };
            const mimeType = mimeTypes[ext || ''] || 'image/png';
            return `data:${mimeType};base64,${raw}`;
        }
        return null;
    }

    // Optimistic update helpers
    optimisticUpdate(item: Item): void {
        cache.set(item);
    }

    optimisticDelete(id: string): void {
        cache.delete(id);
    }

    getCachedItems(): Item[] {
        // Try to load from localStorage first if memory cache is empty
        const memoryItems = cache.getAll();
        if (memoryItems.length === 0) {
            const loaded = cache.load();
            if (loaded && loaded.length > 0) {
                return this.sortItems(loaded);
            }
        }
        return this.sortItems(memoryItems);
    }
}
