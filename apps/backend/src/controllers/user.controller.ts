import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { User } from '../models/user.model';
import { AuthRequest } from '../middlewares/auth.middleware';
import { BadRequestError, NotFoundError, ConflictError } from '../utils/errors';

// Search users by username
export const searchUsers = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { q } = req.query;
    if (!q || typeof q !== 'string') {
      throw new BadRequestError('Search query required');
    }

    const currentUser = await User.findById(req.user?._id);
    if (!currentUser) {
      throw new NotFoundError('Current user');
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
};

// Update profile
export const updateProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
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
};

// Get friends list
export const getFriends = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const currentUser = await User.findById(req.user?._id)
      .populate('friends', 'username avatar isOnline lastSeen');

    if (!currentUser) {
      throw new NotFoundError('User');
    }

    res.json({ success: true, data: currentUser.friends });
  } catch (error) {
    next(error);
  }
};

// Get friend requests
export const getFriendRequests = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const currentUser = await User.findById(req.user?._id)
      .populate('friendRequestsReceived', 'username avatar isOnline lastSeen');

    if (!currentUser) {
      throw new NotFoundError('User');
    }

    res.json({ success: true, data: currentUser.friendRequestsReceived });
  } catch (error) {
    next(error);
  }
};

// Send friend request
export const sendFriendRequest = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      throw new BadRequestError('User ID is required');
    }

    if (userId === req.user?._id?.toString()) {
      throw new BadRequestError('Cannot send friend request to yourself');
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      throw new NotFoundError('User');
    }

    const currentUser = await User.findById(req.user?._id);
    if (!currentUser) {
      throw new NotFoundError('Current user');
    }

    if (currentUser.friends?.includes(userObjectId)) {
      throw new ConflictError('Already friends with this user');
    }

    if (currentUser.friendRequestsSent?.includes(userObjectId)) {
      throw new ConflictError('Friend request already sent');
    }

    if (currentUser.friendRequestsReceived?.includes(userObjectId)) {
      throw new ConflictError('Friend request already received from this user');
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
};

// Accept friend request
export const acceptFriendRequest = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      throw new BadRequestError('User ID is required');
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);

    const currentUser = await User.findById(req.user?._id);
    if (!currentUser) {
      throw new NotFoundError('Current user');
    }

    if (!currentUser.friendRequestsReceived?.includes(userObjectId)) {
      throw new BadRequestError('No friend request from this user');
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
};

// Reject friend request
export const rejectFriendRequest = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      throw new BadRequestError('User ID is required');
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);

    const currentUser = await User.findById(req.user?._id);
    if (!currentUser) {
      throw new NotFoundError('Current user');
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
};

// Remove friend
export const removeFriend = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const currentUser = await User.findById(req.user?._id);
    if (!currentUser) {
      throw new NotFoundError('Current user');
    }

    if (!currentUser.friends?.includes(userObjectId)) {
      throw new BadRequestError('Not friends with this user');
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
};

// Get user by ID
export const getUserById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.params.userId).select('-__v');
    if (!user) {
      throw new NotFoundError('User');
    }
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};
