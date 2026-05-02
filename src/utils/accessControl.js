/**
 * Centralized access helpers. Backend (/api/users/me) is the source of truth when present.
 */

export const getEffectiveRole = (backendUser, clerkUser) => {
    const md = clerkUser?.publicMetadata || {};

    if (backendUser) {
        if (backendUser.role === 'admin' || backendUser.role === 'moderator') {
            return backendUser.role;
        }
        if (backendUser.planType === 'full' || backendUser.hasFullAccess) return 'full';
        if (backendUser.planType === 'pro' || backendUser.hasPro) return 'pro';
    }

    let role = md.role || 'normal';
    if (role === 'admin' || role === 'moderator') return role;
    if (md.planType === 'full' || md.hasFullAccess) return 'full';
    if (md.planType === 'pro' || md.hasPro) return 'pro';
    if (role === 'full' || role === 'pro') return role;
    return 'normal';
};

export const hasAccess = (currentRole, requiredRole) => {
    if (currentRole === 'admin' || currentRole === 'moderator') return true;
    if (currentRole === 'full') return true;
    if (currentRole === 'pro' && requiredRole === 'pro') return true;
    if (requiredRole === 'normal') return true;
    return false;
};
