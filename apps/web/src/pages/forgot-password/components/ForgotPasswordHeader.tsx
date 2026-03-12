import Icon from 'components/AppIcon';

const ForgotPasswordHeader = () => (
  <div className="text-center space-y-2">
    <div className="flex justify-center mb-4">
      <div className="p-3 bg-primary/10 rounded-full">
        <Icon name="KeyRound" size={28} className="text-primary" />
      </div>
    </div>
    <h1 className="text-2xl font-bold text-foreground">Forgot your password?</h1>
    <p className="text-sm text-muted-foreground">
      Enter your email and we&apos;ll send you a reset link.
    </p>
  </div>
);

export default ForgotPasswordHeader;