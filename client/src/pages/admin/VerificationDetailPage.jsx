import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import verificationService from '../../services/verificationService.js';
import { useAuth } from '../../hooks/useAuth.js';
import { useToast } from '../../hooks/useToast.js';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import SampleDataBadge from '../../components/common/SampleDataBadge.jsx';
import Button from '../../components/common/Button.jsx';
import Input from '../../components/common/Input.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import {
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Building,
  FileText,
  User,
  MapPin,
  Calendar,
  AlertTriangle,
} from 'lucide-react';

export function VerificationDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [institution, setInstitution] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Reject modal
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await verificationService.getInstitutionById(id);
      if (data) {
        setInstitution(data);
      } else {
        setError('Institution record not found.');
      }
    } catch (err) {
      console.error('Failed to load institution details:', err);
      setError(err?.response?.data?.message || err?.message || 'Failed to load institution details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      const result = await verificationService.updateStatus(
        id,
        'Approved',
        '',
        user?.id
      );
      if (result.success) {
        toast.success(`Prototype review approved for ${institution?.name || 'institution'}.`);
        loadData();
      } else {
        toast.error(result.error || 'Failed to approve institution.');
      }
    } catch (err) {
      toast.error('An unexpected error occurred during approval.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (e) => {
    e.preventDefault();
    if (!rejectReason.trim()) {
      toast.error('Please specify a rejection reason for the applicant.');
      return;
    }

    setActionLoading(true);
    try {
      const result = await verificationService.updateStatus(
        id,
        'Rejected',
        rejectReason.trim(),
        user?.id
      );
      if (result.success) {
        toast.success(`Prototype review marked Rejected for ${institution?.name || 'institution'}.`);
        setShowRejectModal(false);
        setRejectReason('');
        loadData();
      } else {
        toast.error(result.error || 'Failed to reject institution.');
      }
    } catch (err) {
      toast.error('An unexpected error occurred during rejection.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center space-y-3 bg-white rounded-3xl border border-sand-200">
        <div className="w-8 h-8 border-2 border-sage-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-charcoal-500">Loading submission audit data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto space-y-8">
        <Link
          to="/admin/verifications"
          className="inline-flex items-center gap-2 text-xs font-semibold text-charcoal-600 hover:text-charcoal-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Verifications Directory</span>
        </Link>
        <ErrorState
          title="Failed to Load Institution Audit Record"
          message={error}
          onRetry={loadData}
        />
      </div>
    );
  }

  if (!institution) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Return Navigation */}
      <Link
        to="/admin/verifications"
        className="inline-flex items-center gap-2 text-xs font-semibold text-charcoal-600 hover:text-charcoal-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Return to Verifications Directory</span>
      </Link>

      {/* Prototype Review Governance Banner */}
      <div className="p-4 sm:p-5 rounded-3xl bg-amber-50/80 border border-amber-200 text-amber-900 flex items-start gap-3.5 shadow-soft-sm">
        <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs sm:text-sm">
          <p className="font-semibold text-amber-950">Prototype Verification Notice</p>
          <p className="mt-0.5 text-amber-800 leading-relaxed">
            This administrative screen evaluates simulated applicant submissions for prototype demonstration.
            Approving or rejecting does not represent statutory or legal verification of authenticity under state law.
          </p>
        </div>
      </div>

      {/* Header Profile */}
      <div className="bg-white rounded-3xl border border-sand-200 p-6 sm:p-8 shadow-soft-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-sand-100">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-charcoal-500 bg-sand-100 px-2.5 py-0.5 rounded capitalize">
                {institution.institutionType?.replace('_', ' ') || 'Care Home'}
              </span>
              {institution.isSample && <SampleDataBadge />}
              <StatusBadge status={institution.verificationStatus} type="verification" />
            </div>
            <h1 className="font-serif text-3xl font-bold text-charcoal-900">
              {institution.name}
            </h1>
            <p className="text-xs text-charcoal-500 mt-1">
              Registered ID: <span className="font-mono">{institution.id}</span> • Applicant User: {institution.userId}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="danger"
              size="sm"
              icon={XCircle}
              onClick={() => setShowRejectModal(true)}
              disabled={actionLoading}
            >
              Reject with Reason
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={CheckCircle2}
              onClick={handleApprove}
              loading={actionLoading}
            >
              Approve Prototype
            </Button>
          </div>
        </div>

        {/* Audit Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 bg-sand-50 rounded-2xl border border-sand-200 space-y-1">
            <span className="text-charcoal-500 block font-medium">Physical Delivery Location</span>
            <strong className="text-charcoal-900 text-sm block">
              {institution.address}
            </strong>
            <p className="text-charcoal-400 mt-0.5">District: {institution.district || 'Greater Hyderabad'}</p>
          </div>

          <div className="p-4 bg-sand-50 rounded-2xl border border-sand-200 space-y-1">
            <span className="text-charcoal-500 block font-medium">Capacity & Occupancy</span>
            <strong className="text-charcoal-900 text-sm block">
              {institution.capacity || '40'} beds capacity • {institution.occupancy || '35'} current residents
            </strong>
            <p className="text-charcoal-400 mt-0.5">Verified resident ratio: 88%</p>
          </div>

          <div className="p-4 bg-sand-50 rounded-2xl border border-sand-200 space-y-1">
            <span className="text-charcoal-500 block font-medium">Liaison Contact Person</span>
            <strong className="text-charcoal-900 text-sm block">
              {institution.contactPerson || 'Authorized Administrator'}
            </strong>
            <p className="text-charcoal-400 mt-0.5">Phone: {institution.phone} • Email: {institution.email}</p>
          </div>

          <div className="p-4 bg-sand-50 rounded-2xl border border-sand-200 space-y-1">
            <span className="text-charcoal-500 block font-medium">Review Audit Trail</span>
            <strong className="text-charcoal-900 text-sm block">
              Status: {institution.verificationStatus}
            </strong>
            <p className="text-charcoal-400 mt-0.5">
              Audited by: {institution.verifiedBy || 'Pending assignment'}
            </p>
          </div>
        </div>

        {/* Verification Notes */}
        {institution.verificationNotice && (
          <div className="p-4 bg-sand-100 rounded-2xl border border-sand-200 text-xs text-charcoal-700 leading-relaxed">
            <strong className="block text-charcoal-900 mb-1">Audit Log Notation:</strong>
            {institution.verificationNotice}
          </div>
        )}

        {institution.rejectionReason && (
          <div className="p-4 bg-red-50 rounded-2xl border border-red-200 text-xs text-red-900 leading-relaxed">
            <strong className="block text-red-950 mb-1">Previous Rejection Reason:</strong>
            {institution.rejectionReason}
          </div>
        )}

        {/* Mock Sample Documents Inspection Strip */}
        <div className="pt-4 border-t border-sand-100 space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-charcoal-700">
            Sample Verification Documents Attached
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 bg-sand-50 rounded-xl border border-sand-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-sage-700" />
                <div>
                  <p className="text-xs font-semibold text-charcoal-900">Society_Trust_Deed_Sample.pdf</p>
                  <p className="text-[10px] text-charcoal-400">Sample Registration Audit Doc • 1.4 MB</p>
                </div>
              </div>
              <span className="text-[11px] text-sage-800 font-semibold bg-sage-100 px-2 py-0.5 rounded">
                Verified
              </span>
            </div>

            <div className="p-3.5 bg-sand-50 rounded-xl border border-sand-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-terracotta-700" />
                <div>
                  <p className="text-xs font-semibold text-charcoal-900">Utility_Address_Proof_Sample.pdf</p>
                  <p className="text-[10px] text-charcoal-400">Sample Facility Lease Proof • 850 KB</p>
                </div>
              </div>
              <span className="text-[11px] text-sage-800 font-semibold bg-sage-100 px-2 py-0.5 rounded">
                Verified
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Reject Modal with Reason Input */}
      {showRejectModal && (
        <div
          className="fixed inset-0 z-50 bg-charcoal-900/40 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-3xl max-w-md w-full max-h-[calc(100vh-2rem)] overflow-y-auto my-auto p-6 sm:p-8 shadow-soft-lg space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="font-serif text-xl font-bold text-charcoal-900">
              Reject Prototype Verification
            </h3>
            <p className="text-xs text-charcoal-600 leading-relaxed">
              Please provide a clear reason for rejecting the submission for <strong>{institution.name}</strong>. This feedback will be displayed on their status dashboard.
            </p>

            <form onSubmit={handleReject} className="space-y-4">
              <Input
                label="Structured Rejection Reason"
                placeholder="e.g. Attached utility bill is illegible. Please re-upload verified proof of occupancy."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                required
              />

              <div className="pt-2 flex items-center justify-end gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowRejectModal(false)}
                  disabled={actionLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="danger"
                  size="sm"
                  loading={actionLoading}
                >
                  Confirm Rejection
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default VerificationDetailPage;
