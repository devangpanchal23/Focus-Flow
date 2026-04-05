import ActivityLog from '../models/ActivityLog.js';

export const logActivity = async (userId, action, performedBy, ipAddress, details = {}) => {
    try {
        const log = new ActivityLog({
            userId,
            action,
            performedBy,
            ipAddress,
            details
        });
        await log.save();
    } catch (error) {
        console.error('Error logging activity:', error);
        // We don't throw here to avoid failing the main request if logging fails
    }
};

// Middleware wrapper for specific dynamic routes if desired, though calling logActivity directly in controllers is often cleaner.
export const activityLoggerMiddleware = (action) => {
    return async (req, res, next) => {
        // Run next() first, then log if successful? 
        // Best approach is manually calling `logActivity` in controllers when the operation succeeds.
        next();
    };
};
