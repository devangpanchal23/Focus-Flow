/**
 * Single source of truth for premium tier on the server.
 * Uses planType + legacy flags + role (admin/moderator/full/pro).
 */
export function getEffectivePlanTier(user) {
    if (!user) return 'free';
    if (user.role === 'admin' || user.role === 'moderator') return 'admin';
    if (user.planType === 'full' || user.hasFullAccess || user.role === 'full') return 'full';
    if (user.planType === 'pro' || user.hasPro || user.role === 'pro') return 'pro';
    return 'free';
}

const accessMap = {
    free: ['tasks', 'focus'],
    pro: ['tasks', 'focus', 'calendar', 'webblock'],
    full: ['all'],
};

export function tierHasFeature(tier, feature) {
    if (tier === 'admin') return true;
    const list = accessMap[tier] || accessMap.free;
    return list.includes('all') || list.includes(feature);
}
