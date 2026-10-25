import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import { useToast } from '../../hooks/useToast.js';
import verificationService from '../../services/verificationService.js';
import { INSTITUTION_TYPES } from '../../config/roles.js';
import Button from '../../components/common/Button.jsx';
import Input from '../../components/common/Input.jsx';
import Select from '../../components/common/Select.jsx';
import LocationPicker from '../../components/common/LocationPicker.jsx';
import SampleDataBadge from '../../components/common/SampleDataBadge.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import { Building, Save } from 'lucide-react';

export function InstitutionProfilePage() {
  const { user } = useAuth();
  const toast = useToast();

  const [formData, setFormData] = useState({
    name: user?.name || 'Sample Orphanage 1',
    institutionType: user?.institutionType || 'orphanage',
    contactPerson: user?.contactPerson || 'S. Kameswara Rao',
    email: user?.email || '',
    phone: user?.phone || '+91 91234 56789',
    address: user?.address || 'Plot 12, Peerzadiguda, Hyderabad',
    latitude: user?.latitude ?? null,
    longitude: user?.longitude ?? null,
    capacity: String(user?.capacity || 48),
    occupancy: String(user?.occupancy || 42),
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const inst = await verificationService.getMyInstitution();
      if (inst) {
        setFormData({
          name: inst.name || user?.name || '',
          institutionType: inst.institutionType || user?.institutionType || 'orphanage',
          contactPerson: inst.contactPerson || user?.name || '',
          email: inst.email || user?.email || '',
          phone: inst.phone || user?.phone || '',
          address: inst.address || user?.address || '',
          latitude: inst.latitude ?? null,
          longitude: inst.longitude ?? null,
          capacity: String(inst.capacity ?? 48),
          occupancy: String(inst.occupancy ?? 42),
        });
      }
    } catch (err) {
      console.error('Could not load institution profile:', err);
      setError(err?.response?.data?.message || err?.message || 'Failed to load institution profile.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...formData,
        capacity: Number(formData.capacity),
        occupancy: Number(formData.occupancy),
      };

      const result = await verificationService.updateMyInstitution(payload);
      if (result.success) {
        toast.success('Institution profile updated successfully.');
      } else {
        toast.error(result.error || 'Failed to update institutional profile.');
      }
    } catch (err) {
      toast.error('Failed to update institutional profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div className="pb-6 border-b border-sand-200">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-terracotta-800 bg-terracotta-50 px-2.5 py-0.5 rounded-md border border-terracotta-200">
            Institutional Care Record
          </span>
          {user?.isSample && <SampleDataBadge />}
        </div>
        <h1 className="font-serif text-3xl font-bold text-charcoal-900">
          Institution Profile
        </h1>
        <p className="text-sm text-charcoal-600 mt-1">
          Manage resident care capacity, verified physical address, and institutional liaison contacts.
        </p>
      </div>

      {error ? (
        <ErrorState
          title="Failed to Load Institution Profile"
          message={error}
          onRetry={loadProfile}
        />
      ) : loading ? (
        <div className="py-20 text-center space-y-3 bg-white rounded-3xl border border-sand-200">
          <div className="w-8 h-8 border-2 border-sage-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-charcoal-500">Loading institution profile...</p>
        </div>
      ) : (
        <form onSubmit={handleSave} className="bg-white rounded-3xl border border-sand-200 p-6 sm:p-8 shadow-soft-sm space-y-5">
          <div className="flex items-center gap-4 pb-4 border-b border-sand-100">
          <div className="w-14 h-14 rounded-2xl bg-terracotta-100 border border-terracotta-200 flex items-center justify-center text-terracotta-800 font-serif text-2xl font-bold">
            {formData.name ? formData.name.charAt(0).toUpperCase() : 'I'}
          </div>
          <div>
            <h3 className="font-semibold text-charcoal-900 text-lg">{formData.name}</h3>
            <p className="text-xs text-charcoal-500">
              <span className="capitalize">{formData.institutionType.replace('_', ' ')}</span> • Verified Care Facility
            </p>
          </div>
        </div>

        <Select
          label="Care Classification"
          name="institutionType"
          value={formData.institutionType}
          onChange={handleChange}
          options={INSTITUTION_TYPES}
        />

        <Input
          label="Official Institution Title"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
        />

        <Input
          label="Administrative Liaison / Contact Person"
          name="contactPerson"
          value={formData.contactPerson}
          onChange={handleChange}
          required
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Contact Email"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            disabled
          />
          <Input
            label="Official Telephone"
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            required
          />
        </div>

        <LocationPicker
          addressLabel="Physical Delivery Address"
          addressName="address"
          address={formData.address}
          onAddressChange={handleChange}
          addressPlaceholder="Plot No, Street, Neighborhood, City"
          addressHelperText="Verified care facility address. Drop a map pin to enable distance-based matching with donors."
          required
          latitude={formData.latitude}
          longitude={formData.longitude}
          onChange={({ latitude, longitude }) =>
            setFormData((prev) => ({ ...prev, latitude, longitude }))
          }
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Total Resident Capacity"
            type="number"
            min="1"
            name="capacity"
            value={formData.capacity}
            onChange={handleChange}
          />
          <Input
            label="Current Occupancy"
            type="number"
            min="0"
            name="occupancy"
            value={formData.occupancy}
            onChange={handleChange}
          />
        </div>

        <div className="pt-4 flex justify-end">
          <Button type="submit" variant="accent" loading={saving} icon={Save} className="w-full sm:w-auto px-6">
            Save Institutional Record
          </Button>
        </div>
      </form>
      )}
    </div>
  );
}

export default InstitutionProfilePage;
