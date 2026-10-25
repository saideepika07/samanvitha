import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import { useToast } from '../../hooks/useToast.js';
import donationService from '../../services/donationService.js';
import { DONATION_STATUS, DONATION_STATUS_STEPS } from '../../config/donationStatus.js';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import SampleDataBadge from '../../components/common/SampleDataBadge.jsx';
import Button from '../../components/common/Button.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import { Inbox, CheckCircle2, Truck, PackageCheck, Clock, MapPin, Calendar } from 'lucide-react';
import { formatReservationExpiry } from '../../utils/dateUtils.js';

export function IncomingRequestsPage() {
  const { user } = useAuth();
  const toast = useToast();

  const [incoming, setIncoming] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processingId, setProcessingId] = useState(null);

  const loadIncoming = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await donationService.getInstitutionIncoming(user?.name);
      setIncoming(data);
    } catch (err) {
      console.error('Failed to load incoming requests:', err);
      setError(err?.response?.data?.message || err?.message || 'Failed to load incoming requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIncoming();
  }, [user]);

  // Handle Mark Received / Completed
  const handleUpdateStatus = async (donationId, nextStatus) => {
    setProcessingId(donationId);
    try {
      const result = await donationService.updateDonationStatus(donationId, nextStatus);
      if (result.success) {
        toast.success(`Donation marked as "${nextStatus}".`);
        loadIncoming();
      } else {
        const rawError = result.error || '';
        const friendlyMessage =
          rawError.includes('delivery readiness') ||
          rawError.includes('donating party') ||
          rawError.includes('donor')
            ? 'Please wait until the donor confirms the handover.'
            : rawError || 'Failed to update donation status.';
        toast.error(friendlyMessage);
      }
    } catch (err) {
      const rawError = err?.response?.data?.error || err?.message || '';
      const friendlyMessage =
        rawError.includes('delivery readiness') ||
        rawError.includes('donating party') ||
        rawError.includes('donor')
          ? 'Please wait until the donor confirms the handover.'
          : 'An unexpected error occurred.';
      toast.error(friendlyMessage);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="pb-6 border-b border-sand-200">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-terracotta-800 bg-terracotta-50 px-2.5 py-0.5 rounded-md border border-terracotta-200">
            Logistics & Handover
          </span>
        </div>
        <h1 className="font-serif text-3xl font-bold text-charcoal-900">
          Incoming Requests & Reservations
        </h1>
        <p className="text-sm text-charcoal-600 mt-1">
          Review community resources reserved or in-transit for your resident care home. Verify incoming batches upon handover.
        </p>
      </div>

      {error ? (
        <ErrorState
          title="Failed to Load Incoming Requests"
          message={error}
          onRetry={loadIncoming}
        />
      ) : loading ? (
        <div className="py-20 text-center space-y-3 bg-white rounded-3xl border border-sand-200">
          <div className="w-8 h-8 border-2 border-sage-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-charcoal-500">Checking for incoming pledges...</p>
        </div>
      ) : incoming.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-3xl border border-sand-200 p-8 space-y-4 shadow-soft-sm">
          <Inbox className="w-10 h-10 text-charcoal-400 mx-auto" />
          <h3 className="font-serif text-xl font-bold text-charcoal-900">
            No incoming pledges at this moment
          </h3>
          <p className="text-xs text-charcoal-500 max-w-sm mx-auto">
            When donors match with your unfulfilled needs and reserve deliveries, they will appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {incoming.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-3xl border border-sand-200 p-6 shadow-soft-sm flex flex-col justify-between space-y-5"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-charcoal-600 bg-sand-100 px-2.5 py-1 rounded-lg">
                      {item.category}
                    </span>
                    {item.isSample && <SampleDataBadge />}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <StatusBadge status={item.status} />
                    {item.status === DONATION_STATUS.RESERVED && (
                      <span className="flex items-center gap-1 text-[11px] font-medium text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg">
                        <Clock className="w-3 h-3 text-amber-700 flex-shrink-0" />
                        {formatReservationExpiry(item.reservedAt || item.createdAt)}
                      </span>
                    )}
                  </div>
                </div>

                <h3 className="font-serif text-xl font-bold text-charcoal-900">
                  {item.itemType}
                </h3>

                <p className="text-xs text-charcoal-500 mt-1">
                  Pledged by: <strong className="text-charcoal-800">{item.donorName}</strong>
                </p>

                {/* Details Callout */}
                <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-sand-50 rounded-xl border border-sand-200/80">
                    <span className="text-charcoal-500 block">Quantity & Condition</span>
                    <strong className="text-charcoal-900 block text-sm mt-0.5">
                      {item.quantity} {item.unit} ({item.condition})
                    </strong>
                  </div>

                  <div className="p-3 bg-sand-50 rounded-xl border border-sand-200/80">
                    <span className="text-charcoal-500 block">Donor Origin</span>
                    <strong className="text-charcoal-900 block text-sm mt-0.5 truncate">
                      {item.location}
                    </strong>
                  </div>
                </div>

                {item.notes && (
                  <p className="mt-3 text-xs text-charcoal-600 italic bg-sand-50/50 p-2.5 rounded-xl border border-sand-100">
                    "{item.notes}"
                  </p>
                )}

                {/* Small Status Stepper */}
                <div className="mt-4 p-3 bg-sand-50 rounded-2xl border border-sand-200/80 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[10px] font-semibold text-charcoal-700 uppercase tracking-wider">
                      Status Lifecycle
                    </span>
                    <span className="text-[11px] font-medium text-sage-800">
                      {item.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-1">
                    {DONATION_STATUS_STEPS.map((step, idx) => {
                      const currentIdx = DONATION_STATUS_STEPS.indexOf(item.status);
                      const isCompletedStep = currentIdx >= idx;
                      const isCurrent = item.status === step;

                      return (
                        <div key={step} className="flex flex-col items-center flex-1" title={step}>
                          <div
                            className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold transition-all ${
                              isCurrent
                                ? 'bg-sage-600 text-white ring-2 ring-sage-100'
                                : isCompletedStep
                                ? 'bg-sage-200 text-sage-800'
                                : 'bg-sand-200 text-charcoal-400'
                            }`}
                          >
                            {idx + 1}
                          </div>
                          <span className="text-[8px] mt-0.5 text-center text-charcoal-500 truncate max-w-[42px] hidden sm:block">
                            {step}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Status Action Workflow Buttons */}
              <div className="pt-4 border-t border-sand-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-1 text-[11px] text-charcoal-400">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Target: {item.deadline || 'Flexible'}</span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {(item.status === DONATION_STATUS.RESERVED ||
                    item.status === DONATION_STATUS.READY_FOR_DELIVERY) && (
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={true}
                        title="Waiting for the donor to confirm the handover"
                        className="opacity-50 cursor-not-allowed"
                      >
                        Acknowledge
                      </Button>
                      <span className="text-[11px] text-charcoal-400 italic">
                        Waiting for the donor to confirm the handover
                      </span>
                    </div>
                  )}

                  {item.status === DONATION_STATUS.DELIVERED && (
                    <Button
                      variant="primary"
                      size="sm"
                      loading={processingId === item.id}
                      onClick={() => handleUpdateStatus(item.id, DONATION_STATUS.COMPLETED)}
                      icon={CheckCircle2}
                      className="w-full sm:w-auto"
                    >
                      Acknowledge
                    </Button>
                  )}

                  {item.status === DONATION_STATUS.RECEIVED && (
                    <Button
                      variant="primary"
                      size="sm"
                      loading={processingId === item.id}
                      onClick={() => handleUpdateStatus(item.id, DONATION_STATUS.COMPLETED)}
                      icon={PackageCheck}
                      className="w-full sm:w-auto"
                    >
                      Confirm Complete
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default IncomingRequestsPage;
