import React, { useState, useRef, useEffect } from 'react';
import { StorageService } from '../services/storage';
import type { Item, ItemType } from '../types';
import { Plus, X, Image as ImageIcon } from 'lucide-react';

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
                    placeholder="Capture something..."
                    value={input}
                    onChange={(e) => {
                        setInput(e.target.value);
                        if (e.target.value) setIsExpanded(true);
                    }}
                    onFocus={() => setIsExpanded(true)}
                    onKeyDown={handleKeyDown}
                    autoComplete="off"
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
                        background: '#eee',
                        padding: '4px 8px'
                    }}>
                        <ImageIcon size={14} />
                        {droppedFile.name}
                        <button onClick={() => setDroppedFile(null)}><X size={14} /></button>
                    </div>
                )}
            </div>

            {isExpanded && (
                <div className="capture-expanded">
                    <textarea
                        placeholder="Add a note or description..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        onKeyDown={handleKeyDown}
                        rows={3}
                        style={{ 
                            width: '100%', 
                            resize: 'none', 
                            background: 'transparent', 
                            fontFamily: 'var(--font-sans)',
                            fontSize: '0.95rem',
                            border: 'none',
                            outline: 'none'
                        }}
                    />
                    
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                        {tags.map(tag => (
                            <span key={tag} className="tag">
                                #{tag}
                                <button 
                                    onClick={() => removeTag(tag)} 
                                    style={{ marginLeft: '4px', cursor: 'pointer' }}
                                >×</button>
                            </span>
                        ))}
                        <input
                            type="text"
                            value={tagInput}
                            onChange={(e) => setTagInput(e.target.value)}
                            onKeyDown={handleTagKeyDown}
                            placeholder={tags.length === 0 ? "Add tags..." : "Add another..."}
                            className="tag-input"
                            style={{ flex: 1, minWidth: '80px' }}
                        />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                        <button className="btn" onClick={handleSave} disabled={isSaving}>
                            {isSaving ? 'SAVING...' : 'SAVE ENTRY'} <Plus size={16} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
