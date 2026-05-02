import User from '../models/User.js';
import { getEffectivePlanTier } from '../utils/planAccess.js';

/**
 * Gate routes by plan. Pass any of: 'pro', 'full'
 * — 'full' always satisfies a route that requires 'pro'.
 */
export function requirePremium(...allowedTiers) {
    return async (req, res, next) => {
        try {
            if (!req.user?.uid) {
                return res.status(401).json({ message: 'Unauthorized' });
            }
            const user = await User.findOne({ userId: req.user.uid }).select(
                'role planType hasPro hasFullAccess planExpiry paymentStatus'
            );
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            const tier = getEffectivePlanTier(user);
            if (tier === 'admin') {
                return next();
            }

            const wantsPro = allowedTiers.includes('pro');
            const wantsFull = allowedTiers.includes('full');

            if (wantsFull && tier === 'full') return next();
            if (wantsPro && (tier === 'pro' || tier === 'full')) return next();
            if (allowedTiers.includes(tier)) return next();

            return res.status(403).json({ message: 'Upgrade required' });
        } catch (err) {
            next(err);
        }
    };
}
