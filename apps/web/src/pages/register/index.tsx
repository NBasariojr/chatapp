import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "redux/store";
import { register, clearError } from "redux/slices/authSlice";
import { connectSocket } from "services/socket.service";
import RegistrationHeader from "./components/RegistrationHeader";
import RegistrationForm from "./components/RegistrationForm";
import OAuthButtons from "../../components/ui/OAuthButtons";
import LoginRedirect from "./components/LoginRedirect";
import RegistrationSuccess from "./components/RegistrationSuccess";

const Register = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { token, isLoading, error, user } = useSelector(
    (state: RootState) => state.auth,
  );

  const [step, setStep] = useState<"form" | "success">("form");
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [oauthError, setOauthError] = useState("");

  useEffect(() => {
    if (token) navigate("/chat-dashboard");
  }, [token, navigate]);

  useEffect(() => {
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  const handleFormSubmit = useCallback(async (formData: {
    username: string;
    email: string;
    password: string;
    confirmPassword: string;
    agreedToTerms: boolean;
  }) => {
    setOauthError("");
    try {
      await dispatch(register({
        username: formData.username,
        email: formData.email,
        password: formData.password,
      })).unwrap();
      const storedToken = localStorage.getItem("chatapp_token");
      if (storedToken) connectSocket(storedToken);
      setRegisteredEmail(formData.email);
      setStep("success");
    } catch {
      // Error is in Redux state.auth.error — displayed in the form
    }
  }, [dispatch]);

  const handleOAuthSignup = async (provider: string) => {
    setOauthError("");
    if (provider === "google") {
      // Google OAuth is handled by the OAuthButtons component
      // This callback is for when OAuth login succeeds
      const storedToken = localStorage.getItem("chatapp_token");
      if (storedToken) {
        connectSocket(storedToken);
        setRegisteredEmail(user?.email ?? "your registered email");
        setStep("success");
      }
    }
  };

  const handleContinueToDashboard = () => {
    navigate("/chat-dashboard");
  };

  const handleResendVerification = async () => {
    // TODO: Dispatch resend verification email action (Milestone 8)
    // For now, surface a non-blocking message via Redux ui state
    console.warn("[Register] Resend verification not yet implemented");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-2xl shadow-2xl border border-border p-8">
          {step === "form" ? (
            <>
              <RegistrationHeader />
              <div className="space-y-6">
                <RegistrationForm
                  onSubmit={handleFormSubmit}
                  isLoading={isLoading}
                />
                {(error || oauthError) && (
                  <p className="text-sm text-error text-center">
                    {error || oauthError}
                  </p>
                )}
                <OAuthButtons
                  onOAuthLogin={handleOAuthSignup}
                  isLoading={isLoading}
                />
                <LoginRedirect onNavigateToLogin={() => navigate("/login")} />
              </div>
            </>
          ) : (
            <RegistrationSuccess
              userEmail={registeredEmail}
              onContinue={handleContinueToDashboard}
              onResendVerification={handleResendVerification}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Register;
