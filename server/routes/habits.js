import express from 'express';
import Habit from '../models/Habit.js';
import { verifyToken } from '../middleware/auth.js';
import { checkFeatureAccess } from '../middleware/featureAccessMiddleware.js';

const router = express.Router();

router.use(verifyToken);
router.use(checkFeatureAccess('habits'));

// Get all habits
router.get('/', async (req, res) => {
    try {
        const habits = await Habit.find({ userId: req.user.uid }).sort({ createdAt: 1 });

        const formattedHabits = habits.map(h => ({
            id: h._id,
            title: h.title,
            createdAt: h.createdAt,
            completions: h.completions
        }));

        res.json(formattedHabits);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Create a habit
router.post('/', async (req, res) => {
    try {
        if (!req.body.title) {
            return res.status(400).json({ message: 'Title is required' });
        }

        const habit = new Habit({
            userId: req.user.uid,
            title: req.body.title,
            createdAt: new Date()
        });

        const newHabit = await habit.save();

        res.status(201).json({
            id: newHabit._id,
            title: newHabit.title,
            createdAt: newHabit.createdAt,
            completions: newHabit.completions
        });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Delete a habit
router.delete('/:id', async (req, res) => {
    try {
        const habit = await Habit.findOne({ _id: req.params.id, userId: req.user.uid });
        if (!habit) return res.status(404).json({ message: 'Habit not found' });

        await habit.deleteOne();
        res.json({ message: 'Habit deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Toggle habit completion for a date
router.post('/:id/toggle', async (req, res) => {
    try {
        const { date } = req.body; // Expects "YYYY-MM-DD"
        if (!date) return res.status(400).json({ message: 'Date is required' });

        const habit = await Habit.findOne({ _id: req.params.id, userId: req.user.uid });
        if (!habit) return res.status(404).json({ message: 'Habit not found' });

        const index = habit.completions.indexOf(date);
        let added = false;

        if (index > -1) {
            // Remove
            habit.completions.splice(index, 1);
        } else {
            // Add
            habit.completions.push(date);
            added = true;
        }

        await habit.save();

        res.json({
            id: habit._id,
            completions: habit.completions,
            toggledDate: date,
            status: added ? 'completed' : 'uncompleted'
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

export default router;
