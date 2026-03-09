
export const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return next({
      statusCode: 403,
      message: "Access denied",
    });
  }
  next();
};
