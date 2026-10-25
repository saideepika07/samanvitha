import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import verificationService from '../../services/verificationService.js';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import SampleDataBadge from '../../components/common/SampleDataBadge.jsx';
import Button from '../../components/common/Button.jsx';
import Input from '../../components/common/Input.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import {
  ShieldCheck,
  ShieldAlert,
  Search,
  Filter,
  Eye,
  Building,
  CheckCircle2,
  Clock,
  XCircle,
  ArrowRight,
} from 'lucide-react';

export function InstitutionVerificationReviewPage() {
  const [institutions, setInstitutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const loadInstitutions = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await verificationService.getAllVerifications();
      setInstitutions(data);
    } catch (err) {
      console.error('Failed to load institutions for verification:', err);
      setError(err?.response?.data?.message || err?.message || 'Failed to load institutions for verification.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInstitutions();
  }, []);

  const filtered = (institutions || []).filter((inst) => {
    const q = (search || '').toLowerCase();
    const name = (inst?.name || '').toLowerCase();
    const address = (inst?.address || '').toLowerCase();
    const contact = (inst?.contactPerson || '').toLowerCase();

    const matchesSearch =
      name.includes(q) ||
      address.includes(q) ||
      contact.includes(q);

    const matchesStatus =
      statusFilter === 'all' || inst?.verificationStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-8">
      {/* Prototype Review Governance Banner */}
      <div className="p-4 sm:p-5 rounded-3xl bg-amber-50/80 border border-amber-200 text-amber-900 flex items-start gap-3.5 shadow-soft-sm">
        <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs sm:text-sm">
          <p className="font-semibold text-amber-950">Administrative Prototype Review Notice</p>
          <p className="mt-0.5 text-amber-800 leading-relaxed">
            Institutional verification workflows in this prototype demonstrate compliance verification procedures.
            <strong> Reviews do not constitute or prove formal legal authenticity under statutory registry law.</strong>
          </p>
        </div>
      </div>

      {/* Header */}
      <div className="pb-6 border-b border-sand-200">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-charcoal-700 bg-sand-200 px-2.5 py-0.5 rounded-md">
            Administrative Governance
          </span>
        </div>
        <h1 className="font-serif text-3xl font-bold text-charcoal-900">
          Institution Verification Reviews
        </h1>
        <p className="text-sm text-charcoal-600 mt-1">
          Review care facilities, verify sample documentation, and issue prototype approval or rejection decisions.
        </p>
      </div>

      {/* Filter and Search */}
      <div className="p-4 sm:p-5 bg-white rounded-3xl border border-sand-200 shadow-soft-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <Input
              placeholder="Search by institution name, address, or liaison..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={Search}
            />
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-xl border border-sand-300 bg-sand-50/50 px-3.5 py-2.5 text-sm text-charcoal-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sage-100 focus:border-sage-500"
              aria-label="Filter by verification status"
            >
              <option value="all">All Prototype Review Stages</option>
              <option value="Pending">Pending Review</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
              <option value="Suspended">Suspended</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-charcoal-500 pt-2 border-t border-sand-200/80">
          <span>
            Showing <strong>{filtered.length}</strong> of {institutions.length} institutions
          </span>
          {(search || statusFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setStatusFilter('all');
              }}
              className="text-sage-700 hover:underline cursor-pointer"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      {error ? (
        <ErrorState
          title="Failed to Load Institutions"
          message={error}
          onRetry={loadInstitutions}
        />
      ) : loading ? (
        <div className="py-20 text-center space-y-3 bg-white rounded-3xl border border-sand-200">
          <div className="w-8 h-8 border-2 border-sage-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-charcoal-500">Loading applicant institutions...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-3xl border border-sand-200 p-8 space-y-3 shadow-soft-sm">
          <Building className="w-10 h-10 text-charcoal-400 mx-auto" />
          <h3 className="font-serif text-xl font-bold text-charcoal-900">
            No institutions match filter
          </h3>
          <p className="text-xs text-charcoal-500 max-w-sm mx-auto">
            Try choosing "All Prototype Review Stages" or clearing your search term.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Mobile Cards (Visible below md) */}
          <div className="md:hidden space-y-3">
            {filtered.map((inst) => (
              <div
                key={inst.id}
                className="bg-white rounded-2xl border border-sand-200 p-4 shadow-soft-sm space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="font-semibold text-charcoal-900 text-sm">{inst.name}</h4>
                      {inst.isSample && <SampleDataBadge />}
                    </div>
                    <span className="text-xs text-charcoal-500 capitalize block mt-0.5">
                      {inst.institutionType?.replace('_', ' ') || 'Orphanage'}
                    </span>
                  </div>
                  <StatusBadge status={inst.verificationStatus} type="verification" />
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-sand-100">
                  <div>
                    <span className="text-charcoal-400 block text-[11px]">Location</span>
                    <span className="text-charcoal-800 font-medium truncate block">{inst.address}</span>
                  </div>
                  <div>
                    <span className="text-charcoal-400 block text-[11px]">Capacity</span>
                    <strong className="text-charcoal-900 font-mono">{inst.capacity || '30'} beds</strong>
                  </div>
                  <div>
                    <span className="text-charcoal-400 block text-[11px]">Liaison Contact</span>
                    <span className="text-charcoal-800 font-medium">{inst.contactPerson || 'Liaison'}</span>
                  </div>
                  <div>
                    <span className="text-charcoal-400 block text-[11px]">Phone</span>
                    <span className="text-charcoal-600">{inst.phone}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-sand-100 flex items-center justify-end">
                  <Link to={`/admin/verifications/${inst.id}`}>
                    <Button variant="primary" size="sm" icon={Eye} className="text-xs min-h-[44px]">
                      Review Application
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table (hidden md:block) */}
          <div className="hidden md:block bg-white rounded-3xl border border-sand-200 shadow-soft-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm text-charcoal-800">
                <thead className="bg-sand-50/80 text-[11px] font-semibold text-charcoal-500 uppercase tracking-wider border-b border-sand-200">
                  <tr>
                    <th scope="col" className="px-6 py-4">Institution Title</th>
                    <th scope="col" className="px-6 py-4">Care Category</th>
                    <th scope="col" className="px-6 py-4">Physical Location</th>
                    <th scope="col" className="px-6 py-4">Capacity</th>
                    <th scope="col" className="px-6 py-4">Liaison Contact</th>
                    <th scope="col" className="px-6 py-4">Prototype Status</th>
                    <th scope="col" className="px-6 py-4 text-right">Review Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sand-200/70">
                  {filtered.map((inst) => (
                    <tr key={inst.id} className="hover:bg-sand-50/60 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-charcoal-900">{inst.name}</span>
                          {inst.isSample && <SampleDataBadge />}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-xs capitalize text-charcoal-600">
                        {inst.institutionType?.replace('_', ' ') || 'Orphanage'}
                      </td>

                      <td className="px-6 py-4 text-xs text-charcoal-600 max-w-xs truncate">
                        {inst.address}
                      </td>

                      <td className="px-6 py-4 font-mono text-xs">
                        {inst.capacity || '30'} beds
                      </td>

                      <td className="px-6 py-4 text-xs">
                        <p className="font-medium text-charcoal-800">{inst.contactPerson || 'Liaison'}</p>
                        <p className="text-charcoal-400">{inst.phone}</p>
                      </td>

                      <td className="px-6 py-4">
                        <StatusBadge status={inst.verificationStatus} type="verification" />
                      </td>

                      <td className="px-6 py-4 text-right">
                        <Link to={`/admin/verifications/${inst.id}`}>
                          <Button variant="primary" size="sm" icon={Eye} className="text-xs min-h-[38px]">
                            Review
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default InstitutionVerificationReviewPage;
