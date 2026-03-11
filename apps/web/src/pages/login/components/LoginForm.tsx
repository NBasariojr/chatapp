import React, { useState } from "react";
import Button from "components/ui/Button";
import Input from "components/ui/Input";
import { Checkbox } from "components/ui/Checkbox";
import Icon from "components/AppIcon";

interface LoginFormProps {
  onLogin: (data: { email: string; password: string; rememberMe: boolean }) => void;
  isLoading: boolean;
  error?: string;
}

const LoginForm = ({ onLogin, isLoading, error }: LoginFormProps) => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.email.trim()) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Please enter a valid email address";
    }
    if (!formData.password.trim()) {
      errors.password = "Password is required";
    } else if (formData.password.length < 6) {
      errors.password = "Password must be at least 6 characters";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) onLogin(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-error/10 border border-error/20 rounded-lg">
          <div className="flex items-center space-x-2">
            <Icon name="AlertCircle" size={16} className="text-error flex-shrink-0" />
            <p className="text-sm text-error">{error}</p>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <Input
          label="Email Address"
          type="email"
          name="email"
          placeholder="Enter your email"
          value={formData.email}
          onChange={handleInputChange}
          error={formErrors.email}
          required
          disabled={isLoading}
        />
        <Input
          label="Password"
          type="password"
          name="password"
          placeholder="Enter your password"
          value={formData.password}
          onChange={handleInputChange}
          error={formErrors.password}
          required
          disabled={isLoading}
        />
      </div>

      <div className="flex items-center justify-between">
        <Checkbox
          label="Remember me"
          name="rememberMe"
          checked={formData.rememberMe}
          onChange={handleInputChange}
          disabled={isLoading}
        />
        <button
          type="button"
          className="text-sm text-primary hover:text-primary/80 transition-colors duration-200 focus:outline-none focus:underline"
          disabled={isLoading}
        >
          Forgot password?
        </button>
      </div>

      <Button
        type="submit"
        variant="default"
        fullWidth
        loading={isLoading}
        disabled={isLoading}
        className="bg-primary hover:bg-primary/90 text-primary-foreground"
      >
        Sign In
      </Button>
    </form>
  );
};

export default LoginForm;