import React, { useState, useRef, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
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
    const [isDeleting, setIsDeleting] = useState(false);
    
    const [clickCount, setClickCount] = useState(0);
    const clickTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Load image URL
    useEffect(() => {
        if (item.type === 'image' && item.image) {
            storage.getAssetUrl(item.image).then(setImageUrl).catch(console.error);
        }
    }, [item.image, item.type, storage]);

    const handleCardClick = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).tagName === 'BUTTON' || (e.target as HTMLElement).closest('a') || (e.target as HTMLElement).closest('button')) return;

        setClickCount(prev => prev + 1);
        
        if (clickTimeoutRef.current) {
            clearTimeout(clickTimeoutRef.current);
        }

        if (clickCount + 1 === 2) {
            setIsEditing(true);
            setClickCount(0);
        } else {
            clickTimeoutRef.current = setTimeout(() => {
                setClickCount(0);
            }, 300);
        }
    };

    useEffect(() => {
        return () => {
            if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
        };
    }, []);

    const handleSave = async () => {
        const updatedItem: Item = {
            ...item,
            content: editContent,
            title: editTitle || undefined,
            description: editDescription || undefined,
            tags: editTags ? editTags.split(',').map(t => t.trim()).filter(Boolean) : [],
        };
        
        try {
            await storage.updateItem(updatedItem);
            onUpdate(updatedItem);
            setIsEditing(false);
        } catch (error) {
            console.error('Failed to save item:', error);
        }
    };

    const deleteItem = async () => {
        if (!isDeleting) {
            setIsDeleting(true);
            return;
        }
        
        try {
            await storage.deleteItem(item.id);
            onDelete(item);
        } catch (error) {
            console.error('Failed to delete item:', error);
            setIsDeleting(false);
        }
    };

    if (isEditing) {
        return (
            <>
                <div 
                    className="capture-backdrop"
                    onClick={() => setIsEditing(false)}
                />
                
                <div className="capture-overlay">
                    {item.type === 'image' && imageUrl && (
                        <img 
                            src={imageUrl} 
                            alt={item.content}
                            style={{
                                width: '100%',
                                maxHeight: '200px',
                                objectFit: 'cover',
                                borderRadius: '4px',
                                marginBottom: '8px'
                            }}
                        />
                    )}
                    
                    {item.type === 'link' && (
                        <input 
                            className="capture-input" 
                            value={editTitle} 
                            onChange={e => setEditTitle(e.target.value)} 
                            placeholder="Title"
                            autoFocus
                        />
                    )}
                    
                    <textarea 
                        className="capture-input"
                        style={{ 
                            fontSize: item.type === 'image' ? '1rem' : '1.25rem',
                            resize: 'none', 
                            minHeight: item.type === 'image' ? '40px' : '80px',
                        }}
                        value={editContent} 
                        onChange={e => setEditContent(e.target.value)}
                        placeholder={item.type === 'image' ? 'Caption' : 'Content'}
                        autoFocus={item.type !== 'link'}
                    />

                    <textarea
                        className="capture-description"
                        style={{ minHeight: '40px' }}
                        value={editDescription}
                        onChange={e => setEditDescription(e.target.value)}
                        placeholder="Add a note..."
                    />

                    <input
                        className="capture-tag-input"
                        style={{ width: '100%' }}
                        value={editTags}
                        onChange={e => setEditTags(e.target.value)}
                        placeholder="Tags (comma separated)"
                    />

                    <div className="capture-actions">
                        <button className="btn text" onClick={() => setIsEditing(false)}>Cancel</button>
                        <button className="btn outline" onClick={handleSave}>Save</button>
                    </div>
                </div>
            </>
        );
    }

    return (
        <div 
            className={`grid-item type-${item.type} ${item.archived ? 'opacity-50' : ''}`}
            onClick={handleCardClick}
        >
            {item.type === 'image' && imageUrl && (
                <div className="card-image-container">
                    <img src={imageUrl} alt={item.content} />
                </div>
            )}

            <div className="card-content">
                {item.type === 'link' && (
                    <>
                        <a href={item.content} target="_blank" rel="noopener noreferrer">
                            {item.title || item.content}
                        </a>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-faint)', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {new URL(item.content).hostname}
                        </div>
                    </>
                )}

                {item.type === 'note' && (
                    <div className="note-content">{item.content}</div>
                )}

                {item.type === 'image' && item.content && (
                    <div className="image-caption">{item.content}</div>
                )}

                {item.description && (
                    <div className="card-description">
                        {item.description}
                    </div>
                )}

                {item.tags && item.tags.length > 0 && (
                    <div className="card-tags" style={{ marginTop: '8px' }}>
                        {item.tags.map(tag => (
                            <span key={tag} className="tag">{tag}</span>
                        ))}
                    </div>
                )}

                <div className="card-footer">
                    <span className="card-date">
                        {(() => {
                            try {
                                return formatDistanceToNow(new Date(item.createdAt), { addSuffix: true });
                            } catch {
                                return '';
                            }
                        })()}
                    </span>
                    <span className="card-type">{item.type}</span>
                </div>
            </div>

            <div className="card-actions-hover">
                <button 
                    className={`mini-cue mini-cue-delete`} 
                    onClick={deleteItem} 
                    onMouseLeave={() => setIsDeleting(false)}
                    title={isDeleting ? "Click again to confirm" : "Delete"} 
                    style={isDeleting ? { background: '#e53935', borderColor: '#e53935', transform: 'scale(2)', opacity: 1 } : {}}
                />
            </div>
        </div>
    );
}
