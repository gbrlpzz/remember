import React, { useState, useRef, useEffect } from 'react';
import { StorageService } from '../services/storage';
import type { Item, ItemType } from '../types';

const generateId = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

interface CaptureBarProps {
    storage: StorageService;
    onSave: () => void;
}

export function CaptureBar({ storage, onSave }: CaptureBarProps) {
    const [input, setInput] = useState('');
    const [description, setDescription] = useState('');
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');
    const [isExpanded, setIsExpanded] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);
    const [droppedFile, setDroppedFile] = useState<File | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node) && !input && !description && !droppedFile) {
                setIsExpanded(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [input, description, droppedFile]);

    const handleTagKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && tagInput.trim()) {
            e.preventDefault();
            if (!tags.includes(tagInput.trim())) {
                setTags([...tags, tagInput.trim()]);
            }
            setTagInput('');
        } else if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
            setTags(tags.slice(0, -1));
        }
    };

    const removeTag = (tagToRemove: string) => {
        setTags(tags.filter(tag => tag !== tagToRemove));
    };

    const handleSave = async () => {
        if ((!input.trim() && !droppedFile) || isSaving) return;

        setIsSaving(true);
        try {
            let type: ItemType = 'note';
            let imagePath: string | undefined;
            let content = input;

            if (droppedFile) {
                type = 'image';
                imagePath = await storage.uploadAsset(droppedFile);
                // If we have a dropped file, the input becomes the title/caption if provided, 
                // or we use the filename if empty. 
                // Actually, let's keep the logic clean: content is the main text. 
                // For images, content is the caption/alt text.
                if (!content) content = droppedFile.name;
            } else if (/^(http|https):\/\/[^ "]+$/.test(content)) {
                type = 'link';
            }

            const item: Item = {
                id: generateId(),
                type,
                content,
                title: type === 'link' ? content : undefined, // Can be edited later
                description: description.trim() || undefined,
                image: imagePath,
                createdAt: new Date().toISOString(),
                tags: tags,
            };

            // Optimistic update
            storage.optimisticUpdate(item);
            onSave();

            // Actual save
            await storage.saveItem(item);
            
            // Reset
            setInput('');
            setDescription('');
            setTags([]);
            setDroppedFile(null);
            setIsExpanded(false);
        } catch (error) {
            console.error("Failed to save", error);
            alert("Failed to save item");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];
            if (file.type.startsWith('image/')) {
                setDroppedFile(file);
                setIsExpanded(true);
            }
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            handleSave();
        }
    };

    return (
        <div 
            ref={containerRef}
            className={`capture-area ${isExpanded ? 'expanded' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
        >
            {isDragOver && <div className="drag-overlay">DROP IMAGE</div>}
            
            <div style={{ position: 'relative' }}>
                <input
                    type="text"
                    className="input-swiss"
                    placeholder="Save a thought..."
                    value={input}
                    onChange={(e) => {
                        setInput(e.target.value);
                        if (e.target.value) setIsExpanded(true);
                    }}
                    onFocus={() => setIsExpanded(true)}
                    onKeyDown={handleKeyDown}
                    autoComplete="off"
                    style={{ 
                        textAlign: 'center',
                        padding: '20px 0',
                        fontSize: '1.2rem',
                        letterSpacing: '-0.02em',
                        background: 'transparent'
                    }}
                />
                {droppedFile && (
                    <div style={{ 
                        position: 'absolute', 
                        right: 0, 
                        top: '50%', 
                        transform: 'translateY(-50%)',
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px',
                        fontSize: '0.875rem',
                        background: '#fff',
                        border: '1px solid #eee',
                        padding: '4px 12px',
                        borderRadius: '999px',
                        color: '#000'
                    }}>
                        <div className="magic-cue cue-frame" style={{ width: '12px', height: '12px' }} />
                        {droppedFile.name}
                        <button onClick={() => setDroppedFile(null)}>
                            <div className="magic-cue cue-x" style={{ width: '8px', height: '8px' }} />
                        </button>
                    </div>
                )}
            </div>

            {isExpanded && (
                <div className="capture-expanded" style={{ textAlign: 'center' }}>
                    <textarea
                        placeholder="Add context..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        onKeyDown={handleKeyDown}
                        rows={1}
                        style={{ 
                            width: '100%', 
                            resize: 'none', 
                            background: 'transparent', 
                            fontFamily: 'var(--font-sans)',
                            fontSize: '0.95rem',
                            border: 'none',
                            outline: 'none',
                            color: 'var(--color-text-muted)',
                            textAlign: 'center',
                            marginBottom: '16px'
                        }}
                    />
                    
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', justifyContent: 'center' }}>
                        {tags.map(tag => (
                            <span key={tag} className="tag" style={{ background: '#f5f5f5', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>
                                #{tag}
                                <button 
                                    onClick={() => removeTag(tag)} 
                                    style={{ marginLeft: '4px', cursor: 'pointer', opacity: 0.5 }}
                                >
                                    <div className="magic-cue cue-x" style={{ width: '6px', height: '6px' }} />
                                </button>
                            </span>
                        ))}
                        <input
                            type="text"
                            value={tagInput}
                            onChange={(e) => setTagInput(e.target.value)}
                            onKeyDown={handleTagKeyDown}
                            placeholder={tags.length === 0 ? "+ tag" : "+"}
                            className="tag-input"
                            style={{ 
                                width: '60px',
                                background: 'transparent',
                                color: 'var(--color-text-muted)',
                                borderBottom: '1px solid transparent',
                                fontSize: '0.9rem',
                                textAlign: 'left'
                            }}
                        />
                    </div>
                    
                    <div style={{ marginTop: '24px', opacity: isSaving ? 0.5 : 1 }}>
                         <button className="btn outline" onClick={handleSave} disabled={isSaving}>
                            {isSaving ? 'SAVING' : 'SAVE'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
