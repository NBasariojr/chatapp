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
      .catch((err: Error & { status?: number }) => {
        // Only logout if server explicitly says token is invalid (401)
        // Network errors, timeouts, Render cold starts → do NOT logout
        if (err?.status === 401) {
          trackSocketError('token_expired_or_invalid');
          dispatch(logout());
          trackLogout();
          disconnectSocket();
        }
        // For any other error (500, network timeout, etc.) — stay logged in
        // The user still has a valid token in localStorage
      });

    return () => {
      disconnectSocket();
    };
  }, [token]);

  return <Routes />;
}

export default App;