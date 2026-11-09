import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { useToast, useServerWaking } from '../../hooks/useToast.js';
import { ROLES, DONOR_ACCOUNT_TYPES, INSTITUTION_TYPES } from '../../config/roles.js';
import { Button } from '../../components/common/Button.jsx';
import { Input } from '../../components/common/Input.jsx';
import { PasswordInput } from '../../components/PasswordInput.jsx';
import { Select } from '../../components/common/Select.jsx';
import LocationPicker from '../../components/common/LocationPicker.jsx';
import { Heart, Building, ShieldAlert, ArrowRight, Check, X } from 'lucide-react';

export function RegisterPage() {
  const { register } = useAuth();
  const toast = useToast();
  const isServerWaking = useServerWaking();
  const navigate = useNavigate();

  const [role, setRole] = useState(ROLES.DONOR); // Only DONOR or INSTITUTION
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    accountType: 'individual',
    institutionType: 'orphanage',
    address: '',
    latitude: null,
    longitude: null,
    capacity: '30',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // Reset visibility when leaving page
  useEffect(() => {
    return () => {
      setShowPassword(false);
      setShowConfirmPassword(false);
    };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  // Live password requirements
  const hasMinLength = formData.password.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(formData.password);
  const hasNumber = /[0-9]/.test(formData.password);
  const passwordsMatch = formData.confirmPassword.length > 0 && formData.password === formData.confirmPassword;
  const passwordsMismatch = formData.confirmPassword.length > 0 && formData.password !== formData.confirmPassword;

  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = role === ROLES.DONOR ? 'Full name or entity name is required' : 'Institution name is required';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long';
    } else if (!hasLetter || !hasNumber) {
      newErrors.password = 'Password must contain at least one letter and one number';
    }
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    if (!formData.phone.trim()) {
      newErrors.phone = 'Contact phone number is required';
    }
    if (role === ROLES.INSTITUTION && !formData.address.trim()) {
      newErrors.address = 'Physical address is required for institutional verification';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      setShowPassword(false);
      setShowConfirmPassword(false);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        role,
        name: formData.name,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        address: formData.address,
        latitude: formData.latitude ?? null,
        longitude: formData.longitude ?? null,
        ...(role === ROLES.DONOR
          ? { accountType: formData.accountType }
          : {
              institutionType: formData.institutionType,
              capacity: formData.capacity,
            }),
      };

      const result = await register(payload);
      if (result.success) {
        toast.success('Registration successful! Please log in with your credentials.');
        navigate('/login', {
          state: {
            registeredEmail: formData.email,
            successMessage: 'Account created successfully! Please sign in with your credentials.',
          },
        });
      } else {
        toast.error(result.error || 'Failed to complete registration.');
        setErrors((prev) => ({ ...prev, general: result.error }));
      }
    } catch (err) {
      toast.error('An unexpected error occurred during registration.');
    } finally {
      setLoading(false);
      setShowPassword(false);
      setShowConfirmPassword(false);
    }
  };

  return (
    <div className="bg-white/80 border border-sand-200 rounded-3xl p-6 sm:p-8 shadow-soft-md">
      <div className="text-center mb-6">
        <h2 className="font-serif text-2xl sm:text-3xl font-bold text-charcoal-900">
          Create Your Account
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-charcoal-500">
          Join the Samanvitha community to align resources with verified needs.
        </p>
      </div>

      {/* Role Selection Tabs (Only Donor or Institution allowed) */}
      <div className="grid grid-cols-2 gap-2 p-1.5 bg-sand-100 rounded-2xl mb-6">
        <button
          type="button"
          onClick={() => setRole(ROLES.DONOR)}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 min-h-[44px] rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
            role === ROLES.DONOR
              ? 'bg-white text-sage-800 shadow-soft-sm'
              : 'text-charcoal-600 hover:text-charcoal-900'
          }`}
        >
          <Heart className="w-4 h-4 text-sage-600" />
          <span>Donor</span>
        </button>
        <button
          type="button"
          onClick={() => setRole(ROLES.INSTITUTION)}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 min-h-[44px] rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
            role === ROLES.INSTITUTION
              ? 'bg-white text-terracotta-800 shadow-soft-sm'
              : 'text-charcoal-600 hover:text-charcoal-900'
          }`}
        >
          <Building className="w-4 h-4 text-terracotta-600" />
          <span>Institution</span>
        </button>
      </div>

      {errors.general && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
          {errors.general}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Role-specific Subtype Selection */}
        {role === ROLES.DONOR ? (
          <Select
            label="Donor Account Type"
            name="accountType"
            value={formData.accountType}
            onChange={handleChange}
            options={DONOR_ACCOUNT_TYPES}
            helperText="Select whether you are contributing as an individual, household, or registered business."
            required
          />
        ) : (
          <Select
            label="Institution Type"
            name="institutionType"
            value={formData.institutionType}
            onChange={handleChange}
            options={INSTITUTION_TYPES}
            helperText="Samanvitha connects with orphanages and elderly care homes."
            required
          />
        )}

        <Input
          label={role === ROLES.DONOR ? 'Full Name / Entity Name' : 'Institution Name'}
          name="name"
          placeholder={role === ROLES.DONOR ? 'e.g. Sravani V. or Sri Balaji Traders' : 'e.g. Sample Orphanage 3'}
          value={formData.name}
          onChange={handleChange}
          error={errors.name}
          required
        />

        <Input
          label="Email Address"
          type="email"
          name="email"
          placeholder="your.email@example.com"
          value={formData.email}
          onChange={handleChange}
          error={errors.email}
          required
        />

        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <PasswordInput
              label="Password"
              name="password"
              id="register-password"
              placeholder="At least 8 characters"
              value={formData.password}
              onChange={handleChange}
              showPassword={showPassword}
              onTogglePassword={setShowPassword}
              error={errors.password}
              required
              autoComplete="new-password"
            />
            <div>
              <PasswordInput
                label="Confirm Password"
                name="confirmPassword"
                id="register-confirm-password"
                placeholder="Repeat password"
                value={formData.confirmPassword}
                onChange={handleChange}
                showPassword={showConfirmPassword}
                onTogglePassword={setShowConfirmPassword}
                error={errors.confirmPassword}
                required
                autoComplete="new-password"
              />
              {/* Live inline match / mismatch feedback */}
              {passwordsMatch && (
                <p className="mt-1.5 text-xs text-sage-700 font-medium flex items-center gap-1.5" role="status">
                  <Check className="w-3.5 h-3.5 text-sage-600 flex-shrink-0" aria-hidden="true" />
                  <span>Passwords match</span>
                </p>
              )}
              {passwordsMismatch && !errors.confirmPassword && (
                <p className="mt-1.5 text-xs text-red-600 font-medium flex items-center gap-1.5" role="alert">
                  <X className="w-3.5 h-3.5 text-red-500 flex-shrink-0" aria-hidden="true" />
                  <span>Passwords do not match</span>
                </p>
              )}
            </div>
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
            </ul>
          </div>
        </div>

        <Input
          label="Contact Phone"
          type="tel"
          name="phone"
          placeholder="+91 98765 43210"
          value={formData.phone}
          onChange={handleChange}
          error={errors.phone}
          required
        />

        {role === ROLES.INSTITUTION && (
          <>
            <LocationPicker
              addressLabel="Physical Address & District"
              addressName="address"
              addressPlaceholder="Plot No, Street, Neighborhood, City"
              address={formData.address}
              onAddressChange={handleChange}
              addressError={errors.address}
              required
              latitude={formData.latitude}
              longitude={formData.longitude}
              onChange={({ latitude, longitude }) =>
                setFormData((prev) => ({ ...prev, latitude, longitude }))
              }
            />
            <Input
              label="Approximate Resident Capacity"
              type="number"
              name="capacity"
              min="1"
              placeholder="e.g. 40"
              value={formData.capacity}
              onChange={handleChange}
            />
            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-800 leading-relaxed flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
              <span>
                <strong>Prototype Review Note:</strong> New institutions enter a prototype verification review status. This simulates administrative audit compliance.
              </span>
            </div>
          </>
        )}

        {role === ROLES.DONOR && (
          <Input
            label="Pickup Location / Neighborhood"
            name="address"
            placeholder="e.g. Madhapur, Hyderabad"
            value={formData.address}
            onChange={handleChange}
            helperText="Helps match with nearby institutions for easier delivery."
          />
        )}

        <div className="pt-2">
          <Button
            type="submit"
            variant="primary"
            loading={loading}
            disabled={loading}
            className="w-full justify-center py-3"
            icon={ArrowRight}
          >
            Create {role === ROLES.DONOR ? 'Donor' : 'Institution'} Account
          </Button>
          {loading && isServerWaking && (
            <p className="text-xs text-charcoal-600 bg-sand-100/90 py-2.5 px-3 rounded-xl border border-sand-200 mt-2.5 text-center flex items-center justify-center gap-2 animate-fade-in">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              The server is waking up (free hosting). This can take up to a minute, please wait.
            </p>
          )}
        </div>
      </form>

      {/* Switch to Login */}
      <div className="mt-6 pt-6 border-t border-sand-200 text-center">
        <p className="text-xs sm:text-sm text-charcoal-600">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-sage-700 hover:text-sage-800 underline">
            Log in here
          </Link>
        </p>
      </div>

      {/* Admin registration restriction note */}
      <div className="mt-4 text-center">
        <p className="text-[11px] text-charcoal-400">
          * Administrator privileges cannot be chosen during registration. A sample admin login is available on the login screen.
        </p>
      </div>
    </div>
  );
}

export default RegisterPage;
