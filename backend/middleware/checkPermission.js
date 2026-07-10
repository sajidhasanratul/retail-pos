module.exports = (requiredPermission) => {
  return (req, res, next) => {
    // The permissions array is injected into the JWT token during login
    const userPermissions = req.userData.permissions || [];
    
    if (userPermissions.includes(requiredPermission)) {
      next();
    } else {
      return res.status(403).json({ message: 'Access denied. Insufficient permissions.' });
    }
  };
};