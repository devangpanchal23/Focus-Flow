import jwt from 'jsonwebtoken';

export const verifyToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key');
        
        // Populate req.user. The token contains { user_id: '...' } as defined in auth.js generic generation
        req.user = { uid: decodedToken.user_id };
        next();

    } catch (err) {
        console.error('Auth Error (JWT):', err.message);
        res.status(403).json({ message: 'Unauthorized: Invalid token' });
    }
};
