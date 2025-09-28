const mongoose = require("mongoose");
const istUtils = require("../utils/istDateTimeUtils"); // Using ONLY your IST utils

const notificationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: [
      "devicechangerequest",
      "deviceapproved",
      "devicerejected",
      "userregistered",
      "attendancealert",
      "systemalert"
    ],
    required: true
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Organization",
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  title: {
    type: String,
    required: true,
    maxlength: 100
  },
  message: {
    type: String,
    required: true,
    maxlength: 500
  },
  data: {
    type: mongoose.Schema.Types.Mixed, // Store any additional data
    default: {}
  },
  isRead: {
    type: Boolean,
    default: false
  },
  priority: {
    type: String,
    enum: ["low", "medium", "high", "urgent"],
    default: "medium"
  },
  createdAt: {
    type: Date,
    default: () => istUtils.getISTDate()
  },
  readAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: false // Using custom createdAt
});

// Add virtuals for IST formatting
notificationSchema.virtual('createdAtIST').get(function () {
  return this.createdAt ? istUtils.formatISTTimestamp(this.createdAt) : null;
});

notificationSchema.virtual('readAtIST').get(function () {
  return this.readAt ? istUtils.formatISTTimestamp(this.readAt) : null;
});

// Instance method to mark as read
notificationSchema.methods.markAsRead = function () {
  this.isRead = true;
  this.readAt = istUtils.getISTDate();
  return this.save();
};

// Instance method to get formatted notification data
notificationSchema.methods.getFormattedData = function () {
  return {
    _id: this._id,
    type: this.type,
    title: this.title,
    message: this.message,
    data: this.data,
    isRead: this.isRead,
    priority: this.priority,
    createdAt: this.createdAt,
    createdAtIST: istUtils.formatISTTimestamp(this.createdAt),
    readAt: this.readAt,
    readAtIST: this.readAt ? istUtils.formatISTTimestamp(this.readAt) : null,
    organizationId: this.organizationId,
    userId: this.userId
  };
};

// Static method to create notification with IST timestamp
notificationSchema.statics.createNotification = async function (notificationData) {
  const notification = new this({
    ...notificationData,
    createdAt: istUtils.getISTDate()
  });
  return await notification.save();
};

// Static method to get notifications for organization with IST formatting
notificationSchema.statics.getOrganizationNotifications = async function (organizationId, options = {}) {
  const {
    limit = 50,
    onlyUnread = false,
    type = null,
    userId = null
  } = options;

  const query = { organizationId };
  if (onlyUnread) query.isRead = false;
  if (type) query.type = type;
  if (userId) query.userId = userId;

  const notifications = await this.find(query)
    .populate('userId', 'name email department phone')
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return notifications.map(notification => ({
    ...notification,
    createdAtIST: istUtils.formatISTTimestamp(notification.createdAt),
    readAtIST: notification.readAt ? istUtils.formatISTTimestamp(notification.readAt) : null
  }));
};

// Static method to mark multiple notifications as read
notificationSchema.statics.markMultipleAsRead = async function (notificationIds, organizationId) {
  const readTime = istUtils.getISTDate();
  return await this.updateMany(
    {
      _id: { $in: notificationIds },
      organizationId: organizationId
    },
    {
      isRead: true,
      readAt: readTime
    }
  );
};

// Static method to mark all organization notifications as read
notificationSchema.statics.markAllAsRead = async function (organizationId, userId = null) {
  const query = { organizationId, isRead: false };
  if (userId) query.userId = userId;

  const readTime = istUtils.getISTDate();
  return await this.updateMany(query, {
    isRead: true,
    readAt: readTime
  });
};

// Static method to get unread count
notificationSchema.statics.getUnreadCount = async function (organizationId, userId = null) {
  const query = { organizationId, isRead: false };
  if (userId) query.userId = userId;
  return await this.countDocuments(query);
};

// Static method to clean old notifications (older than specified days)
notificationSchema.statics.cleanOldNotifications = async function (daysOld = 30) {
  const cutoffDate = istUtils.getISTDate();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  return await this.deleteMany({
    createdAt: { $lt: cutoffDate }
  });
};

// Create indexes for efficient queries
notificationSchema.index({ organizationId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ type: 1, organizationId: 1 });

// Auto-delete notifications older than 30 days
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

// Enable virtuals in JSON output
notificationSchema.set('toJSON', { virtuals: true });
notificationSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model("Notification", notificationSchema);
