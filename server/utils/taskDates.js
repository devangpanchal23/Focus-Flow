import { isValid, parseISO } from 'date-fns';

/** Calendar `YYYY-MM-DD` → UTC day bounds (inclusive) for stable queries */
export function utcDayBoundsFromYyyyMmDd(dateStr) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateStr).trim());
    if (!m) return null;
    const y = Number(m[1]);
    const mo = Number(m[2]) - 1;
    const d = Number(m[3]);
    return {
        start: new Date(Date.UTC(y, mo, d, 0, 0, 0, 0)),
        end: new Date(Date.UTC(y, mo, d, 23, 59, 59, 999)),
    };
}

/** Store a calendar day as UTC noon — always inside that calendar day's UTC bounds */
export function utcNoonFromYyyyMmDd(dateStr) {
    const bounds = utcDayBoundsFromYyyyMmDd(dateStr);
    if (!bounds) return null;
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateStr).trim());
    const y = Number(m[1]);
    const mo = Number(m[2]) - 1;
    const d = Number(m[3]);
    return new Date(Date.UTC(y, mo, d, 12, 0, 0, 0));
}

/**
 * Accept ISO string or YYYY-MM-DD from client; normalize to Date for persisted scheduledDate (UTC noon for calendar dates).
 */
export function normalizeIncomingScheduledDate(value) {
    if (value == null || value === '') return null;
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
        return utcNoonFromYyyyMmDd(value.trim());
    }
    const d = typeof value === 'string' ? parseISO(value) : new Date(value);
    if (!isValid(d)) return null;
    return d;
}

/** Client sent local startOfDay/endOfDay as ISO — use as-is for range filter on scheduledDate */
export function rangeFromIsoParams(start, end) {
    const s = new Date(start);
    const e = new Date(end);
    if (!isValid(s) || !isValid(e)) return null;
    return { start: s, end: e };
}
