export function toPublicUser(userDoc) {
    if (!userDoc) return null;
    const o = userDoc.toObject ? userDoc.toObject() : { ...userDoc };
    return {
        uid: o.userId,
        email: o.email,
        displayName: o.displayName,
        photoURL: o.photoURL,
        role: o.role,
        status: o.status,
        isPremium: o.isPremium,
        hasPro: o.hasPro,
        hasFullAccess: o.hasFullAccess,
        planType: o.planType || 'free',
        paymentStatus: o.paymentStatus || 'pending',
        planExpiry: o.planExpiry ?? null,
        transactionId: o.lastTransactionId || o.razorpay_payment_id || null,
    };
}
