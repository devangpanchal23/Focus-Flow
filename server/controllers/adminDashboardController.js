import User from '../models/User.js';
import Task from '../models/Task.js';

export const getDashboardStats = async (req, res) => {
    try {
        // Total Users
        const totalUsers = await User.countDocuments();

        // Active Users (Last 7 days approx, utilizing lastLogin if we had consistent tracking, or createdAt, or DailyStats)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const activeUsersLast7Days = await User.countDocuments({
             lastLogin: { $gte: sevenDaysAgo } 
        });

        // Tasks Total & Completed
        const totalTasks = await Task.countDocuments();
        const completedTasks = await Task.countDocuments({ completed: true });

        // Tasks per day (Last 7 days) Using Mongo Aggregation
        const tasksPerDayAgg = await Task.aggregate([
            {
                $match: {
                    createdAt: { $gte: sevenDaysAgo }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        res.json({
            totalUsers,
            activeUsers: activeUsersLast7Days,
            totalTasks,
            completedTasks,
            tasksPerDay: tasksPerDayAgg
        });
    } catch (error) {
        console.error("Dashboard Stats Error:", error);
        res.status(500).json({ message: "Server Error fetching stats" });
    }
};
