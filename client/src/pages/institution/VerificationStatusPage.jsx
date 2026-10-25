import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import { useToast } from '../../hooks/useToast.js';
import verificationService from '../../services/verificationService.js';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import SampleDataBadge from '../../components/common/SampleDataBadge.jsx';
import Button from '../../components/common/Button.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  FileCheck,
  Clock,
  Building,
  CheckCircle2,
  XCircle,
  Upload,
  FileText,
} from 'lucide-react';

export function VerificationStatusPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const loadVerification = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await verificationService.getMyInstitution();
      setProfile(data);
    } catch (err) {
      console.error('Failed to load verification profile:', err);
      setError(err?.response?.data?.message || err?.message || 'Failed to load verification profile.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVerification();
  }, [user]);

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error('Please choose a PDF or image document to upload.');
      return;
    }

    setUploading(true);
    try {
      const result = await verificationService.uploadDocument(selectedFile);
      if (result.success) {
        toast.success('Verification document uploaded successfully.');
        setSelectedFile(null);
        loadVerification();
      } else {
        toast.error(result.error || 'Failed to upload document.');
      }
    } catch (err) {
      toast.error('An unexpected error occurred during upload.');
    } finally {
      setUploading(false);
    }
  };

  const currentStatus = profile?.verificationStatus || user?.verificationStatus || 'Pending';

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Prototype Review Legal Disclaimer Banner */}
      <div className="p-5 rounded-3xl bg-amber-50/90 border border-amber-200/90 shadow-soft-sm flex items-start gap-3.5">
        <ShieldAlert className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="font-semibold text-amber-900 text-sm">
            Prototype Verification Review Disclaimer
          </h4>
          <p className="text-xs text-amber-800 leading-relaxed">
            Institution verification on Samanvitha is strictly a prototype review designed to simulate and demonstrate operational governance within this frontend phase.
            <strong> It does not represent or claim to establish formal legal, statutory, or regulatory authenticity.</strong>
          </p>
        </div>
      </div>

      {/* Header */}
      <div className="pb-6 border-b border-sand-200">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-terracotta-800 bg-terracotta-50 px-2.5 py-0.5 rounded-md border border-terracotta-200">
            Compliance & Review
          </span>
          {(profile?.isSample || user?.isSample) && <SampleDataBadge />}
        </div>
        <h1 className="font-serif text-3xl font-bold text-charcoal-900">
          Institution Review Status
        </h1>
        <p className="text-sm text-charcoal-600 mt-1">
          Track the prototype review standing of {profile?.name || user?.name || 'your care home'}.
        </p>
      </div>

      {error ? (
        <ErrorState
          title="Failed to Load Verification Status"
          message={error}
          onRetry={loadVerification}
        />
      ) : loading ? (
        <div className="py-20 text-center space-y-3 bg-white rounded-3xl border border-sand-200">
          <div className="w-8 h-8 border-2 border-sage-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-charcoal-500">Loading verification details...</p>
        </div>
      ) : (
        <>
          {/* Status Overview Card */}
          <div className="bg-white rounded-3xl border border-sand-200 p-6 sm:p-8 shadow-soft-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-sand-100">
          <div>
            <span className="text-xs font-semibold text-charcoal-500 uppercase tracking-wider block">
              Current Review Stage
            </span>
            <div className="flex items-center gap-2 mt-1">
              <StatusBadge status={currentStatus} type="verification" className="text-sm px-3 py-1" />
            </div>
          </div>

          <div className="text-xs text-charcoal-500 sm:text-right">
            <span>Reviewed by: </span>
            <strong className="text-charcoal-800">
              {profile?.verifiedBy ? 'Platform Administrator' : 'Awaiting reviewer'}
            </strong>
            <p className="mt-0.5 text-charcoal-400">
              {profile?.reviewedAt
                ? `Updated: ${new Date(profile.reviewedAt).toLocaleDateString()}`
                : 'Pending initial audit'}
            </p>
          </div>
        </div>

        {/* Verification Status Details */}
        {currentStatus === 'Approved' && (
          <div className="p-4 rounded-2xl bg-sage-50 border border-sage-200 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-sage-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-sage-900 space-y-1">
              <p className="font-semibold">Review Approved</p>
              <p className="leading-relaxed text-sage-800">
                Your institution's prototype submission has been reviewed and approved. Needs posted by your home appear on the Public Needs Board and are eligible for algorithmic match reservations.
              </p>
            </div>
          </div>
        )}

        {currentStatus === 'Pending' && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3">
            <Clock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 space-y-1">
              <p className="font-semibold">Prototype Review In Progress</p>
              <p className="leading-relaxed text-amber-800">
                Administrative reviewers are inspecting your prototype registration. You can still manage stock and list needs, which will be published upon approval.
              </p>
            </div>
          </div>
        )}

        {currentStatus === 'Rejected' && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 flex items-start gap-3">
            <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-red-900 space-y-1">
              <p className="font-semibold">Prototype Review Rejected</p>
              <p className="leading-relaxed text-red-800">
                Reason noted by administrator: "{profile?.rejectionReason || 'Sample documents were incomplete.'}"
              </p>
            </div>
          </div>
        )}

        {/* Audit Record Summary */}
        <div className="space-y-3 pt-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-charcoal-700">
            Recorded Institutional Data
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-sand-50 rounded-xl border border-sand-200/80">
              <span className="text-charcoal-500 block">Institution Name</span>
              <strong className="text-charcoal-900 text-sm mt-0.5 block">
                {profile?.name || user?.name}
              </strong>
            </div>

            <div className="p-3 bg-sand-50 rounded-xl border border-sand-200/80">
              <span className="text-charcoal-500 block">Care Category</span>
              <strong className="text-charcoal-900 text-sm mt-0.5 block capitalize">
                {profile?.institutionType?.replace('_', ' ') || 'Orphanage'}
              </strong>
            </div>

            <div className="p-3 bg-sand-50 rounded-xl border border-sand-200/80">
              <span className="text-charcoal-500 block">Registered Capacity</span>
              <strong className="text-charcoal-900 text-sm mt-0.5 block">
                {profile?.capacity || '45'} residents
              </strong>
            </div>

            <div className="p-3 bg-sand-50 rounded-xl border border-sand-200/80">
              <span className="text-charcoal-500 block">Address On File</span>
              <strong className="text-charcoal-900 text-sm mt-0.5 block truncate">
                {profile?.address || user?.address || 'Plot 12, Peerzadiguda, Hyderabad'}
              </strong>
            </div>
          </div>
        </div>

        {/* Verification Documents Upload Section */}
        <div className="space-y-4 pt-4 border-t border-sand-200">
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-charcoal-700">
              Institutional Verification Documents
            </h4>
            <p className="text-xs text-charcoal-500 mt-0.5">
              Upload state registration certificates, trust deeds, or care home licenses (PDF or Images, max 5MB).
            </p>
          </div>

          <form onSubmit={handleFileUpload} className="p-4 bg-sand-50/70 rounded-2xl border border-sand-200 space-y-3">
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <input
                type="file"
                accept=".pdf,image/png,image/jpeg,image/jpg"
                onChange={(e) => setSelectedFile(e.target.files[0] || null)}
                className="w-full text-xs text-charcoal-700 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-sand-200 file:text-charcoal-800 hover:file:bg-sand-300 cursor-pointer"
                aria-label="Upload verification document"
              />
              <Button
                type="submit"
                variant="primary"
                size="sm"
                icon={Upload}
                disabled={!selectedFile || uploading}
                loading={uploading}
                className="w-full sm:w-auto text-xs whitespace-nowrap"
              >
                Upload Document
              </Button>
            </div>
            {selectedFile && (
              <p className="text-[11px] text-sage-800 font-mono">
                Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </form>

          {profile?.documents && profile.documents.length > 0 && (
            <div className="space-y-2">
              <span className="text-[11px] font-semibold text-charcoal-600 block">
                Uploaded Documentation ({profile.documents.length})
              </span>
              <div className="space-y-1.5">
                {profile.documents.map((doc, idx) => (
                  <div
                    key={doc._id || doc.filename || idx}
                    className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-sand-200 text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="w-4 h-4 text-terracotta-600 flex-shrink-0" />
                      <span className="font-medium text-charcoal-800 truncate">
                        {doc.originalName || doc.filename}
                      </span>
                      <span className="text-charcoal-400 text-[10px]">
                        ({(doc.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                    <span className="text-[10px] text-charcoal-500 whitespace-nowrap">
                      {new Date(doc.uploadedAt || Date.now()).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      </>
      )}
    </div>
  );
}

export default VerificationStatusPage;
