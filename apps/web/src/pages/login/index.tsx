import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "redux/store";
import { login, clearError } from "redux/slices/authSlice";
import { connectSocket } from "services/socket.service";
import LoginForm from "./components/LoginForm";
import OAuthButtons from "../../components/ui/OAuthButtons";
import LoginHeader from "./components/LoginHeader";
import LoginFooter from "./components/LoginFooter";

const Login = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { token, isLoading, error } = useSelector((state: RootState) => state.auth);

  const [oauthError, setOauthError] = useState("");

  // Redirect if already logged in
  useEffect(() => {
    if (token) {
      navigate("/chat-dashboard");
    }
  }, [token, navigate]);

  // Clear redux error on unmount
  useEffect(() => {
    return () => { dispatch(clearError()); };
  }, [dispatch]);

  const handleLogin = async (formData: {
    email: string;
    password: string;
    rememberMe: boolean;
  }) => {
    setOauthError("");
    const result = await dispatch(login({ email: formData.email, password: formData.password }));

    if (login.fulfilled.match(result)) {
      const storedToken = localStorage.getItem("chatapp_token");
      if (storedToken) connectSocket(storedToken);
      navigate("/chat-dashboard");
    }
  };

  const handleOAuthLogin = async (provider: string) => {
    // OAuth is not yet implemented on the backend.
    // Placeholder for future Google/GitHub OAuth integration.
    setOauthError(`${provider} login is not available yet.`);
  };

  const handleNavigateToRegister = () => {
    navigate("/register");
  };

  const displayError = error || oauthError;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-card border border-border rounded-2xl shadow-xl p-8 space-y-8">
          {/* Header */}
          <LoginHeader />

          {/* Login Form */}
          <LoginForm
            onLogin={handleLogin}
            isLoading={isLoading}
            error={displayError}
          />

          {/* OAuth Buttons */}
          <OAuthButtons
            onOAuthLogin={handleOAuthLogin}
            isLoading={isLoading}
          />

          {/* Footer */}
          <LoginFooter onNavigateToRegister={handleNavigateToRegister} />
        </div>
      </div>
    </div>
  );
};

export default Login;