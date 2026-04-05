import React, { useState } from 'react';
import { useNoteStore } from '../../store/useNoteStore';
import NoteEditor from './NoteEditor';
import NoteCard from './NoteCard';
import { X } from 'lucide-react';

export default function Notes() {
    const { notes, addNote, updateNote, deleteNote, isLoading } = useNoteStore();
    const [editingNote, setEditingNote] = useState(null);

    const handleCreate = async (noteData) => {
        try {
            await addNote(noteData);
        } catch (err) {
            console.error(err);
            throw err;
        }
    };

    const handleUpdate = async (noteData) => {
        try {
            const id = noteData.id || noteData._id;
            await updateNote(id, noteData);
            setEditingNote(null);
        } catch (err) {
            console.error(err);
            alert("Failed to save note");
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this note?')) {
            try {
                await deleteNote(id);
                if (editingNote?.id === id || editingNote?._id === id) setEditingNote(null);
            } catch (err) {
                console.error(err);
                alert("Failed to delete note");
            }
        }
    };

    const handlePin = async (note) => {
        try {
            const id = note.id || note._id;
            await updateNote(id, { isPinned: !note.isPinned });
        } catch (err) {
            console.error(err);
        }
    };

    const pinnedNotes = notes.filter(n => n.isPinned);
    const otherNotes = notes.filter(n => !n.isPinned);

    return (
        <div className="h-full overflow-y-auto p-4 md:p-8 custom-scrollbar">
            {/* Create Note Area */}
            <div className="max-w-2xl mx-auto mb-10">
                <NoteEditor onSave={handleCreate} className="shadow-sm hover:shadow-md bg-white dark:bg-slate-800" />
            </div>

            {/* Notes Grid */}
            <div className="max-w-7xl mx-auto space-y-8 pb-20">
                {isLoading && notes.length === 0 && (
                    <div className="text-center text-slate-400">Loading notes...</div>
                )}

                {/* Pinned Notes */}
                {pinnedNotes.length > 0 && (
                    <section>
                        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">Pinned</h2>
                        <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-4">
                            {pinnedNotes.map(note => (
                                <NoteCard
                                    key={note._id || note.id}
                                    note={note}
                                    onClick={setEditingNote}
                                    onDelete={handleDelete}
                                    onPin={handlePin}
                                />
                            ))}
                        </div>
                    </section>
                )}

                {/* Other Notes */}
                {otherNotes.length > 0 && (
                    <section>
                        {pinnedNotes.length > 0 && (
                            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">Others</h2>
                        )}
                        <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-4">
                            {otherNotes.map(note => (
                                <NoteCard
                                    key={note._id || note.id}
                                    note={note}
                                    onClick={setEditingNote}
                                    onDelete={handleDelete}
                                    onPin={handlePin}
                                />
                            ))}
                        </div>
                    </section>
                )}

                {!isLoading && notes.length === 0 && (
                    <div className="text-center py-20 opacity-50">
                        <div className="inline-block p-4 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
                            <span className="text-4xl">📝</span>
                        </div>
                        <p className="text-slate-500 font-medium">No notes yet</p>
                        <p className="text-slate-400 text-sm">Notes you add appear here</p>
                    </div>
                )}
            </div>

            {/* Edit Modal */}
            {editingNote && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div
                        className="fixed inset-0"
                        onClick={() => setEditingNote(null)}
                    ></div>
                    <div className="w-full max-w-2xl relative z-60 animate-in zoom-in-95 duration-200">
                        <NoteEditor
                            initialData={editingNote}
                            onSave={handleUpdate}
                            onClose={() => setEditingNote(null)}
                            className="bg-white dark:bg-slate-800 shadow-2xl max-h-[85vh] flex flex-col"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
