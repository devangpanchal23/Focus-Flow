/**
 * Centralized access helpers. Backend (/api/users/me) is the source of truth when present.
 */

export const getEffectiveRole = (backendUser, clerkUser) => {
    if (backendUser) {
        if (backendUser.role === 'admin' || backendUser.role === 'moderator') {
            return backendUser.role;
        }
        const hasPaidPlan =
            backendUser.paymentStatus === 'completed' || backendUser.isPremium;
        if (hasPaidPlan && (backendUser.planType === 'full' || backendUser.hasFullAccess)) return 'full';
        if (hasPaidPlan && (backendUser.planType === 'pro' || backendUser.hasPro)) return 'pro';
        return 'normal';
    }

    return 'normal';
};

export const hasAccess = (currentRole, requiredRole) => {
    if (currentRole === 'admin' || currentRole === 'moderator') return true;
    if (currentRole === 'full') return true;
    if (currentRole === 'pro' && requiredRole === 'pro') return true;
    if (requiredRole === 'normal') return true;
    return false;
};
