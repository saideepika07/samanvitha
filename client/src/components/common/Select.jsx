import React from 'react';

export function Select({
  label,
  id,
  name,
  value,
  onChange,
  options = [],
  placeholder = 'Select an option',
  error,
  helperText,
  required = false,
  disabled = false,
  className = '',
  ...props
}) {
  const selectId = id || name;

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label
          htmlFor={selectId}
          className="text-xs font-semibold uppercase tracking-wider text-charcoal-700 flex items-center justify-between"
        >
          <span>
            {label}
            {required && <span className="text-terracotta-500 ml-1" aria-hidden="true">*</span>}
          </span>
        </label>
      )}

      <select
        id={selectId}
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${selectId}-error` : helperText ? `${selectId}-helper` : undefined}
        className={`w-full rounded-xl border bg-sand-50/50 px-3.5 py-2.5 text-sm text-charcoal-900 transition-all duration-150 focus:bg-white focus:outline-none focus:ring-2 min-h-[44px] disabled:bg-sand-100 disabled:text-charcoal-400 disabled:cursor-not-allowed ${
          error
            ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
            : 'border-sand-300 focus:border-sage-500 focus:ring-sage-100'
        }`}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => {
          const val = typeof opt === 'object' ? opt.value || opt.id : opt;
          const lbl = typeof opt === 'object' ? opt.label || opt.name : opt;
          return (
            <option key={val} value={val}>
              {lbl}
            </option>
          );
        })}
      </select>

      {error ? (
        <p id={`${selectId}-error`} className="text-xs text-red-600 font-medium" role="alert">
          {error}
        </p>
      ) : helperText ? (
        <p id={`${selectId}-helper`} className="text-xs text-charcoal-500">
          {helperText}
        </p>
      ) : null}
    </div>
  );
}

export default Select;
