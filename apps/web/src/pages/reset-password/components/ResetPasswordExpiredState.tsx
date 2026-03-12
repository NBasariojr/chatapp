import { useNavigate } from 'react-router-dom';
import Icon from 'components/AppIcon';
import Button from 'components/ui/Button';

const ResetPasswordExpiredState = () => {
  const navigate = useNavigate();

  return (
    <div className="text-center space-y-4 py-4">
      <div className="flex justify-center">
        <div className="p-3 bg-error/10 rounded-full">
          <Icon name="AlertTriangle" size={28} className="text-error" />
        </div>
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-bold text-foreground">Link expired</h2>
        <p className="text-sm text-muted-foreground">
          This reset link is invalid or has expired. Links are only valid for 15 minutes.
        </p>
      </div>
      <Button
        variant="default"
        onClick={() => navigate('/forgot-password')}
        className="bg-primary hover:bg-primary/90 text-primary-foreground w-full"
      >
        Request a new link
      </Button>
      <button
        type="button"
        onClick={() => navigate('/login')}
        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        Back to Sign In
      </button>
    </div>
  );
};

export default ResetPasswordExpiredState;