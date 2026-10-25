import React from 'react';

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  type = 'button',
  disabled = false,
  loading = false,
  onClick,
  className = '',
  icon: Icon,
  ...props
}) {
  const baseStyles =
    'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 cursor-pointer';

  const variants = {
    primary:
      'bg-sage-600 text-white hover:bg-sage-700 active:bg-sage-800 focus-visible:outline-sage-600 shadow-soft-sm',
    accent:
      'bg-terracotta-500 text-white hover:bg-terracotta-600 active:bg-terracotta-700 focus-visible:outline-terracotta-500 shadow-soft-sm',
    secondary:
      'bg-sand-100 text-charcoal-800 border border-sand-200 hover:bg-sand-200 hover:border-sand-300 focus-visible:outline-sage-600',
    outline:
      'bg-transparent text-charcoal-800 border border-sand-300 hover:bg-sand-100 focus-visible:outline-sage-600',
    ghost:
      'bg-transparent text-charcoal-700 hover:bg-sand-100 hover:text-charcoal-900 focus-visible:outline-sage-600',
    danger:
      'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 focus-visible:outline-red-600',
  };

  const sizes = {
    sm: 'text-xs px-3 py-2 min-h-[40px] sm:min-h-[38px] gap-1.5',
    md: 'text-sm px-4 py-2.5 min-h-[44px] gap-2',
    lg: 'text-base px-6 py-3.5 min-h-[48px] gap-2.5',
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`${baseStyles} ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`}
      {...props}
    >
      {loading ? (
        <>
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <span>Loading...</span>
        </>
      ) : (
        <>
          {Icon && <Icon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />}
          <span>{children}</span>
        </>
      )}
    </button>
  );
}

export default Button;
