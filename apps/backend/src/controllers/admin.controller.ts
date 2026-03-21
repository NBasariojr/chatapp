import { Response, NextFunction } from 'express';
import { User } from '../models/user.model';
import { Room } from '../models/room.model';
import { Message } from '../models/message.model';
import { AuthRequest } from '../middlewares/auth.middleware';

// Get platform statistics
export const getStats = async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const [totalUsers, onlineUsers, totalRooms, totalMessages] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isOnline: true }),
      Room.countDocuments(),
      Message.countDocuments(),
    ]);

    res.json({
      success: true,
      data: { totalUsers, onlineUsers, totalRooms, totalMessages },
    });
  } catch (error) {
    next(error);
  }
};

// Get all users with optional search
export const getUsers = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { q } = req.query;
    const filter = q ? { username: { $regex: q, $options: 'i' } } : {};

    const users = await User.find(filter)
      .select('-__v')
      .sort({ createdAt: -1 })
      .limit(200);

    res.json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
};

// Update user role
export const updateUserRole = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { role } = req.body;
    const validRoles = ['user', 'moderator', 'admin'];

    if (!validRoles.includes(role)) {
      res.status(400).json({ success: false, message: 'Invalid role' });
      return;
    }

    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { role },
      { new: true, select: '-__v' }
    );

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    res.json({ success: true, data: user, message: 'Role updated' });
  } catch (error) {
    next(error);
  }
};

// Delete user (ban/remove)
export const deleteUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Prevent self-deletion
    if (req.params.userId === req.user?._id?.toString()) {
      res.status(400).json({ success: false, message: 'Cannot delete your own account' });
      return;
    }

    const user = await User.findByIdAndDelete(req.params.userId);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    res.json({ success: true, message: 'User removed' });
  } catch (error) {
    next(error);
  }
};

// Get all rooms
export const getRooms = async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const rooms = await Room.find()
      .populate('participants', 'username')
      .populate('createdBy', 'username')
      .sort({ createdAt: -1 })
      .limit(200);

    res.json({ success: true, data: rooms });
  } catch (error) {
    next(error);
  }
};

// Delete room and associated messages
export const deleteRoom = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await Promise.all([
      Room.findByIdAndDelete(req.params.roomId),
      Message.deleteMany({ roomId: req.params.roomId }),
    ]);

    res.json({ success: true, message: 'Room and messages deleted' });
  } catch (error) {
    next(error);
  }
};
