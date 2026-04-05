import express from 'express';
import Note from '../models/Note.js';
import { verifyToken } from '../middleware/auth.js';
import { checkFeatureAccess } from '../middleware/featureAccessMiddleware.js';

const router = express.Router();

// Apply token verification and feature authorization to all routes here
router.use(verifyToken);
router.use(checkFeatureAccess('notes'));

// Get all notes for user
router.get('/', async (req, res) => {
    try {
        const notes = await Note.find({ userId: req.user.uid }).sort({ isPinned: -1, updatedAt: -1 });
        res.json(notes);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Create a new note
router.post('/', async (req, res) => {
    try {
        const note = new Note({
            ...req.body,
            userId: req.user.uid,
            createdAt: new Date(),
            updatedAt: new Date()
        });
        const savedNote = await note.save();
        res.status(201).json(savedNote);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Update a note
router.patch('/:id', async (req, res) => {
    try {
        const note = await Note.findOne({ _id: req.params.id, userId: req.user.uid });
        if (!note) return res.status(404).json({ message: 'Note not found' });

        Object.assign(note, req.body);
        note.updatedAt = new Date();

        const updatedNote = await note.save();
        res.json(updatedNote);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Delete a note
router.delete('/:id', async (req, res) => {
    try {
        const note = await Note.findOneAndDelete({ _id: req.params.id, userId: req.user.uid });
        if (!note) return res.status(404).json({ message: 'Note not found' });

        res.json({ message: 'Note deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

export default router;
