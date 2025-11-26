import React, { useState, useRef, useEffect, useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import type { Item } from '../types';
import { StorageService } from '../services/storage';

interface ItemCardProps {
    item: Item;
    storage: StorageService;
    onUpdate: (item: Item) => void;
    onDelete: (item: Item) => void;
}

// Embed detection helpers
function getYouTubeId(url: string): string | null {
    const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : null;
}

function getVimeoId(url: string): string | null {
    const match = url.match(/vimeo\.com\/(\d+)/);
    return match ? match[1] : null;
}

function getTweetId(url: string): string | null {
    const match = url.match(/(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/);
    return match ? match[1] : null;
}

function getSpotifyEmbed(url: string): string | null {
    const match = url.match(/open\.spotify\.com\/(track|album|playlist|episode)\/([a-zA-Z0-9]+)/);
    if (match) {
        return `https://open.spotify.com/embed/${match[1]}/${match[2]}`;
    }
    return null;
}

// Get preview image for a URL
function getPreviewImage(url: string): string | null {
    try {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname;
        
        // YouTube thumbnail
        const youtubeId = getYouTubeId(url);
        if (youtubeId) {
            return `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`;
        }
        
        // Use a screenshot service for other URLs
        // microlink.io provides free previews
        return `https://api.microlink.io/?url=${encodeURIComponent(url)}&screenshot=true&meta=false&embed=screenshot.url`;
    } catch {
        return null;
    }
}

// Get favicon for a URL
function getFavicon(url: string): string {
    try {
        const urlObj = new URL(url);
        return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=32`;
    } catch {
        return '';
    }
}

export function ItemCard({ item, storage, onUpdate, onDelete }: ItemCardProps) {
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(item.content);
    const [editTitle, setEditTitle] = useState(item.title || '');
    const [editDescription, setEditDescription] = useState(item.description || '');
    const [editTags, setEditTags] = useState<string>(item.tags?.join(', ') || '');
    const [isDeleting, setIsDeleting] = useState(false);
    const [previewError, setPreviewError] = useState(false);
    
    const [clickCount, setClickCount] = useState(0);
    const clickTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Detect embed type
    const embed = useMemo(() => {
        if (item.type !== 'link') return null;
        
        const url = item.content;
        
        const youtubeId = getYouTubeId(url);
        if (youtubeId) return { type: 'youtube', id: youtubeId };
        
        const vimeoId = getVimeoId(url);
        if (vimeoId) return { type: 'vimeo', id: vimeoId };
        
        const tweetId = getTweetId(url);
        if (tweetId) return { type: 'twitter', id: tweetId, url };
        
        const spotifyEmbed = getSpotifyEmbed(url);
        if (spotifyEmbed) return { type: 'spotify', embedUrl: spotifyEmbed };
        
        return null;
    }, [item.type, item.content]);

    // Get preview image URL for non-embed links
    const previewImageUrl = useMemo(() => {
        if (item.type !== 'link' || embed) return null;
        
        // YouTube thumbnails
        const youtubeId = getYouTubeId(item.content);
        if (youtubeId) {
            return `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`;
        }
        
        return null;
    }, [item.type, item.content, embed]);

    // Load image URL
    useEffect(() => {
        if (item.type === 'image' && item.image) {
            storage.getAssetUrl(item.image).then(setImageUrl).catch(console.error);
        }
    }, [item.image, item.type, storage]);

    const handleCardClick = (e: React.MouseEvent) => {
        // Allow double-click on link cards even if clicking the link area
        const isLinkClick = (e.target as HTMLElement).closest('a.link-preview');
        
        if ((e.target as HTMLElement).tagName === 'BUTTON' || 
            (e.target as HTMLElement).tagName === 'IFRAME' ||
            (e.target as HTMLElement).closest('button') ||
            (e.target as HTMLElement).closest('iframe')) return;

        // For single clicks on links, let the link work
        if (isLinkClick && clickCount === 0) {
            // Don't prevent default - let link open
            setClickCount(1);
            clickTimeoutRef.current = setTimeout(() => {
                setClickCount(0);
            }, 300);
            return;
        }

        // Prevent link navigation on double-click
        if (isLinkClick) {
            e.preventDefault();
        }

        setClickCount(prev => prev + 1);
        
        if (clickTimeoutRef.current) {
            clearTimeout(clickTimeoutRef.current);
        }

        if (clickCount + 1 === 2) {
            e.preventDefault();
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

    const openLink = () => {
        if (item.type === 'link') {
            window.open(item.content, '_blank', 'noopener,noreferrer');
        }
    };

    // Render embed
    const renderEmbed = () => {
        if (!embed) return null;

        switch (embed.type) {
            case 'youtube':
                return (
                    <div className="embed-container" style={{ aspectRatio: '16/9', marginBottom: '12px' }}>
                        <iframe
                            src={`https://www.youtube.com/embed/${embed.id}`}
                            title="YouTube video"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            style={{ width: '100%', height: '100%', border: 'none', borderRadius: '2px' }}
                        />
                    </div>
                );
            case 'vimeo':
                return (
                    <div className="embed-container" style={{ aspectRatio: '16/9', marginBottom: '12px' }}>
                        <iframe
                            src={`https://player.vimeo.com/video/${embed.id}`}
                            title="Vimeo video"
                            allow="autoplay; fullscreen; picture-in-picture"
                            allowFullScreen
                            style={{ width: '100%', height: '100%', border: 'none', borderRadius: '2px' }}
                        />
                    </div>
                );
            case 'spotify':
                return (
                    <div className="embed-container" style={{ marginBottom: '12px' }}>
                        <iframe
                            src={embed.embedUrl}
                            title="Spotify"
                            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                            style={{ width: '100%', height: '152px', border: 'none', borderRadius: '8px' }}
                        />
                    </div>
                );
            case 'twitter':
                return (
                    <div className="embed-container twitter-embed" style={{ marginBottom: '12px' }}>
                        <blockquote className="twitter-tweet" data-conversation="none" data-theme="light">
                            <a href={embed.url} target="_blank" rel="noopener noreferrer">View Tweet</a>
                        </blockquote>
                    </div>
                );
            default:
                return null;
        }
    };

    // Render link preview card for non-embed links
    const renderLinkPreview = () => {
        if (embed) return null;
        
        const favicon = getFavicon(item.content);
        let hostname = '';
        try {
            hostname = new URL(item.content).hostname.replace('www.', '');
        } catch {
            hostname = item.content;
        }

        return (
            <a 
                href={item.content} 
                target="_blank" 
                rel="noopener noreferrer"
                className="link-preview"
            >
                {previewImageUrl && !previewError && (
                    <div className="link-preview-image">
                        <img 
                            src={previewImageUrl} 
                            alt="" 
                            onError={() => setPreviewError(true)}
                        />
                    </div>
                )}
                <div className="link-preview-content">
                    <div className="link-preview-title">
                        {item.title || hostname}
                    </div>
                    {item.description && (
                        <div className="link-preview-note">
                            {item.description}
                        </div>
                    )}
                    <div className="link-preview-meta">
                        {favicon && <img src={favicon} alt="" className="link-preview-favicon" />}
                        <span>{hostname}</span>
                    </div>
                </div>
            </a>
        );
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
            className={`grid-item type-${item.type} ${embed ? 'has-embed' : ''} ${item.archived ? 'opacity-50' : ''}`}
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
                        {renderEmbed()}
                        {!embed && renderLinkPreview()}
                    </>
                )}

                {item.type === 'note' && (
                    <div className="note-content">{item.content}</div>
                )}

                {item.type === 'image' && item.content && (
                    <div className="image-caption">{item.content}</div>
                )}

                {item.description && item.type !== 'link' && (
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
