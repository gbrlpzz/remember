import React, { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { StorageService } from '../services/storage';
import type { Item, ItemType } from '../types';

const generateId = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

interface CaptureBarProps {
    storage: StorageService;
    onSave: () => void;
}

export const CaptureBar = forwardRef<{ focus: () => void, addFile: (file: File) => void, addText: (text: string) => void }, CaptureBarProps>(({ storage, onSave }, ref) => {
    const [input, setInput] = useState('');
    const [description, setDescription] = useState('');
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [droppedFile, setDroppedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({
        focus: () => {
            setIsOpen(true);
            setTimeout(() => inputRef.current?.focus(), 100);
        },
        addFile: (file: File) => {
            setDroppedFile(file);
            // Create preview URL
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
            setIsOpen(true);
            setTimeout(() => inputRef.current?.focus(), 100);
        },
        addText: (text: string) => {
            setInput(text);
            setIsOpen(true);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }));

    // Cleanup preview URL
    useEffect(() => {
        return () => {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    // Close on Escape
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                handleClose();
            }
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [isOpen]);

    const handleClose = () => {
        setIsOpen(false);
        setInput('');
        setDescription('');
        setTags([]);
        setTagInput('');
        setDroppedFile(null);
        setPreviewUrl(null);
    };

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
                if (!content) content = droppedFile.name;
            } else if (/^(http|https):\/\/[^ "]+$/.test(content)) {
                type = 'link';
            }

            const item: Item = {
                id: generateId(),
                type,
                content,
                title: type === 'link' ? content : undefined,
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
            
            // Reset and close
            handleClose();
        } catch (error) {
            console.error("Failed to save", error);
            alert("Failed to save item");
        } finally {
            setIsSaving(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            handleSave();
        }
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div 
                className="capture-backdrop"
                onClick={handleClose}
            />
            
            {/* Capture Overlay */}
            <div className="capture-overlay">
                <input
                    ref={inputRef}
                    type="text"
                    className="capture-input"
                    placeholder="What's on your mind?"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    autoComplete="off"
                />

                <textarea
                    placeholder="Add a note..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={2}
                    className="capture-description"
                />

                {droppedFile && (
                    <div className="capture-file-badge">
                        {previewUrl && (
                            <img 
                                src={previewUrl} 
                                alt="Preview" 
                                style={{ 
                                    width: '32px', 
                                    height: '32px', 
                                    objectFit: 'cover', 
                                    borderRadius: '4px' 
                                }} 
                            />
                        )}
                        <div className="magic-cue cue-frame" style={{ width: '10px', height: '10px' }} />
                        <span>{droppedFile.name}</span>
                        <button onClick={() => { setDroppedFile(null); setPreviewUrl(null); }} style={{ opacity: 0.5 }}>
                            <div className="magic-cue cue-x" style={{ width: '8px', height: '8px' }} />
                        </button>
                    </div>
                )}
                
                <div className="capture-tags">
                    {tags.map(tag => (
                        <span key={tag} className="capture-tag">
                            #{tag}
                            <button onClick={() => removeTag(tag)}>
                                <div className="magic-cue cue-x" style={{ width: '5px', height: '5px' }} />
                            </button>
                        </span>
                    ))}
                    <input
                        type="text"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={handleTagKeyDown}
                        placeholder={tags.length === 0 ? "Add tags..." : "+"}
                        className="capture-tag-input"
                    />
                </div>
                
                <div className="capture-actions">
                    <button className="btn text" onClick={handleClose}>
                        Cancel
                    </button>
                    <button className="btn outline" onClick={handleSave} disabled={isSaving}>
                        {isSaving ? 'Saving...' : 'Save'}
                    </button>
                </div>
            </div>
        </>
    );
});
