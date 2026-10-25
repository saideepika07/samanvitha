import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { useToast } from '../../hooks/useToast.js';
import needService from '../../services/needService.js';
import { CATEGORIES } from '../../config/categories.js';
import { calculateRemainingNeed } from '../../utils/matching.js';
import Button from '../../components/common/Button.jsx';
import Input from '../../components/common/Input.jsx';
import Select from '../../components/common/Select.jsx';
import SampleDataBadge from '../../components/common/SampleDataBadge.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import {
  ClipboardPlus,
  Save,
  ArrowLeft,
  AlertTriangle,
  Calculator,
  ShieldAlert,
} from 'lucide-react';

export function CreateEditNeedPage() {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    category: CATEGORIES[0].label,
    itemType: '',
    requiredQuantity: '50',
    usableStock: '10',
    reservedQuantity: '0',
    unit: 'sets',
    urgency: 'Medium',
    deadline: '',
    acceptableCondition: 'New or gently used in clean, usable condition',
    notes: '',
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(isEditing);
  const [error, setError] = useState(null);

  // Set default deadline 21 days in future for new needs
  useEffect(() => {
    if (!isEditing) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 21);
      setFormData((prev) => ({ ...prev, deadline: futureDate.toISOString().split('T')[0] }));
    }
  }, [isEditing]);

  // Load existing need if editing
  const fetchNeed = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const need = await needService.getNeedById(id);
      if (need) {
        setFormData({
          category: need.category,
          itemType: need.itemType,
          requiredQuantity: String(need.requiredQuantity),
          usableStock: String(need.usableStock || 0),
          reservedQuantity: String(need.reservedQuantity || 0),
          unit: need.unit,
          urgency: need.urgency,
          deadline: need.deadline || '',
          acceptableCondition: need.acceptableCondition || '',
          notes: need.notes || '',
        });
      } else {
        setError('Need not found.');
      }
    } catch (err) {
      console.error('Failed to load need details:', err);
      setError(err?.response?.data?.message || err?.message || 'Failed to load need details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNeed();
  }, [id]);

  // Adjust unit choices when category changes
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

  // Live calculation of remaining need
  const liveRemaining = calculateRemainingNeed(
    formData.requiredQuantity,
    formData.usableStock,
    formData.reservedQuantity
  );

  const validate = () => {
    const newErrors = {};

    if (!formData.category) newErrors.category = 'Category is required';
    if (!formData.itemType.trim()) newErrors.itemType = 'Item name / title is required';

    const req = Number(formData.requiredQuantity);
    if (!formData.requiredQuantity || isNaN(req) || req <= 0) {
      newErrors.requiredQuantity = 'Required quantity must be a positive number greater than 0';
    }

    const stock = Number(formData.usableStock);
    if (formData.usableStock === '' || isNaN(stock) || stock < 0) {
      newErrors.usableStock = 'Usable stock cannot be negative';
    }

    if (!formData.deadline) {
      newErrors.deadline = 'Target deadline date is required';
    } else {
      const selected = new Date(formData.deadline);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selected < today) {
        newErrors.deadline = 'Deadline cannot be set in the past';
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
        institutionId: user?.institutionId || 'inst_01',
        institutionName: user?.name || 'Sample Orphanage 1',
        address: user?.address || 'Peerzadiguda, Hyderabad',
        category: formData.category,
        itemType: formData.itemType.trim(),
        requiredQuantity: Number(formData.requiredQuantity),
        usableStock: Number(formData.usableStock),
        unit: formData.unit,
        urgency: formData.urgency,
        deadline: formData.deadline,
        acceptableCondition: formData.acceptableCondition,
        notes: formData.notes.trim(),
      };

      if (isEditing) {
        const result = await needService.updateNeed(id, payload);
        if (result.success) {
          toast.success('Need updated successfully.');
          navigate('/institution/my-needs');
        } else {
          toast.error(result.error || 'Failed to update need.');
        }
      } else {
        const result = await needService.createNeed(payload);
        if (result.success) {
          toast.success('Need published successfully! Available on Public Needs Board.');
          navigate('/institution/my-needs');
        } else {
          toast.error(result.error || 'Failed to create need.');
        }
      }
    } catch (err) {
      toast.error('An unexpected error occurred while saving.');
    } finally {
      setSubmitting(false);
    }
  };

  const currentCategoryObj = CATEGORIES.find((c) => c.label === formData.category) || CATEGORIES[0];

  if (loading) {
    return (
      <div className="py-20 text-center space-y-3">
        <div className="w-8 h-8 border-2 border-sage-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-charcoal-500">Loading need details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto space-y-8">
        <Link
          to="/institution/my-needs"
          className="inline-flex items-center gap-2 text-xs font-semibold text-charcoal-600 hover:text-charcoal-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Needs Directory</span>
        </Link>
        <ErrorState
          title="Failed to Load Need Details"
          message={error}
          onRetry={fetchNeed}
        />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="pb-6 border-b border-sand-200">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-terracotta-800 bg-terracotta-50 px-2.5 py-0.5 rounded-md border border-terracotta-200">
            Institution Need Request
          </span>
        </div>
        <h1 className="font-serif text-3xl font-bold text-charcoal-900">
          {isEditing ? 'Edit Existing Need' : 'Publish Institutional Need'}
        </h1>
        <p className="text-sm text-charcoal-600 mt-1">
          Specify exact required counts and current usable stock. The network accurately matches only remaining unfulfilled deficits.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-sand-200 p-6 sm:p-8 shadow-soft-sm space-y-6">
        {/* Category Selection (Strict v1) */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-charcoal-700">
            Category <span className="text-terracotta-500">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {CATEGORIES.map((cat) => (
              <button
                type="button"
                key={cat.id}
                onClick={() => setFormData((prev) => ({ ...prev, category: cat.label }))}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                  formData.category === cat.label
                    ? 'border-terracotta-500 bg-terracotta-50 text-terracotta-900 shadow-soft-sm ring-1 ring-terracotta-500'
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

        {/* Item Title */}
        <Input
          label="Item Specifics / Required Supply"
          name="itemType"
          placeholder="e.g. Sona Masoori Rice (25kg bags) or Cotton Sarees & Dhotis"
          value={formData.itemType}
          onChange={handleChange}
          error={errors.itemType}
          helperText="State specific brand preferences, sizes, or grades required."
          required
        />

        {/* Quantities & Unit */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="Total Required"
            type="number"
            min="1"
            name="requiredQuantity"
            value={formData.requiredQuantity}
            onChange={handleChange}
            error={errors.requiredQuantity}
            required
          />

          <Input
            label="Current Usable Stock"
            type="number"
            min="0"
            name="usableStock"
            value={formData.usableStock}
            onChange={handleChange}
            error={errors.usableStock}
            helperText="Inventory already on hand."
            required
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-charcoal-700">
              Unit <span className="text-terracotta-500">*</span>
            </label>
            <select
              name="unit"
              value={formData.unit}
              onChange={handleChange}
              className="w-full min-h-[44px] rounded-xl border border-sand-300 bg-sand-50/50 px-3.5 py-2.5 text-sm text-charcoal-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sage-100 focus:border-sage-500"
            >
              {currentCategoryObj.units.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
              <option value="custom">Other unit</option>
            </select>
          </div>
        </div>

        {/* Live Remaining Need Formula Visualizer */}
        <div className="p-4 bg-sand-50 rounded-2xl border border-sand-200 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-charcoal-700 uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <Calculator className="w-4 h-4 text-sage-600" />
              Computed Remaining Need:
            </span>
            <span className="font-serif text-lg font-bold text-charcoal-900">
              {liveRemaining} {formData.unit}
            </span>
          </div>

          <p className="text-[11px] text-charcoal-500 font-mono">
            Remaining = max(0, {Number(formData.requiredQuantity) || 0} required −{' '}
            {Number(formData.usableStock) || 0} usable stock −{' '}
            {Number(formData.reservedQuantity) || 0} reserved)
          </p>
        </div>

        {/* Urgency & Deadline */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-charcoal-700">
              Urgency Level <span className="text-terracotta-500">*</span>
            </label>
            <select
              name="urgency"
              value={formData.urgency}
              onChange={handleChange}
              className="w-full min-h-[44px] rounded-xl border border-sand-300 bg-sand-50/50 px-3.5 py-2.5 text-sm text-charcoal-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sage-100 focus:border-sage-500"
            >
              <option value="Critical">Critical (Immediate stock deficit within 3-7 days)</option>
              <option value="High">High (Needed within 1-2 weeks)</option>
              <option value="Medium">Medium (Regular monthly requirement)</option>
              <option value="Low">Low (Longer-term replenishment)</option>
            </select>
          </div>

          <Input
            label="Needed By (Deadline)"
            type="date"
            name="deadline"
            value={formData.deadline}
            onChange={handleChange}
            error={errors.deadline}
            helperText="Date by which resources must arrive."
            required
          />
        </div>

        {/* Acceptable Condition */}
        <Input
          label="Acceptable Item Condition"
          name="acceptableCondition"
          placeholder="e.g. Clean gently used or new, sealed bags for dry grains"
          value={formData.acceptableCondition}
          onChange={handleChange}
          helperText="Informs donors of packaging or condition standards."
        />

        {/* Notes */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-charcoal-700">
            Contextual Need Notes
          </label>
          <textarea
            name="notes"
            rows="3"
            placeholder="Explain why this need has arisen (e.g. school term start, sudden seasonal weather shift)..."
            value={formData.notes}
            onChange={handleChange}
            className="w-full rounded-xl border border-sand-300 bg-sand-50/50 p-3.5 text-sm text-charcoal-900 placeholder:text-charcoal-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sage-100 focus:border-sage-500"
          />
        </div>

        {/* Submit Actions */}
        <div className="pt-4 border-t border-sand-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link to="/institution/my-needs" className="text-xs text-charcoal-500 hover:text-charcoal-800 min-h-[44px] inline-flex items-center">
            Cancel and return
          </Link>

          <Button
            type="submit"
            variant="accent"
            size="lg"
            loading={submitting}
            icon={isEditing ? Save : ClipboardPlus}
            className="w-full sm:w-auto px-8"
          >
            {isEditing ? 'Save Changes' : 'Publish Need to Directory'}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default CreateEditNeedPage;
