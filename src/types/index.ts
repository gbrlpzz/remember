export type ItemType = 'note' | 'link' | 'image';

export interface Item {
    id: string;
    type: ItemType;
    content: string; // URL or text
    title?: string;
    description?: string;
    image?: string; // URL to image (external or internal)
    createdAt: string;
    updatedAt?: string;
    tags: string[];
    // Interactions
    pinned?: boolean;
    starred?: boolean;
    archived?: boolean;
}

export type SortOption = 'date' | 'oldest' | 'starred' | 'type';
export type FilterOption = 'all' | 'notes' | 'links' | 'images' | 'starred' | 'archived';
