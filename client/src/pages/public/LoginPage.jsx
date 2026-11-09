import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { useToast, useServerWaking } from '../../hooks/useToast.js';
import { getDashboardPathForRole } from '../../routes/RoleRoute.jsx';
import { Button } from '../../components/common/Button.jsx';
import { Input } from '../../components/common/Input.jsx';
import { PasswordInput } from '../../components/PasswordInput.jsx';
import SampleDataBadge from '../../components/common/SampleDataBadge.jsx';
import { USE_MOCK_DATA } from '../../config/featureFlags.js';
import { LogIn, CheckCircle2, ShieldAlert, Sparkles, Key } from 'lucide-react';

export function LoginPage() {
  const { user, isAuthenticated, loading: authLoading, login } = useAuth();
  const toast = useToast();
  const isServerWaking = useServerWaking();
  const navigate = useNavigate();
  const location = useLocation();

  const successMessage = location.state?.successMessage;
  const initialEmail = location.state?.registeredEmail || '';

  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // Reset visibility when navigating away from the page
  useEffect(() => {
    return () => {
      setShowPassword(false);
    };
  }, []);

  // Redirect authenticated users to their role dashboard
  if (!authLoading && isAuthenticated && user) {
    return <Navigate to={getDashboardPathForRole(user.role)} replace />;
  }

  const validate = () => {
    const newErrors = {};
    if (!email.trim()) newErrors.email = 'Email address is required';
    if (!password) newErrors.password = 'Password is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async (e) => {
    e?.preventDefault();
    if (!validate()) {
      setShowPassword(false);
      return;
    }

    setLoading(true);
    try {
      const result = await login({ email, password });
      if (result.success) {
        toast.success(`Welcome back, ${result.data.name}!`);
        const targetPath = getDashboardPathForRole(result.data.role);
        navigate(targetPath, { replace: true });
      } else {
        const errorMsg = result.error || 'Invalid email or password.';
        setErrors({ general: errorMsg });
        toast.error(errorMsg);
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Invalid email or password.';
      setErrors({ general: errorMsg });
      toast.error(errorMsg);
    } finally {
      setLoading(false);
      setShowPassword(false);
    }
  };

  const handleQuickFill = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setErrors({});
  };

  return (
    <div className="bg-white/80 border border-sand-200 rounded-3xl p-6 sm:p-8 shadow-soft-md">
      <div className="text-center mb-6">
        <h2 className="font-serif text-2xl sm:text-3xl font-bold text-charcoal-900">
          Sign In to Samanvitha
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-charcoal-500">
          Access your community donation matches and real-time needs.
        </p>
      </div>

      {/* Success banner if redirected from Register */}
      {successMessage && (
        <div className="mb-6 p-4 rounded-2xl bg-sage-50 border border-sage-300 text-sage-900 flex items-start gap-3 shadow-soft-sm">
          <CheckCircle2 className="w-5 h-5 text-sage-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm">
            <p className="font-semibold">{successMessage}</p>
            <p className="mt-0.5 text-sage-700">Please enter your password to sign in.</p>
          </div>
        </div>
      )}

      {errors.general && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
          {errors.general}
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        <Input
          label="Email Address"
          type="email"
          name="email"
          placeholder="your.email@example.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
          }}
          error={errors.email}
          required
        />

        <div>
          <PasswordInput
            label="Password"
            name="password"
            id="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errors.password) setErrors((prev) => ({ ...prev, password: '' }));
            }}
            showPassword={showPassword}
            onTogglePassword={setShowPassword}
            error={errors.password}
            required
            autoComplete="current-password"
          />
          <div className="flex justify-end mt-1">
            <Link
              to="/forgot-password"
              className="text-xs font-medium text-sage-700 hover:text-sage-800 focus-visible:outline-sage-600 rounded-md py-2 px-1 min-h-[44px] inline-flex items-center underline transition-colors"
            >
              Forgot password?
            </Link>
          </div>
        </div>

        <div className="pt-2">
          <Button
            type="submit"
            variant="primary"
            loading={loading}
            disabled={loading}
            className="w-full justify-center py-3"
            icon={LogIn}
          >
            Sign In
          </Button>
          {loading && isServerWaking && (
            <p className="text-xs text-charcoal-600 bg-sand-100/90 py-2.5 px-3 rounded-xl border border-sand-200 mt-2.5 text-center flex items-center justify-center gap-2 animate-fade-in">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              The server is waking up (free hosting). This can take up to a minute, please wait.
            </p>
          )}
        </div>
      </form>

      {/* Demo Credentials Quick-Fill Strip (Rendered only when USE_MOCK_DATA is true) */}
      {USE_MOCK_DATA && (
        <div className="mt-8 pt-6 border-t border-sand-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-charcoal-700 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-sage-600" />
              Prototype Demo Logins
            </span>
            <SampleDataBadge />
          </div>

          <p className="text-xs text-charcoal-500 mb-3">
            Click any preset below to auto-fill credentials for that role:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleQuickFill('donor@samanvitha.org', 'DemoPassword123!')}
              className="p-2.5 rounded-xl border border-sand-200 bg-sand-50/70 hover:bg-white hover:border-sage-300 text-left transition-all text-xs cursor-pointer focus-visible:outline-sage-600"
            >
              <div className="font-semibold text-charcoal-900 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-sage-500" />
                Donor
              </div>
              <div className="text-[11px] text-charcoal-500 truncate mt-0.5">Sravani V.</div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickFill('institution@samanvitha.org', 'DemoPassword123!')}
              className="p-2.5 rounded-xl border border-sand-200 bg-sand-50/70 hover:bg-white hover:border-terracotta-300 text-left transition-all text-xs cursor-pointer focus-visible:outline-terracotta-500"
            >
              <div className="font-semibold text-charcoal-900 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-terracotta-500" />
                Institution
              </div>
              <div className="text-[11px] text-charcoal-500 truncate mt-0.5">Sample Orphanage 1</div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickFill('admin@samanvitha.org', 'DemoPassword123!')}
              className="p-2.5 rounded-xl border border-sand-200 bg-sand-50/70 hover:bg-white hover:border-charcoal-400 text-left transition-all text-xs cursor-pointer focus-visible:outline-charcoal-600"
            >
              <div className="font-semibold text-charcoal-900 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-charcoal-700" />
                Admin
              </div>
              <div className="text-[11px] text-charcoal-500 truncate mt-0.5">Audit & Review</div>
            </button>
          </div>

          {/* Security Notice */}
          <div className="mt-4 p-3 bg-sand-100 rounded-xl text-[11px] text-charcoal-500 leading-relaxed flex items-start gap-2">
            <Key className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-charcoal-400" />
            <span>
              <strong>Mock Mode Active:</strong> Mock credentials authenticate against local browser state.
            </span>
          </div>
        </div>
      )}

      {/* Link to Register */}
      <div className="mt-6 pt-6 border-t border-sand-200 text-center">
        <p className="text-xs sm:text-sm text-charcoal-600">
          Don't have an account yet?{' '}
          <Link to="/register" className="font-semibold text-sage-700 hover:text-sage-800 underline">
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
