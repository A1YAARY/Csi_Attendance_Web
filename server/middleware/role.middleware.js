const { ApiError } = require("../utils/errorHandler"); // New import

module.exports = function (roles = ["admin"]) {
  if (typeof roles === "string") {
    roles = [roles];
  }

  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      throw new ApiError(403, "Forbidden: Insufficient permissions", {
        requiredRoles: roles,
        userRole: req.user.role
      });
    }
    next();
  };
};
