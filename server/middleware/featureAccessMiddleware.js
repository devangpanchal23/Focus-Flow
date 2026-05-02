import User from '../models/User.js';
import { getEffectivePlanTier, tierHasFeature } from '../utils/planAccess.js';

const checkFeatureAccess = (feature) => {
    return async (req, res, next) => {
        try {
            if (!req.user || !req.user.uid) {
                return res.status(401).json({ message: 'User context missing' });
            }

            const dbUser = await User.findOne({ userId: req.user.uid }).select(
                'role planType hasPro hasFullAccess'
            );
            if (!dbUser) {
                return res.status(404).json({ message: 'User not found' });
            }

            const tier = getEffectivePlanTier(dbUser);

            if (tier === 'admin') {
                return next();
            }

            if (tierHasFeature(tier, feature)) {
                return next();
            }

            return res.status(403).json({
                message: 'Upgrade required to access this feature',
            });
        } catch (error) {
            console.error('Feature access error:', error);
            res.status(500).json({ message: 'Server error checking access' });
        }
    };
};

export { checkFeatureAccess };
