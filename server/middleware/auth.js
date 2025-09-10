export const requireAuth = (req, res, next) => {
  try {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    // Validate ObjectId format
    if (!req.session.userId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(401).json({ message: 'Invalid session' });
    }
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({ message: 'Authentication required' });
  }
};

export const getUser = (req, res, next) => {
  try {
    if (req.session && req.session.userId) {
      req.userId = req.session.userId;
    }
    next();
  } catch (error) {
    console.error('Get user middleware error:', error);
    next();
  }
};