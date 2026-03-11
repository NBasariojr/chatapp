// backend/src/routes/user.routes.ts
import { Router, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { User } from '../models/user.model';
import { authenticate, AuthRequest } from '../middlewares/auth.middleware';

const router: Router = Router();

router.use(authenticate);

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

    // Add friendship status for each user
    const usersWithStatus = users.map(user => {
      const userObj = user.toObject();
      const isFriend = currentUser.friends?.includes(user._id);
      const requestSent = currentUser.friendRequestsSent?.includes(user._id);
      const requestReceived = currentUser.friendRequestsReceived?.includes(user._id);
      
      return {
        ...userObj,
        friendshipStatus: isFriend ? 'friends' : requestSent ? 'request_sent' : requestReceived ? 'request_received' : 'none'
      };
    });

    res.json({ success: true, data: usersWithStatus });
  } catch (error) {
    next(error);
  }
});

// Get user by ID
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

// Update profile
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

// Send friend request
router.post('/friends/request', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.body;
    const userObjectId = new mongoose.Types.ObjectId(userId);
    
    if (!userId) {
      res.status(400).json({ success: false, message: 'User ID is required' });
      return;
    }

    if (userId === req.user?._id?.toString()) {
      res.status(400).json({ success: false, message: 'Cannot send friend request to yourself' });
      return;
    }

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

    // Check if already friends
    if (currentUser.friends?.includes(userObjectId)) {
      res.status(400).json({ success: false, message: 'Already friends with this user' });
      return;
    }

    // Check if request already sent
    if (currentUser.friendRequestsSent?.includes(userObjectId)) {
      res.status(400).json({ success: false, message: 'Friend request already sent' });
      return;
    }

    // Check if request already received
    if (currentUser.friendRequestsReceived?.includes(userObjectId)) {
      res.status(400).json({ success: false, message: 'Friend request already received from this user' });
      return;
    }

    // Add to sender's sent requests and receiver's received requests
    await User.findByIdAndUpdate(req.user?._id, {
      $addToSet: { friendRequestsSent: userObjectId }
    });

    await User.findByIdAndUpdate(userId, {
      $addToSet: { friendRequestsReceived: req.user?._id }
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
    const userObjectId = new mongoose.Types.ObjectId(userId);
    
    if (!userId) {
      res.status(400).json({ success: false, message: 'User ID is required' });
      return;
    }

    const currentUser = await User.findById(req.user?._id);
    if (!currentUser) {
      res.status(404).json({ success: false, message: 'Current user not found' });
      return;
    }

    // Check if request exists
    if (!currentUser.friendRequestsReceived?.includes(userObjectId)) {
      res.status(400).json({ success: false, message: 'No friend request from this user' });
      return;
    }

    // Add to both users' friends list
    await User.findByIdAndUpdate(req.user?._id, {
      $addToSet: { friends: userObjectId },
      $pull: { friendRequestsReceived: userObjectId }
    });

    await User.findByIdAndUpdate(userId, {
      $addToSet: { friends: req.user?._id },
      $pull: { friendRequestsSent: req.user?._id }
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
    const userObjectId = new mongoose.Types.ObjectId(userId);
    
    if (!userId) {
      res.status(400).json({ success: false, message: 'User ID is required' });
      return;
    }

    const currentUser = await User.findById(req.user?._id);
    if (!currentUser) {
      res.status(404).json({ success: false, message: 'Current user not found' });
      return;
    }

    // Remove from received requests and remove from sender's sent requests
    await User.findByIdAndUpdate(req.user?._id, {
      $pull: { friendRequestsReceived: userObjectId }
    });

    await User.findByIdAndUpdate(userId, {
      $pull: { friendRequestsSent: req.user?._id }
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

    // Check if friends
    if (!currentUser.friends?.includes(userObjectId)) {
      res.status(400).json({ success: false, message: 'Not friends with this user' });
      return;
    }

    // Remove from both users' friends list
    await User.findByIdAndUpdate(req.user?._id, {
      $pull: { friends: userObjectId }
    });

    await User.findByIdAndUpdate(userId, {
      $pull: { friends: req.user?._id }
    });

    res.json({ success: true, message: 'Friend removed successfully' });
  } catch (error) {
    next(error);
  }
});

// Get friends list
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

// Get friend requests
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

export default router;