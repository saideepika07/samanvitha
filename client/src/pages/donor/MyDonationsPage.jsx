import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { useToast } from '../../hooks/useToast.js';
import donationService from '../../services/donationService.js';
import { DONATION_STATUS, DONATION_STATUS_STEPS } from '../../config/donationStatus.js';
import { CATEGORIES } from '../../config/categories.js';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import SampleDataBadge from '../../components/common/SampleDataBadge.jsx';
import Button from '../../components/common/Button.jsx';
import Input from '../../components/common/Input.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import { formatReservationExpiry } from '../../utils/dateUtils.js';
import {
  PlusCircle,
  Search,
  Filter,
  Sparkles,
  Ban,
  Package,
  Calendar,
  MapPin,
  ExternalLink,
  ChevronRight,
  Eye,
  X,
  Truck,
  PackageCheck,
  CheckCircle2,
  Clock,
} from 'lucide-react';

export function MyDonationsPage() {
  const { user } = useAuth();
  const toast = useToast();

  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Cancel Modal State
  const [cancelModalItem, setCancelModalItem] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  // Detail Modal State & Lifecycle Transitions
  const [detailItem, setDetailItem] = useState(null);
  const [confirmStatusAction, setConfirmStatusAction] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const closeDetailModal = () => {
    setDetailItem(null);
    setConfirmStatusAction(null);
  };

  const isCancellableStatus = (status) =>
    status === DONATION_STATUS.LISTED ||
    status === DONATION_STATUS.MATCHED ||
    status === DONATION_STATUS.RESERVED ||
    status === DONATION_STATUS.READY_FOR_DELIVERY;

  const loadDonations = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await donationService.getDonorDonations(user?.id);
      setDonations(data);
    } catch (err) {
      console.error('Failed to load donations:', err);
      setError(err?.response?.data?.message || err?.message || 'Failed to load donations.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatusTransition = async (nextStatus) => {
    if (!detailItem) return;
    setActionLoading(true);
    try {
      const result = await donationService.updateDonationStatus(detailItem.id, nextStatus);
      if (result.success) {
        toast.success(`Donation marked as "${nextStatus}".`);
        setConfirmStatusAction(null);
        setDetailItem(result.data);
        loadDonations();
      } else {
        toast.error(result.error || `Failed to update status to "${nextStatus}".`);
      }
    } catch (err) {
      toast.error('An unexpected error occurred while updating status.');
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    loadDonations();
  }, [user?.id]);

  const handleCancelDonation = async () => {
    if (!cancelModalItem) return;
    setCancelling(true);
    try {
      const result = await donationService.cancelDonation(cancelModalItem.id, cancelReason);
      if (result.success) {
        toast.success(`Donation "${cancelModalItem.itemType}" has been cancelled.`);
        setCancelModalItem(null);
        setCancelReason('');
        loadDonations();
      } else {
        toast.error(result.error || 'Failed to cancel donation.');
      }
    } catch (err) {
      toast.error('An unexpected error occurred.');
    } finally {
      setCancelling(false);
    }
  };

  // Filter donations
  const filteredDonations = donations.filter((item) => {
    const matchesSearch =
      item.itemType.toLowerCase().includes(search.toLowerCase()) ||
      item.category.toLowerCase().includes(search.toLowerCase()) ||
      (item.matchedInstitutionName &&
        item.matchedInstitutionName.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-sand-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-sage-800 bg-sage-50 px-2.5 py-0.5 rounded-md border border-sage-200">
              Contribution Tracking
            </span>
          </div>
          <h1 className="font-serif text-3xl font-bold text-charcoal-900">
            My Listed Donations
          </h1>
          <p className="text-sm text-charcoal-600 mt-1">
            Track the 8-stage lifecycle of your contributions from initial listing to verified handover.
          </p>
        </div>

        <Link to="/donor/create-donation">
          <Button variant="primary" icon={PlusCircle} className="shadow-soft-sm">
            New Donation
          </Button>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 sm:p-5 bg-white rounded-3xl border border-sand-200 shadow-soft-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input
            placeholder="Search by item title or matched institution..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={Search}
          />

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-xl border border-sand-300 bg-sand-50/50 px-3.5 py-2.5 text-sm text-charcoal-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sage-100 focus:border-sage-500"
              aria-label="Filter by lifecycle status"
            >
              <option value="all">All Lifecycle Statuses</option>
              {Object.values(DONATION_STATUS).map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full rounded-xl border border-sand-300 bg-sand-50/50 px-3.5 py-2.5 text-sm text-charcoal-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sage-100 focus:border-sage-500"
              aria-label="Filter by item category"
            >
              <option value="all">All Categories</option>
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
            Showing <strong>{filteredDonations.length}</strong> of {donations.length} total entries
          </span>
          {(search || statusFilter !== 'all' || categoryFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setStatusFilter('all');
                setCategoryFilter('all');
              }}
              className="text-sage-700 hover:underline cursor-pointer"
            >
              Reset all filters
            </button>
          )}
        </div>
      </div>

      {/* Donations Table & Cards */}
      {error ? (
        <ErrorState
          title="Failed to Load Donations"
          message={error}
          onRetry={loadDonations}
        />
      ) : loading ? (
        <div className="py-20 text-center space-y-3 bg-white rounded-3xl border border-sand-200">
          <div className="w-8 h-8 border-2 border-sage-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-charcoal-500">Loading your contributions...</p>
        </div>
      ) : filteredDonations.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-3xl border border-sand-200 p-8 space-y-4 shadow-soft-sm">
          <div className="w-12 h-12 rounded-2xl bg-sand-100 flex items-center justify-center mx-auto text-charcoal-500">
            <Package className="w-6 h-6" />
          </div>
          <h3 className="font-serif text-xl font-bold text-charcoal-900">
            No donations match your criteria
          </h3>
          <p className="text-xs text-charcoal-500 max-w-sm mx-auto">
            Try adjusting your search filters or create a new non-perishable donation.
          </p>
          <Link to="/donor/create-donation">
            <Button variant="primary" size="sm" icon={PlusCircle}>
              List New Donation
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Mobile Cards (Visible below md: 360px, 390px, 768px portrait) */}
          <div className="md:hidden space-y-3">
            {filteredDonations.map((item) => {
              const canCancel = isCancellableStatus(item.status);
              return (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl border border-sand-200 p-4 shadow-soft-sm space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.itemType}
                          className="w-12 h-12 rounded-xl object-cover border border-sand-200 flex-shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-sand-100 border border-sand-200 flex items-center justify-center text-charcoal-500 flex-shrink-0">
                          <Package className="w-6 h-6 text-sage-700" />
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="font-semibold text-charcoal-900 text-sm">{item.itemType}</h4>
                          {item.isSample && <SampleDataBadge />}
                        </div>
                        <p className="text-xs text-charcoal-500 mt-0.5">{item.category}</p>
                      </div>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-sand-100">
                    <div>
                      <span className="text-charcoal-400 block text-[11px]">Quantity</span>
                      <strong className="text-charcoal-900 font-mono">{item.quantity} {item.unit}</strong>
                    </div>
                    <div>
                      <span className="text-charcoal-400 block text-[11px]">Condition</span>
                      <span className="text-charcoal-700 font-medium">{item.condition}</span>
                    </div>
                  </div>

                  {item.matchedInstitutionName && (
                    <div className="text-xs p-2.5 rounded-xl bg-sand-50 border border-sand-200/70">
                      <span className="text-charcoal-400 block text-[10px] uppercase font-semibold">Matched Home</span>
                      <p className="text-charcoal-800 font-medium mt-0.5">{item.matchedInstitutionName}</p>
                    </div>
                  )}

                  {item.status === DONATION_STATUS.RESERVED && (
                    <div className="flex items-center gap-1.5 text-xs font-medium text-amber-800 bg-amber-50 px-2.5 py-1.5 rounded-xl border border-amber-200">
                      <Clock className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                      <span>{formatReservationExpiry(item.reservedAt || item.createdAt)}</span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-sand-100 flex items-center justify-between gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        setDetailItem(item);
                        setConfirmStatusAction(null);
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-charcoal-700 hover:text-sage-800 bg-sand-100 hover:bg-sand-200 px-3 py-2 rounded-xl min-h-[44px] transition-colors cursor-pointer"
                    >
                      <Eye className="w-4 h-4 text-charcoal-500" />
                      <span>View Details</span>
                    </button>

                    <div className="flex items-center gap-2">
                      {(item.status === DONATION_STATUS.LISTED || item.status === DONATION_STATUS.MATCHED) && (
                        <Link to={`/donor/matches?donationId=${item.id}`}>
                          <Button variant="secondary" size="sm" icon={Sparkles} className="text-xs min-h-[44px]">
                            Matches
                          </Button>
                        </Link>
                      )}

                      {canCancel && (
                        <button
                          type="button"
                          onClick={() => {
                            setCancelModalItem(item);
                            setCancelReason('');
                          }}
                          className="p-2 text-charcoal-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                          title="Cancel donation"
                          aria-label={`Cancel donation for ${item.itemType}`}
                        >
                          <Ban className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table (hidden md:block) */}
          <div className="hidden md:block bg-white rounded-3xl border border-sand-200 shadow-soft-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm text-charcoal-800">
                <thead className="bg-sand-50/80 text-[11px] font-semibold text-charcoal-500 uppercase tracking-wider border-b border-sand-200">
                  <tr>
                    <th scope="col" className="px-6 py-4">Item & Category</th>
                    <th scope="col" className="px-6 py-4">Quantity</th>
                    <th scope="col" className="px-6 py-4">Condition</th>
                    <th scope="col" className="px-6 py-4">Status Lifecycle</th>
                    <th scope="col" className="px-6 py-4">Matched Institution</th>
                    <th scope="col" className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sand-200/70">
                  {filteredDonations.map((item) => {
                    const canCancel = isCancellableStatus(item.status);

                    return (
                      <tr key={item.id} className="hover:bg-sand-50/60 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.itemType}
                              className="w-10 h-10 rounded-xl object-cover border border-sand-200 flex-shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-sand-100 border border-sand-200 flex items-center justify-center text-charcoal-500 flex-shrink-0">
                              <Package className="w-5 h-5 text-sage-700" />
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="font-semibold text-charcoal-900">{item.itemType}</p>
                              {item.isSample && <SampleDataBadge />}
                            </div>
                            <p className="text-xs text-charcoal-500 mt-0.5">{item.category}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 font-mono font-medium">
                        {item.quantity} {item.unit}
                      </td>

                      <td className="px-6 py-4">
                        <span className="text-xs bg-sand-100 text-charcoal-700 px-2 py-0.5 rounded font-medium">
                          {item.condition}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <StatusBadge status={item.status} />
                        {item.status === DONATION_STATUS.RESERVED && (
                          <span className="flex items-center gap-1 text-[11px] font-medium text-amber-800 mt-1">
                            <Clock className="w-3 h-3 text-amber-600 flex-shrink-0" />
                            {formatReservationExpiry(item.reservedAt || item.createdAt)}
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-xs">
                        {item.matchedInstitutionName ? (
                          <span className="font-medium text-charcoal-800 flex items-center gap-1">
                            {item.matchedInstitutionName}
                          </span>
                        ) : (
                          <span className="text-charcoal-400 italic">Not yet reserved</span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setDetailItem(item);
                              setConfirmStatusAction(null);
                            }}
                            className="p-1.5 text-charcoal-500 hover:text-charcoal-900 hover:bg-sand-100 rounded-lg transition-colors cursor-pointer"
                            title="View details & lifecycle"
                            aria-label={`View details for ${item.itemType}`}
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {(item.status === DONATION_STATUS.LISTED || item.status === DONATION_STATUS.MATCHED) && (
                            <Link to={`/donor/matches?donationId=${item.id}`}>
                              <Button variant="secondary" size="sm" icon={Sparkles} className="text-xs py-1">
                                Matches
                              </Button>
                            </Link>
                          )}

                          {canCancel && (
                            <button
                              type="button"
                              onClick={() => {
                                setCancelModalItem(item);
                                setCancelReason('');
                              }}
                              className="p-1.5 text-charcoal-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="Cancel donation"
                              aria-label={`Cancel donation for ${item.itemType}`}
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          )}
                        </div>
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

      {/* Lifecycle Detail Modal */}
      {detailItem && (
        <div
          className="fixed inset-0 z-50 bg-charcoal-900/40 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[calc(100vh-2rem)] overflow-y-auto my-auto p-5 sm:p-8 shadow-soft-lg space-y-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-charcoal-500">
                    {detailItem.category}
                  </span>
                  {detailItem.isSample && <SampleDataBadge />}
                </div>
                <h3 className="font-serif text-2xl font-bold text-charcoal-900">
                  {detailItem.itemType}
                </h3>
              </div>
              <button
                type="button"
                onClick={closeDetailModal}
                className="p-2 text-charcoal-400 hover:text-charcoal-900 rounded-full hover:bg-sand-100 min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Lifecycle Stepper */}
            <div className="p-4 bg-sand-50 rounded-2xl border border-sand-200 space-y-3">
              <p className="text-xs font-semibold text-charcoal-700 uppercase tracking-wider">
                Status Lifecycle Stage
              </p>
              <div className="flex items-center justify-between text-xs">
                {DONATION_STATUS_STEPS.map((step, idx) => {
                  const currentIdx = DONATION_STATUS_STEPS.indexOf(detailItem.status);
                  const isCompletedStep = currentIdx >= idx;
                  const isCurrent = detailItem.status === step;

                  return (
                    <div key={step} className="flex flex-col items-center flex-1">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          isCurrent
                            ? 'bg-sage-600 text-white ring-4 ring-sage-100'
                            : isCompletedStep
                            ? 'bg-sage-200 text-sage-800'
                            : 'bg-sand-200 text-charcoal-400'
                        }`}
                      >
                        {idx + 1}
                      </div>
                      <span className="text-[9px] mt-1 text-center text-charcoal-500 line-clamp-1">
                        {step}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {detailItem.status === DONATION_STATUS.RESERVED && (
              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 flex items-center justify-between text-xs text-amber-900">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-700" />
                  <span className="font-semibold">Reservation Window:</span>
                </div>
                <span className="font-bold text-amber-800">
                  {formatReservationExpiry(detailItem.reservedAt || detailItem.createdAt)}
                </span>
              </div>
            )}

            {/* Item Details Grid */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-sand-50/50 rounded-xl border border-sand-200/80">
                <span className="text-charcoal-500 block">Quantity & Condition</span>
                <strong className="text-charcoal-900 text-sm mt-0.5 block">
                  {detailItem.quantity} {detailItem.unit} ({detailItem.condition})
                </strong>
              </div>

              <div className="p-3 bg-sand-50/50 rounded-xl border border-sand-200/80">
                <span className="text-charcoal-500 block">Pickup Location</span>
                <strong className="text-charcoal-900 text-sm mt-0.5 block">
                  {detailItem.location}
                </strong>
              </div>

              <div className="p-3 bg-sand-50/50 rounded-xl border border-sand-200/80">
                <span className="text-charcoal-500 block">Availability Deadline</span>
                <strong className="text-charcoal-900 text-sm mt-0.5 block">
                  {detailItem.deadline || 'Flexible'}
                </strong>
              </div>

              <div className="p-3 bg-sand-50/50 rounded-xl border border-sand-200/80">
                <span className="text-charcoal-500 block">Matched Institution</span>
                <strong className="text-charcoal-900 text-sm mt-0.5 block">
                  {detailItem.matchedInstitutionName || 'None assigned yet'}
                </strong>
              </div>
            </div>

            {detailItem.notes && (
              <div className="text-xs bg-sand-50 p-3 rounded-xl border border-sand-200 text-charcoal-600">
                <strong className="block text-charcoal-700 mb-0.5">Notes:</strong>
                {detailItem.notes}
              </div>
            )}

            {/* Status Notices */}
            {detailItem.status === DONATION_STATUS.DELIVERED && (
              <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-2xl flex items-center gap-2.5 text-xs text-blue-900 font-medium">
                <Clock className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <span>Waiting for the institution to acknowledge receipt</span>
              </div>
            )}

            {(detailItem.status === DONATION_STATUS.RECEIVED ||
              detailItem.status === DONATION_STATUS.COMPLETED) && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-900 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>
                  Donation received and verified by {detailItem.matchedInstitutionName || 'the institution'}.
                </span>
              </div>
            )}

            {/* Confirmation Box or Actions Bar */}
            {confirmStatusAction ? (
              <div className="p-4 bg-sand-100 rounded-2xl border border-sand-300 space-y-3">
                <h4 className="font-serif text-base font-bold text-charcoal-900">
                  {confirmStatusAction === DONATION_STATUS.READY_FOR_DELIVERY
                    ? 'Confirm Delivery Readiness'
                    : 'Confirm Handover & Delivery'}
                </h4>
                <p className="text-xs text-charcoal-600 leading-relaxed">
                  {confirmStatusAction === DONATION_STATUS.READY_FOR_DELIVERY
                    ? `Are you ready to dispatch ${detailItem.quantity} ${detailItem.unit} of "${detailItem.itemType}" to ${detailItem.matchedInstitutionName || 'the institution'}?`
                    : `Have you completed the physical delivery of ${detailItem.quantity} ${detailItem.unit} of "${detailItem.itemType}" to ${detailItem.matchedInstitutionName || 'the institution'}?`}
                </p>
                <div className="flex items-center justify-end gap-2 pt-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={actionLoading}
                    onClick={() => setConfirmStatusAction(null)}
                  >
                    Back
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    loading={actionLoading}
                    onClick={() => handleUpdateStatusTransition(confirmStatusAction)}
                  >
                    {confirmStatusAction === DONATION_STATUS.READY_FOR_DELIVERY
                      ? 'Confirm & Mark Ready'
                      : 'Yes, Mark Delivered'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="pt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  {isCancellableStatus(detailItem.status) && (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => {
                        const itemToCancel = detailItem;
                        closeDetailModal();
                        setCancelModalItem(itemToCancel);
                        setCancelReason('');
                      }}
                    >
                      Cancel Donation
                    </Button>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2">
                  <Button variant="secondary" size="sm" onClick={closeDetailModal}>
                    Close
                  </Button>

                  {detailItem.status === DONATION_STATUS.RESERVED && (
                    <Button
                      variant="primary"
                      size="sm"
                      icon={Truck}
                      onClick={() => setConfirmStatusAction(DONATION_STATUS.READY_FOR_DELIVERY)}
                    >
                      Mark ready for delivery
                    </Button>
                  )}

                  {detailItem.status === DONATION_STATUS.READY_FOR_DELIVERY && (
                    <Button
                      variant="primary"
                      size="sm"
                      icon={PackageCheck}
                      onClick={() => setConfirmStatusAction(DONATION_STATUS.DELIVERED)}
                    >
                      Mark delivered
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cancellation Confirmation Modal */}
      {cancelModalItem && (
        <div
          className="fixed inset-0 z-50 bg-charcoal-900/40 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-3xl max-w-md w-full max-h-[calc(100vh-2rem)] overflow-y-auto my-auto p-5 sm:p-8 shadow-soft-lg space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="font-serif text-xl font-bold text-charcoal-900">
              Confirm Cancellation
            </h3>
            <p className="text-xs text-charcoal-600 leading-relaxed">
              Are you sure you want to cancel the donation for{' '}
              <strong>{cancelModalItem.itemType}</strong>? Any active match or reservation with an institution will be released.
            </p>

            <Input
              label="Cancellation Reason (Optional)"
              placeholder="e.g. Items no longer available or given elsewhere"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />

            <div className="pt-4 flex items-center justify-end gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCancelModalItem(null)}
                disabled={cancelling}
              >
                Keep Donation
              </Button>
              <Button
                variant="danger"
                size="sm"
                loading={cancelling}
                onClick={handleCancelDonation}
              >
                Yes, Cancel Donation
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MyDonationsPage;
