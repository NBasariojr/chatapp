// web/src/App.tsx
import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Routes from './Routes';
import { fetchMe, logout } from './redux/slices/authSlice';
import { connectSocket, disconnectSocket } from './services/socket.service';
import type { RootState, AppDispatch } from './redux/store';

function App() {
  const dispatch = useDispatch<AppDispatch>();
  const { token } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    if (!token) return;

    // Validate stored token is still alive on every app load
    dispatch(fetchMe())
      .unwrap()
      .then(() => {
        // ✅ Token is valid — now safe to connect socket
        connectSocket(token);
      })
      .catch(() => {
        // ✅ Token is expired/invalid — clear it and redirect to login
        dispatch(logout());
        disconnectSocket();
      });

    // Cleanup on unmount or token change
    return () => {
      disconnectSocket();
    };
  }, [token]); // re-runs if token changes (login/logout)

  return <Routes />;
}

export default App;