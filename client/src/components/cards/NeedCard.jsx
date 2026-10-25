import React from 'react';
import { Link } from 'react-router-dom';
import StatusBadge from '../common/StatusBadge.jsx';
import SampleDataBadge from '../common/SampleDataBadge.jsx';
import Button from '../common/Button.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { ROLES } from '../../config/roles.js';
import { Heart, Building, Calendar, Info, CheckCircle2 } from 'lucide-react';

export function NeedCard({ need, onSelect }) {
  const { user, isAuthenticated } = useAuth();

  const isFulfilled = need.remainingNeed === 0;

  // Donor action link
  const fulfillUrl = isAuthenticated
    ? user?.role === ROLES.DONOR
      ? `/donor/create-donation?needId=${need.id}&category=${encodeURIComponent(need.category)}&itemType=${encodeURIComponent(need.itemType)}`
      : '/donor/dashboard'
    : `/login?redirect=${encodeURIComponent('/public-needs')}`;

  return (
    <div
      className={`bg-white rounded-3xl border transition-all duration-200 p-6 flex flex-col justify-between shadow-soft-sm hover:shadow-soft hover:border-sand-300 ${
        isFulfilled ? 'opacity-75 bg-sand-50/70 border-sand-200' : 'border-sand-200'
      }`}
    >
      <div>
        {/* Top Badges */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-charcoal-600 bg-sand-100 px-2.5 py-1 rounded-lg">
              {need.category}
            </span>
            {need.isSample && <SampleDataBadge />}
          </div>
          <StatusBadge status={need.urgency} type="urgency" />
        </div>

        {/* Item Title & Institution Name */}
        <h3 className="font-serif text-xl font-bold text-charcoal-900 leading-snug">
          {need.itemType}
        </h3>

        <div className="flex items-center gap-2 mt-1.5 text-xs text-charcoal-600">
          <Building className="w-3.5 h-3.5 text-sage-600 flex-shrink-0" />
          <span className="font-medium">{need.institutionName}</span>
          <span className="text-charcoal-300">•</span>
          <span className="capitalize text-charcoal-500">
            {need.institutionType?.replace('_', ' ') || 'Community Home'}
          </span>
        </div>

        {/* Remaining Need Calculation Banner (Strictly required in UI) */}
        <div className="mt-4 p-3.5 bg-sand-50 rounded-2xl border border-sand-200 space-y-2">
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-semibold text-charcoal-600 uppercase tracking-wider">
              Remaining Deficit:
            </span>
            <span
              className={`font-serif text-lg font-bold ${
                isFulfilled ? 'text-sage-700' : 'text-charcoal-900'
              }`}
            >
              {need.remainingNeed} {need.unit}
            </span>
          </div>

          {/* Mathematical Formula breakdown tooltip */}
          <div className="pt-2 border-t border-sand-200/80 flex items-center justify-between text-[11px] text-charcoal-500">
            <span>Required: {need.requiredQuantity}</span>
            <span>− Stock: {need.usableStock}</span>
            <span>− Reserved: {need.reservedQuantity || 0}</span>
          </div>
        </div>

        {/* Notes & Condition */}
        <div className="mt-4 space-y-2 text-xs">
          {need.acceptableCondition && (
            <div className="flex items-start gap-1.5 text-charcoal-600">
              <span className="font-medium text-charcoal-700">Acceptable condition:</span>
              <span>{need.acceptableCondition}</span>
            </div>
          )}

          {need.notes && (
            <p className="text-charcoal-500 italic bg-white p-2.5 rounded-xl border border-sand-100">
              "{need.notes}"
            </p>
          )}
        </div>
      </div>

      {/* Bottom Footer Actions */}
      <div className="mt-6 pt-4 border-t border-sand-100 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 text-xs text-charcoal-500">
          <Calendar className="w-3.5 h-3.5 text-charcoal-400" />
          <span>Deadline: {need.deadline || 'Ongoing'}</span>
        </div>

        {isFulfilled ? (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-sage-800 bg-sage-50 px-3 py-1.5 rounded-xl border border-sage-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-sage-600" />
            Fulfilled
          </span>
        ) : (
          <Link to={fulfillUrl}>
            <Button variant="primary" size="sm" icon={Heart} className="shadow-soft-sm">
              Fulfill Need
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}

export default NeedCard;
