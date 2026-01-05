// utils/istDateTimeUtils.js

// Single source of truth for IST time handling.
// Stores timestamps in UTC (native Date) but always formats using Asia/Kolkata.

class ISTDateTimeUtils {
    constructor() {
        this.TIMEZONE = 'Asia/Kolkata';
        this.IST_OFFSET_MINUTES = 330; // +05:30
        this.IST_OFFSET_MS = this.IST_OFFSET_MINUTES * 60 * 1000;
    }

    // Returns a Date representing the same instant (UTC). Use formatting helpers to render IST.
    getISTDate(date = new Date()) {
        return date instanceof Date ? new Date(date) : new Date(date);
    }

    // Start of the IST day as a UTC Date:
    // 1) shift UTC->IST, 2) floor to midnight, 3) shift back IST->UTC
    getStartOfDayIST(date = new Date()) {
        const base = date instanceof Date ? date : new Date(date);
        const tIst = base.getTime() + this.IST_OFFSET_MS;
        const d = new Date(tIst);
        d.setUTCHours(0, 0, 0, 0);
        const backUtc = d.getTime() - this.IST_OFFSET_MS;
        return new Date(backUtc);
    }

    // End of the IST day as a UTC Date (23:59:59.999 IST)
    getEndOfDayIST(date = new Date()) {
        const base = date instanceof Date ? date : new Date(date);
        const tIst = base.getTime() + this.IST_OFFSET_MS;
        const d = new Date(tIst);
        d.setUTCHours(23, 59, 59, 999);
        const backUtc = d.getTime() - this.IST_OFFSET_MS;
        return new Date(backUtc);
    }

    // Readable IST formatting plus a convenient “iso-ish” variant tagged with +05:30
    formatISTTimestamp(date) {
        if (!date) return null;
        const d = date instanceof Date ? date : new Date(date);
        return {
            iso: d.toISOString().replace('Z', '+05:30'),
            readable: d.toLocaleString('en-IN', {
                timeZone: this.TIMEZONE,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true,
            }),
            date: d.toLocaleDateString('en-IN', { timeZone: this.TIMEZONE }),
            time: d.toLocaleTimeString('en-IN', { timeZone: this.TIMEZONE, hour12: true }),
        };
    }

    // Human duration from minutes
    formatDuration(minutes) {
        if (!minutes || minutes <= 0) return '0h 0m';
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return `${h}h ${m}m`;
    }

    // Compare by IST calendar day
    isSameDayIST(date1, date2) {
        const s1 = this.getStartOfDayIST(date1).getTime();
        const s2 = this.getStartOfDayIST(date2).getTime();
        return s1 === s2;
    }
}

module.exports = new ISTDateTimeUtils();
