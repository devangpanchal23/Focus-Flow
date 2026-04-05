import React from 'react';
import { Pin, Trash2 } from 'lucide-react';

export default function NoteCard({ note, onClick, onDelete, onPin }) {
    return (
        <div
            className="group relative flex flex-col p-4 rounded-xl border border-slate-200 hover:border-slate-300 dark:border-slate-700 hover:shadow-md transition-all duration-200 cursor-pointer break-inside-avoid mb-4"
            style={{ backgroundColor: note.color || '#ffffff' }}
            onClick={() => onClick(note)}
        >
            {/* Hover Actions */}
            <div className="opacity-0 group-hover:opacity-100 absolute top-2 right-2 flex gap-1 transition-opacity z-10">
                <button
                    onClick={(e) => { e.stopPropagation(); onPin(note); }}
                    className={`p-1.5 rounded-full hover:bg-black/10 backdrop-blur-sm transition-colors ${note.isPinned ? 'bg-black/5 text-indigo-600' : 'text-slate-600'}`}
                >
                    <Pin size={16} className={note.isPinned ? 'fill-current' : ''} />
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); onDelete(note._id || note.id); }}
                    className="p-1.5 rounded-full hover:bg-black/10 backdrop-blur-sm text-slate-600 transition-colors"
                >
                    <Trash2 size={16} />
                </button>
            </div>

            {note.title && (
                <h3 className="font-bold text-lg mb-2 text-slate-800">{note.title}</h3>
            )}

            <div
                className="text-slate-700 text-sm line-clamp-[10] prose prose-sm max-w-none prose-p:my-0 prose-headings:my-1"
                dangerouslySetInnerHTML={{ __html: note.content || '' }}
            />

            <div className="mt-3 text-xs text-slate-400 font-medium">
                {new Date(note.updatedAt || note.createdAt).toLocaleDateString()}
            </div>
        </div>
    );
}
