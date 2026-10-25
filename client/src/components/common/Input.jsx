import React from 'react';

export function Input({
  label,
  id,
  name,
  type = 'text',
  value,
  onChange,
  placeholder,
  error,
  helperText,
  required = false,
  disabled = false,
  className = '',
  icon: Icon,
  rightElement,
  ...props
}) {
  const inputId = id || name;

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-semibold uppercase tracking-wider text-charcoal-700 flex items-center justify-between"
        >
          <span>
            {label}
            {required && <span className="text-terracotta-500 ml-1" aria-hidden="true">*</span>}
          </span>
        </label>
      )}

      <div className="relative rounded-xl">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-charcoal-400">
            <Icon className="w-4 h-4" aria-hidden="true" />
          </div>
        )}
        <input
          id={inputId}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
          className={`w-full rounded-xl border bg-sand-50/50 px-3.5 py-2.5 text-sm text-charcoal-900 placeholder:text-charcoal-400 transition-all duration-150 focus:bg-white focus:outline-none focus:ring-2 min-h-[44px] disabled:bg-sand-100 disabled:text-charcoal-400 disabled:cursor-not-allowed ${
            Icon ? 'pl-10' : ''
          } ${
            rightElement ? 'pr-11' : ''
          } ${
            error
              ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
              : 'border-sand-300 focus:border-sage-500 focus:ring-sage-100'
          }`}
          {...props}
        />
        {rightElement && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            {rightElement}
          </div>
        )}
      </div>

      {error ? (
        <p id={`${inputId}-error`} className="text-xs text-red-600 font-medium" role="alert">
          {error}
        </p>
      ) : helperText ? (
        <p id={`${inputId}-helper`} className="text-xs text-charcoal-500">
          {helperText}
        </p>
      ) : null}
    </div>
  );
}

export default Input;
