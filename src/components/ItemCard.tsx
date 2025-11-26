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
            <div className="grid-item card-swiss" style={{ background: '#f9f9f9', padding: '1rem' }}>
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
                        style={{ fontSize: '1rem', borderBottom: '1px solid #ddd', resize: 'vertical', minHeight: '100px' }}
                        value={editContent} 
                        onChange={e => setEditContent(e.target.value)}
                        placeholder="Content"
                    />
                    <textarea
                        className="input-swiss"
                        style={{ fontSize: '0.9rem', borderBottom: '1px solid #ddd' }}
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
        <div className={`grid-item card-swiss ${item.archived ? 'opacity-50' : ''}`}>
            {item.type === 'image' && imageUrl && (
                <div className="card-image-container">
                    <img src={imageUrl} alt={item.content} />
                </div>
            )}

            <div className="card-meta">
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span className="card-date">
                        {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                    </span>
                    {item.pinned && <Pin size={12} fill="currentColor" />}
                    {item.starred && <Star size={12} fill="currentColor" color="var(--color-accent)" />}
                </div>
                <span className="card-type">{item.type}</span>
            </div>

            {item.type === 'link' && (
                <h3 className="card-title">
                    <a href={item.content} target="_blank" rel="noopener noreferrer">
                        {item.title || item.content} <ExternalLink size={12} style={{ verticalAlign: 'middle' }} />
                    </a>
                </h3>
            )}

            {item.content && item.type !== 'link' && (
                <div className="card-content">
                    {item.type === 'image' ? (
                        <div style={{ fontStyle: 'italic' }}>{item.content}</div>
                    ) : (
                        <div>{item.content}</div>
                    )}
                </div>
            )}

            {item.description && (
                <div className="card-content mt-sm" style={{ 
                    borderLeft: '2px solid var(--color-accent)', 
                    paddingLeft: '12px',
                    color: 'var(--color-text)'
                }}>
                    {item.description}
                </div>
            )}

            {item.tags && item.tags.length > 0 && (
                <div className="card-tags">
                    {item.tags.map(tag => (
                        <span key={tag} className="tag">#{tag}</span>
                    ))}
                </div>
            )}

            <div className="card-actions-hover" ref={actionsRef}>
                <button onClick={() => setIsEditing(true)} title="Edit"><MoreHorizontal size={16} /></button>
                <button onClick={togglePin} title="Pin"><Pin size={16} fill={item.pinned ? 'currentColor' : 'none'} /></button>
                <button onClick={toggleStar} title="Star"><Star size={16} fill={item.starred ? 'currentColor' : 'none'} /></button>
                <button onClick={toggleArchive} title="Archive"><Archive size={16} /></button>
                <button onClick={deleteItem} title="Delete" style={{ color: 'red' }}><Trash2 size={16} /></button>
            </div>
        </div>
    );
}
