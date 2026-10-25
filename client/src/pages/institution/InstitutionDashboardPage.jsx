import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import needService from '../../services/needService.js';
import SampleDataBadge from '../../components/common/SampleDataBadge.jsx';
import Button from '../../components/common/Button.jsx';
import { SkeletonCard } from '../../components/common/Skeleton.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import {
  PlusCircle,
  ClipboardList,
  ShieldCheck,
  Inbox,
  AlertTriangle,
  ArrowRight,
  TrendingDown,
} from 'lucide-react';

export function InstitutionDashboardPage() {
  const { user } = useAuth();
  const [needs, setNeeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadInstitutionData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await needService.getInstitutionNeeds(user?.institutionId || user?.id || 'inst_01');
      setNeeds(data);
    } catch (err) {
      console.error('Failed to load institution needs:', err);
      setError(err?.response?.data?.message || err?.message || 'Failed to load institution needs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInstitutionData();
  }, [user]);

  const openNeeds = needs.filter((n) => n.remainingNeed > 0);
  const criticalNeeds = needs.filter((n) => n.urgency === 'Critical' && n.remainingNeed > 0);
  const totalReserved = needs.reduce((acc, n) => acc + (n.reservedQuantity || 0), 0);

  // Chart data: Need breakdown by category
  const chartMap = {
    'Clothes (including sarees)': { name: 'Clothes', required: 0, stock: 0, remaining: 0 },
    'Books and educational supplies': { name: 'Books/Edu', required: 0, stock: 0, remaining: 0 },
    'Rice and packaged essentials': { name: 'Rice/Grains', required: 0, stock: 0, remaining: 0 },
  };

  needs.forEach((n) => {
    if (chartMap[n.category]) {
      chartMap[n.category].required += Number(n.requiredQuantity || 0);
      chartMap[n.category].stock += Number(n.usableStock || 0);
      chartMap[n.category].remaining += Number(n.remainingNeed || 0);
    }
  });

  const chartData = Object.values(chartMap);

  return (
    <div className="space-y-8">
      {/* Prototype Review Banner */}
      <div className="p-4 rounded-3xl bg-amber-50/80 border border-amber-200 text-amber-900 flex items-start gap-3.5 shadow-soft-sm">
        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs sm:text-sm">
          <p className="font-semibold text-amber-950">Prototype Verification Standing</p>
          <p className="mt-0.5 text-amber-800 leading-relaxed">
            Institutional verification on Samanvitha is currently a prototype review for interface demonstration and does not claim to establish formal legal authenticity under state law.
          </p>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-sand-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-terracotta-700 uppercase tracking-wider bg-terracotta-50 px-2.5 py-0.5 rounded-md border border-terracotta-200">
              Institution Portal
            </span>
            {user?.isSample && <SampleDataBadge />}
          </div>
          <h1 className="font-serif text-3xl font-bold text-charcoal-900">
            {user?.name || 'Care Institution'}
          </h1>
          <p className="text-sm text-charcoal-600 mt-1">
            Care Type: <strong className="capitalize">{user?.institutionType?.replace('_', ' ') || 'Orphanage'}</strong> • Address: {user?.address || 'Hyderabad'}
          </p>
        </div>

        <Link to="/institution/needs/new" className="w-full sm:w-auto">
          <Button variant="accent" icon={PlusCircle} className="w-full sm:w-auto shadow-soft-sm">
            Post New Need
          </Button>
        </Link>
      </div>

      {error ? (
        <ErrorState
          title="Failed to Load Institution Dashboard"
          message={error}
          onRetry={loadInstitutionData}
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
                Active Unfulfilled Needs
              </p>
              <ClipboardList className="w-5 h-5 text-terracotta-600" />
            </div>
            <p className="mt-2 font-serif text-3xl font-bold text-charcoal-900">
              {openNeeds.length}
            </p>
            <p className="mt-1 text-xs text-charcoal-500">Items with remaining demand {'>'} 0</p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-sand-200 shadow-soft-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-charcoal-500">
                Critical Urgency Items
              </p>
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <p className="mt-2 font-serif text-3xl font-bold text-charcoal-900">
              {criticalNeeds.length}
            </p>
            <p className="mt-1 text-xs text-charcoal-500">Impending stock depletion</p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-sand-200 shadow-soft-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-charcoal-500">
                Incoming Units Reserved
              </p>
              <Inbox className="w-5 h-5 text-sage-600" />
            </div>
            <p className="mt-2 font-serif text-3xl font-bold text-charcoal-900">
              {totalReserved}
            </p>
            <p className="mt-1 text-xs text-charcoal-500">Reserved donations pending receipt</p>
          </div>
        </div>
      )}

      {/* Recharts Analytics: Required vs Stock vs Remaining */}
      {!loading && needs.length > 0 && (
        <div className="p-6 bg-white rounded-3xl border border-sand-200 shadow-soft-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-sand-100">
            <div>
              <h3 className="font-serif text-lg font-bold text-charcoal-900">
                Inventory Demand vs Usable Stock
              </h3>
              <p className="text-xs text-charcoal-500">
                Total demand, shelf stock, and unfulfilled deficit across categories
              </p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fill: '#5C636D', fontSize: 11 }} />
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
                <Bar dataKey="remaining" name="Remaining Deficit" fill="#C87D55" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Remaining Need Calculation Principle Card */}
      <div className="p-6 rounded-3xl bg-white border border-sand-200 shadow-soft-sm">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h3 className="font-serif text-xl font-bold text-charcoal-900">
              Transparent Remaining Need Calculation
            </h3>
            <p className="mt-1 text-sm text-charcoal-600">
              All incoming donor pledges automatically decrement unfulfilled demand according to the formula:
            </p>
            <div className="mt-3 inline-block font-mono text-xs sm:text-sm bg-sand-100 px-3.5 py-2 rounded-xl text-charcoal-800 border border-sand-200">
              Remaining Need = Math.max(0, Required Quantity - Usable Stock - Reserved Quantity)
            </div>
          </div>
          <Link to="/institution/my-needs">
            <Button variant="secondary" size="sm" icon={ArrowRight}>
              Manage Needs List
            </Button>
          </Link>
        </div>
      </div>
      </>
      )}
    </div>
  );
}

export default InstitutionDashboardPage;
