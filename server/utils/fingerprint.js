const crypto = require('crypto');
const { ApiError } = require('../utils/errorHandler'); // New import

// Generate device fingerprint from multiple attributes
function generateFingerprint(deviceId, userAgent, platform, screenRes, timezone) {
  const data = [
    deviceId || '',
    userAgent || '',
    platform || '',
    screenRes || '',
    timezone || '',
    // Add more attributes: language, connection type, etc.
  ].join('|');
  return crypto.createHash('sha256').update(data).digest('hex');
}

// Check if fingerprint is allowed (matches registered or within threshold)
function isFingerprintAllowed(user, newFingerprint, similarityThreshold = 0.8) {
  try {
    if (!user.deviceInfo || !user.deviceInfo.registeredFingerprint) {
      // First time - always allow but log
      return { allowed: true, reason: 'First registration', similarity: 1.0 };
    }

    // Simple similarity check (e.g., prefix match for now; use Levenshtein or Jaro-Winkler for advanced)
    const registered = user.deviceInfo.registeredFingerprint;
    const similarity = calculateSimilarity(newFingerprint, registered);

    const allowed = similarity >= similarityThreshold;
    return {
      allowed: allowed,
      reason: allowed ? 'Fingerprint matches' : 'Fingerprint mismatch',
      similarity: similarity,
      threshold: similarityThreshold,
    };
  } catch (error) {
    throw new ApiError(500, 'Fingerprint validation error', {
      code: 'FINGERPRINT_VALIDATION_FAILED',
    });
  }
}

// Calculate similarity between two fingerprints (basic Hamming distance for hex strings)
function calculateSimilarity(fp1, fp2) {
  if (fp1 === fp2) return 1.0;
  if (fp1.length !== fp2.length) return 0.0;

  let differences = 0;
  for (let i = 0; i < fp1.length; i++) {
    if (fp1[i] !== fp2[i]) differences++;
  }
  const distance = differences / fp1.length;
  return 1 - distance; // Similarity score
}

// Log suspicious fingerprint attempt
function logSuspicious(user, suspiciousFingerprint, context = {}) {
  // In production, log to database or external service
  console.warn('Suspicious fingerprint detected:', {
    userId: user._id,
    userEmail: user.email,
    suspiciousFP: suspiciousFingerprint,
    registeredFP: user.deviceInfo?.registeredFingerprint,
    context: context,
    timestamp: new Date().toISOString(),
  });

  // Optionally update user with suspicion count
  if (!user.deviceInfo.suspiciousAttempts) user.deviceInfo.suspiciousAttempts = 0;
  user.deviceInfo.suspiciousAttempts++;
  user.deviceInfo.lastSuspiciousAttempt = new Date();

  return true; // Logged successfully
}

// Advanced: Allow multiple fingerprints per device (for minor changes)
function allowMultipleFingerprints(user, newFingerprint) {
  if (!user.deviceInfo.registeredFingerprints) {
    user.deviceInfo.registeredFingerprints = [];
  }

  // Check if already registered (exact match)
  const existing = user.deviceInfo.registeredFingerprints.find(fp => fp.visitorId === newFingerprint);
  if (existing) {
    return { allowed: true, reason: 'Already registered fingerprint' };
  }

  // Allow if similar to existing (e.g., minor browser update)
  const similar = user.deviceInfo.registeredFingerprints.some(fp =>
    calculateSimilarity(newFingerprint, fp.visitorId) > 0.95
  );

  if (similar) {
    return { allowed: true, reason: 'Similar to existing fingerprint' };
  }

  // Reject and log
  logSuspicious(user, newFingerprint, { action: 'multiple_fp_check' });
  return { allowed: false, reason: 'New fingerprint not similar enough' };
}

module.exports = {
  generateFingerprint,
  isFingerprintAllowed,
  calculateSimilarity,
  logSuspicious,
  allowMultipleFingerprints,
};
