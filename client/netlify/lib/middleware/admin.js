function adminMiddleware(req, res, next) {
  if (!req.user?.is_admin) {
    return res.status(403).json({ message: 'Accès réservé à l\'administrateur' });
  }
  next();
}

module.exports = adminMiddleware;
