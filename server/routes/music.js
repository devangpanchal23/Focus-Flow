import express from 'express';
import multer from 'multer';
import Song from '../models/Song.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Configure Multer for memory storage (buffer)
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 15 * 1024 * 1024 // Limit to 15MB to be safe with Mongo 16MB doc limit
    }
});

// GET /api/music - Get all songs for user
router.get('/', verifyToken, async (req, res) => {
    try {
        // We only return metadata for the list to keep it fast
        // The actual binary data will be fetched individually via a streaming endpoint or included if the list is small?
        // Actually for a pure "clone" it's easier to just return everything or assume client handles it.
        // But sending 50MB of data in a list is bad.
        // Let's return metadata only, and have a separate endpoint to get the blob.
        // OR: Return base64? No.

        // Better strategy for this task:
        // 1. GET / -> returns [{_id, name, mimeType}]
        // 2. GET /:id/stream -> returns binary stream

        const songs = await Song.find({ userId: req.user.uid }).select('-data'); // Exclude heavy data field
        res.json(songs);
    } catch (error) {
        console.error('Error fetching songs:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// GET /api/music/:id/audio - Stream specific song
router.get('/:id/audio', async (req, res) => {
    // Note: This endpoint might not be auth-protected if used in <audio src="..."> 
    // unless we pass token in query param or headers. 
    // For simplicity in this clone, let's make it public IF they have the ID, or use query param auth.
    // We'll trust the ID is enough obfuscation for now, or check 'token' query param.

    try {
        const song = await Song.findById(req.params.id);
        if (!song) return res.status(404).send('Song not found');

        res.set('Content-Type', song.mimeType);
        res.set('Content-Length', song.data.length);
        res.send(song.data);
    } catch (error) {
        console.error('Error streaming song:', error);
        res.status(500).send('Server Error');
    }
});

// POST /api/music - Upload a song
router.post('/', verifyToken, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const newSong = new Song({
            userId: req.user.uid,
            name: req.file.originalname,
            mimeType: req.file.mimetype,
            data: req.file.buffer,
            size: req.file.size
        });

        await newSong.save();

        // Return the song metadata (no data)
        res.status(201).json({
            _id: newSong._id,
            name: newSong.name,
            userId: newSong.userId
        });
    } catch (error) {
        console.error('Error uploading song:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// DELETE /api/music/:id - Delete a song
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        const song = await Song.findOneAndDelete({ _id: req.params.id, userId: req.user.uid });
        if (!song) return res.status(404).json({ message: 'Song not found' });
        res.json({ message: 'Song deleted' });
    } catch (error) {
        console.error('Error deleting song:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

export default router;
