import UserFocusScore from '../models/UserFocusScore.js';
import DailyStats from '../models/DailyStats.js';
import Task from '../models/Task.js';
import Habit from '../models/Habit.js';
import { startOfDay, endOfDay, subDays, format, parseISO } from 'date-fns';

export const calculateAndSaveFocusScore = async (userId, dateStr) => {
    // dateStr expected "YYYY-MM-DD"
    // We assume calculation happens at end of day or on demand.

    // 1. Fetch Daily Stats
    let dailyStats = await DailyStats.findOne({ userId, date: dateStr });

    // If no stats, initialize basic structure to avoid nulls
    if (!dailyStats) {
        // Fallback or create? 
        // If today, maybe create. If past, assume 0.
        // Let's rely on queried data below mostly.
    }

    const start = startOfDay(parseISO(dateStr));
    const end = endOfDay(parseISO(dateStr));

    // --- 1. Task Completion Score (40%) ---
    // Rule: completedTasks / totalTasks * 100
    // We query Tasks to be precise (DailyStats might drift)
    // "Total Tasks" = Created today OR (Scheduled for today AND not deleted)
    // Actually, simple metric: Tasks active today.
    // Let's use: Created Today + Due Today.
    // Simplified: All tasks that were "completed" today vs Total tasks that "exist" for today.

    const tasksCompletedTodayCount = await Task.countDocuments({
        userId,
        completed: true,
        completedAt: { $gte: start, $lte: end }
    });

    // Total tasks: We can count tasks created today + tasks completed today (in case created before) + overdue?
    // Let's stick to prompt: "Count tasks within selected timeframe".
    // We'll use: Tasks completed today + Tasks due today that are NOT completed.
    // Or just "Tasks created today".
    // Let's use DailyStats.tasksCreated as a baseline for "intent" + tasksCompletedToday.
    // A robust proxy: Total Tasks = (Tasks Due Today) + (Tasks Created Today).

    // For MVP/Stability: Use DailyStats counters if available, else query.
    // Let's query "Tasks with scheduledDate == today" + "Tasks created today".
    const tasksDueOrCreated = await Task.countDocuments({
        userId,
        $or: [
            { scheduledDate: { $gte: start, $lte: end } },
            { createdAt: { $gte: start, $lte: end } }
        ]
    });

    const totalMeasurableTasks = Math.max(tasksDueOrCreated, tasksCompletedTodayCount); // Avoid denominator < numerator

    let taskScore = 0;
    if (totalMeasurableTasks > 0) {
        taskScore = (tasksCompletedTodayCount / totalMeasurableTasks) * 100;
    }


    // --- 2. Focus Session Score (25%) ---
    // Formula: actualFocusTime / plannedFocusTime * 100
    // Actual: from DailyStats.totalFocusTime (seconds)
    const actualSeconds = dailyStats ? dailyStats.totalFocusTime : 0;

    // Planned: Sum of estimatedTime of TODAY'S tasks (or default 2h)
    // We sum estimatedTime of all tasks involved today
    const tasksForEstimation = await Task.find({
        userId,
        $or: [
            { scheduledDate: { $gte: start, $lte: end } },
            { createdAt: { $gte: start, $lte: end } },
            { completedAt: { $gte: start, $lte: end } }
        ]
    });

    let plannedSeconds = tasksForEstimation.reduce((acc, t) => acc + (t.estimatedTime || 0), 0);
    if (plannedSeconds < 1800) plannedSeconds = 7200; // Default to 2 hours if estimate is missing/low

    let focusScore = 0;
    if (plannedSeconds > 0) {
        focusScore = (actualSeconds / plannedSeconds) * 100;
    }
    if (focusScore > 100) focusScore = 100; // Cap
    // Ignore sessions < 10 mins (600s) - this logic should be in the tracking, but we can't retroactively filter totalFocusTime easily without raw logs.
    // We assume totalFocusTime is valid.


    // --- 3. Habit Consistency Score (20%) ---
    // Rule: currentStreak / maxExpectedStreak * 100 (Rolling 7 day window)
    // We check last 7 days.
    const habits = await Habit.find({ userId });
    let habitScore = 0;

    if (habits.length > 0) {
        let totalHabitCompliance = 0;
        const windowDays = 7;

        // Generate last 7 date strings
        const last7Days = [];
        for (let i = 0; i < windowDays; i++) {
            last7Days.push(format(subDays(parseISO(dateStr), i), 'yyyy-MM-dd'));
        }

        habits.forEach(h => {
            // Count how many of last 7 days are in h.completions
            let matchCount = 0;
            last7Days.forEach(d => {
                if (h.completions.includes(d)) matchCount++;
            });
            totalHabitCompliance += (matchCount / windowDays);
        });

        // Average compliance across all habits
        habitScore = (totalHabitCompliance / habits.length) * 100;
    } else {
        habitScore = 100; // No habits = 'perfect' compliance? Or 0? 
        // Prompt: "Missing module data → weighted redistribution optional". 
        // Let's set 50 neutral or 0? Prompt says "Empty data -> score defaults to 0".
        habitScore = 0;
    }


    // --- 4. Distraction Control Score (10%) ---
    // Formula: 1 - (distractions / focusSessions) * 100
    const distractions = dailyStats ? (dailyStats.distractions || 0) : 0;
    const focusSessions = dailyStats ? (dailyStats.focusSessionsCount || 0) : 1; // Avoid div/0

    let distractionScore = 100;
    if (focusSessions > 0) {
        const ratio = distractions / focusSessions;
        distractionScore = (1 - ratio) * 100;
        if (distractionScore < 0) distractionScore = 0;
    }

    // --- 5. Break Discipline Score (5%) ---
    // Formula: takenBreaks / suggestedBreaks * 100
    const breaksTaken = dailyStats ? (dailyStats.breaksTaken || 0) : 0;
    const breaksSuggested = dailyStats ? (dailyStats.breaksSuggested || 0) : 0;

    let breakScore = 100; // Default to perfect if no suggestions
    if (breaksSuggested > 0) {
        breakScore = (breaksTaken / breaksSuggested) * 100;
        if (breakScore > 100) breakScore = 100;
    } else if (actualSeconds > 3600 && breaksTaken === 0) {
        // If worked > 1 hour without breaks/suggestions, penalize?
        breakScore = 50;
    }


    // --- Final Calculation ---
    // Weights: Task(0.40) + Focus(0.25) + Habit(0.20) + Distraction(0.10) + Break(0.05)

    let finalScore =
        (taskScore * 0.40) +
        (focusScore * 0.25) +
        (habitScore * 0.20) +
        (distractionScore * 0.10) +
        (breakScore * 0.05);

    finalScore = Math.round(Math.max(0, Math.min(100, finalScore)));

    // Save to DB
    const scoreRecord = await UserFocusScore.findOneAndUpdate(
        { userId, date: dateStr },
        {
            userId,
            date: dateStr,
            taskCompletionScore: Math.round(taskScore),
            focusSessionScore: Math.round(focusScore),
            habitConsistencyScore: Math.round(habitScore),
            distractionControlScore: Math.round(distractionScore),
            breakDisciplineScore: Math.round(breakScore),
            finalFocusScore: finalScore,
            createdAt: new Date()
        },
        { upsert: true, new: true }
    );

    return scoreRecord;
};
