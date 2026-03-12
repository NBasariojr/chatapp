import { useEffect, useState } from 'react';
import { authService } from 'services/auth.service';
import ResetPasswordExpiredState from './ResetPasswordExpiredState';
import Icon from 'components/AppIcon';

type ValidationStatus = 'checking' | 'valid' | 'invalid';

interface TokenValidationGuardProps {
  token: string;
  children: React.ReactNode;
}

const TokenValidationGuard = ({ token, children }: TokenValidationGuardProps) => {
  const [status, setStatus] = useState<ValidationStatus>('checking');

  useEffect(() => {
    let cancelled = false;

    const validate = async () => {
      try {
        const { valid } = await authService.validateResetToken(token);
        if (!cancelled) setStatus(valid ? 'valid' : 'invalid');
      } catch {
        // Network error or 400 from backend — treat as invalid
        if (!cancelled) setStatus('invalid');
      }
    };

    validate();

    // Cleanup prevents setState on an unmounted component
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (status === 'checking') {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-3">
        <Icon name="Loader2" size={24} className="text-primary animate-spin" />
        <p className="text-sm text-muted-foreground">Validating your reset link…</p>
      </div>
    );
  }

  if (status === 'invalid') {
    return <ResetPasswordExpiredState />;
  }

  return <>{children}</>;
};

export default TokenValidationGuard;