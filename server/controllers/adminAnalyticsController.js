import Task from '../models/Task.js';
import User from '../models/User.js';

export const getTopTaskPerformers = async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit || '3', 10) || 3, 50);

        const agg = await Task.aggregate([
            {
                $group: {
                    _id: '$userId',
                    tasksCreated: { $sum: 1 },
                    tasksCompleted: {
                        $sum: {
                            $cond: [{ $eq: ['$completed', true] }, 1, 0]
                        }
                    }
                }
            },
            {
                $addFields: {
                    completionRate: {
                        $cond: [
                            { $eq: ['$tasksCreated', 0] },
                            0,
                            { $divide: ['$tasksCompleted', '$tasksCreated'] }
                        ]
                    }
                }
            },
            // Sort by completed first, then by created
            { $sort: { tasksCompleted: -1, tasksCreated: -1 } },
            { $limit: limit }
        ]);

        const userIds = agg.map(a => a._id).filter(Boolean);
        const users = await User.find({ userId: { $in: userIds } })
            .select('userId email displayName photoURL role status')
            .lean();

        const userMap = new Map(users.map(u => [u.userId, u]));

        const leaderboard = agg.map(row => ({
            userId: row._id,
            user: userMap.get(row._id) || null,
            tasksCreated: row.tasksCreated,
            tasksCompleted: row.tasksCompleted,
            completionRate: row.completionRate
        }));

        res.json({ leaderboard });
    } catch (error) {
        console.error('Admin analytics error:', error);
        res.status(500).json({ message: 'Server error fetching analytics' });
    }
};

