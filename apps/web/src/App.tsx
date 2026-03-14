import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Routes from './Routes';
import { fetchMe, logout } from './redux/slices/authSlice';
import { connectSocket, disconnectSocket } from './services/socket.service';
import type { RootState, AppDispatch } from './redux/store';
import {
  trackSocketConnected,
  trackSocketError,
  trackLogout,
} from '@/lib/analytics';

function App() {
  const dispatch = useDispatch<AppDispatch>();
  const { token } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    if (!token) return;

    dispatch(fetchMe())
      .unwrap()
      .then(() => {
        connectSocket(token);
        trackSocketConnected();
      })
      .catch(() => {
        trackSocketError('token_expired_or_invalid');
        dispatch(logout());
        trackLogout();
        disconnectSocket();
      });

    return () => {
      disconnectSocket();
    };
  }, [token]);

  return <Routes />;
}

export default App;