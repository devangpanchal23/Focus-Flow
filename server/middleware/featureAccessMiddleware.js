import User from '../models/User.js';

const checkFeatureAccess = (feature) => {
    return async (req, res, next) => {
        try {
            // req.user should be populated by verifyToken
            if (!req.user || !req.user.uid) {
                return res.status(401).json({ message: "User context missing" });
            }

            let role = req.user.role;
            if (!role) {
                const dbUser = await User.findOne({ userId: req.user.uid }).select('role');
                if (!dbUser) {
                    return res.status(404).json({ message: "User not found" });
                }
                role = dbUser.role;
                req.user.role = role; // Cache for subsequent middlewares
            }

            // Admin and Moderator bypass
            if (role === 'admin' || role === 'moderator') {
                return next();
            }

        const accessMap = {
            // Company access tiers:
            // - normal: only core execution features
            // - pro: adds calendar + web blocking
            // - full: unlock everything
            normal: ["tasks", "focus"],
            pro: ["tasks", "focus", "calendar", "webblock"],
            full: ["all"]
        };

        if (
            (accessMap[role] && accessMap[role].includes(feature)) ||
            (accessMap[role] && accessMap[role].includes("all"))
        ) {
            return next();
        }

        return res.status(403).json({
            message: "Upgrade required to access this feature"
        });
        } catch (error) {
            console.error('Feature access error:', error);
            res.status(500).json({ message: "Server error checking access" });
        }
    };
};

export { checkFeatureAccess };
