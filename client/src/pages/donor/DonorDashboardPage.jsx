import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import donationService from '../../services/donationService.js';
import SampleDataBadge from '../../components/common/SampleDataBadge.jsx';
import Button from '../../components/common/Button.jsx';
import { SkeletonCard } from '../../components/common/Skeleton.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import {
  PlusCircle,
  Package,
  Sparkles,
  HeartHandshake,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { DONATION_STATUS } from '../../config/donationStatus.js';

const CHART_COLORS = ['#4A6B53', '#C87D55', '#A9967E', '#5C636D'];

export function DonorDashboardPage() {
  const { user } = useAuth();
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadDonorData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await donationService.getDonorDonations(user?.id);
      setDonations(data);
    } catch (err) {
      console.error('Failed to load donor donations:', err);
      setError(err?.response?.data?.message || err?.message || 'Failed to load donations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDonorData();
  }, [user?.id]);

  // Single definition: Counted as completed when recipient institution has acknowledged receipt (Received or Completed)
  const completedDonationsCount = donations.filter(
    (d) => d.status === DONATION_STATUS.COMPLETED || d.status === DONATION_STATUS.RECEIVED
  ).length;

  // Active contributions: In progress, not completed, received or cancelled
  const activeDonationsCount = donations.filter(
    (d) =>
      d.status !== DONATION_STATUS.COMPLETED &&
      d.status !== DONATION_STATUS.RECEIVED &&
      d.status !== DONATION_STATUS.CANCELLED
  ).length;

  const matchedDonationsCount = donations.filter(
    (d) => d.status === DONATION_STATUS.MATCHED || d.status === DONATION_STATUS.RESERVED
  ).length;

  // Chart data: Contributions by category
  const categoryCounts = donations.reduce((acc, d) => {
    acc[d.category] = (acc[d.category] || 0) + Number(d.quantity || 1);
    return acc;
  }, {});

  const pieData = Object.entries(categoryCounts).map(([cat, val], idx) => ({
    name: cat.split(' ')[0], // Short name
    fullName: cat,
    value: val,
    color: CHART_COLORS[idx % CHART_COLORS.length],
  }));

  // Chart data: Contributions by status
  const statusCounts = donations.reduce((acc, d) => {
    acc[d.status] = (acc[d.status] || 0) + 1;
    return acc;
  }, {});

  const barData = Object.entries(statusCounts).map(([st, cnt]) => ({
    status: st,
    count: cnt,
  }));

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-sand-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-sage-700 uppercase tracking-wider bg-sage-50 px-2.5 py-0.5 rounded-md border border-sage-200">
              Donor Portal
            </span>
            {user?.isSample && <SampleDataBadge />}
          </div>
          <h1 className="font-serif text-3xl font-bold text-charcoal-900">
            Welcome, {user?.name || 'Community Donor'}
          </h1>
          <p className="text-sm text-charcoal-600 mt-1">
            Account Type: <strong className="capitalize">{user?.accountType || 'Individual'}</strong> • Location: {user?.location || user?.address || 'Hyderabad'}
          </p>
        </div>

        <Link to="/donor/create-donation" className="w-full sm:w-auto">
          <Button variant="primary" icon={PlusCircle} className="w-full sm:w-auto shadow-soft-sm">
            Create Donation
          </Button>
        </Link>
      </div>

      {error ? (
        <ErrorState
          title="Failed to Load Dashboard"
          message={error}
          onRetry={loadDonorData}
        />
      ) : (
        <>
          {/* Summary KPI Cards */}
          {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="p-5 rounded-2xl bg-white border border-sand-200 shadow-soft-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-charcoal-500">
                Active Contributions
              </p>
              <Package className="w-5 h-5 text-sage-600" />
            </div>
            <p className="mt-2 font-serif text-3xl font-bold text-charcoal-900">
              {activeDonationsCount}
            </p>
            <p className="mt-1 text-xs text-charcoal-500">Currently listed or in delivery</p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-sand-200 shadow-soft-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-charcoal-500">
                Matched & Reserved
              </p>
              <Sparkles className="w-5 h-5 text-terracotta-500" />
            </div>
            <p className="mt-2 font-serif text-3xl font-bold text-charcoal-900">
              {matchedDonationsCount}
            </p>
            <p className="mt-1 text-xs text-charcoal-500">Aligned with orphanage or elder needs</p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-sand-200 shadow-soft-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-charcoal-500">
                Delivered & Fulfilled
              </p>
              <HeartHandshake className="w-5 h-5 text-charcoal-600" />
            </div>
            <p className="mt-2 font-serif text-3xl font-bold text-charcoal-900">
              {completedDonationsCount}
            </p>
            <p className="mt-1 text-xs text-charcoal-500" title="Counted when recipient institution acknowledges receipt (Received or Completed)">
              Acknowledged as Received or Completed
            </p>
          </div>
        </div>
      )}

      {/* Recharts Analytics Strip */}
      {!loading && donations.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 1: Category Distribution */}
          <div className="p-6 bg-white rounded-3xl border border-sand-200 shadow-soft-sm space-y-3">
            <h3 className="font-serif text-lg font-bold text-charcoal-900">
              Contributions by Category
            </h3>
            <p className="text-xs text-charcoal-500">
              Total volume across non-perishable categories
            </p>
            <div className="h-56 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FAF8F5',
                      borderColor: '#DDD2C3',
                      borderRadius: '12px',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2 text-[11px] text-charcoal-600">
              {pieData.map((d) => (
                <div key={d.name} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                  <span>{d.fullName} ({d.value})</span>
                </div>
              ))}
            </div>
          </div>

          {/* Chart 2: Status Breakdown */}
          <div className="p-6 bg-white rounded-3xl border border-sand-200 shadow-soft-sm space-y-3">
            <h3 className="font-serif text-lg font-bold text-charcoal-900">
              Pledges by Lifecycle Stage
            </h3>
            <p className="text-xs text-charcoal-500">
              Status distribution of your recorded contributions
            </p>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="status" tick={{ fill: '#5C636D', fontSize: 10 }} />
                  <YAxis tick={{ fill: '#5C636D', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FAF8F5',
                      borderColor: '#DDD2C3',
                      borderRadius: '12px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="count" name="Donations" fill="#4A6B53" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Quick Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-3xl bg-sand-100/70 border border-sand-200 space-y-3">
          <h3 className="font-serif text-xl font-bold text-charcoal-900">
            Check Algorithmic Matches
          </h3>
          <p className="text-sm text-charcoal-600">
            View ranked orphanages and old-age homes needing your listed resources, with full 4-component score breakdowns.
          </p>
          <div className="pt-2">
            <Link to="/donor/matches">
              <Button variant="primary" size="sm" icon={Sparkles}>
                View Match Suggestions
              </Button>
            </Link>
          </div>
        </div>

        <div className="p-6 rounded-3xl bg-sand-100/70 border border-sand-200 space-y-3">
          <h3 className="font-serif text-xl font-bold text-charcoal-900">
            Public Needs Directory
          </h3>
          <p className="text-sm text-charcoal-600">
            Browse live verified requests from care homes to see where immediate unfulfilled deficits exist.
          </p>
          <div className="pt-2">
            <Link to="/public-needs">
              <Button variant="secondary" size="sm" icon={ArrowRight}>
                Explore Open Needs
              </Button>
            </Link>
          </div>
        </div>
      </div>
      </>
      )}
    </div>
  );
}

export default DonorDashboardPage;
