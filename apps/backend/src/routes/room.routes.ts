// backend/src/routes/room.routes.ts
import { Router, Response, NextFunction } from 'express';
import { Room } from '../models/room.model';
import { authenticate, AuthRequest } from '../middlewares/auth.middleware';

const router: Router = Router();

router.use(authenticate);

// Get all rooms for current user
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const rooms = await Room.find({ participants: req.user?._id })
      .populate('participants', 'username avatar isOnline lastSeen')
      .populate('lastMessage')
      .sort({ updatedAt: -1 });

    res.json({ success: true, data: rooms });
  } catch (error) {
    next(error);
  }
});

// Create a direct message room or group
router.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { participantIds, name, isGroup = false } = req.body;

    if (!participantIds || !Array.isArray(participantIds)) {
      res.status(400).json({ success: false, message: 'participantIds array required' });
      return;
    }

    const allParticipants = [...new Set([req.user?._id, ...participantIds])];

    // For DMs, check if room already exists
    if (!isGroup && allParticipants.length === 2) {
      const existing = await Room.findOne({
        isGroup: false,
        participants: { $all: allParticipants, $size: 2 },
      }).populate('participants', 'username avatar isOnline');

      if (existing) {
        res.json({ success: true, data: existing });
        return;
      }
    }

    const room = await Room.create({
      name: isGroup ? name : undefined,
      isGroup,
      participants: allParticipants,
      createdBy: req.user?._id,
    });

    await room.populate('participants', 'username avatar isOnline');

    res.status(201).json({ success: true, data: room });
  } catch (error) {
    next(error);
  }
});

// Get room by ID
router.get('/:roomId', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const room = await Room.findOne({
      _id: req.params.roomId,
      participants: req.user?._id,
    })
      .populate('participants', 'username avatar isOnline lastSeen')
      .populate('lastMessage');

    if (!room) {
      res.status(404).json({ success: false, message: 'Room not found' });
      return;
    }

    res.json({ success: true, data: room });
  } catch (error) {
    next(error);
  }
});

export default router;