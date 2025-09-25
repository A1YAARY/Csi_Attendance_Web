// IST helper function
const getISTDate = (date = new Date()) => {
  const istOffset = 5.5 * 60 * 60 * 1000;
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  return new Date(utc + istOffset);
};

const fingerprintUtils = {};

/**
 * Checks if a given fingerprint is allowed for the user.
 * Registers it if it's the first-time fingerprint.
 */
fingerprintUtils.isFingerprintAllowed = function (user, fp) {
  if (!user.deviceInfo) user.deviceInfo = {};

  // First-time registration
  if (!user.deviceInfo.registeredFingerprint) {
    user.deviceInfo.registeredFingerprint = fp;
    user.deviceInfo.registeredFingerprints = [
      {
        visitorId: fp,
        createdAt: getISTDate(),
      },
    ];
    return true;
  }

  // Check if fingerprint matches registered ones
  const allowed =
    user.deviceInfo.registeredFingerprint === fp ||
    (user.deviceInfo.registeredFingerprints || []).some(
      (f) => f.visitorId === fp
    );

  return allowed;
};

/**
 * Logs suspicious fingerprint attempts for auditing
 */
fingerprintUtils.logSuspicious = function (user, fp) {
  user.suspiciousLogs = user.suspiciousLogs || [];
  user.suspiciousLogs.push({
    date: getISTDate(),
    reason: "Fingerprint mismatch",
    meta: { fingerprint: fp },
  });
};

module.exports = fingerprintUtils;
