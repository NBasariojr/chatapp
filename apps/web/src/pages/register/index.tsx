import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "redux/store";
import { register, clearError } from "redux/slices/authSlice";
import { connectSocket } from "services/socket.service";
import RegistrationHeader from "./components/RegistrationHeader";
import RegistrationForm from "./components/RegistrationForm";
import OAuthOptions from "./components/OAuthOptions";
import LoginRedirect from "./components/LoginRedirect";
import RegistrationSuccess from "./components/RegistrationSuccess";

const Register = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { token, isLoading, error } = useSelector((state: RootState) => state.auth);

  const [step, setStep] = useState<"form" | "success">("form");
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [oauthError, setOauthError] = useState("");

  useEffect(() => {
    if (token) navigate("/chat-dashboard");
  }, [token, navigate]);

  useEffect(() => {
    return () => { dispatch(clearError()); };
  }, [dispatch]);

  const handleFormSubmit = async (formData: {
    username: string;
    email: string;
    password: string;
    confirmPassword: string;
    agreedToTerms: boolean;
  }) => {
    setOauthError("");
    const result = dispatch(
      register({
        username: formData.username,
        email: formData.email,
        password: formData.password,
      })
    );

    if (register.fulfilled.match(result)) {
      const storedToken = localStorage.getItem("chatapp_token");
      if (storedToken) connectSocket(storedToken);
      setRegisteredEmail(formData.email);
      setStep("success");
    }
  };

  const handleOAuthSignup = (provider: string) => {
    setOauthError(`${provider} signup is not available yet.`);
  };

  const handleContinueToDashboard = () => {
    navigate("/chat-dashboard");
  };

  const handleResendVerification = async () => {
    // Placeholder — wire to backend email verification endpoint when ready
    alert("Verification email resent. Please check your inbox.");
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
                  <p className="text-sm text-error text-center">{error || oauthError}</p>
                )}
                <OAuthOptions
                  onOAuthSignup={handleOAuthSignup}
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

        <div className="text-center mt-8 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} LinkUp. All rights reserved.</p>
          <div className="flex justify-center space-x-4 mt-2">
            <button className="hover:text-primary transition-colors duration-200">Privacy Policy</button>
            <button className="hover:text-primary transition-colors duration-200">Terms of Service</button>
            <button className="hover:text-primary transition-colors duration-200">Support</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;