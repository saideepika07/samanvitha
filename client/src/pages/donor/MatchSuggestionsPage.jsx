import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { useToast, useServerWaking } from '../../hooks/useToast.js';
import donationService from '../../services/donationService.js';
import matchService from '../../services/matchService.js';
import MatchScoreBreakdown from '../../components/cards/MatchScoreBreakdown.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import SampleDataBadge from '../../components/common/SampleDataBadge.jsx';
import Button from '../../components/common/Button.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import {
  Sparkles,
  Heart,
  Building,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  ArrowRight,
  Package,
  Clock,
} from 'lucide-react';
import { formatReservationExpiry } from '../../utils/dateUtils.js';

export function MatchSuggestionsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const isServerWaking = useServerWaking();
  const [searchParams, setSearchParams] = useSearchParams();

  const queryDonationId = searchParams.get('donationId');

  const [donations, setDonations] = useState([]);
  const [selectedDonationId, setSelectedDonationId] = useState(queryDonationId || '');
  const [matches, setMatches] = useState([]);
  const [loadingDonations, setLoadingDonations] = useState(true);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [errorDonations, setErrorDonations] = useState(null);
  const [errorMatches, setErrorMatches] = useState(null);
  const [reservingId, setReservingId] = useState(null);
  const [confirmReservation, setConfirmReservation] = useState(null);

  // Load donor's donations to populate selector
  const fetchDonations = async () => {
    try {
      setLoadingDonations(true);
      setErrorDonations(null);
      const data = await donationService.getDonorDonations(user?.id);
      setDonations(data);

      // Pick first donation if none selected in URL
      if (data.length > 0) {
        const initialId = queryDonationId && data.some((d) => d.id === queryDonationId)
          ? queryDonationId
          : data[0].id;
        setSelectedDonationId(initialId);
      }
    } catch (err) {
      console.error('Failed to load donations for matching:', err);
      setErrorDonations(err?.response?.data?.message || err?.message || 'Failed to load donations for matching.');
    } finally {
      setLoadingDonations(false);
    }
  };

  useEffect(() => {
    fetchDonations();
  }, [user?.id, queryDonationId]);

  // Load matches whenever selected donation changes
  const fetchMatches = async () => {
    if (!selectedDonationId) {
      setMatches([]);
      return;
    }
    try {
      setLoadingMatches(true);
      setErrorMatches(null);
      const results = await matchService.getSuggestionsForDonation(selectedDonationId);
      setMatches(results);
    } catch (err) {
      console.error('Failed to compute matches:', err);
      setErrorMatches(err?.response?.data?.message || err?.message || 'Failed to compute match suggestions.');
    } finally {
      setLoadingMatches(false);
    }
  };

  useEffect(() => {
    fetchMatches();
  }, [selectedDonationId]);

  const activeDonation = donations.find((d) => d.id === selectedDonationId);

  const handleOpenReserveModal = (match) => {
    const donationAvailable = activeDonation?.availableQuantity != null
      ? activeDonation.availableQuantity
      : Math.max(0, (activeDonation?.quantity || 0) - (activeDonation?.reservedQuantity || 0));

    const needRemaining = match.components?.unfulfilledDemand?.remainingNeed ??
      Math.max(
        0,
        (match.need?.requiredQuantity || 0) -
          (match.need?.usableStock || 0) -
          (match.need?.reservedQuantity || 0)
      );

    const reserveQty = Math.min(donationAvailable, needRemaining);
    const stayAvailable = Math.max(0, donationAvailable - reserveQty);
    const unit = activeDonation?.unit || match.need?.unit || 'units';

    setConfirmReservation({
      match,
      needId: match.need.id,
      institutionName: match.need.institutionName,
      itemType: match.need.itemType,
      reserveQty,
      donationAvailable,
      stayAvailable,
      unit,
    });
  };

  const handleReserve = async (needId, quantity) => {
    if (!selectedDonationId || !needId) return;

    setReservingId(needId);
    try {
      const result = await matchService.reserveMatch(selectedDonationId, needId, quantity);
      if (result.success) {
        toast.success('Match confirmed & reserved! The institution has been notified.');
        setConfirmReservation(null);
        // Refresh donations list
        const updatedDonations = await donationService.getDonorDonations(user?.id);
        setDonations(updatedDonations);
        // Refresh matches
        const refreshedMatches = await matchService.getSuggestionsForDonation(selectedDonationId);
        setMatches(refreshedMatches);
      } else {
        toast.error(result.error || 'Failed to reserve match.');
      }
    } catch (err) {
      toast.error('An unexpected error occurred while reserving.');
    } finally {
      setReservingId(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="pb-6 border-b border-sand-200">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-sage-800 bg-sage-50 px-2.5 py-0.5 rounded-md border border-sage-200">
            Algorithmic Engine
          </span>
        </div>
        <h1 className="font-serif text-3xl font-bold text-charcoal-900">
          Match Suggestions
        </h1>
        <p className="text-sm text-charcoal-600 mt-1">
          Ranked matches computed by multi-attribute scoring: Urgency (35%), Unfulfilled Demand (30%), Time Sensitivity (20%), and Delivery Feasibility (15%).
        </p>
      </div>

      {errorDonations ? (
        <ErrorState
          title="Failed to Load Donations for Matching"
          message={errorDonations}
          onRetry={fetchDonations}
        />
      ) : (
        <>
          {/* Donation Selector */}
          {donations.length > 0 && (
            <div className="p-4 sm:p-5 bg-white rounded-3xl border border-sand-200 shadow-soft-sm space-y-3">
              <label className="text-xs font-semibold uppercase tracking-wider text-charcoal-700 block">
                Select Your Listed Donation to Match:
              </label>
              <div className="flex flex-wrap gap-2">
                {donations.map((d) => (
                  <button
                    type="button"
                    key={d.id}
                    onClick={() => {
                      setSelectedDonationId(d.id);
                      setSearchParams({ donationId: d.id });
                    }}
                    className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border text-xs font-medium transition-all cursor-pointer ${
                      selectedDonationId === d.id
                        ? 'border-sage-600 bg-sage-50 text-sage-900 shadow-soft-sm ring-1 ring-sage-600'
                        : 'border-sand-200 bg-sand-50/50 hover:bg-sand-100 text-charcoal-700'
                    }`}
                  >
                    <Package className="w-4 h-4 text-sage-700 flex-shrink-0" />
                    <span>
                      <strong>{d.itemType}</strong> ({d.quantity} {d.unit})
                    </span>
                    <StatusBadge status={d.status} className="text-[10px] py-0 px-1.5" />
                  </button>
                ))}
              </div>

              {activeDonation && (
                <div className="pt-2 text-xs text-charcoal-500 flex flex-wrap gap-4 border-t border-sand-100">
                  <span>Category: <strong>{activeDonation.category}</strong></span>
                  <span>Condition: <strong>{activeDonation.condition}</strong></span>
                  <span>Pickup Location: <strong>{activeDonation.location}</strong></span>
                  <span>Status: <strong className="text-charcoal-800">{activeDonation.status}</strong></span>
                </div>
              )}
            </div>
          )}

          {/* Match Results List */}
          {errorMatches ? (
            <ErrorState
              title="Failed to Compute Match Suggestions"
              message={errorMatches}
              onRetry={fetchMatches}
            />
          ) : loadingMatches ? (
            <div className="py-20 text-center space-y-3 bg-white rounded-3xl border border-sand-200">
              <div className="w-8 h-8 border-2 border-sage-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-charcoal-500">Evaluating institutional need deficits...</p>
            </div>
          ) : matches.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-3xl border border-sand-200 p-8 space-y-4 shadow-soft-sm">
          <Sparkles className="w-10 h-10 text-charcoal-400 mx-auto" />
          <h3 className="font-serif text-xl font-bold text-charcoal-900">
            No active institutional matches found
          </h3>
          <p className="text-xs text-charcoal-500 max-w-sm mx-auto">
            Currently, no verified care homes have posted unmet deficits for {activeDonation?.category || 'this category'}. Check back soon as new requests are added daily.
          </p>
          <Link to="/public-needs">
            <Button variant="secondary" size="sm" icon={ArrowRight}>
              Explore Public Needs Directory
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 text-xs text-charcoal-500 px-1">
            <span>
              Showing <strong>{matches.length}</strong> ranked matches (Highest score first)
            </span>
            <span className="italic text-[11px] text-charcoal-400">
              * Ranking strictly excludes donor wealth or institutional popularity
            </span>
          </div>

          {matches.map((m, idx) => {
            const isReserved = activeDonation?.matchedNeedId === m.need.id;

            return (
              <div
                key={m.needId}
                className={`bg-white rounded-3xl border p-6 sm:p-8 shadow-soft-sm transition-all space-y-6 ${
                  isReserved ? 'border-sage-600 ring-2 ring-sage-100' : 'border-sand-200'
                }`}
              >
                {/* Header Strip */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-6 h-6 rounded-full bg-sage-100 text-sage-800 text-xs font-bold flex items-center justify-center">
                        #{idx + 1}
                      </span>
                      <span className="text-xs font-semibold uppercase tracking-wider text-charcoal-500 bg-sand-100 px-2 py-0.5 rounded">
                        {m.need.category}
                      </span>
                      <StatusBadge status={m.need.urgency} type="urgency" />
                      {m.need.isSample && <SampleDataBadge />}
                    </div>

                    <h3 className="font-serif text-2xl font-bold text-charcoal-900">
                      {m.need.institutionName}
                    </h3>
                    <p className="text-xs text-charcoal-500 mt-0.5">
                      Care Facility Type: <strong className="capitalize">{m.need.institutionType?.replace('_', ' ') || 'Home'}</strong> • Address: {m.need.address}
                    </p>
                  </div>

                  {/* Reserve Action */}
                  <div className="w-full sm:w-auto sm:text-right">
                    {isReserved ? (
                      <div className="flex flex-col sm:items-end gap-1">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sage-100 text-sage-800 font-semibold text-xs border border-sage-300">
                          <CheckCircle2 className="w-4 h-4 text-sage-600" />
                          Match Reserved
                        </span>
                        <span className="flex items-center gap-1 text-[11px] font-medium text-amber-800">
                          <Clock className="w-3 h-3 text-amber-600" />
                          {formatReservationExpiry(activeDonation?.reservedAt || activeDonation?.createdAt)}
                        </span>
                      </div>
                    ) : (
                      <Button
                        variant="primary"
                        size="md"
                        loading={reservingId === m.need.id}
                        onClick={() => handleOpenReserveModal(m)}
                        icon={Heart}
                        className="w-full sm:w-auto shadow-soft-sm"
                      >
                        Reserve Match
                      </Button>
                    )}
                  </div>
                </div>

                {/* Need specifics summary */}
                <div className="p-4 bg-sand-50 rounded-2xl border border-sand-200 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-charcoal-500 block">Requested Supply</span>
                    <strong className="text-charcoal-900 block text-sm mt-0.5 truncate">
                      {m.need.itemType}
                    </strong>
                  </div>

                  <div>
                    <span className="text-charcoal-500 block">Remaining Unfulfilled Deficit</span>
                    <strong className="text-charcoal-900 block text-sm mt-0.5 font-mono">
                      {m.components.unfulfilledDemand.remainingNeed} {m.need.unit}
                    </strong>
                  </div>

                  <div>
                    <span className="text-charcoal-500 block">Fulfillment Deadline</span>
                    <strong className="text-charcoal-900 block text-sm mt-0.5">
                      {m.need.deadline || 'Flexible'}
                    </strong>
                  </div>
                </div>

                {/* Component Score Breakdown Card */}
                <MatchScoreBreakdown matchResult={m} />
              </div>
            );
          })}
        </div>
      )}
      </>
      )}

      {/* Reserve Confirmation Modal (Requirement 2) */}
      {confirmReservation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl border border-sand-300 shadow-soft-lg max-w-md w-full p-6 sm:p-8 space-y-6">
            <div className="flex items-start justify-between gap-3">
              <div className="w-10 h-10 rounded-2xl bg-sage-100 text-sage-700 flex items-center justify-center flex-shrink-0">
                <Heart className="w-5 h-5" />
              </div>
              <button
                type="button"
                onClick={() => setConfirmReservation(null)}
                className="text-charcoal-400 hover:text-charcoal-700 p-1 rounded-lg text-lg leading-none cursor-pointer"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1">
              <h3 className="font-serif text-2xl font-bold text-charcoal-900">
                Confirm Match Reservation
              </h3>
              <p className="text-xs text-charcoal-500">
                Reserving for <strong>{confirmReservation.institutionName}</strong> ({confirmReservation.itemType})
              </p>
            </div>

            {/* Allocation Quantity Callout */}
            <div className="p-4 bg-sand-50 rounded-2xl border border-sand-200 space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-charcoal-500 block">
                Reservation Allocation
              </span>
              <p className="font-serif text-base sm:text-lg font-bold text-charcoal-900">
                {confirmReservation.reserveQty} of {confirmReservation.donationAvailable} {confirmReservation.unit} will be reserved; {confirmReservation.stayAvailable} stay available
              </p>
              <p className="text-xs text-charcoal-600 leading-relaxed">
                {confirmReservation.stayAvailable > 0
                  ? `To prevent over-allocation, exactly ${confirmReservation.reserveQty} ${confirmReservation.unit} will be reserved for this care home. Your remaining ${confirmReservation.stayAvailable} ${confirmReservation.unit} remain Listed and available for other needs.`
                  : `This allocates all ${confirmReservation.reserveQty} ${confirmReservation.unit} to fulfill this deficit.`}
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="secondary"
                size="md"
                disabled={reservingId != null}
                onClick={() => setConfirmReservation(null)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                loading={reservingId === confirmReservation.needId}
                disabled={reservingId != null}
                onClick={() =>
                  handleReserve(confirmReservation.needId, confirmReservation.reserveQty)
                }
                icon={Heart}
              >
                Confirm Reservation
              </Button>
            </div>
            {reservingId && isServerWaking && (
              <p className="text-xs text-charcoal-600 bg-sand-100/90 py-2.5 px-3 rounded-xl border border-sand-200 mt-2 text-center flex items-center justify-center gap-2 animate-fade-in">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                The server is waking up (free hosting). This can take up to a minute, please wait.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default MatchSuggestionsPage;
