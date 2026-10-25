import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { useToast } from '../../hooks/useToast.js';
import donationService from '../../services/donationService.js';
import { CATEGORIES } from '../../config/categories.js';
import { Button } from '../../components/common/Button.jsx';
import { Input } from '../../components/common/Input.jsx';
import { Select } from '../../components/common/Select.jsx';
import { ImageUpload } from '../../components/common/ImageUpload.jsx';
import LocationPicker from '../../components/common/LocationPicker.jsx';
import SampleDataBadge from '../../components/common/SampleDataBadge.jsx';
import { PackagePlus, Sparkles, ArrowRight, ShieldCheck, Heart } from 'lucide-react';

export function CreateDonationPage() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Prefill if directed from a public need
  const prefillCategory = searchParams.get('category') || CATEGORIES[0].label;
  const prefillItemType = searchParams.get('itemType') || '';
  const prefillNeedId = searchParams.get('needId') || null;

  const [formData, setFormData] = useState({
    category: prefillCategory,
    itemType: prefillItemType,
    quantity: '10',
    unit: 'items',
    condition: 'Gently Used',
    location: user?.location || user?.address || 'Madhapur, Hyderabad',
    latitude: user?.latitude ?? null,
    longitude: user?.longitude ?? null,
    deadline: '',
    image: null,
    notes: '',
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Set default deadline to 14 days from today
  useEffect(() => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 14);
    const dateStr = futureDate.toISOString().split('T')[0];
    setFormData((prev) => ({ ...prev, deadline: dateStr }));
  }, []);

  // Sync unit choices when category changes
  useEffect(() => {
    const matchedCategory = CATEGORIES.find((c) => c.label === formData.category);
    if (matchedCategory && matchedCategory.units.length > 0) {
      if (!matchedCategory.units.includes(formData.unit)) {
        setFormData((prev) => ({ ...prev, unit: matchedCategory.units[0] }));
      }
    }
  }, [formData.category]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.category) {
      newErrors.category = 'Please select a permitted category';
    }
    if (!formData.itemType.trim()) {
      newErrors.itemType = 'Item description/name is required';
    }
    const qty = Number(formData.quantity);
    if (!formData.quantity || isNaN(qty) || qty <= 0) {
      newErrors.quantity = 'Quantity must be a positive number greater than 0';
    }
    if (!formData.unit.trim()) {
      newErrors.unit = 'Unit is required (e.g. items, kg, sets)';
    }
    if (!formData.location.trim()) {
      newErrors.location = 'Pickup location / address is required for delivery coordination';
    }
    if (!formData.deadline) {
      newErrors.deadline = 'Deadline is required';
    } else {
      const selected = new Date(formData.deadline);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selected < today) {
        newErrors.deadline = 'Deadline cannot be in the past';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const payload = {
        donorId: user?.id,
        donorName: user?.name,
        category: formData.category,
        itemType: formData.itemType.trim(),
        quantity: Number(formData.quantity),
        unit: formData.unit,
        condition: formData.condition,
        location: formData.location.trim(),
        latitude: formData.latitude ?? null,
        longitude: formData.longitude ?? null,
        deadline: formData.deadline,
        image: formData.image,
        notes: formData.notes.trim(),
        matchedNeedId: prefillNeedId,
      };

      const result = await donationService.createDonation(payload);
      if (result.success) {
        toast.success('Donation listed successfully! Algorithmic matches are now calculated.');
        navigate('/donor/my-donations');
      } else {
        toast.error(result.error || 'Failed to list donation.');
      }
    } catch (err) {
      toast.error('An unexpected error occurred while saving the donation.');
    } finally {
      setSubmitting(false);
    }
  };

  const currentCategoryObj = CATEGORIES.find((c) => c.label === formData.category) || CATEGORIES[0];

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="pb-6 border-b border-sand-200">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-sage-800 bg-sage-50 px-2.5 py-0.5 rounded-md border border-sage-200">
            Donor Contribution Form
          </span>
        </div>
        <h1 className="font-serif text-3xl font-bold text-charcoal-900">
          List a New Donation
        </h1>
        <p className="text-sm text-charcoal-600 mt-1">
          Specify non-perishable resources. Our algorithmic engine will immediately match them to verified orphanages and old-age homes with unfulfilled deficits.
        </p>
      </div>

      {prefillNeedId && (
        <div className="p-4 rounded-2xl bg-sage-50 border border-sage-300 text-sage-900 flex items-start gap-3 shadow-soft-sm">
          <Heart className="w-5 h-5 text-sage-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm">
            <p className="font-semibold">Fulfilling Selected Community Need</p>
            <p className="text-sage-700 mt-0.5">
              Prefilled with: <strong>{prefillItemType}</strong> ({prefillCategory}).
            </p>
          </div>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-sand-200 p-6 sm:p-8 shadow-soft-sm space-y-6">
        {/* Category Selector (Strictly v1 allowed categories) */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-charcoal-700 flex items-center justify-between">
            <span>
              Category <span className="text-terracotta-500">*</span>
            </span>
            <span className="text-[11px] font-normal text-charcoal-400">Strictly non-perishable in v1</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {CATEGORIES.map((cat) => (
              <button
                type="button"
                key={cat.id}
                onClick={() => setFormData((prev) => ({ ...prev, category: cat.label }))}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                  formData.category === cat.label
                    ? 'border-sage-600 bg-sage-50 text-sage-900 shadow-soft-sm ring-1 ring-sage-600'
                    : 'border-sand-200 hover:border-sand-300 bg-sand-50/50 text-charcoal-700'
                }`}
              >
                <p className="text-xs font-bold">{cat.label}</p>
                <p className="text-[11px] text-charcoal-500 mt-1 leading-snug line-clamp-2">
                  {cat.description}
                </p>
              </button>
            ))}
          </div>
          {errors.category && <p className="text-xs text-red-600 mt-1">{errors.category}</p>}
        </div>

        {/* Item Name / Specifics */}
        <Input
          label="Item Specifics / Title"
          name="itemType"
          placeholder="e.g. Cotton Sarees (folded, clean) or Ruled 192pg Notebooks"
          value={formData.itemType}
          onChange={handleChange}
          error={errors.itemType}
          helperText="Specify the type, grade, or age group for clarity."
          required
        />

        {/* Quantity & Unit */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Quantity Available"
            type="number"
            min="1"
            name="quantity"
            placeholder="e.g. 25"
            value={formData.quantity}
            onChange={handleChange}
            error={errors.quantity}
            required
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-charcoal-700">
              Unit of Measurement <span className="text-terracotta-500">*</span>
            </label>
            <div className="flex gap-2">
              <select
                name="unit"
                value={formData.unit}
                onChange={handleChange}
                className="w-full rounded-xl border border-sand-300 bg-sand-50/50 px-3.5 py-2.5 text-sm text-charcoal-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sage-100 focus:border-sage-500"
              >
                {currentCategoryObj.units.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
                <option value="custom">Other unit</option>
              </select>
            </div>
            {errors.unit && <p className="text-xs text-red-600">{errors.unit}</p>}
          </div>
        </div>

        {/* Condition Radios */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-charcoal-700">
            Item Condition <span className="text-terracotta-500">*</span>
          </label>
          <div className="grid grid-cols-3 gap-3">
            {['New', 'Like New', 'Gently Used'].map((c) => (
              <label
                key={c}
                className={`flex items-center justify-center p-3 min-h-[44px] rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                  formData.condition === c
                    ? 'border-sage-600 bg-sage-50 text-sage-900 shadow-soft-sm'
                    : 'border-sand-200 bg-sand-50/50 text-charcoal-700 hover:bg-sand-100'
                }`}
              >
                <input
                  type="radio"
                  name="condition"
                  value={c}
                  checked={formData.condition === c}
                  onChange={handleChange}
                  className="sr-only"
                />
                <span>{c}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Availability Deadline */}
        <div>
          <Input
            label="Available Until (Deadline)"
            type="date"
            name="deadline"
            value={formData.deadline}
            onChange={handleChange}
            error={errors.deadline}
            helperText="Date after which you cannot hold or dispatch the items."
            required
          />
        </div>

        {/* Pickup Location & Interactive Map Pin */}
        <LocationPicker
          addressLabel="Pickup Location / Area"
          addressName="location"
          address={formData.location}
          onAddressChange={handleChange}
          addressPlaceholder="e.g. Madhapur, Hyderabad"
          addressError={errors.location}
          addressHelperText="Used to compute delivery feasibility score (15% weight). Coordinates are optional but encouraged."
          required
          latitude={formData.latitude}
          longitude={formData.longitude}
          onChange={({ latitude, longitude }) =>
            setFormData((prev) => ({ ...prev, latitude, longitude }))
          }
        />

        {/* Image Upload with Preview and Validation */}
        <ImageUpload
          label="Item Photograph (Preview)"
          value={formData.image}
          onChange={(imgData) => setFormData((prev) => ({ ...prev, image: imgData }))}
          helperText="Upload a photo of the packaged items to assist institutions in verifying condition."
        />

        {/* Notes / Special Instructions */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-charcoal-700">
            Additional Handling Notes
          </label>
          <textarea
            name="notes"
            rows="3"
            placeholder="Any packaging details, preferred pickup timings, or special handling notes..."
            value={formData.notes}
            onChange={handleChange}
            className="w-full rounded-xl border border-sand-300 bg-sand-50/50 p-3.5 text-sm text-charcoal-900 placeholder:text-charcoal-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sage-100 focus:border-sage-500"
          />
        </div>

        {/* Actions */}
        <div className="pt-4 border-t border-sand-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link to="/donor/my-donations" className="text-xs text-charcoal-500 hover:text-charcoal-800">
            Cancel and return
          </Link>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={submitting}
            icon={PackagePlus}
            className="w-full sm:w-auto px-8"
          >
            Publish Donation & Find Matches
          </Button>
        </div>
      </form>
    </div>
  );
}

export default CreateDonationPage;
