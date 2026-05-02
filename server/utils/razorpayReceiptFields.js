/**
 * Normalizes Razorpay payment/order entity fields for persisted receipts.
 */

export function razorpayPaymentReceiptSnapshot(entity) {
    if (!entity || typeof entity !== 'object') return {};

    let vpa = entity.vpa || '';
    if (entity.upi && typeof entity.upi === 'object' && entity.upi.vpa) {
        vpa = entity.upi.vpa;
    }

    let cardNetwork = '';
    let cardLast4 = '';
    if (entity.card && typeof entity.card === 'object') {
        cardNetwork = entity.card.network || entity.card.type || entity.card.issuer || '';
        cardLast4 = entity.card.last4 || '';
    }

    const createdUnix = entity.created_at;
    const capturedUnix = entity.captured_at;

    const feePaise =
        typeof entity.fee === 'number'
            ? entity.fee
            : typeof entity.fee === 'string'
              ? Number(entity.fee)
              : undefined;
    const taxPaise =
        typeof entity.tax === 'number'
            ? entity.tax
            : typeof entity.tax === 'string'
              ? Number(entity.tax)
              : undefined;

    return {
        currency: entity.currency || 'INR',
        paymentMethod: entity.method || '',
        razorpayStatus: entity.status || '',
        bank: entity.bank || '',
        wallet: entity.wallet || '',
        vpa,
        payerRzpEmail: entity.email || '',
        contactPhone:
            typeof entity.contact === 'string' ? entity.contact : entity.contact?.toString?.() || '',
        international:
            entity.international === true ||
            entity.international === 1 ||
            String(entity.international || '').toLowerCase() === 'true',
        feeRupee:
            feePaise != null && Number.isFinite(Number(feePaise))
                ? Math.round(Number(feePaise)) / 100
                : undefined,
        taxRupee:
            taxPaise != null && Number.isFinite(Number(taxPaise))
                ? Math.round(Number(taxPaise)) / 100
                : undefined,
        cardNetwork,
        cardLast4,
        description: typeof entity.description === 'string' ? entity.description.slice(0, 200) : '',
        rzpPaidAt: createdUnix ? new Date(Number(createdUnix) * 1000) : undefined,
        rzpCapturedAt: capturedUnix ? new Date(Number(capturedUnix) * 1000) : undefined,
    };
}
