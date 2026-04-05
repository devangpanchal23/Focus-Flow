import mongoose from 'mongoose';

const songSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        index: true
    },
    name: {
        type: String, // Filename (e.g. "song.mp3")
        required: true
    },
    mimeType: {
        type: String, // "audio/mpeg", etc.
        required: true
    },
    data: {
        type: Buffer, // The actual binary data
        required: true
    },
    size: {
        type: Number,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

export default mongoose.model('Song', songSchema);
