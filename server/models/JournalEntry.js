import mongoose from 'mongoose';

const journalEntrySchema = new mongoose.Schema({
    userId: { type: String, required: true },
    date: { type: String, required: true }, // Format: YYYY-MM-DD
    content: { type: String, default: '', trim: true },
    mood: { type: String, default: 'neutral' }, // reliable for future emotion tracking
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Compound index to ensure one entry per day per user
journalEntrySchema.index({ userId: 1, date: 1 }, { unique: true });

const JournalEntry = mongoose.model('JournalEntry', journalEntrySchema);
export default JournalEntry;
