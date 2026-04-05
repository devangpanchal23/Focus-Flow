import User from '../models/User.js';

export const requireRole = (roles) => {
    return async (req, res, next) => {
        try {
            // req.user is set by verifyToken middleware
            if (!req.user || !req.user.uid) {
                return res.status(401).json({ message: 'Unauthorized' });
            }

            const user = await User.findOne({ userId: req.user.uid });
            
            if (!user) {
                return res.status(401).json({ message: 'User not found' });
            }

            if (user.isBlocked) {
                return res.status(403).json({ message: 'Account is blocked' });
            }

            const allowedRoles = Array.isArray(roles) ? roles : [roles];
            
            if (!allowedRoles.includes(user.role)) {
                return res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
            }

            // Attach full user object for subsequent middlewares/controllers if needed
            req.adminUser = user; 
            next();
        } catch (error) {
            console.error('RBAC Error:', error);
            res.status(500).json({ message: 'Server error checking permissions' });
        }
    };
};
