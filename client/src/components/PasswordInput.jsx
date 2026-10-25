import React, { useState, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Input } from './common/Input.jsx';

/**
 * Reusable PasswordInput component with accessible show/hide toggle.
 *
 * Accessibility features:
 * - Real <button type="button"> that cannot accidentally submit forms
 * - Dynamic aria-label ("Show password" / "Hide password")
 * - aria-pressed attribute tracking visibility state
 * - Keyboard focusable with visible focus ring
 * - onMouseDown preventDefault prevents stealing focus from the input when clicked
 */
export function PasswordInput({
  label = 'Password',
  id,
  name = 'password',
  value = '',
  onChange,
  placeholder = 'Enter password',
  error,
  helperText,
  required = false,
  disabled = false,
  autoComplete = 'current-password',
  className = '',
  icon,
  showPassword: controlledShow,
  onTogglePassword: controlledOnToggle,
  resetTrigger,
  ...props
}) {
  const [internalShow, setInternalShow] = useState(false);
  const isControlled = typeof controlledShow === 'boolean';
  const isVisible = isControlled ? controlledShow : internalShow;

  useEffect(() => {
    if (resetTrigger !== undefined) {
      if (isControlled && controlledOnToggle) {
        controlledOnToggle(false);
      } else {
        setInternalShow(false);
      }
    }
  }, [resetTrigger, isControlled, controlledOnToggle]);

  const handleToggle = (e) => {
    e.preventDefault();
    const next = !isVisible;
    if (isControlled && controlledOnToggle) {
      controlledOnToggle(next);
    } else {
      setInternalShow(next);
    }
  };

  const toggleButton = (
    <button
      type="button"
      onClick={handleToggle}
      onMouseDown={(e) => {
        // Prevent button click from stealing focus from the password input
        e.preventDefault();
      }}
      className="text-charcoal-400 hover:text-charcoal-700 min-h-[44px] min-w-[44px] flex items-center justify-center p-1 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-500 focus-visible:ring-offset-1 cursor-pointer transition-colors"
      aria-label={isVisible ? 'Hide password' : 'Show password'}
      aria-pressed={isVisible}
    >
      {isVisible ? (
        <EyeOff className="w-4 h-4" aria-hidden="true" />
      ) : (
        <Eye className="w-4 h-4" aria-hidden="true" />
      )}
    </button>
  );

  return (
    <Input
      label={label}
      id={id}
      name={name}
      type={isVisible ? 'text' : 'password'}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      error={error}
      helperText={helperText}
      required={required}
      disabled={disabled}
      autoComplete={autoComplete}
      className={className}
      icon={icon}
      rightElement={toggleButton}
      {...props}
    />
  );
}

export default PasswordInput;
