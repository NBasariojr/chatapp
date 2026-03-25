import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from 'redux/store';
import { resetPassword, clearResetPasswordStatus } from 'redux/slices/authSlice';
import TokenValidationGuard from './components/TokenValidationGuard';
import ResetPasswordHeader from './components/ResetPasswordHeader';
import ResetPasswordForm from './components/ResetPasswordForm';
import Icon from 'components/AppIcon';

const ResetPassword = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { status, error } = useSelector((state: RootState) => state.auth.resetPassword);

  // Reset state on unmount so re-entry starts from idle
  useEffect(() => {
    return () => {
      dispatch(clearResetPasswordStatus());
    };
  }, [dispatch]);

  // Auto-redirect to /login 3 seconds after a successful reset
  useEffect(() => {
    if (status !== 'success') return;
    const timer = setTimeout(() => navigate('/login'), 3000);
    return () => clearTimeout(timer);
  }, [status, navigate]);

  // Guard against a missing :token param (shouldn't be reachable via normal navigation)
  useEffect(() => {
    if (!token) navigate('/forgot-password', { replace: true });
  }, [token, navigate]);

  if (!token) return null;

  // ─── Success state ──────────────────────────────────────────────────────────
  if (status === 'success') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-card border border-border rounded-2xl shadow-xl p-8 text-center space-y-4">
            <div className="flex justify-center">
              <div className="p-3 bg-success/10 rounded-full">
                <Icon name="CheckCircle2" size={28} className="text-success" />
              </div>
            </div>
            <h2 className="text-xl font-bold text-foreground">Password reset!</h2>
            <p className="text-sm text-muted-foreground">
              Your password has been updated. Redirecting you to sign in…
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ─── Default / form state ───────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-card border border-border rounded-2xl shadow-xl p-8 space-y-8">
          {/*
            TokenValidationGuard fires GET /api/auth/reset-password/:token on mount.
            - 'checking' → spinner
            - 'invalid'  → ResetPasswordExpiredState (link to /forgot-password)
            - 'valid'    → renders header + form
          */}
          <TokenValidationGuard token={token}>
            <ResetPasswordHeader />
            <ResetPasswordForm
              onSubmit={(password, confirmPassword) => {
                dispatch(resetPassword({ token, password, confirmPassword }));
              }}
              isLoading={status === 'loading'}
              error={status === 'error' ? error : null}
            />
          </TokenValidationGuard>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;