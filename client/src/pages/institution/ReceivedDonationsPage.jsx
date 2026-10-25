import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import donationService from '../../services/donationService.js';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import SampleDataBadge from '../../components/common/SampleDataBadge.jsx';
import { PackageCheck, Calendar, CheckCircle, Search } from 'lucide-react';
import Input from '../../components/common/Input.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';

export function ReceivedDonationsPage() {
  const { user } = useAuth();
  const [received, setReceived] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await donationService.getInstitutionReceived(user?.name);
      setReceived(data);
    } catch (err) {
      console.error('Failed to load received donations:', err);
      setError(err?.response?.data?.message || err?.message || 'Failed to load received donations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const filtered = received.filter(
    (item) =>
      item.itemType.toLowerCase().includes(search.toLowerCase()) ||
      item.donorName.toLowerCase().includes(search.toLowerCase()) ||
      item.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="pb-6 border-b border-sand-200">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-sage-800 bg-sage-50 px-2.5 py-0.5 rounded-md border border-sage-200">
            Fulfillment Ledger
          </span>
        </div>
        <h1 className="font-serif text-3xl font-bold text-charcoal-900">
          Received Donations History
        </h1>
        <p className="text-sm text-charcoal-600 mt-1">
          Complete verified audit log of resources handed over and inspected by institutional care staff.
        </p>
      </div>

      {/* Search */}
      <div className="max-w-md">
        <Input
          placeholder="Search by item, category, or donor..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          icon={Search}
        />
      </div>

      {error ? (
        <ErrorState
          title="Failed to Load Received Donations"
          message={error}
          onRetry={loadData}
        />
      ) : loading ? (
        <div className="py-20 text-center space-y-3 bg-white rounded-3xl border border-sand-200">
          <div className="w-8 h-8 border-2 border-sage-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-charcoal-500">Loading handover history...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-3xl border border-sand-200 p-8 space-y-3 shadow-soft-sm">
          <PackageCheck className="w-10 h-10 text-charcoal-400 mx-auto" />
          <h3 className="font-serif text-xl font-bold text-charcoal-900">
            No received records found
          </h3>
          <p className="text-xs text-charcoal-500 max-w-sm mx-auto">
            Once incoming requests are marked as Received or Completed, they are archived here in the inventory ledger.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Mobile Cards (Visible below md) */}
          <div className="md:hidden space-y-3">
            {filtered.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-sand-200 p-4 shadow-soft-sm space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="font-semibold text-charcoal-900 text-sm">{item.itemType}</h4>
                      {item.isSample && <SampleDataBadge />}
                    </div>
                    <span className="text-xs text-charcoal-500 block mt-0.5">{item.category}</span>
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
                  <div>
                    <span className="text-charcoal-400 block text-[11px]">Contributing Donor</span>
                    <span className="text-charcoal-800 font-medium">{item.donorName}</span>
                  </div>
                  <div>
                    <span className="text-charcoal-400 block text-[11px]">Handover Date</span>
                    <span className="text-charcoal-600">{item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : 'October 2026'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table (hidden md:block) */}
          <div className="hidden md:block bg-white rounded-3xl border border-sand-200 shadow-soft-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm text-charcoal-800">
                <thead className="bg-sand-50/80 text-[11px] font-semibold text-charcoal-500 uppercase tracking-wider border-b border-sand-200">
                  <tr>
                    <th scope="col" className="px-6 py-4">Item & Category</th>
                    <th scope="col" className="px-6 py-4">Quantity Handed Over</th>
                    <th scope="col" className="px-6 py-4">Condition</th>
                    <th scope="col" className="px-6 py-4">Contributing Donor</th>
                    <th scope="col" className="px-6 py-4">Audit Status</th>
                    <th scope="col" className="px-6 py-4">Handover Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sand-200/70">
                  {filtered.map((item) => (
                    <tr key={item.id} className="hover:bg-sand-50/60 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-charcoal-900">{item.itemType}</span>
                          {item.isSample && <SampleDataBadge />}
                        </div>
                        <span className="text-xs text-charcoal-500 block mt-0.5">{item.category}</span>
                      </td>

                      <td className="px-6 py-4 font-mono font-medium">
                        {item.quantity} {item.unit}
                      </td>

                      <td className="px-6 py-4">
                        <span className="text-xs bg-sand-100 text-charcoal-700 px-2.5 py-0.5 rounded font-medium">
                          {item.condition}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-xs font-medium text-charcoal-800">
                        {item.donorName}
                      </td>

                      <td className="px-6 py-4">
                        <StatusBadge status={item.status} />
                      </td>

                      <td className="px-6 py-4 text-xs text-charcoal-500">
                        {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : 'October 2026'}
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

export default ReceivedDonationsPage;
