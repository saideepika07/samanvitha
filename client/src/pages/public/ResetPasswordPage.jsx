import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { useToast } from '../../hooks/useToast.js';
import { authService } from '../../services/authService.js';
import { getDashboardPathForRole } from '../../routes/RoleRoute.jsx';
import { Button } from '../../components/common/Button.jsx';
import { Input } from '../../components/common/Input.jsx';
import { PasswordInput } from '../../components/PasswordInput.jsx';
import {
  KeyRound,
  Check,
  X,
  AlertTriangle,
  Clock,
  ArrowLeft,
  CheckCircle2,
  Lock,
} from 'lucide-react';

export function ResetPasswordPage() {
  const { token } = useParams();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  // Token validation state
  const [tokenStatus, setTokenStatus] = useState({
    checking: true,
    valid: false,
    reason: null,
    message: '',
    email: '',
  });

  // Form input state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Validate the token on mount
  useEffect(() => {
    let mounted = true;

    async function checkToken() {
      try {
        const result = await authService.validateResetToken(token);
        if (!mounted) return;

        if (result.valid) {
          setTokenStatus({
            checking: false,
            valid: true,
            reason: null,
            message: '',
            email: result.email || '',
          });
        } else {
          setTokenStatus({
            checking: false,
            valid: false,
            reason: result.reason,
            message: result.message || 'This password reset link is invalid.',
            email: result.email || '',
          });
        }
      } catch (err) {
        if (!mounted) return;
        setTokenStatus({
          checking: false,
          valid: false,
          reason: 'error',
          message: 'Unable to validate reset link. Please try again.',
          email: '',
        });
      }
    }

    checkToken();
    return () => {
      mounted = false;
    };
  }, [token]);

  // Reset visibility when navigating away from the page
  useEffect(() => {
    return () => {
      setShowNewPassword(false);
      setShowConfirmPassword(false);
    };
  }, []);

  // Redirect authenticated users to their dashboard
  if (!authLoading && isAuthenticated && user) {
    return <Navigate to={getDashboardPathForRole(user.role)} replace />;
  }

  // Live password requirements checks
  const hasMinLength = newPassword.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const validateForm = () => {
    const newErrors = {};

    if (!newPassword) {
      newErrors.newPassword = 'New password is required.';
    } else if (newPassword.length < 8) {
      newErrors.newPassword = 'Password must be at least 8 characters long.';
    } else if (!hasLetter || !hasNumber) {
      newErrors.newPassword = 'Password must contain at least one letter and one number.';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your new password.';
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleReset = async (e) => {
    e?.preventDefault();
    if (!validateForm()) {
      setShowNewPassword(false);
      setShowConfirmPassword(false);
      return;
    }

    setSubmitting(true);
    try {
      // Components must only call authService, never touch localStorage directly
      const result = await authService.resetPassword(token, newPassword);

      if (result.success) {
        toast.success('Password updated. Please log in.');
        navigate('/login', {
          replace: true,
          state: {
            successMessage: 'Password updated. Please log in.',
            registeredEmail: tokenStatus.email,
          },
        });
      } else {
        setErrors({ general: result.error || 'Failed to reset password.' });
        toast.error(result.error || 'Failed to reset password.');
      }
    } catch (err) {
      setErrors({ general: 'An unexpected error occurred while resetting password.' });
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setSubmitting(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
    }
  };

  // State 1: Checking token
  if (tokenStatus.checking) {
    return (
      <div className="bg-white/80 border border-sand-200 rounded-3xl p-8 shadow-soft-md text-center">
        <div className="w-10 h-10 border-2 border-sage-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <h2 className="font-serif text-xl font-bold text-charcoal-900">Verifying Reset Link...</h2>
        <p className="mt-1 text-xs text-charcoal-500">Checking token validity and expiration.</p>
      </div>
    );
  }

  // State 2: Invalid, expired or already used token
  if (!tokenStatus.valid) {
    const isExpired = tokenStatus.reason === 'expired';
    const isUsed = tokenStatus.reason === 'already_used';

    return (
      <div className="bg-white/80 border border-sand-200 rounded-3xl p-6 sm:p-8 shadow-soft-md text-center">
        <div
          className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 ${
            isExpired ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
          }`}
        >
          {isExpired ? (
            <Clock className="w-7 h-7" aria-hidden="true" />
          ) : (
            <AlertTriangle className="w-7 h-7" aria-hidden="true" />
          )}
        </div>

        <h2 className="font-serif text-2xl font-bold text-charcoal-900">
          {isUsed
            ? 'Reset Link Already Used'
            : isExpired
            ? 'Reset Link Expired'
            : 'Invalid Reset Link'}
        </h2>

        <p className="mt-2 text-xs sm:text-sm text-charcoal-600 max-w-sm mx-auto leading-relaxed">
          {tokenStatus.message}
        </p>

        <div className="mt-6 flex flex-col gap-2.5">
          <Link to="/forgot-password" className="w-full">
            <Button variant="primary" className="w-full justify-center py-3">
              Request a New Reset Link
            </Button>
          </Link>

          <Link
            to="/login"
            className="inline-flex items-center justify-center gap-1.5 text-xs font-medium text-sage-700 hover:text-sage-800 focus-visible:outline-sage-600 rounded-md py-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            <span>Return to Sign In</span>
          </Link>
        </div>
      </div>
    );
  }

  // State 3: Valid token — Display Password Reset Form
  return (
    <div className="bg-white/80 border border-sand-200 rounded-3xl p-6 sm:p-8 shadow-soft-md">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="w-12 h-12 rounded-2xl bg-sage-100 text-sage-800 flex items-center justify-center mx-auto mb-3 shadow-soft-sm">
          <KeyRound className="w-6 h-6" aria-hidden="true" />
        </div>
        <h2 className="font-serif text-2xl sm:text-3xl font-bold text-charcoal-900">
          Create New Password
        </h2>
        {tokenStatus.email && (
          <p className="mt-1 text-xs text-charcoal-500">
            Resetting password for <strong className="text-charcoal-800">{tokenStatus.email}</strong>
          </p>
        )}
      </div>

      {errors.general && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium" role="alert">
          {errors.general}
        </div>
      )}

      <form onSubmit={handleReset} className="space-y-4" noValidate>
        {/* New Password Field */}
        <div>
          <PasswordInput
            label="New Password"
            name="newPassword"
            id="newPassword"
            placeholder="At least 8 characters"
            value={newPassword}
            onChange={(e) => {
              setNewPassword(e.target.value);
              if (errors.newPassword) setErrors((prev) => ({ ...prev, newPassword: '' }));
            }}
            showPassword={showNewPassword}
            onTogglePassword={setShowNewPassword}
            error={errors.newPassword}
            required
            disabled={submitting}
            autoComplete="new-password"
            icon={Lock}
          />
        </div>

        {/* Confirm Password Field */}
        <div>
          <PasswordInput
            label="Confirm New Password"
            name="confirmPassword"
            id="confirmPassword"
            placeholder="Re-enter your new password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: '' }));
            }}
            showPassword={showConfirmPassword}
            onTogglePassword={setShowConfirmPassword}
            error={errors.confirmPassword}
            required
            disabled={submitting}
            autoComplete="new-password"
            icon={Lock}
          />
        </div>

        {/* Password Strength and Requirements Hint Box */}
        <div className="p-3.5 rounded-2xl bg-sand-100/70 border border-sand-200/80 text-xs">
          <p className="font-semibold text-charcoal-800 mb-2">Password Requirements:</p>
          <ul className="space-y-1.5 text-charcoal-600">
            <li className="flex items-center gap-2">
              {hasMinLength ? (
                <Check className="w-3.5 h-3.5 text-sage-600 flex-shrink-0" aria-hidden="true" />
              ) : (
                <span className="w-3.5 h-3.5 rounded-full border border-charcoal-300 flex-shrink-0" aria-hidden="true" />
              )}
              <span className={hasMinLength ? 'text-sage-800 font-medium' : ''}>
                At least 8 characters long
              </span>
            </li>

            <li className="flex items-center gap-2">
              {hasLetter ? (
                <Check className="w-3.5 h-3.5 text-sage-600 flex-shrink-0" aria-hidden="true" />
              ) : (
                <span className="w-3.5 h-3.5 rounded-full border border-charcoal-300 flex-shrink-0" aria-hidden="true" />
              )}
              <span className={hasLetter ? 'text-sage-800 font-medium' : ''}>
                Contains at least one letter (a-z, A-Z)
              </span>
            </li>

            <li className="flex items-center gap-2">
              {hasNumber ? (
                <Check className="w-3.5 h-3.5 text-sage-600 flex-shrink-0" aria-hidden="true" />
              ) : (
                <span className="w-3.5 h-3.5 rounded-full border border-charcoal-300 flex-shrink-0" aria-hidden="true" />
              )}
              <span className={hasNumber ? 'text-sage-800 font-medium' : ''}>
                Contains at least one number (0-9)
              </span>
            </li>

            {confirmPassword.length > 0 && (
              <li className="flex items-center gap-2">
                {passwordsMatch ? (
                  <Check className="w-3.5 h-3.5 text-sage-600 flex-shrink-0" aria-hidden="true" />
                ) : (
                  <X className="w-3.5 h-3.5 text-red-500 flex-shrink-0" aria-hidden="true" />
                )}
                <span className={passwordsMatch ? 'text-sage-800 font-medium' : 'text-red-600'}>
                  Passwords match
                </span>
              </li>
            )}
          </ul>
        </div>

        <div className="pt-2">
          <Button
            type="submit"
            variant="primary"
            loading={submitting}
            disabled={submitting}
            className="w-full justify-center py-3"
            icon={CheckCircle2}
          >
            Reset Password
          </Button>
        </div>
      </form>

      {/* Back to Login Link */}
      <div className="mt-6 pt-6 border-t border-sand-200 text-center">
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-sage-700 hover:text-sage-800 focus-visible:outline-sage-600 rounded-md py-2 px-3 min-h-[44px] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          <span>Back to Sign In</span>
        </Link>
      </div>
    </div>
  );
}

export default ResetPasswordPage;
