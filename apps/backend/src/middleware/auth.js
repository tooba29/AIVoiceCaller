import { User } from '../models/index.js';

export const requireAuth = async (req, res, next) => {
  try {
    console.log('🔐 AUTH MIDDLEWARE CHECK');
    console.log('🔐 Session userId:', req.session?.userId);
    console.log('🔐 Session exists:', !!req.session);

    if (!req.session?.userId) {
      console.log('❌ AUTH FAILED: No session userId');
      return res.status(401).json({ error: 'Authentication required' });
    }

    const user = await User.findByPk(req.session.userId);
    if (!user) {
      console.log('❌ AUTH FAILED: User not found in database');
      req.session.destroy();
      return res.status(401).json({ error: 'User not found' });
    }

    console.log('✅ AUTH SUCCESS: User authenticated:', user.id);
    req.user = user;
    next();
  } catch (error) {
    console.error('❌ AUTH MIDDLEWARE ERROR:', error);
    res.status(500).json({ error: 'Authentication error' });
  }
};

export const optionalAuth = async (req, res, next) => {
  try {
    if (req.session.userId) {
      const user = await User.findByPk(req.session.userId);
      if (user) {
        req.user = user;
      }
    }
    next();
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    next();
  }
};
