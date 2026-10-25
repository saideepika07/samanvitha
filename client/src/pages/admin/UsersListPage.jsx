import React, { useState, useEffect } from 'react';
import authService from '../../services/authService.js';
import { ROLES, ROLE_LABELS } from '../../config/roles.js';
import SampleDataBadge from '../../components/common/SampleDataBadge.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import Input from '../../components/common/Input.jsx';
import { Users, Search, Filter, ShieldCheck, Mail, Phone, Calendar } from 'lucide-react';

export function UsersListPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await authService.getAllUsers();
      setUsers(data || []);
    } catch (err) {
      console.error('Failed to load users list:', err);
      setError(err.message || 'Failed to load users list from server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const filtered = (users || []).filter((u) => {
    const q = (search || '').toLowerCase();
    const name = (u?.name || '').toLowerCase();
    const email = (u?.email || '').toLowerCase();
    const loc = (u?.location || '').toLowerCase();
    const addr = (u?.address || '').toLowerCase();

    const matchesSearch =
      name.includes(q) ||
      email.includes(q) ||
      loc.includes(q) ||
      addr.includes(q);

    const matchesRole = roleFilter === 'all' || u?.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="pb-6 border-b border-sand-200">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-charcoal-700 bg-sand-200 px-2.5 py-0.5 rounded-md">
            Administrative Audit
          </span>
        </div>
        <h1 className="font-serif text-3xl font-bold text-charcoal-900">
          Registered Users Directory
        </h1>
        <p className="text-sm text-charcoal-600 mt-1">
          Comprehensive directory of all registered donors (individual, household, shop, business) and institutional accounts.
        </p>
      </div>

      {/* Error State */}
      {error && !loading && (
        <ErrorState
          title="Unable to Load Users Directory"
          message={error}
          onRetry={loadUsers}
        />
      )}

      {/* Filter and Search */}
      {!error && (
        <div className="p-4 sm:p-5 bg-white rounded-3xl border border-sand-200 shadow-soft-sm space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <Input
                placeholder="Search users by name, email, or area..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                icon={Search}
              />
            </div>

            <div>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full h-11 px-3.5 rounded-2xl bg-sand-50 border border-sand-300 text-charcoal-800 text-sm focus:outline-none focus:ring-2 focus:ring-sage-500 transition"
              >
                <option value="all">All Roles (Any account)</option>
                <option value={ROLES.DONOR}>Donors only</option>
                <option value={ROLES.INSTITUTION}>Institutions only</option>
                <option value={ROLES.ADMIN}>Administrators only</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Table Content */}
      {!error && loading ? (
        <div className="p-12 text-center text-charcoal-500 font-medium bg-white rounded-3xl border border-sand-200">
          Loading directory records from server...
        </div>
      ) : !error && filtered.length === 0 ? (
        <div className="p-12 text-center text-charcoal-500 bg-white rounded-3xl border border-sand-200">
          No registered accounts found matching your filter.
        </div>
      ) : !error && (
        <div className="space-y-4">
          {/* Mobile Cards (Visible below md) */}
          <div className="md:hidden space-y-3">
            {filtered.map((u) => {
              const roleStyle = {
                [ROLES.DONOR]: 'bg-sage-100 text-sage-900 border-sage-300',
                [ROLES.INSTITUTION]: 'bg-terracotta-100 text-terracotta-900 border-terracotta-300',
                [ROLES.ADMIN]: 'bg-sand-200 text-charcoal-900 border-sand-300',
              }[u.role];

              return (
                <div
                  key={u._id || u.id}
                  className="bg-white rounded-2xl border border-sand-200 p-4 shadow-soft-sm space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="font-semibold text-charcoal-900 text-sm">{u.name}</h4>
                        {u.isSample && <SampleDataBadge />}
                      </div>
                      <span className="text-[11px] text-charcoal-400 font-mono block mt-0.5">
                        {u._id || u.id}
                      </span>
                    </div>
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border ${roleStyle}`}>
                      {ROLE_LABELS[u.role] || u.role}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-sand-100">
                    <div>
                      <span className="text-charcoal-400 block text-[11px]">Account Type</span>
                      <span className="text-charcoal-800 font-medium capitalize">
                        {u.accountType || u.institutionType?.replace('_', ' ') || 'Standard'}
                      </span>
                    </div>
                    <div>
                      <span className="text-charcoal-400 block text-[11px]">Phone</span>
                      <span className="text-charcoal-700 font-medium">{u.phone || 'N/A'}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-charcoal-400 block text-[11px]">Email Address</span>
                      <span className="text-charcoal-800 font-mono text-xs break-all">{u.email}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-charcoal-400 block text-[11px]">Location</span>
                      <span className="text-charcoal-600">{u.location || u.address || 'Hyderabad'}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-sand-100 text-[11px] text-charcoal-400 flex items-center justify-between">
                    <span>Registered</span>
                    <span>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'Initial Seed'}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table (hidden md:block) */}
          <div className="hidden md:block bg-white rounded-3xl border border-sand-200 overflow-hidden shadow-soft-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm text-charcoal-700">
                <thead className="bg-sand-100/70 border-b border-sand-200 text-xs uppercase tracking-wider text-charcoal-600">
                  <tr>
                    <th className="px-6 py-4 font-semibold">User Details</th>
                    <th className="px-6 py-4 font-semibold">Role</th>
                    <th className="px-6 py-4 font-semibold">Account / Type</th>
                    <th className="px-6 py-4 font-semibold">Email</th>
                    <th className="px-6 py-4 font-semibold">Contact & Location</th>
                    <th className="px-6 py-4 font-semibold">Registered</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sand-200/70">
                  {filtered.map((u) => {
                    const roleStyle = {
                      [ROLES.DONOR]: 'bg-sage-100 text-sage-900 border-sage-300',
                      [ROLES.INSTITUTION]: 'bg-terracotta-100 text-terracotta-900 border-terracotta-300',
                      [ROLES.ADMIN]: 'bg-sand-200 text-charcoal-900 border-sand-300',
                    }[u.role];

                    return (
                      <tr key={u._id || u.id} className="hover:bg-sand-50/60 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-charcoal-900">{u.name}</span>
                            {u.isSample && <SampleDataBadge />}
                          </div>
                          <span className="text-[11px] text-charcoal-400 font-mono block mt-0.5">
                            {u._id || u.id}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border ${roleStyle}`}>
                            {ROLE_LABELS[u.role] || u.role}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-xs capitalize text-charcoal-600">
                          {u.accountType || u.institutionType?.replace('_', ' ') || 'Standard'}
                        </td>

                        <td className="px-6 py-4 text-xs font-mono text-charcoal-600">
                          {u.email}
                        </td>

                        <td className="px-6 py-4 text-xs text-charcoal-600">
                          <p>{u.phone || 'N/A'}</p>
                          <p className="text-charcoal-400">{u.location || u.address || 'Hyderabad'}</p>
                        </td>

                        <td className="px-6 py-4 text-xs text-charcoal-500">
                          {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'Initial Seed'}
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
    </div>
  );
}

export default UsersListPage;
