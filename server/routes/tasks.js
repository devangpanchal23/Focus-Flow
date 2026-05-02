import express from 'express';
import Task from '../models/Task.js';
import DailyStats from '../models/DailyStats.js';
import User from '../models/User.js';
import { format } from 'date-fns';
import { verifyToken } from '../middleware/auth.js';
import {
    utcDayBoundsFromYyyyMmDd,
    normalizeIncomingScheduledDate,
    rangeFromIsoParams,
} from '../utils/taskDates.js';

const router = express.Router();

const getUserIdentityForDailyStats = async (userId) => {
    const user = await User.findOne({ userId })
        .select('email displayName')
        .lean();
    const identityUpdate = {};
    if (user?.email) identityUpdate.userEmail = user.email;
    if (user?.displayName) identityUpdate.userDisplayName = user.displayName;
    return identityUpdate;
};

const buildDailyStatsUpdate = (incUpdate, identityUpdate) => {
    const update = { $inc: incUpdate };
    if (identityUpdate && Object.keys(identityUpdate).length > 0) {
        update.$set = identityUpdate;
    }
    return update;
};

// Apply auth middleware to all routes
router.use(verifyToken);

// Get all tasks or filter by scheduledDate (never createdAt)
router.get('/', async (req, res) => {
    try {
        const { start, end, date, rangeStart, rangeEnd } = req.query;
        let query = { userId: req.user.uid };

        if (rangeStart && rangeEnd) {
            const b1 = utcDayBoundsFromYyyyMmDd(rangeStart);
            const b2 = utcDayBoundsFromYyyyMmDd(rangeEnd);
            if (!b1 || !b2) {
                return res.status(400).json({ message: 'Invalid rangeStart or rangeEnd (use yyyy-MM-dd)' });
            }
            query.scheduledDate = {
                $gte: b1.start,
                $lte: b2.end,
            };
        } else if (start && end) {
            const r = rangeFromIsoParams(start, end);
            if (!r) {
                return res.status(400).json({ message: 'Invalid start or end ISO date' });
            }
            query.scheduledDate = {
                $gte: r.start,
                $lte: r.end,
            };
        } else if (date) {
            const bounds =
                utcDayBoundsFromYyyyMmDd(date) ||
                (() => {
                    const parsed = normalizeIncomingScheduledDate(date);
                    if (!parsed) return null;
                    const y = parsed.getUTCFullYear();
                    const m = parsed.getUTCMonth();
                    const d = parsed.getUTCDate();
                    return {
                        start: new Date(Date.UTC(y, m, d, 0, 0, 0, 0)),
                        end: new Date(Date.UTC(y, m, d, 23, 59, 59, 999)),
                    };
                })();
            if (!bounds) {
                return res.status(400).json({ message: 'Invalid date query' });
            }
            query.scheduledDate = {
                $gte: bounds.start,
                $lte: bounds.end,
            };
        }

        const tasks = await Task.find(query).sort({
            scheduledDate: 1,
            scheduledTime: 1,
            createdAt: -1,
        });

        // Transform _id to id for frontend compatibility
        const formattedTasks = tasks.map(task => ({
            id: task._id, // Map _id to id
            title: task.title,
            description: task.description,
            completed: task.completed,
            completedAt: task.completedAt,
            priority: task.priority,
            project: task.project,
            timeSpent: task.timeSpent,
            estimatedTime: task.estimatedTime,
            createdAt: task.createdAt,
            scheduledDate: task.scheduledDate,
            scheduledTime: task.scheduledTime
        }));
        res.json(formattedTasks);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Create a task
router.post('/', async (req, res) => {
    try {
        console.log('Creating task with body:', req.body); // Debug log

        if (!req.body.title) {
            return res.status(400).json({ message: 'Task title is required' });
        }

        const scheduledDate = normalizeIncomingScheduledDate(req.body.scheduledDate);

        const task = new Task({
            userId: req.user.uid,
            title: req.body.title,
            description: req.body.description || '',
            priority: req.body.priority || 'medium',
            project: req.body.project || 'Inbox',
            estimatedTime: req.body.estimatedTime || 0,
            scheduledDate: scheduledDate || undefined,
            scheduledTime: req.body.scheduledTime,
        });

        const newTask = await task.save();

        // Update Daily Stats for Creation (by scheduled day, not createdAt)
        try {
            const identityUpdate = await getUserIdentityForDailyStats(req.user.uid);
            const statDay = newTask.scheduledDate
                ? new Date(newTask.scheduledDate).toISOString().slice(0, 10)
                : format(new Date(), 'yyyy-MM-dd');
            await DailyStats.findOneAndUpdate(
                { date: statDay, userId: req.user.uid },
                buildDailyStatsUpdate({ tasksCreated: 1 }, identityUpdate),
                { upsert: true, new: true }
            );
        } catch (statsErr) {
            console.error('Failed to update daily stats:', statsErr);
        }

        res.status(201).json({
            id: newTask._id,
            title: newTask.title,
            description: newTask.description,
            completed: newTask.completed,
            priority: newTask.priority,
            project: newTask.project,
            timeSpent: newTask.timeSpent,
            estimatedTime: newTask.estimatedTime,
            createdAt: newTask.createdAt,
            scheduledDate: newTask.scheduledDate,
            scheduledTime: newTask.scheduledTime
        });

    } catch (err) {
        console.error('Error in POST /tasks:', err);
        if (err.name === 'ValidationError') {
            return res.status(400).json({ message: 'Validation Error: ' + err.message });
        }
        res.status(400).json({ message: err.message || 'Failed to create task' });
    }
});

// Update a task (toggle completion, etc)
router.patch('/:id', async (req, res) => {
    try {
        const task = await Task.findOne({ _id: req.params.id, userId: req.user.uid });
        if (!task) return res.status(404).json({ message: 'Task not found' });

        if (req.body.title != null) task.title = req.body.title;
        if (req.body.description != null) task.description = req.body.description;
        if (req.body.completed != null) {
            task.completed = req.body.completed;
            task.completedAt = req.body.completed ? new Date() : null;
        }
        if (req.body.priority != null) task.priority = req.body.priority;
        if (req.body.project != null) task.project = req.body.project;
        if (req.body.estimatedTime != null) task.estimatedTime = req.body.estimatedTime;
        if (req.body.scheduledDate != null) {
            task.scheduledDate =
                normalizeIncomingScheduledDate(req.body.scheduledDate) || undefined;
        }
        if (req.body.scheduledTime != null) task.scheduledTime = req.body.scheduledTime;

        // Check if task is being completed
        const isCompleting = req.body.completed === true && task.completed === false;

        const updatedTask = await task.save();

        if (isCompleting) {
            const today = format(new Date(), 'yyyy-MM-dd');
            const identityUpdate = await getUserIdentityForDailyStats(req.user.uid);
            await DailyStats.findOneAndUpdate(
                { date: today, userId: req.user.uid },
                buildDailyStatsUpdate({ tasksCompleted: 1 }, identityUpdate),
                { upsert: true, new: true }
            );
        }

        res.json({
            id: updatedTask._id,
            title: updatedTask.title,
            description: updatedTask.description,
            completed: updatedTask.completed,
            completedAt: updatedTask.completedAt,
            priority: updatedTask.priority,
            project: updatedTask.project,
            timeSpent: updatedTask.timeSpent,
            estimatedTime: updatedTask.estimatedTime,
            createdAt: updatedTask.createdAt,
            scheduledDate: updatedTask.scheduledDate,
            scheduledTime: updatedTask.scheduledTime
        });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Delete a task
router.delete('/:id', async (req, res) => {
    try {
        const task = await Task.findOne({ _id: req.params.id, userId: req.user.uid });
        if (!task) return res.status(404).json({ message: 'Task not found' });

        await task.deleteOne();
        res.json({ message: 'Task deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Log time for a task
router.post('/:id/log-time', async (req, res) => {
    try {
        const { duration } = req.body; // duration in seconds
        if (!duration || typeof duration !== 'number') {
            return res.status(400).json({ message: 'Valid duration is required' });
        }

        const task = await Task.findOne({ _id: req.params.id, userId: req.user.uid });
        if (!task) return res.status(404).json({ message: 'Task not found' });

        // Update Task
        task.timeSpent += duration;
        await task.save();

        // Update Daily Stats
        const today = format(new Date(), 'yyyy-MM-dd');
        const identityUpdate = await getUserIdentityForDailyStats(req.user.uid);
        await DailyStats.findOneAndUpdate(
            { date: today, userId: req.user.uid },
            buildDailyStatsUpdate({ totalFocusTime: duration }, identityUpdate),
            { upsert: true, new: true }
        );

        res.json({
            message: 'Time logged successfully',
            timeSpent: task.timeSpent
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

export default router;
