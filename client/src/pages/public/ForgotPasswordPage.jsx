import React, { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { useServerWaking } from '../../hooks/useToast.js';
import { authService } from '../../services/authService.js';
import { MOCK_RESET_LINK } from '../../config/featureFlags.js';
import { getDashboardPathForRole } from '../../routes/RoleRoute.jsx';
import { Button } from '../../components/common/Button.jsx';
import { Input } from '../../components/common/Input.jsx';
import { Mail, ArrowLeft, CheckCircle2, Sparkles, Send, Info } from 'lucide-react';

export function ForgotPasswordPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const isServerWaking = useServerWaking();

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submittedStatus, setSubmittedStatus] = useState(null); // { message, demoResetLink, submittedEmail }
  const [cooldown, setCooldown] = useState(0);

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Redirect authenticated users to their dashboard
  if (!authLoading && isAuthenticated && user) {
    return <Navigate to={getDashboardPathForRole(user.role)} replace />;
  }

  const validateEmail = (val) => {
    const trimmed = (val || '').trim();
    if (!trimmed) {
      return 'Email address is required';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      return 'Please enter a valid email address (e.g. name@example.com)';
    }
    return '';
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    const validationError = validateEmail(email);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    setLoading(true);

    try {
      // Components must only call authService, never touch localStorage directly
      const result = await authService.requestPasswordReset(email);

      if (!result.success && result.error) {
        setError(result.error);
        return;
      }

      // Always display the same neutral message regardless of whether the email was found
      setSubmittedStatus({
        message: result.message || 'If an account exists for this email, reset instructions have been sent.',
        demoResetLink: result.demoResetLink,
        submittedEmail: email.trim().toLowerCase(),
      });

      // Start 30-second cooldown on the send button
      setCooldown(30);
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'An unexpected error occurred while requesting password reset. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white/80 border border-sand-200 rounded-3xl p-6 sm:p-8 shadow-soft-md">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="w-12 h-12 rounded-2xl bg-sage-100 text-sage-800 flex items-center justify-center mx-auto mb-3 shadow-soft-sm">
          <Mail className="w-6 h-6" aria-hidden="true" />
        </div>
        <h2 className="font-serif text-2xl sm:text-3xl font-bold text-charcoal-900">
          Reset Your Password
        </h2>
        <p className="mt-1.5 text-xs sm:text-sm text-charcoal-500 max-w-sm mx-auto">
          Enter the email address associated with your Samanvitha account to receive reset instructions.
        </p>
      </div>

      {/* Neutral confirmation banner after submission */}
      {submittedStatus && (
        <div
          role="status"
          aria-live="polite"
          className="mb-6 p-4 rounded-2xl bg-sage-50 border border-sage-300 text-sage-950 flex items-start gap-3 shadow-soft-sm"
        >
          <CheckCircle2 className="w-5 h-5 text-sage-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div className="text-xs sm:text-sm">
            <p className="font-semibold text-sage-900">{submittedStatus.message}</p>
            <p className="mt-1 text-sage-700 leading-relaxed">
              Please check your inbox and spam folders. The link will remain active for 15 minutes.
            </p>
          </div>
        </div>
      )}

      {/* Demo Mode helper banner (Mock mode only, controlled by feature flag) */}
      {/* [SECURITY NOTE: Mock reset token storage runs in browser storage for frontend prototype phase.
          This is not secure and will be replaced by the backend API and SMTP email dispatch.] */}
      {MOCK_RESET_LINK && submittedStatus && (
        <div className="mb-6 p-4 rounded-2xl bg-amber-50/90 border border-amber-300 text-amber-950 text-xs shadow-soft-sm">
          <div className="flex items-center gap-1.5 font-bold text-amber-900 mb-1.5 uppercase tracking-wider text-[11px]">
            <Sparkles className="w-4 h-4 text-amber-700" aria-hidden="true" />
            <span>DEMO MODE: no email is sent. Use this link to continue</span>
          </div>

          {submittedStatus.demoResetLink ? (
            <div>
              <p className="text-amber-900 mb-2.5 leading-relaxed">
                In this frontend prototype, no email is dispatched. Click the generated reset link below to proceed with testing:
              </p>
              <Link
                to={submittedStatus.demoResetLink}
                className="inline-flex items-center gap-2 font-semibold text-sage-800 bg-white hover:bg-sage-50 border border-amber-300 hover:border-sage-400 px-3.5 py-2 rounded-xl shadow-soft-sm transition-all text-xs"
              >
                <span>Continue to Password Reset →</span>
              </Link>
            </div>
          ) : (
            <div className="flex items-start gap-2 text-amber-900 leading-relaxed">
              <Info className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <p>
                No user with email <strong className="font-mono">{submittedStatus.submittedEmail}</strong> exists in mock storage. (The neutral confirmation message above is shown intentionally to protect account privacy).
              </p>
            </div>
          )}

          <p className="mt-2.5 text-[10px] text-amber-800/80 leading-normal border-t border-amber-200/80 pt-2">
            * Note: Mock token storage in browser storage is not secure and will be replaced by the production backend authentication API.
          </p>
        </div>
      )}

      {/* Reset request form */}
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Input
          label="Email Address"
          type="email"
          name="email"
          id="forgot-email"
          placeholder="your.email@example.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (error) setError('');
          }}
          error={error}
          required
          disabled={loading}
          autoComplete="email"
          icon={Mail}
        />

        <div className="pt-2">
          <Button
            type="submit"
            variant="primary"
            loading={loading}
            disabled={loading || cooldown > 0}
            className="w-full justify-center py-3"
            icon={Send}
          >
            {cooldown > 0 ? `Resend link (${cooldown}s)` : 'Send reset link'}
          </Button>
          {loading && isServerWaking && (
            <p className="text-xs text-charcoal-600 bg-sand-100/90 py-2.5 px-3 rounded-xl border border-sand-200 mt-2.5 text-center flex items-center justify-center gap-2 animate-fade-in">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              The server is waking up (free hosting). This can take up to a minute, please wait.
            </p>
          )}
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

export default ForgotPasswordPage;
