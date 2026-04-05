import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import {
    MoreVertical, Palette,
    Bold, Italic, Underline,
    List, ListOrdered,
    Heading1, Heading2, Heading3
} from 'lucide-react';
import { createPortal } from 'react-dom';

const COLORS = [
    '#ffffff', // White
    '#faafa8', // Red
    '#f39f76', // Orange
    '#fff8b8', // Yellow
    '#e2f6d3', // Green
    '#b4ddd3', // Teal
    '#d4e4ed', // Blue
    '#aeccdc', // Dark Blue
    '#d3bfdb', // Purple
    '#f6e2dd', // Pink
    '#e9e3d4', // Brown
    '#efeff1', // Gray
    // New Colors
    '#fde4cf', // Peach
    '#ffcfa0', // Deep Orange
    '#fbf8cc', // Lemon
    '#e9edc9', // Sage
    '#ccd5ae', // Olive
    '#90dbf4', // Sky
    '#a2d2ff', // Baby Blue
    '#bde0fe', // Powder Blue
    '#ffafcc', // Hot Pink
    '#cdb4db', // Lavender
    '#edafb8', // Rose
    '#cfdbd5', // Ash
];

export default function NoteEditor({
    initialData = null,
    onSave,
    onClose,
    className = ''
}) {
    const [title, setTitle] = useState(initialData?.title || '');
    const [color, setColor] = useState(initialData?.color || '#ffffff');
    const [isExpanded, setIsExpanded] = useState(!!initialData);
    const contentRef = useRef(null);
    const [showColorPicker, setShowColorPicker] = useState(false);

    // For Fixed Positioning of Color Picker
    const paletteBtnRef = useRef(null);
    const [pickerPos, setPickerPos] = useState({ top: 0, left: 0 });

    useEffect(() => {
        if (contentRef.current && initialData?.content) {
            contentRef.current.innerHTML = initialData.content;
        }
    }, [initialData]);

    const handleWindowClick = (e) => {
        // If click target is inside the palette button, do nothing (let button handler work)
        if (paletteBtnRef.current && paletteBtnRef.current.contains(e.target)) {
            return;
        }
        // If click target is inside the picker (we need a ref for the picker but it's in a portal)
        // simplified: we'll use a backdrop or just check closest.
        if (e.target.closest('.color-picker-popup')) return;

        setShowColorPicker(false);
    };

    // Handle closing the color picker when clicking outside
    useEffect(() => {
        if (!showColorPicker) return;

        window.addEventListener('mousedown', handleWindowClick);
        return () => window.removeEventListener('mousedown', handleWindowClick);
    }, [showColorPicker]);

    // Calculate position when opening
    useLayoutEffect(() => {
        if (showColorPicker && paletteBtnRef.current) {
            const rect = paletteBtnRef.current.getBoundingClientRect();
            // Default: below the button
            let top = rect.bottom + 8;
            let left = rect.left;

            // Check if it overflows bottom of screen
            const pickerHeight = 200; // approx
            if (top + pickerHeight > window.innerHeight) {
                // Place above
                top = rect.top - pickerHeight - 8;
            }

            // Check right overflow
            const pickerWidth = 200; // approx
            if (left + pickerWidth > window.innerWidth) {
                left = window.innerWidth - pickerWidth - 10;
            }

            // eslint-disable-next-line react-hooks/set-state-in-effect
            setPickerPos({ top, left });
        }
    }, [showColorPicker]);


    const handleSave = async () => {
        const content = contentRef.current ? contentRef.current.innerHTML : '';
        // Don't save empty notes
        if (!title.trim() && (!content || content === '<br>')) {
            if (onClose) onClose();
            return;
        }

        try {
            await onSave({
                title,
                content,
                color,
                id: initialData?.id || initialData?._id
            });

            // Reset only if successful and it's a create form (initialData is null)
            if (!initialData) {
                setTitle('');
                if (contentRef.current) contentRef.current.innerHTML = '';
                setColor('#ffffff');
                setIsExpanded(false);
            }
        } catch (error) {
            console.error("Failed to save note:", error);
            alert("Failed to save note. Please try again.");
        }
    };

    const execCmd = (cmd, arg = null) => {
        document.execCommand(cmd, false, arg);
        // Ensure focus remains on content
        contentRef.current?.focus();
    };

    return (
        <div
            className={`
                relative flex flex-col rounded-xl shadow-md border border-slate-200 transition-all duration-300
                ${className}
            `}
            style={{ backgroundColor: color }}
        >
            {/* Title Input */}
            {(isExpanded || title) && (
                <input
                    type="text"
                    placeholder="Title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className={`
                        w-full bg-transparent px-4 py-3 font-bold text-lg outline-none placeholder:text-slate-400
                        text-slate-800
                    `}
                />
            )}

            {/* Rich Text Toolbar */}
            {isExpanded && (
                <div className={`
                    flex items-center gap-1 px-2 py-1 mx-2 mb-2 rounded-lg border border-black/5 bg-black/5 
                `}>
                    <ToolbarButton onClick={() => execCmd('bold')} icon={Bold} title="Bold" />
                    <ToolbarButton onClick={() => execCmd('italic')} icon={Italic} title="Italic" />
                    <ToolbarButton onClick={() => execCmd('underline')} icon={Underline} title="Underline" />
                    <div className="w-px h-4 bg-black/10 mx-1" />
                    <ToolbarButton onClick={() => execCmd('formatBlock', 'H1')} icon={Heading1} title="Heading 1" />
                    <ToolbarButton onClick={() => execCmd('formatBlock', 'H2')} icon={Heading2} title="Heading 2" />
                    <ToolbarButton onClick={() => execCmd('formatBlock', 'H3')} icon={Heading3} title="Heading 3" />
                    <div className="w-px h-4 bg-black/10 mx-1" />
                    <ToolbarButton onClick={() => execCmd('insertUnorderedList')} icon={List} title="Bullet List" />
                    <ToolbarButton onClick={() => execCmd('insertOrderedList')} icon={ListOrdered} title="Numbered List" />
                </div>
            )}

            {/* Content Editable */}
            <div
                ref={contentRef}
                contentEditable
                onClick={() => setIsExpanded(true)}
                className={`
                    w-full px-4 py-3 outline-none min-h-[40px] max-h-[60vh] overflow-y-auto
                    markdown-body journal-editor-content max-w-none
                    ${!isExpanded ? 'cursor-text truncate' : ''}
                    text-slate-800
                `}
                data-placeholder="Take a note..."
                onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                        handleSave();
                        if (onClose) onClose();
                    }
                }}
            />

            {/* Footer Actions */}
            {isExpanded && (
                <div className="flex items-center justify-between px-2 py-2 mt-1">
                    <div className="flex gap-1 relative">
                        <button
                            ref={paletteBtnRef}
                            onClick={() => setShowColorPicker(!showColorPicker)}
                            className="p-2 rounded-full hover:bg-black/10 transition-colors text-slate-600"
                            title="Background options"
                        >
                            <Palette size={18} />
                        </button>

                        {/* Color Picker Popover via Portal */}
                        {showColorPicker && createPortal(
                            <div
                                className="color-picker-popup fixed grid grid-cols-4 gap-2 p-3 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 z-[9999] animate-in fade-in zoom-in duration-200"
                                style={{
                                    top: pickerPos.top,
                                    left: pickerPos.left,
                                    width: '240px'
                                }}
                            >
                                {COLORS.map((c) => (
                                    <button
                                        key={c}
                                        onClick={() => { setColor(c); setShowColorPicker(false); }}
                                        className={`w-8 h-8 rounded-full border border-slate-200 hover:scale-110 transition-transform ${color === c ? 'ring-2 ring-indigo-500 ring-offset-2' : ''}`}
                                        style={{ backgroundColor: c }}
                                        title={c}
                                    />
                                ))}
                            </div>,
                            document.body
                        )}
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={() => {
                                if (onClose) onClose();
                                else {
                                    setIsExpanded(false);
                                }
                            }}
                            className="px-4 py-1.5 font-medium text-sm text-slate-500 hover:text-slate-700 hover:bg-black/5 rounded-md transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-4 py-1.5 font-medium text-sm text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors shadow-sm"
                        >
                            Save
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// eslint-disable-next-line no-unused-vars
function ToolbarButton({ onClick, icon: Icon, title }) {
    return (
        <button
            onClick={onClick}
            className="p-1.5 rounded hover:bg-black/10 text-slate-700 transition-colors"
            title={title}
            type="button" // Prevent form submission if any
        >
            <Icon size={16} />
        </button>
    );
}
