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
    
    const [clickCount, setClickCount] = useState(0);
    const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleCardClick = (e: React.MouseEvent) => {
        // Ignore clicks on buttons/links
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

    if (isEditing) {
        return (
            <>
                {/* Backdrop */}
                <div 
                    style={{
                        position: 'fixed',
                        top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(255,255,255,0.9)',
                        backdropFilter: 'blur(5px)',
                        zIndex: 9998,
                        animation: 'fadeIn 0.2s ease-out'
                    }}
                    onClick={() => setIsEditing(false)}
                />
                
                {/* Centered Edit Modal */}
                <div 
                    className="grid-item card-swiss" 
                    style={{ 
                        position: 'fixed',
                        top: '50%', left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '90%',
                        maxWidth: '600px',
                        background: 'transparent',
                        padding: '0',
                        border: 'none',
                        zIndex: 9999,
                        boxShadow: 'none'
                    }}
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {item.type === 'link' && (
                            <input 
                                className="input-swiss" 
                                style={{ fontSize: '1.5rem', fontWeight: 500, textAlign: 'center' }}
                                value={editTitle} 
                                onChange={e => setEditTitle(e.target.value)} 
                                placeholder="Title"
                                autoFocus
                            />
                        )}
                        
                        <textarea 
                            className="input-swiss" 
                            style={{ 
                                fontSize: item.type === 'image' ? '1rem' : '1.5rem', 
                                borderBottom: '1px solid transparent', 
                                resize: 'none', 
                                minHeight: '150px',
                                background: 'transparent',
                                textAlign: 'center',
                                lineHeight: 1.4
                            }}
                            value={editContent} 
                            onChange={e => setEditContent(e.target.value)}
                            placeholder="Content"
                            autoFocus={item.type !== 'link'}
                        />

                        <textarea
                            className="input-swiss"
                            style={{ 
                                fontSize: '1rem', 
                                borderBottom: '1px solid transparent',
                                color: '#999',
                                textAlign: 'center',
                                minHeight: '60px'
                            }}
                            value={editDescription}
                            onChange={e => setEditDescription(e.target.value)}
                            placeholder="Add a note..."
                        />

                        <input
                            className="input-swiss"
                            style={{ 
                                fontSize: '0.9rem', 
                                textAlign: 'center',
                                color: '#999'
                            }}
                            value={editTags}
                            onChange={e => setEditTags(e.target.value)}
                            placeholder="Tags (comma separated)"
                        />

                        <div style={{ display: 'flex', gap: '16px', marginTop: '32px', justifyContent: 'center' }}>
                            <button className="btn outline" onClick={handleSave}>SAVE</button>
                            <button className="btn text" onClick={() => setIsEditing(false)} style={{ color: '#999' }}>CANCEL</button>
                        </div>
                    </div>
                </div>
            </>
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
                    <div className="type-link" style={{ border: 'none', padding: '0' }}>
                        <h3 className="card-title" style={{ margin: 0 }}>
                            <a href={item.content} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', fontSize: '1.1rem', fontWeight: 500 }}>
                                {item.title || item.content} <div className="magic-cue cue-connect" style={{ display: 'inline-block', width: '10px', height: '10px', marginLeft: '4px', verticalAlign: 'top' }}><span /></div>
                            </a>
                        </h3>
                        <div style={{ fontSize: '0.8rem', color: '#ccc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '4px' }}>
                            {item.content}
                        </div>
                    </div>
                )}

                {item.content && item.type !== 'link' && (
                    <div className="card-content">
                        {item.type === 'image' ? (
                            <div className="image-caption" style={{ fontSize: '0.8rem', color: '#999', marginTop: '8px' }}>{item.content}</div>
                        ) : (
                            <div className="note-content">{item.content}</div>
                        )}
                    </div>
                )}

                {item.description && (
                    <div className="card-description" style={{ marginTop: '12px', fontSize: '0.85rem', color: '#999' }}>
                        {item.description}
                    </div>
                )}

                <div className="card-footer">
                    {/* Date only visible on hover via CSS */}
                    <span className="card-date">
                        {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                    </span>
                    
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {item.pinned && <div className="mini-cue mini-cue-pin" style={{ background: 'currentColor', width: '6px', height: '6px' }} />}
                        {item.starred && <div className="mini-cue mini-cue-star" style={{ boxShadow: '0 0 5px currentColor' }} />}
                    </div>
                </div>
            </div>

            <div className="card-actions-hover" ref={actionsRef}>
                <button className="mini-cue mini-cue-edit" onClick={() => setIsEditing(true)} title="Edit" />
                <button className="mini-cue mini-cue-pin" onClick={togglePin} title="Pin" style={{ background: item.pinned ? 'currentColor' : 'transparent' }} />
                <button className="mini-cue mini-cue-star" onClick={toggleStar} title="Star" style={{ boxShadow: item.starred ? '0 0 5px currentColor' : 'none' }} />
                <button className="mini-cue mini-cue-archive" onClick={toggleArchive} title="Archive" />
                <button className="mini-cue mini-cue-delete" onClick={deleteItem} title="Delete" />
            </div>
        </div>
    );
}
