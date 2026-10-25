import React from 'react';

/**
 * SampleDataBadge: Visibly flags prototype demo and sample data records.
 */
export function SampleDataBadge({ isSample = true, className = '' }) {
  if (isSample === false) return null;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium tracking-wide uppercase bg-amber-50 text-amber-800 border border-amber-200 select-none ${className}`}
      title="This record is part of the prototype sample dataset"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" aria-hidden="true" />
      Sample Data
    </span>
  );
}

export default SampleDataBadge;
