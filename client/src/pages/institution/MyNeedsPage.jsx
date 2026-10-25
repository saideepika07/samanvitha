import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { useToast } from '../../hooks/useToast.js';
import needService from '../../services/needService.js';
import { CATEGORIES } from '../../config/categories.js';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import SampleDataBadge from '../../components/common/SampleDataBadge.jsx';
import Button from '../../components/common/Button.jsx';
import Input from '../../components/common/Input.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import {
  PlusCircle,
  Search,
  Filter,
  Edit3,
  ClipboardList,
  CheckCircle2,
  Calendar,
  Layers,
  X,
} from 'lucide-react';

export function MyNeedsPage() {
  const { user } = useAuth();
  const toast = useToast();

  const [needs, setNeeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Stock Adjustment Modal
  const [stockModalItem, setStockModalItem] = useState(null);
  const [newStock, setNewStock] = useState('0');
  const [updatingStock, setUpdatingStock] = useState(false);

  const loadNeeds = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await needService.getInstitutionNeeds(user?.institutionId || user?.id || 'inst_01');
      setNeeds(data);
    } catch (err) {
      console.error('Failed to load institution needs:', err);
      setError(err?.response?.data?.message || err?.message || 'Failed to load institution needs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNeeds();
  }, [user]);

  const handleUpdateStock = async (e) => {
    e.preventDefault();
    if (!stockModalItem) return;

    setUpdatingStock(true);
    try {
      const result = await needService.updateNeed(stockModalItem.id, {
        usableStock: Number(newStock),
      });

      if (result.success) {
        toast.success(`Usable stock for "${stockModalItem.itemType}" updated.`);
        setStockModalItem(null);
        loadNeeds();
      } else {
        toast.error(result.error || 'Failed to update usable stock.');
      }
    } catch (err) {
      toast.error('An unexpected error occurred.');
    } finally {
      setUpdatingStock(false);
    }
  };

  const filteredNeeds = needs.filter((n) => {
    const matchesSearch =
      n.itemType.toLowerCase().includes(search.toLowerCase()) ||
      n.category.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || n.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-sand-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-terracotta-800 bg-terracotta-50 px-2.5 py-0.5 rounded-md border border-terracotta-200">
              Inventory & Deficit Needs
            </span>
          </div>
          <h1 className="font-serif text-3xl font-bold text-charcoal-900">
            Institutional Needs Directory
          </h1>
          <p className="text-sm text-charcoal-600 mt-1">
            Active supply requirements. Remaining demand updates automatically as stock is consumed or donations arrive.
          </p>
        </div>

        <Link to="/institution/needs/new">
          <Button variant="accent" icon={PlusCircle} className="shadow-soft-sm">
            Publish New Need
          </Button>
        </Link>
      </div>

      {/* Filter and Search */}
      <div className="p-4 sm:p-5 bg-white rounded-3xl border border-sand-200 shadow-soft-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <Input
              placeholder="Search active needs by item specifics..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={Search}
            />
          </div>

          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full rounded-xl border border-sand-300 bg-sand-50/50 px-3.5 py-2.5 text-sm text-charcoal-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sage-100 focus:border-sage-500"
              aria-label="Filter by category"
            >
              <option value="all">All Permitted Categories</option>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.label}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-charcoal-500 pt-2 border-t border-sand-200/80">
          <span>
            Showing <strong>{filteredNeeds.length}</strong> of {needs.length} institutional needs
          </span>
          <span className="font-mono text-[11px] bg-sand-100 px-2 py-0.5 rounded">
            Formula: Remaining = max(0, Required − Stock − Reserved)
          </span>
        </div>
      </div>

      {/* Needs Table */}
      {error ? (
        <ErrorState
          title="Failed to Load Needs"
          message={error}
          onRetry={loadNeeds}
        />
      ) : loading ? (
        <div className="py-20 text-center space-y-3 bg-white rounded-3xl border border-sand-200">
          <div className="w-8 h-8 border-2 border-sage-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-charcoal-500">Loading institutional needs...</p>
        </div>
      ) : filteredNeeds.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-3xl border border-sand-200 p-8 space-y-4 shadow-soft-sm">
          <ClipboardList className="w-10 h-10 text-charcoal-400 mx-auto" />
          <h3 className="font-serif text-xl font-bold text-charcoal-900">
            No needs listed currently
          </h3>
          <p className="text-xs text-charcoal-500 max-w-sm mx-auto">
            State unfulfilled resource gaps to allow community donors to coordinate matching deliveries.
          </p>
          <Link to="/institution/needs/new">
            <Button variant="accent" size="sm" icon={PlusCircle}>
              Post First Need
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Mobile Cards (Visible below md: 360px, 390px, 768px portrait) */}
          <div className="md:hidden space-y-3">
            {filteredNeeds.map((need) => {
              const isFulfilled = need.remainingNeed === 0;
              return (
                <div
                  key={need.id}
                  className="bg-white rounded-2xl border border-sand-200 p-4 shadow-soft-sm space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="font-semibold text-charcoal-900 text-sm">{need.itemType}</h4>
                        {need.isSample && <SampleDataBadge />}
                      </div>
                      <span className="text-xs text-charcoal-500 block mt-0.5">{need.category}</span>
                    </div>
                    <StatusBadge status={need.urgency} type="urgency" />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-sand-100">
                    <div>
                      <span className="text-charcoal-400 block text-[11px]">Required</span>
                      <strong className="text-charcoal-900 font-mono">{need.requiredQuantity} {need.unit}</strong>
                    </div>
                    <div>
                      <span className="text-charcoal-400 block text-[11px]">Usable Stock</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="font-mono text-charcoal-800 font-medium">{need.usableStock || 0} {need.unit}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setStockModalItem(need);
                            setNewStock(String(need.usableStock || 0));
                          }}
                          className="p-1.5 text-charcoal-400 hover:text-charcoal-800 hover:bg-sand-100 rounded-lg min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
                          title="Adjust stock"
                          aria-label={`Adjust stock for ${need.itemType}`}
                        >
                          <Layers className="w-4 h-4 text-sage-600" />
                        </button>
                      </div>
                    </div>
                    <div>
                      <span className="text-charcoal-400 block text-[11px]">Reserved In-Transit</span>
                      <span className="text-terracotta-700 font-mono font-medium">{need.reservedQuantity || 0} {need.unit}</span>
                    </div>
                    <div>
                      <span className="text-charcoal-400 block text-[11px]">Remaining Deficit</span>
                      {isFulfilled ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-sage-800 bg-sage-50 px-2 py-0.5 rounded-md border border-sage-200 mt-0.5">
                          <CheckCircle2 className="w-3 h-3 text-sage-600" /> Fulfilled
                        </span>
                      ) : (
                        <span className="font-mono font-bold text-charcoal-900 text-xs">
                          {need.remainingNeed} {need.unit}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-sand-100 flex items-center justify-between gap-2 flex-wrap text-xs">
                    <span className="text-charcoal-500">
                      Deadline: <strong className="text-charcoal-700">{need.deadline || 'Flexible'}</strong>
                    </span>

                    <Link to={`/institution/needs/${need.id}/edit`}>
                      <Button variant="secondary" size="sm" icon={Edit3} className="text-xs min-h-[40px]">
                        Edit Need
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table (hidden md:block) */}
          <div className="hidden md:block bg-white rounded-3xl border border-sand-200 shadow-soft-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-sm text-charcoal-800">
                <thead className="bg-sand-50/80 text-[11px] font-semibold text-charcoal-500 uppercase tracking-wider border-b border-sand-200">
                  <tr>
                    <th scope="col" className="px-6 py-4">Required Item & Category</th>
                    <th scope="col" className="px-6 py-4">Urgency</th>
                    <th scope="col" className="px-6 py-4">Total Required</th>
                    <th scope="col" className="px-6 py-4">Usable Stock</th>
                    <th scope="col" className="px-6 py-4">Reserved</th>
                    <th scope="col" className="px-6 py-4">Remaining Deficit</th>
                    <th scope="col" className="px-6 py-4">Deadline</th>
                    <th scope="col" className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sand-200/70">
                  {filteredNeeds.map((need) => {
                    const isFulfilled = need.remainingNeed === 0;

                    return (
                      <tr key={need.id} className="hover:bg-sand-50/60 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-charcoal-900">{need.itemType}</span>
                            {need.isSample && <SampleDataBadge />}
                          </div>
                          <span className="text-xs text-charcoal-500 block mt-0.5">{need.category}</span>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <StatusBadge status={need.urgency} type="urgency" />
                      </td>

                      <td className="px-6 py-4 font-mono font-medium">
                        {need.requiredQuantity} {need.unit}
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono">{need.usableStock || 0} {need.unit}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setStockModalItem(need);
                              setNewStock(String(need.usableStock || 0));
                            }}
                            className="p-1 text-charcoal-400 hover:text-charcoal-800 hover:bg-sand-100 rounded cursor-pointer"
                            title="Adjust current usable stock"
                            aria-label={`Adjust stock for ${need.itemType}`}
                          >
                            <Layers className="w-3.5 h-3.5 text-sage-600" />
                          </button>
                        </div>
                      </td>

                      <td className="px-6 py-4 font-mono text-terracotta-700">
                        {need.reservedQuantity || 0} {need.unit}
                      </td>

                      <td className="px-6 py-4">
                        {isFulfilled ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-sage-800 bg-sage-50 px-2.5 py-0.5 rounded-full border border-sage-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-sage-600" />
                            Fulfilled
                          </span>
                        ) : (
                          <span className="font-mono font-bold text-charcoal-900 text-sm">
                            {need.remainingNeed} {need.unit}
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-xs text-charcoal-500">
                        {need.deadline || 'Flexible'}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <Link to={`/institution/needs/${need.id}/edit`}>
                          <Button variant="secondary" size="sm" icon={Edit3} className="text-xs py-1">
                            Edit
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Adjust Usable Stock Dialog */}
      {stockModalItem && (
        <div
          className="fixed inset-0 z-50 bg-charcoal-900/40 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-3xl max-w-md w-full max-h-[calc(100vh-2rem)] overflow-y-auto my-auto p-5 sm:p-8 shadow-soft-lg space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-semibold text-charcoal-500 uppercase tracking-wider">
                  Update Inventory Stock
                </span>
                <h3 className="font-serif text-xl font-bold text-charcoal-900 mt-0.5">
                  {stockModalItem.itemType}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setStockModalItem(null)}
                className="p-2 text-charcoal-400 hover:text-charcoal-800 rounded-full min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-charcoal-600">
              Enter the usable quantity currently sitting on home shelves. Increasing stock decreases remaining need immediately.
            </p>

            <form onSubmit={handleUpdateStock} className="space-y-4">
              <Input
                label={`Usable Stock (${stockModalItem.unit})`}
                type="number"
                min="0"
                value={newStock}
                onChange={(e) => setNewStock(e.target.value)}
                required
              />

              <div className="pt-2 flex items-center justify-end gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStockModalItem(null)}
                  disabled={updatingStock}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  loading={updatingStock}
                >
                  Update Stock
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default MyNeedsPage;
