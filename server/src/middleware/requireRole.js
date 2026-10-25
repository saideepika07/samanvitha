// Role-Based Authorization Guard Middleware
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required before checking permissions.',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `User role '${req.user.role}' is not authorized to access this resource. Required role: ${roles.join(' or ')}.`,
      });
    }

    next();
  };
};

module.exports = requireRole;
module.exports.requireRole = requireRole;
