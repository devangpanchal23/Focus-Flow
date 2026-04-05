import mongoose from 'mongoose';

const noteSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    title: { type: String },
    content: { type: String },
    color: { type: String, default: '#ffffff' },
    isPinned: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const Note = mongoose.model('Note', noteSchema);
export default Note;
