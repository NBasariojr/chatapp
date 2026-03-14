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
  const { token, isLoading, error } = useSelector(
    (state: RootState) => state.auth,
  );
  const [oauthError, setOauthError] = useState("");

  useEffect(() => {
    if (token) navigate("/chat-dashboard");
  }, [token, navigate]);

  useEffect(() => {
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  const handleLogin = async (formData: {
    email: string;
    password: string;
    rememberMe: boolean;
  }) => {
    setOauthError("");
    await dispatch(
      login({ email: formData.email, password: formData.password }),
    ).unwrap();
    const storedToken = localStorage.getItem("chatapp_token");
    if (storedToken) connectSocket(storedToken);
    navigate("/chat-dashboard");
  };

  const handleOAuthLogin = async (provider: string) => {
    setOauthError("");
    if (provider === "google") {
      // Google OAuth is handled by the OAuthButtons component
      // This callback is for when OAuth login succeeds
      const storedToken = localStorage.getItem("chatapp_token");
      if (storedToken) {
        connectSocket(storedToken);
        navigate("/chat-dashboard");
      }
    }
  };

  const handleNavigateToRegister = () => navigate("/register");

  // Navigate to the forgot-password page
  const handleForgotPassword = () => navigate("/forgot-password");

  const displayError = error || oauthError;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-card border border-border rounded-2xl shadow-xl p-8 space-y-8">
          <LoginHeader />
          <LoginForm
            onLogin={handleLogin}
            onForgotPassword={handleForgotPassword}
            isLoading={isLoading}
            error={displayError}
          />
          <OAuthButtons onOAuthLogin={handleOAuthLogin} isLoading={isLoading} />
          <LoginFooter onNavigateToRegister={handleNavigateToRegister} />
        </div>
      </div>
    </div>
  );
};

export default Login;
