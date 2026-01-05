// utils/normalizeAttendance.js
export function normalizeAttendanceRecord(raw) {
    if (!raw) return null;

    const sessions = (raw.sessions || []).map((s) => {
        const checkInIso =
            s?.checkIn?.timeIST?.iso ??
            s?.checkIn?.iso ??
            s?.checkIn?.time ??
            s?.checkIn ??
            null;

        const checkOutIso =
            s?.checkOut?.timeIST?.iso ??
            s?.checkOut?.iso ??
            s?.checkOut?.time ??
            s?.checkOut ??
            null;

        return {
            checkIn: checkInIso || null,           // ISO string preferred
            checkOut: checkOutIso || null,         // ISO string or null
            duration: typeof s?.duration === "number" ? s.duration : null,
            isActive: !!s?.isActive,
            sessionNumber: s?.sessionNumber ?? undefined,
        };
    });

    const createdAt = raw?.dateIST?.iso ?? raw?.date ?? raw?.createdAt ?? null;

    const totalMins =
        typeof raw?.totalWorkingTime === "number"
            ? raw.totalWorkingTime
            : sessions.reduce((acc, s) => {
                if (typeof s.duration === "number") return acc + s.duration;
                if (s.checkIn && s.checkOut)
                    return acc + Math.max(0, Math.floor((new Date(s.checkOut) - new Date(s.checkIn)) / 60000));
                if (s.checkIn && !s.checkOut)
                    return acc + Math.max(0, Math.floor((Date.now() - new Date(s.checkIn)) / 60000));
                return acc;
            }, 0);

    const fmt = (m) => `${Math.floor(m / 60)}h ${m % 60}m`;

    return {
        createdAt,                                // used by Previous
        organizationName: raw?.organizationName ?? "",
        status: raw?.status ?? null,              // drives StatusLabel and Card status
        sessions,                                  // used by Card/Details/TimeProgressBar/Previous
        sessionsCount: raw?.sessionsCount ?? sessions.length,
        totalWorkingTime: totalMins,               // minutes
        totalWorkingTimeFormatted: raw?.totalWorkingTimeFormatted ?? fmt(totalMins),
        _id: raw?._id,
    };
}
