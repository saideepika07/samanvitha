import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import needService from '../../services/needService.js';
import donationService from '../../services/donationService.js';
import verificationService from '../../services/verificationService.js';
import authService from '../../services/authService.js';
import adminService from '../../services/adminService.js';
import storage from '../../services/storageService.js';
import { USE_MOCK_DATA } from '../../config/featureFlags.js';
import { useToast } from '../../hooks/useToast.js';
import SampleDataBadge from '../../components/common/SampleDataBadge.jsx';
import Button from '../../components/common/Button.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  ShieldCheck,
  ClipboardList,
  Package,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Users,
  AlertOctagon,
  ArrowRight,
  TrendingUp,
  Info,
} from 'lucide-react';
import { DONATION_STATUS } from '../../config/donationStatus.js';

// Muted natural theme colors for Recharts
const CHART_COLORS = {
  sage: '#4A6B53',
  terracotta: '#C87D55',
  sand: '#A9967E',
  charcoal: '#34383F',
  lightSage: '#7E9F86',
};

const PIE_COLORS = ['#4A6B53', '#C87D55', '#A9967E', '#5C636D'];

export function AdminDashboardPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [stats, setStats] = useState({
    needsCount: 0,
    donationsCount: 0,
    deliveriesCompleted: 0,
    pendingVerifications: 0,
    usersCount: 0,
    donationStatusCounts: {},
  });

  const [categoryData, setCategoryData] = useState([]);
  const [fulfillmentData, setFulfillmentData] = useState([]);
  const [lifecycleData, setLifecycleData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadAdminData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Attempt to load unified analytics from backend endpoint if not in mock mode
      let analytics = null;
      if (!USE_MOCK_DATA) {
        try {
          analytics = await adminService.getAnalytics();
        } catch (apiErr) {
          console.warn('Dedicated analytics endpoint unavailable, falling back to multi-service load:', apiErr.message);
        }
      }

      if (analytics) {
        setStats({
          needsCount: Number(analytics.needs?.totalNeeds || 0),
          donationsCount: Number(analytics.donations?.total || 0),
          deliveriesCompleted: Number(analytics.donations?.completed || 0),
          pendingVerifications: Number(analytics.institutions?.pending || 0),
          usersCount: Number(analytics.users?.total || 0),
          donationStatusCounts: analytics.donations?.byStatus || {},
        });

        // 1. Category Breakdown
        const rawCats = analytics.categoryData || [];
        const catMap = {
          'Clothes (including sarees)': { category: 'Clothes', required: 0, stock: 0, reserved: 0 },
          'Books and educational supplies': { category: 'Books/Edu', required: 0, stock: 0, reserved: 0 },
          'Rice and packaged essentials': { category: 'Rice/Grains', required: 0, stock: 0, reserved: 0 },
        };

        rawCats.forEach((c) => {
          if (c?.category && catMap[c.category]) {
            catMap[c.category].required = Number(c.required || 0);
            catMap[c.category].stock = Number(c.stock || 0);
            catMap[c.category].reserved = Number(c.reserved || 0);
          }
        });
        setCategoryData(Object.values(catMap));

        // 2. Fulfillment Breakdown
        const totalUsable = Number(analytics.needs?.totalUsableStock || 0);
        const totalReserved = Number(analytics.needs?.totalReservedQuantity || 0);
        const totalRemaining = Number(analytics.needs?.totalRemainingDeficit || 0);

        setFulfillmentData([
          { name: 'Stock on Hand', value: totalUsable, color: CHART_COLORS.sage },
          { name: 'Reserved In-Transit', value: totalReserved, color: CHART_COLORS.terracotta },
          { name: 'Unmet Remaining Deficit', value: totalRemaining, color: CHART_COLORS.sand },
        ]);

        // 3. Donation Lifecycle Stage Distribution
        const stages = [
          'Listed',
          'Matched',
          'Reserved',
          'Ready for delivery',
          'Delivered',
          'Received',
          'Completed',
        ];
        const byStatus = analytics.donations?.byStatus || {};
        const stageCounts = stages.map((st) => ({
          stage: st,
          count: Number(byStatus[st] || 0),
        }));
        setLifecycleData(stageCounts);
      } else {
        // Fallback / Mock mode: aggregate from services
        const [needs, donations, verifications, users] = await Promise.all([
          needService.getPublicNeeds(),
          donationService.getAllDonations(),
          verificationService.getAllVerifications(),
          authService.getAllUsers(),
        ]);

        const safeDonations = donations || [];
        const safeNeeds = needs || [];
        const safeVerifications = verifications || [];
        const safeUsers = users || [];

        // Single definition: Completed Deliveries = Received or Completed
        const completed = safeDonations.filter(
          (d) => d?.status === DONATION_STATUS.RECEIVED || d?.status === DONATION_STATUS.COMPLETED
        ).length;

        // Pledged donations: Only non-cancelled donations
        const pledged = safeDonations.filter(
          (d) => d?.status !== DONATION_STATUS.CANCELLED
        ).length;

        const pending = safeVerifications.filter((v) => v?.verificationStatus === 'Pending').length;

        const fallbackStatusCounts = {};
        Object.values(DONATION_STATUS).forEach((st) => {
          fallbackStatusCounts[st] = 0;
        });
        safeDonations.forEach((d) => {
          if (d?.status && fallbackStatusCounts[d.status] !== undefined) {
            fallbackStatusCounts[d.status] += 1;
          }
        });

        setStats({
          needsCount: safeNeeds.length,
          donationsCount: pledged,
          deliveriesCompleted: completed,
          pendingVerifications: pending,
          usersCount: safeUsers.length,
          donationStatusCounts: fallbackStatusCounts,
        });

        // 1. Data-derived Category Breakdown (Clothes, Books, Rice)
        const catMap = {
          'Clothes (including sarees)': { category: 'Clothes', required: 0, stock: 0, reserved: 0 },
          'Books and educational supplies': { category: 'Books/Edu', required: 0, stock: 0, reserved: 0 },
          'Rice and packaged essentials': { category: 'Rice/Grains', required: 0, stock: 0, reserved: 0 },
        };

        safeNeeds.forEach((n) => {
          if (n?.category && catMap[n.category]) {
            catMap[n.category].required += Number(n.requiredQuantity || 0);
            catMap[n.category].stock += Number(n.usableStock || 0);
            catMap[n.category].reserved += Number(n.reservedQuantity || 0);
          }
        });
        setCategoryData(Object.values(catMap));

        // 2. Data-derived Fulfilled vs Outstanding Deficit
        let totalRemaining = 0;
        let totalUsable = 0;
        let totalReserved = 0;

        safeNeeds.forEach((n) => {
          totalRemaining += Number(n?.remainingNeed || 0);
          totalUsable += Number(n?.usableStock || 0);
          totalReserved += Number(n?.reservedQuantity || 0);
        });

        setFulfillmentData([
          { name: 'Stock on Hand', value: totalUsable, color: CHART_COLORS.sage },
          { name: 'Reserved In-Transit', value: totalReserved, color: CHART_COLORS.terracotta },
          { name: 'Unmet Remaining Deficit', value: totalRemaining, color: CHART_COLORS.sand },
        ]);

        // 3. Donation Lifecycle Stage Distribution
        const stages = [
          'Listed',
          'Matched',
          'Reserved',
          'Ready for delivery',
          'Delivered',
          'Received',
          'Completed',
        ];
        const stageCounts = stages.map((st) => ({
          stage: st,
          count: safeDonations.filter((d) => d?.status === st).length,
        }));
        setLifecycleData(stageCounts);
      }
    } catch (err) {
      console.error('Failed to load admin stats:', err);
      setError(err?.response?.data?.message || err?.message || 'Failed to load administrative statistics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleResetSampleData = () => {
    storage.resetAll();
    toast.success('Sample prototype dataset re-seeded to factory defaults!');
    loadAdminData();
  };

  return (
    <div className="space-y-8">
      {/* Disclaimer Banner */}
      <div className="p-4 rounded-2xl bg-sand-100 border border-sand-300 text-charcoal-800 flex flex-col sm:flex-row items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-terracotta-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm">
            <p className="font-semibold text-charcoal-900">
              Prototype Review & Strictly Derived Metrics Notice
            </p>
            <p className="mt-0.5 text-charcoal-600 leading-relaxed">
              Institution verification in this prototype demonstrates review workflows and does not imply formal legal registration. Impact metrics strictly represent data-derived counts (needs, contributions, completed handovers). No monetary or meal estimates are fabricated.
            </p>
          </div>
        </div>

        {USE_MOCK_DATA && (
          <Button
            variant="secondary"
            size="sm"
            onClick={handleResetSampleData}
            icon={RotateCcw}
            title="Reset sample data back to seed state"
            className="w-full sm:w-auto flex-shrink-0"
          >
            Reset Sample Data
          </Button>
        )}
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-sand-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-charcoal-700 uppercase tracking-wider bg-sand-200 px-2.5 py-0.5 rounded-md">
              Administration & Audit
            </span>
            {user?.isSample && <SampleDataBadge />}
          </div>
          <h1 className="font-serif text-3xl font-bold text-charcoal-900">
            Platform Impact Overview
          </h1>
          <p className="text-sm text-charcoal-600 mt-1">
            Data-derived counts of community needs, matching flow, and institutional compliance.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link to="/admin/verifications" className="w-full sm:w-auto">
            <Button variant="primary" icon={ShieldCheck} className="w-full sm:w-auto">
              Review Verifications ({stats.pendingVerifications})
            </Button>
          </Link>
        </div>
      </div>

      {error ? (
        <ErrorState
          title="Failed to Load Overview Data"
          message={error}
          onRetry={loadAdminData}
        />
      ) : (
        <>
          {/* KPI Cards: Pure Derived Counts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-5 rounded-2xl bg-white border border-sand-200 shadow-soft-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-charcoal-500">
              Recorded Needs
            </p>
            <ClipboardList className="w-5 h-5 text-sage-600" />
          </div>
          <p className="mt-2 font-serif text-3xl font-bold text-charcoal-900">
            {loading ? '...' : stats.needsCount}
          </p>
          <p className="mt-1 text-xs text-charcoal-500">Total institutional need entries</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-sand-200 shadow-soft-sm relative group">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-charcoal-500">
                Pledged Donations
              </p>
              <div
                className="relative cursor-help"
                title={`Pledged donations by status:\n${Object.entries(stats.donationStatusCounts)
                  .map(([s, c]) => `${s}: ${c}`)
                  .join('\n')}`}
              >
                <Info className="w-3.5 h-3.5 text-charcoal-400 hover:text-charcoal-600 transition-colors" />
                <div className="hidden group-hover:block absolute left-0 sm:left-auto sm:right-0 top-full mt-2 z-20 w-64 p-3 bg-charcoal-900 text-white rounded-xl shadow-xl text-xs space-y-1.5 pointer-events-none">
                  <p className="font-semibold border-b border-charcoal-700 pb-1 text-sand-200">
                    Pledged Donations by Status
                  </p>
                  <p className="text-[11px] text-charcoal-300">
                    Active & fulfilled contributions (excludes Cancelled):
                  </p>
                  <div className="space-y-0.5 pt-1">
                    {Object.entries(stats.donationStatusCounts).map(([st, cnt]) => (
                      <div key={st} className="flex justify-between items-center text-[11px]">
                        <span className={st === DONATION_STATUS.CANCELLED ? 'text-charcoal-400 line-through' : 'text-charcoal-200'}>
                          {st}:
                        </span>
                        <span className="font-mono font-medium text-white">{cnt}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <Package className="w-5 h-5 text-terracotta-600" />
          </div>
          <p className="mt-2 font-serif text-3xl font-bold text-charcoal-900">
            {loading ? '...' : stats.donationsCount}
          </p>
          <p className="mt-1 text-xs text-charcoal-500">Total non-cancelled pledges</p>
        </div>

        {/* Single Definition: Count a delivery as completed when the institution has acknowledged receipt (Received or Completed) */}
        <div className="p-5 rounded-2xl bg-white border border-sand-200 shadow-soft-sm relative group">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-charcoal-500">
                Completed Deliveries
              </p>
              <div
                className="relative cursor-help"
                title="Counted when the recipient institution has acknowledged receipt (status 'Received' or 'Completed')."
              >
                <Info className="w-3.5 h-3.5 text-charcoal-400 hover:text-charcoal-600 transition-colors" />
                <div className="hidden group-hover:block absolute left-0 sm:left-auto sm:right-0 top-full mt-2 z-20 w-60 p-2.5 bg-charcoal-900 text-white rounded-xl shadow-xl text-xs space-y-1 pointer-events-none">
                  <p className="font-semibold text-sand-200">Completed Deliveries Rule</p>
                  <p className="text-[11px] text-charcoal-300 leading-relaxed">
                    Counted when the recipient institution has acknowledged receipt of goods (status "Received" or "Completed").
                  </p>
                </div>
              </div>
            </div>
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="mt-2 font-serif text-3xl font-bold text-charcoal-900">
            {loading ? '...' : stats.deliveriesCompleted}
          </p>
          <p className="mt-1 text-xs text-charcoal-500">Acknowledged receipt (Received or Completed)</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-sand-200 shadow-soft-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-charcoal-500">
              Registered Accounts
            </p>
            <Users className="w-5 h-5 text-charcoal-700" />
          </div>
          <p className="mt-2 font-serif text-3xl font-bold text-charcoal-900">
            {loading ? '...' : stats.usersCount}
          </p>
          <p className="mt-1 text-xs text-charcoal-500">Donors, homes, and reviewers</p>
        </div>
      </div>

      {/* Visual Impact Charts in Muted Natural Palette */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Quantities by Category */}
        <div className="p-6 bg-white rounded-3xl border border-sand-200 shadow-soft-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-sand-100">
            <div>
              <h3 className="font-serif text-lg font-bold text-charcoal-900">
                Supply Quantities by Category
              </h3>
              <p className="text-xs text-charcoal-500">
                Required demand vs usable stock vs reserved in-transit
              </p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="category" tick={{ fill: '#5C636D', fontSize: 11 }} />
                <YAxis tick={{ fill: '#5C636D', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FAF8F5',
                    borderColor: '#DDD2C3',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar dataKey="required" name="Total Required" fill="#A9967E" radius={[4, 4, 0, 0]} />
                <Bar dataKey="stock" name="Usable Stock" fill="#4A6B53" radius={[4, 4, 0, 0]} />
                <Bar dataKey="reserved" name="Reserved In-Transit" fill="#C87D55" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Fulfilled vs Outstanding Deficit */}
        <div className="p-6 bg-white rounded-3xl border border-sand-200 shadow-soft-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-sand-100">
            <div>
              <h3 className="font-serif text-lg font-bold text-charcoal-900">
                Need Fulfillment Breakdown
              </h3>
              <p className="text-xs text-charcoal-500">
                Aggregate inventory distribution across care homes
              </p>
            </div>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            {fulfillmentData.length === 0 || fulfillmentData.every((d) => !d.value || d.value === 0) ? (
              <div className="text-center p-6 text-charcoal-400">
                <p className="text-sm font-medium">No inventory or active deficits recorded yet.</p>
                <p className="text-xs mt-1 text-charcoal-400">Charts will populate as care homes record required supplies.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={fulfillmentData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {fulfillmentData.map((entry, index) => (
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
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Chart 3: Donation Lifecycle Stages */}
      <div className="p-6 bg-white rounded-3xl border border-sand-200 shadow-soft-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-sand-100">
          <div>
            <h3 className="font-serif text-lg font-bold text-charcoal-900">
              Donation Lifecycle Distribution
            </h3>
            <p className="text-xs text-charcoal-500">
              Volume of contributions across the 7 progressive handover stages
            </p>
          </div>
        </div>

        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={lifecycleData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="stage" tick={{ fill: '#5C636D', fontSize: 10 }} />
              <YAxis tick={{ fill: '#5C636D', fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#FAF8F5',
                  borderColor: '#DDD2C3',
                  borderRadius: '12px',
                  fontSize: '12px',
                }}
              />
              <Bar dataKey="count" name="Donation Batches" fill="#4A6B53" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Admin Module Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-white border border-sand-200 shadow-soft-sm space-y-3">
          <div className="w-10 h-10 rounded-xl bg-sage-100 flex items-center justify-center text-sage-700">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="font-serif text-xl font-bold text-charcoal-900">
            Prototype Verifications
          </h3>
          <p className="text-xs text-charcoal-600">
            Examine applicant orphanages and old-age homes. Approve or reject with structured rationale.
          </p>
          <div className="pt-2">
            <Link to="/admin/verifications">
              <Button variant="secondary" size="sm" icon={ArrowRight}>
                Review Submissions
              </Button>
            </Link>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-sand-200 shadow-soft-sm space-y-3">
          <div className="w-10 h-10 rounded-xl bg-terracotta-100 flex items-center justify-center text-terracotta-700">
            <Users className="w-5 h-5" />
          </div>
          <h3 className="font-serif text-xl font-bold text-charcoal-900">
            Users Directory
          </h3>
          <p className="text-xs text-charcoal-600">
            Audit registered donors (individual, household, shop, business) and verified institutional accounts.
          </p>
          <div className="pt-2">
            <Link to="/admin/users">
              <Button variant="secondary" size="sm" icon={ArrowRight}>
                View Directory
              </Button>
            </Link>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-sand-200 shadow-soft-sm space-y-3">
          <div className="w-10 h-10 rounded-xl bg-sand-200 flex items-center justify-center text-charcoal-700">
            <AlertOctagon className="w-5 h-5" />
          </div>
          <h3 className="font-serif text-xl font-bold text-charcoal-900">
            Disputes & Delivery Issues
          </h3>
          <p className="text-xs text-charcoal-600">
            Track flagged delivery delays, item grade discrepancies, or unfulfilled match reservations.
          </p>
          <div className="pt-2">
            <Link to="/admin/disputes">
              <Button variant="secondary" size="sm" icon={ArrowRight}>
                Manage Disputes
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

export default AdminDashboardPage;
