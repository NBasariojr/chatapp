import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../../redux/store';
import { createAsyncThunk } from '@reduxjs/toolkit';
import Icon from '../../../components/AppIcon';
import Image from '../../../components/AppImage';
import Button from '../../../components/ui/Button';
import PresenceIndicator from '../../../components/ui/PresenceIndicator';
import { chatService } from '../../../services/chat.service';
import { fetchRooms } from '../../../redux/slices/chatSlice';
import type { User, UserRole } from '@chatapp/shared';

interface ParticipantsListProps {
  roomId: string;
}

// ─── Async Thunk ─────────────────────────────────────────────────────────────

const removeParticipant = createAsyncThunk(
  'participants/removeParticipant',
  async ({ roomId, userId }: { roomId: string; userId: string }) => {
    await chatService.removeParticipant(roomId, userId);
    return userId;
  }
);

const changeParticipantRole = createAsyncThunk(
  'participants/changeRole',
  async ({ roomId, userId, newRole }: { roomId: string; userId: string; newRole: UserRole }) => {
    await chatService.changeParticipantRole(roomId, userId, newRole);
    return { userId, newRole };
  }
);

const ParticipantsList: React.FC<ParticipantsListProps> = ({ roomId }) => {
  const dispatch = useDispatch<AppDispatch>();
  const [selectedParticipant, setSelectedParticipant] = useState<string | null>(null);
  
  // Get data from Redux store
  const { participants, admins, moderators, currentUser } = useSelector((state: RootState) => {
    const room = state.chat.rooms.find(r => r._id === roomId);
    return {
      participants: room?.participants || [],
      admins: room?.admins || [],
      moderators: room?.moderators || [],
      currentUser: state.auth.user
    };
  });

  useEffect(() => {
    if (roomId) {
      dispatch(fetchRooms());
    }
  }, [dispatch, roomId]);

  const isCurrentUserAdmin = admins?.some((admin: User) => admin?._id === currentUser?._id);
  
  const getParticipantRole = (participant: User) => {
    if (admins?.some((admin: User) => admin?._id === participant?._id)) return 'admin';
    if (moderators?.some((mod: User) => mod?._id === participant?._id)) return 'moderator';
    return 'member';
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'text-error';
      case 'moderator': return 'text-warning';
      default: return 'text-muted-foreground';
    }
  };

  const handleRoleChange = (participant: User, newRole: UserRole) => {
    dispatch(changeParticipantRole({ roomId, userId: participant._id!, newRole }));
    setSelectedParticipant(null);
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-foreground">
          Participants ({participants?.length})
        </h3>
        <Button
          variant="outline"
          size="sm"
          iconName="UserPlus"
          iconPosition="left"
        >
          Add Members
        </Button>
      </div>
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {participants?.map((participant: User) => {
          const role = getParticipantRole(participant);
          const canManage = isCurrentUserAdmin && participant?._id !== currentUser?._id;
          
          return (
            <div
              key={participant?._id}
              className="flex items-center justify-between p-3 hover:bg-accent/50 rounded-lg transition-colors duration-200"
            >
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <div className="w-10 h-10 bg-secondary rounded-full overflow-hidden">
                    <Image
                      src={participant?.avatar || ''}
                      alt={participant?.username}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <PresenceIndicator
                    status={participant?.isOnline ? 'online' : 'offline'}
                    size="sm"
                    className="absolute -bottom-0.5 -right-0.5"
                  />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium text-foreground">
                      {participant?.username}
                    </p>
                    {participant?._id === currentUser?._id && (
                      <span className="text-xs text-primary">(You)</span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <p className="text-xs text-muted-foreground">
                      {participant?.email}
                    </p>
                    <span className="text-xs">•</span>
                    <span className={`text-xs font-medium capitalize ${getRoleColor(role)}`}>
                      {role}
                    </span>
                  </div>
                </div>
              </div>
              {canManage && (
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedParticipant(
                        selectedParticipant === participant?._id ? null : participant?._id
                      )}
                      iconName="MoreVertical"
                    />
                    
                    {selectedParticipant === participant?._id && (
                      <div className="absolute right-0 top-full mt-1 w-48 bg-popover border border-border rounded-lg shadow-lg z-50">
                        <div className="py-2">
                          <button
                            onClick={() => handleRoleChange(participant, 'admin' as UserRole)}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-accent/50 flex items-center space-x-2"
                            disabled={role === 'admin'}
                          >
                            <Icon name="Shield" size={14} />
                            <span>Make Admin</span>
                          </button>
                          <button
                            onClick={() => handleRoleChange(participant, 'moderator' as UserRole)}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-accent/50 flex items-center space-x-2"
                            disabled={role === 'moderator'}
                          >
                            <Icon name="Star" size={14} />
                            <span>Make Moderator</span>
                          </button>
                          <button
                            onClick={() => handleRoleChange(participant, 'member' as UserRole)}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-accent/50 flex items-center space-x-2"
                            disabled={role === 'member'}
                          >
                            <Icon name="User" size={14} />
                            <span>Make Member</span>
                          </button>
                          <hr className="my-1 border-border" />
                          <button
                            onClick={() => dispatch(removeParticipant({ roomId, userId: participant._id! }))}
                            className="w-full px-3 py-2 text-left text-sm text-destructive hover:bg-accent/50 flex items-center space-x-2"
                          >
                            <Icon name="UserMinus" size={14} />
                            <span>Remove from Group</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ParticipantsList;
