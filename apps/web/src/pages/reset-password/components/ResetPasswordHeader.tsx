import Icon from 'components/AppIcon';

const ResetPasswordHeader = () => (
  <div className="text-center space-y-2">
    <div className="flex justify-center mb-4">
      <div className="p-3 bg-primary/10 rounded-full">
        <Icon name="LockKeyhole" size={28} className="text-primary" />
      </div>
    </div>
    <h1 className="text-2xl font-bold text-foreground">Set new password</h1>
    <p className="text-sm text-muted-foreground">
      Choose a strong password — at least 8 characters, one uppercase letter, and one number.
    </p>
  </div>
);

export default ResetPasswordHeader;