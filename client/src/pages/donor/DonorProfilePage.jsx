import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import { useToast } from '../../hooks/useToast.js';
import authService from '../../services/authService.js';
import { DONOR_ACCOUNT_TYPES } from '../../config/roles.js';
import Button from '../../components/common/Button.jsx';
import Input from '../../components/common/Input.jsx';
import Select from '../../components/common/Select.jsx';
import SampleDataBadge from '../../components/common/SampleDataBadge.jsx';
import { User, Save, MapPin, Mail, Phone, Building } from 'lucide-react';

export function DonorProfilePage() {
  const { user, updateUser } = useAuth();
  const toast = useToast();

  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    accountType: user?.accountType || 'individual',
    location: user?.location || user?.address || 'Madhapur, Hyderabad',
  });

  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updatedUser = await authService.updateCurrentUser(formData);
      if (updateUser) {
        updateUser(updatedUser);
      }
      toast.success('Donor profile updated successfully.');
    } catch (err) {
      console.error('Failed to update profile:', err);
      toast.error(err?.response?.data?.message || err?.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div className="pb-6 border-b border-sand-200">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-sage-800 bg-sage-50 px-2.5 py-0.5 rounded-md border border-sage-200">
            Account Management
          </span>
          {user?.isSample && <SampleDataBadge />}
        </div>
        <h1 className="font-serif text-3xl font-bold text-charcoal-900">
          Donor Profile
        </h1>
        <p className="text-sm text-charcoal-600 mt-1">
          Manage your account type, primary contact number, and default pickup neighborhood.
        </p>
      </div>

      <form onSubmit={handleSave} className="bg-white rounded-3xl border border-sand-200 p-6 sm:p-8 shadow-soft-sm space-y-5">
        <div className="flex items-center gap-4 pb-4 border-b border-sand-100">
          <div className="w-14 h-14 rounded-2xl bg-sage-100 border border-sage-200 flex items-center justify-center text-sage-800 font-serif text-2xl font-bold">
            {formData.name ? formData.name.charAt(0).toUpperCase() : 'D'}
          </div>
          <div>
            <h3 className="font-semibold text-charcoal-900 text-lg">{formData.name}</h3>
            <p className="text-xs text-charcoal-500">
              Donor Role • <span className="capitalize">{formData.accountType}</span> Account
            </p>
          </div>
        </div>

        <Select
          label="Account Classification"
          name="accountType"
          value={formData.accountType}
          onChange={handleChange}
          options={DONOR_ACCOUNT_TYPES}
          helperText="Designates whether you donate as an individual, family household, or business retailer."
        />

        <Input
          label="Full Name or Business Title"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
        />

        <Input
          label="Email Address"
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          disabled
          helperText="Email is used for session login and cannot be altered in prototype mode."
        />

        <Input
          label="Contact Phone"
          type="tel"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          placeholder="+91 98765 43210"
          required
        />

        <Input
          label="Primary Pickup Neighborhood / City"
          name="location"
          value={formData.location}
          onChange={handleChange}
          placeholder="e.g. Madhapur, Hyderabad"
          helperText="Used to compute delivery proximity when ranking matches."
          required
        />

        <div className="pt-4 flex justify-end">
          <Button type="submit" variant="primary" loading={saving} icon={Save} className="px-6">
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}

export default DonorProfilePage;
