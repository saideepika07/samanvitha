import React, { useState, useEffect } from 'react';
import api from '../../services/api.js';
import storage from '../../services/storageService.js';
import { USE_MOCK_DATA } from '../../config/featureFlags.js';
import { useToast } from '../../hooks/useToast.js';
import SampleDataBadge from '../../components/common/SampleDataBadge.jsx';
import Button from '../../components/common/Button.jsx';
import Input from '../../components/common/Input.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import { AlertOctagon, CheckCircle2, Clock, Search, X } from 'lucide-react';

export function DisputesListPage() {
  const toast = useToast();
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  // Resolve modal state
  const [resolveItem, setResolveItem] = useState(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [resolving, setResolving] = useState(false);

  const loadDisputes = async () => {
    try {
      setLoading(true);
      setError(null);
      if (USE_MOCK_DATA) {
        const data = storage.get(storage.KEYS.DISPUTES) || [];
        setDisputes(data);
        return;
      }
      const res = await api.get('/disputes');
      if (res.data?.success && Array.isArray(res.data.data)) {
        setDisputes(res.data.data);
      } else {
        throw new Error(res.data?.message || 'Failed to fetch disputes');
      }
    } catch (err) {
      console.error('Failed to load disputes:', err);
      setError(err?.response?.data?.message || err?.message || 'Failed to load disputes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDisputes();
  }, []);

  const handleResolve = async (e) => {
    e.preventDefault();
    if (!resolveItem) return;

    setResolving(true);
    const note = resolutionNote.trim() || 'Issue reconciled by administrative coordination.';
    try {
      if (USE_MOCK_DATA) {
        const allDisputes = storage.get(storage.KEYS.DISPUTES) || [];
        const index = allDisputes.findIndex((d) => d.id === resolveItem.id);
        if (index !== -1) {
          allDisputes[index] = {
            ...allDisputes[index],
            status: 'Resolved',
            resolvedAt: new Date().toISOString(),
            resolutionNotes: note,
          };
          storage.set(storage.KEYS.DISPUTES, allDisputes);
          toast.success(`Dispute ${resolveItem.id} marked as Resolved.`);
          setResolveItem(null);
          setResolutionNote('');
          loadDisputes();
        }
        return;
      }

      const res = await api.put(`/disputes/${resolveItem.id}/resolve`, {
        status: 'Resolved',
        resolutionNotes: note,
      });

      if (res.data?.success) {
        toast.success(`Dispute ${resolveItem.id} marked as Resolved.`);
        setResolveItem(null);
        setResolutionNote('');
        loadDisputes();
      } else {
        toast.error(res.data?.message || 'Failed to resolve dispute.');
      }
    } catch (err) {
      console.error('Dispute resolve failed:', err);
      toast.error(err?.response?.data?.message || err?.message || 'Failed to resolve dispute.');
    } finally {
      setResolving(false);
    }
  };

  const filtered = (disputes || []).filter((d) => {
    const q = (search || '').toLowerCase();
    const donor = (d?.donorName || '').toLowerCase();
    const inst = (d?.institutionName || '').toLowerCase();
    const issue = (d?.issueType || '').toLowerCase();

    return donor.includes(q) || inst.includes(q) || issue.includes(q);
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="pb-6 border-b border-sand-200">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-charcoal-700 bg-sand-200 px-2.5 py-0.5 rounded-md">
            Operational Mediation
          </span>
        </div>
        <h1 className="font-serif text-3xl font-bold text-charcoal-900">
          Disputes & Delivery Exceptions
        </h1>
        <p className="text-sm text-charcoal-600 mt-1">
          Review reported delivery postponements, item grade discrepancies, and logistical mismatches between donors and care homes.
        </p>
      </div>

      {/* Filter and Search */}
      <div className="max-w-md">
        <Input
          placeholder="Search by donor, institution, or issue type..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          icon={Search}
        />
      </div>

      {error ? (
        <ErrorState
          title="Failed to Load Disputes"
          message={error}
          onRetry={loadDisputes}
        />
      ) : loading ? (
        <div className="py-20 text-center space-y-3 bg-white rounded-3xl border border-sand-200">
          <div className="w-8 h-8 border-2 border-sage-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-charcoal-500">Loading delivery exceptions...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-3xl border border-sand-200 p-8 space-y-3 shadow-soft-sm">
          <CheckCircle2 className="w-10 h-10 text-sage-600 mx-auto" />
          <h3 className="font-serif text-xl font-bold text-charcoal-900">
            No active disputes
          </h3>
          <p className="text-xs text-charcoal-500 max-w-sm mx-auto">
            All logistical deliveries and institutional handovers are operating in harmony.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-3xl border border-sand-200 p-6 shadow-soft-sm flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wider text-charcoal-600 bg-sand-100 px-2.5 py-0.5 rounded">
                      {item.issueType}
                    </span>
                    {item.isSample && <SampleDataBadge />}
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                      item.status === 'Resolved'
                        ? 'bg-sage-100 text-sage-900 border-sage-300'
                        : 'bg-amber-50 text-amber-900 border-amber-300'
                    }`}
                  >
                    {item.status === 'Resolved' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-sage-600" />
                    ) : (
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                    )}
                    {item.status}
                  </span>
                </div>

                <h3 className="font-serif text-lg font-bold text-charcoal-900">
                  {item.donorName} ↔ {item.institutionName}
                </h3>

                <p className="mt-2 text-xs text-charcoal-600 leading-relaxed bg-sand-50 p-3 rounded-xl border border-sand-200/80">
                  {item.description}
                </p>

                {item.resolutionNotes && (
                  <div className="mt-3 p-3 bg-sage-50/70 border border-sage-200 rounded-xl text-xs text-sage-900">
                    <strong className="block mb-0.5">Resolution Notes:</strong>
                    {item.resolutionNotes}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-sand-100 flex items-center justify-between">
                <span className="text-[11px] text-charcoal-400">
                  Reported: {new Date(item.createdAt).toLocaleDateString()}
                </span>

                {item.status !== 'Resolved' && (
                  <Button
                    variant="primary"
                    size="sm"
                    icon={CheckCircle2}
                    onClick={() => {
                      setResolveItem(item);
                      setResolutionNote('');
                    }}
                  >
                    Resolve Dispute
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Resolution Modal */}
      {resolveItem && (
        <div
          className="fixed inset-0 z-50 bg-charcoal-900/40 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-3xl max-w-md w-full max-h-[calc(100vh-2rem)] overflow-y-auto my-auto p-5 sm:p-8 shadow-soft-lg space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="font-serif text-xl font-bold text-charcoal-900">
              Resolve Delivery Exception
            </h3>
            <p className="text-xs text-charcoal-600 leading-relaxed">
              Record the mediation outcome for the dispute between <strong>{resolveItem.donorName}</strong> and <strong>{resolveItem.institutionName}</strong>.
            </p>

            <form onSubmit={handleResolve} className="space-y-4">
              <Input
                label="Mediation / Resolution Summary"
                placeholder="e.g. Mutual drop-off date rescheduled or alternate items provided."
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                required
              />

              <div className="pt-2 flex items-center justify-end gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setResolveItem(null)}
                  disabled={resolving}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  loading={resolving}
                >
                  Mark as Resolved
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default DisputesListPage;
