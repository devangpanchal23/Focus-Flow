import User from '../models/User.js';
import UserSessionLog from '../models/UserSessionLog.js';
import { toPublicUser } from '../utils/userPublic.js';
import { mergePreferences, mergeUiState } from '../utils/mergeUserState.js';

const defaultPreferences = () => ({
    theme: 'light',
    soundEnabled: true,
    volume: 0.5,
});

const defaultUiState = () => ({
    sidebarOrder: [],
    lastActiveTab: 'dashboard',
    focusSession: {},
    youtubeMusic: {},
});

export async function getMeWithState(req, res) {
    try {
        const user = await User.findOne({ userId: req.user.uid });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const prefsRaw = user.preferences?.toObject?.() || user.preferences || {};
        const uiRaw = user.uiState?.toObject?.() || user.uiState || {};

        res.json({
            user: toPublicUser(user),
            preferences: { ...defaultPreferences(), ...prefsRaw },
            uiState: { ...defaultUiState(), ...uiRaw },
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
}

export async function patchUserState(req, res) {
    try {
        const { preferences, uiState } = req.body || {};
        const user = await User.findOne({ userId: req.user.uid });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        let changed = false;

        if (preferences && typeof preferences === 'object') {
            user.preferences = mergePreferences(user.preferences, preferences);
            changed = true;
        }
        if (uiState && typeof uiState === 'object') {
            user.uiState = mergeUiState(user.uiState, uiState);
            changed = true;
        }

        if (changed) {
            user.lastSyncAt = new Date();
            await user.save();
        }

        const prefsRaw = user.preferences?.toObject?.() || user.preferences || {};
        const uiRaw = user.uiState?.toObject?.() || user.uiState || {};

        res.json({
            ok: true,
            preferences: { ...defaultPreferences(), ...prefsRaw },
            uiState: { ...defaultUiState(), ...uiRaw },
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
}

export async function logUserSession(req, res) {
    try {
        const { event = 'APP_OPEN', payload } = req.body || {};

        await UserSessionLog.create({
            userId: req.user.uid,
            provider: req.user.provider || 'unknown',
            event: ['APP_OPEN', 'APP_SYNC', 'STATE_PATCH', 'LOGOUT_MARKER'].includes(event)
                ? event
                : 'APP_OPEN',
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            payload: payload && typeof payload === 'object' ? payload : undefined,
        });

        const safeEmail = `${String(req.user.uid).replace(/\W/g, '_').slice(0, 48)}@placeholder.focusflow.app`;
        await User.findOneAndUpdate(
            { userId: req.user.uid },
            {
                $set: { lastLogin: new Date() },
                $setOnInsert: {
                    userId: req.user.uid,
                    email: safeEmail,
                    displayName: 'Signed-in user',
                    role: 'normal',
                    status: 'accepted',
                },
            },
            { upsert: true }
        ).catch(() => {});

        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
}
