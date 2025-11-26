import React, { useState, useRef, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { 
    Star, 
    Pin, 
    Archive, 
    Trash2, 
    ExternalLink,
    MoreHorizontal
} from 'lucide-react';
import type { Item } from '../types';
import { StorageService } from '../services/storage';

interface ItemCardProps {
    item: Item;
    storage: StorageService;
    onUpdate: (item: Item) => void;
    onDelete: (item: Item) => void;
}

export function ItemCard({ item, storage, onUpdate, onDelete }: ItemCardProps) {
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(item.content);
    const [editTitle, setEditTitle] = useState(item.title || '');
    const [editDescription, setEditDescription] = useState(item.description || '');
    const [editTags, setEditTags] = useState<string>(item.tags?.join(', ') || '');
    
    const [showActions, setShowActions] = useState(false);
    const actionsRef = useRef<HTMLDivElement>(null);

    // Generate a random rotation between -2 and 2 degrees for that "pinned" look
    // Removed for austere minimal look
    // const rotation = React.useMemo(() => Math.random() * 4 - 2, []);

    useEffect(() => {
        if (item.type === 'image' && item.image) {
            storage.getAsset(item.image).then(base64 => {
                if (base64) {
                    const ext = item.image!.split('.').pop();
                    const mime = ext === 'png' ? 'image/png' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/webp';
                    setImageUrl(`data:${mime};base64,${base64}`);
                }
            });
        }
    }, [item, storage]);

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (actionsRef.current && !actionsRef.current.contains(e.target as Node)) {
                setShowActions(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSave = async () => {
        const updated = {
            ...item,
            content: editContent,
            title: editTitle || undefined,
            description: editDescription || undefined,
            tags: editTags.split(',').map(t => t.trim()).filter(Boolean),
        };
        
        try {
            await storage.updateItem(updated);
            onUpdate(updated);
            setIsEditing(false);
        } catch (e) {
            console.error('Failed to update', e);
        }
    };

    const togglePin = async () => {
        const updated = await storage.togglePinned(item);
        onUpdate(updated);
    };

    const toggleStar = async () => {
        const updated = await storage.toggleStarred(item);
        onUpdate(updated);
    };

    const toggleArchive = async () => {
        const updated = await storage.toggleArchived(item);
        onUpdate(updated);
    };

    const deleteItem = async () => {
        if (confirm('Permanently delete?')) {
            await storage.deleteItem(item);
            onDelete(item);
        }
    };

    if (isEditing) {
        return (
            <div className="grid-item card-swiss" style={{ background: 'var(--color-surface)', padding: '1rem', border: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {item.type === 'link' && (
                        <input 
                            className="input-swiss" 
                            style={{ fontSize: '1rem' }}
                            value={editTitle} 
                            onChange={e => setEditTitle(e.target.value)} 
                            placeholder="Title"
                        />
                    )}
                    <textarea 
                        className="input-swiss" 
                        style={{ fontSize: '1rem', borderBottom: '1px solid var(--color-border)', resize: 'vertical', minHeight: '100px' }}
                        value={editContent} 
                        onChange={e => setEditContent(e.target.value)}
                        placeholder="Content"
                    />
                    <textarea
                        className="input-swiss"
                        style={{ fontSize: '0.9rem', borderBottom: '1px solid var(--color-border)' }}
                        value={editDescription}
                        onChange={e => setEditDescription(e.target.value)}
                        placeholder="Add a note/description..."
                    />
                    <input
                        className="input-swiss"
                        style={{ fontSize: '0.85rem' }}
                        value={editTags}
                        onChange={e => setEditTags(e.target.value)}
                        placeholder="Tags (comma separated)"
                    />
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                        <button className="btn" onClick={handleSave}>SAVE</button>
                        <button className="btn outline" onClick={() => setIsEditing(false)}>CANCEL</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div 
            className={`grid-item card-swiss type-${item.type} ${item.archived ? 'opacity-50' : ''}`}
        >
            {item.type === 'image' && imageUrl && (
                <div className="card-image-container">
                    <img src={imageUrl} alt={item.content} />
                </div>
            )}

            <div style={{ padding: item.type === 'image' ? '12px 0 0 0' : '0' }}>
                
                {item.type === 'link' && (
                    <div className="type-link">
                        <h3 className="card-title">
                            <a href={item.content} target="_blank" rel="noopener noreferrer">
                                {item.title || item.content} <ExternalLink size={10} style={{ verticalAlign: 'middle', opacity: 0.5 }} />
                            </a>
                        </h3>
                        <div style={{ fontSize: '0.8rem', color: '#999', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {item.content}
                        </div>
                    </div>
                )}

                {item.content && item.type !== 'link' && (
                    <div className="card-content">
                        {item.type === 'image' ? (
                            <div className="image-caption" style={{ fontSize: '0.9rem', color: '#000' }}>{item.content}</div>
                        ) : (
                            <div className="note-content">{item.content}</div>
                        )}
                    </div>
                )}

                {item.description && (
                    <div className="card-description" style={{ marginTop: '12px', fontSize: '0.85rem', color: '#666' }}>
                        {item.description}
                    </div>
                )}

                <div className="card-footer">
                    {/* Date only visible on hover via CSS */}
                    <span className="card-date">
                        {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                    </span>
                    
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {item.pinned && <Pin size={12} fill="currentColor" />}
                        {item.starred && <Star size={12} fill="currentColor" />}
                    </div>
                </div>
            </div>

            <div className="card-actions-hover" ref={actionsRef}>
                <button onClick={() => setIsEditing(true)} title="Edit"><MoreHorizontal size={16} /></button>
                <button onClick={togglePin} title="Pin"><Pin size={16} fill={item.pinned ? 'currentColor' : 'none'} /></button>
                <button onClick={toggleStar} title="Star"><Star size={16} fill={item.starred ? 'currentColor' : 'none'} /></button>
                <button onClick={toggleArchive} title="Archive"><Archive size={16} /></button>
                <button onClick={deleteItem} title="Delete"><Trash2 size={16} /></button>
            </div>
        </div>
    );
}
