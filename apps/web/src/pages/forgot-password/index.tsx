import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from 'redux/store';
import { forgotPassword, clearForgotPasswordStatus } from 'redux/slices/authSlice';
import ForgotPasswordHeader from './components/ForgotPasswordHeader';
import ForgotPasswordForm from './components/ForgotPasswordForm';
import Icon from 'components/AppIcon';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { status, error } = useSelector((state: RootState) => state.auth.forgotPassword);

  // Reset state on unmount so re-entry starts from idle
  useEffect(() => {
    return () => {
      dispatch(clearForgotPasswordStatus());
    };
  }, [dispatch]);

  const handleSubmit = (email: string) => {
    dispatch(forgotPassword(email));
  };

  // ─── Success state ──────────────────────────────────────────────────────────
  if (status === 'success') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-card border border-border rounded-2xl shadow-xl p-8 text-center space-y-4">
            <div className="flex justify-center">
              <div className="p-3 bg-success/10 rounded-full">
                <Icon name="MailCheck" size={28} className="text-success" />
              </div>
            </div>
            <h2 className="text-xl font-bold text-foreground">Check your inbox</h2>
            <p className="text-sm text-muted-foreground">
              If that email is registered, you&apos;ll receive a reset link shortly.
              The link expires in <strong>15 minutes</strong>.
            </p>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="text-sm text-primary hover:text-primary/80 transition-colors"
            >
              Back to Sign In
            </button>
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
          <ForgotPasswordHeader />
          <ForgotPasswordForm
            onSubmit={handleSubmit}
            isLoading={status === 'loading'}
            error={status === 'error' ? error : null}
          />
          <div className="text-center">
            <button
              type="button"
              onClick={() => navigate('/login')}
              disabled={status === 'loading'}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              ← Back to Sign In
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;