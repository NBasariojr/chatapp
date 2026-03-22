import React from "react";
import { Check, Minus } from "lucide-react";
import { cn } from "lib/utils";

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  description?: string;
  error?: string;
  indeterminate?: boolean;
  variant?: "sm" | "default" | "lg";
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(({
  className,
  id,
  checked,
  indeterminate = false,
  disabled = false,
  required = false,
  label,
  description,
  error,
  variant = "default",
  ...props
}, ref) => {
  const checkboxId = id || `checkbox-${Math.random().toString(36).slice(2, 11)}`;

  const variantClasses = {
    sm:      "h-4 w-4",
    default: "h-4 w-4",
    lg:      "h-5 w-5",
  };

  return (
    <div className={cn("flex items-start space-x-2", className)}>
      <div className="relative flex items-center">
        <input
          type="checkbox"
          ref={ref}
          id={checkboxId}
          checked={checked}
          disabled={disabled}
          required={required}
          className="sr-only"
          {...props}
        />
        <label
          htmlFor={checkboxId}
          className={cn(
            "peer shrink-0 rounded-sm border border-primary ring-offset-background cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            variantClasses[variant],
            checked && "bg-primary text-primary-foreground border-primary",
            indeterminate && "bg-primary text-primary-foreground border-primary",
            error && "border-destructive",
            disabled && "cursor-not-allowed opacity-50"
          )}
        >
          {checked && !indeterminate && (
            <Check className="h-3 w-3 text-current" />
          )}
          {indeterminate && (
            <Minus className="h-3 w-3 text-current" />
          )}
        </label>
      </div>

      {(label || description || error) && (
        <div className="flex-1 space-y-1">
          {label && (
            <label
              htmlFor={checkboxId}
              className={cn(
                "text-sm font-medium leading-none cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
                error ? "text-destructive" : "text-foreground"
              )}
            >
              {label}
              {required && <span className="text-destructive ml-1">*</span>}
            </label>
          )}
          {description && !error && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>
      )}
    </div>
  );
});

Checkbox.displayName = "Checkbox";

// Checkbox Group
interface CheckboxGroupProps extends React.FieldsetHTMLAttributes<HTMLFieldSetElement> {
  label?: string;
  description?: string;
  error?: string;
  required?: boolean;
}

const CheckboxGroup = React.forwardRef<HTMLFieldSetElement, CheckboxGroupProps>(({
  className,
  children,
  label,
  description,
  error,
  required = false,
  disabled = false,
  ...props
}, ref) => {
  return (
    <fieldset
      ref={ref}
      disabled={disabled}
      className={cn("space-y-3", className)}
      {...props}
    >
      {label && (
        <legend className={cn(
          "text-sm font-medium",
          error ? "text-destructive" : "text-foreground"
        )}>
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </legend>
      )}
      {description && !error && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
      <div className="space-y-2">{children}</div>
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </fieldset>
  );
});

CheckboxGroup.displayName = "CheckboxGroup";

export { Checkbox, CheckboxGroup };