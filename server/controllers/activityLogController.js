import ActivityLog from '../models/ActivityLog.js';

export const getLogs = async (req, res) => {
    try {
        const { action, limit = 50, page = 1 } = req.query;
        let query = {};
        
        if (action) {
            query.action = action;
        }

        const skip = (page - 1) * limit;

        const logs = await ActivityLog.find(query)
            .sort({ timestamp: -1 })
            .skip(skip)
            .limit(parseInt(limit));
            
        const total = await ActivityLog.countDocuments(query);

        res.json({ 
            logs,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
