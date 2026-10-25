import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/common/Button.jsx';
import SampleDataBadge from '../../components/common/SampleDataBadge.jsx';
import { Construction, ArrowLeft } from 'lucide-react';

export function PlaceholderPage({ title, description, milestone = 'F2 - F4' }) {
  return (
    <div className="p-8 sm:p-12 bg-white rounded-3xl border border-sand-200 text-center max-w-2xl mx-auto shadow-soft-sm space-y-4 my-8">
      <div className="w-12 h-12 rounded-2xl bg-sand-100 flex items-center justify-center mx-auto text-charcoal-700">
        <Construction className="w-6 h-6" />
      </div>
      <div className="flex items-center justify-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-charcoal-500 bg-sand-100 px-2.5 py-0.5 rounded">
          Milestone {milestone} Target
        </span>
      </div>
      <h2 className="font-serif text-2xl font-bold text-charcoal-900">{title}</h2>
      <p className="text-sm text-charcoal-600 leading-relaxed max-w-md mx-auto">
        {description || 'This module is scheduled for implementation in the upcoming milestone phase.'}
      </p>
      <div className="pt-2">
        <Link to="..">
          <Button variant="secondary" size="sm" icon={ArrowLeft}>
            Return to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default PlaceholderPage;
