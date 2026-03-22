// backend/src/routes/user.routes.ts
import { Router } from 'express';
import {
  searchUsers,
  updateProfile,
  getFriends,
  getFriendRequests,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
  getUserById,
} from '../controllers/user.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router: Router = Router();

router.use(authenticate);

// Static routes
router.get('/search', searchUsers);
router.patch('/me', updateProfile);
router.get('/friends', getFriends);
router.get('/friends/requests', getFriendRequests);
router.post('/friends/request', sendFriendRequest);
router.post('/friends/accept', acceptFriendRequest);
router.post('/friends/reject', rejectFriendRequest);
router.delete('/friends/:userId', removeFriend);

// Dynamic route
router.get('/:userId', getUserById);

export default router;