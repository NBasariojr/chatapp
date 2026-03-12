// backend/src/routes/user.routes.ts
import { Router, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { User } from '../models/user.model';
import { authenticate, AuthRequest } from '../middlewares/auth.middleware';

const router: Router = Router();

router.use(authenticate);

// Static routes

// Search users by username
router.get('/search', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { q } = req.query;
    if (!q || typeof q !== 'string') {
      res.status(400).json({ success: false, message: 'Search query required' });
      return;
    }

    const currentUser = await User.findById(req.user?._id);
    if (!currentUser) {
      res.status(404).json({ success: false, message: 'Current user not found' });
      return;
    }

    const users = await User.find({
      username: { $regex: q, $options: 'i' },
      _id: { $ne: req.user?._id },
    })
      .select('username avatar isOnline lastSeen friends friendRequestsSent friendRequestsReceived')
      .limit(20);

    const usersWithStatus = users.map(user => {
      const userObj = user.toObject();
      const isFriend = currentUser.friends?.includes(user._id);
      const requestSent = currentUser.friendRequestsSent?.includes(user._id);
      const requestReceived = currentUser.friendRequestsReceived?.includes(user._id);

      return {
        ...userObj,
        friendshipStatus: isFriend ? 'friends' : requestSent ? 'request_sent' : requestReceived ? 'request_received' : 'none',
      };
    });

    res.json({ success: true, data: usersWithStatus });
  } catch (error) {
    next(error);
  }
});

// Update profile — /me must be before /:userId or it gets caught as a user ID
router.patch('/me', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const allowedFields = ['username', 'avatar'];
    const updates = Object.fromEntries(
      Object.entries(req.body).filter(([key]) => allowedFields.includes(key))
    );

    const user = await User.findByIdAndUpdate(req.user?._id, updates, {
      new: true,
      runValidators: true,
    });

    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
});

// Get friends list — must be before /:userId
router.get('/friends', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const currentUser = await User.findById(req.user?._id)
      .populate('friends', 'username avatar isOnline lastSeen');

    if (!currentUser) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    res.json({ success: true, data: currentUser.friends });
  } catch (error) {
    next(error);
  }
});

// Get friend requests — must be before /:userId
router.get('/friends/requests', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const currentUser = await User.findById(req.user?._id)
      .populate('friendRequestsReceived', 'username avatar isOnline lastSeen');

    if (!currentUser) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    res.json({ success: true, data: currentUser.friendRequestsReceived });
  } catch (error) {
    next(error);
  }
});

// Send friend request
router.post('/friends/request', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      res.status(400).json({ success: false, message: 'User ID is required' });
      return;
    }

    if (userId === req.user?._id?.toString()) {
      res.status(400).json({ success: false, message: 'Cannot send friend request to yourself' });
      return;
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    const currentUser = await User.findById(req.user?._id);
    if (!currentUser) {
      res.status(404).json({ success: false, message: 'Current user not found' });
      return;
    }

    if (currentUser.friends?.includes(userObjectId)) {
      res.status(400).json({ success: false, message: 'Already friends with this user' });
      return;
    }

    if (currentUser.friendRequestsSent?.includes(userObjectId)) {
      res.status(400).json({ success: false, message: 'Friend request already sent' });
      return;
    }

    if (currentUser.friendRequestsReceived?.includes(userObjectId)) {
      res.status(400).json({ success: false, message: 'Friend request already received from this user' });
      return;
    }

    await User.findByIdAndUpdate(req.user?._id, {
      $addToSet: { friendRequestsSent: userObjectId },
    });

    await User.findByIdAndUpdate(userId, {
      $addToSet: { friendRequestsReceived: req.user?._id },
    });

    res.json({ success: true, message: 'Friend request sent successfully' });
  } catch (error) {
    next(error);
  }
});

// Accept friend request
router.post('/friends/accept', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      res.status(400).json({ success: false, message: 'User ID is required' });
      return;
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);

    const currentUser = await User.findById(req.user?._id);
    if (!currentUser) {
      res.status(404).json({ success: false, message: 'Current user not found' });
      return;
    }

    if (!currentUser.friendRequestsReceived?.includes(userObjectId)) {
      res.status(400).json({ success: false, message: 'No friend request from this user' });
      return;
    }

    await User.findByIdAndUpdate(req.user?._id, {
      $addToSet: { friends: userObjectId },
      $pull: { friendRequestsReceived: userObjectId },
    });

    await User.findByIdAndUpdate(userId, {
      $addToSet: { friends: req.user?._id },
      $pull: { friendRequestsSent: req.user?._id },
    });

    res.json({ success: true, message: 'Friend request accepted' });
  } catch (error) {
    next(error);
  }
});

// Reject friend request
router.post('/friends/reject', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      res.status(400).json({ success: false, message: 'User ID is required' });
      return;
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);

    const currentUser = await User.findById(req.user?._id);
    if (!currentUser) {
      res.status(404).json({ success: false, message: 'Current user not found' });
      return;
    }

    await User.findByIdAndUpdate(req.user?._id, {
      $pull: { friendRequestsReceived: userObjectId },
    });

    await User.findByIdAndUpdate(userId, {
      $pull: { friendRequestsSent: req.user?._id },
    });

    res.json({ success: true, message: 'Friend request rejected' });
  } catch (error) {
    next(error);
  }
});

// Remove friend
router.delete('/friends/:userId', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const currentUser = await User.findById(req.user?._id);
    if (!currentUser) {
      res.status(404).json({ success: false, message: 'Current user not found' });
      return;
    }

    if (!currentUser.friends?.includes(userObjectId)) {
      res.status(400).json({ success: false, message: 'Not friends with this user' });
      return;
    }

    await User.findByIdAndUpdate(req.user?._id, {
      $pull: { friends: userObjectId },
    });

    await User.findByIdAndUpdate(userId, {
      $pull: { friends: req.user?._id },
    });

    res.json({ success: true, message: 'Friend removed successfully' });
  } catch (error) {
    next(error);
  }
});

// Dynamic route

// Get user by ID — must be last, catches anything not matched above
router.get('/:userId', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.params.userId).select('-__v');
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
});

export default router;