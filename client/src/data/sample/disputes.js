// Seed Sample Disputes / Delivery Issues for Admin Portal

export const SAMPLE_DISPUTES = [
  {
    id: 'disp_01',
    donationId: 'don_02',
    donorName: 'Sravani V.',
    institutionName: 'Sample Old-Age Home 1',
    issueType: 'Delivery Delay',
    description: 'Scheduled drop-off was delayed due to heavy rains in Shamshabad area. Donor contacted institution to reschedule for next Monday.',
    status: 'Resolved',
    createdAt: '2026-10-16T10:00:00Z',
    resolvedAt: '2026-10-17T12:00:00Z',
    resolutionNotes: 'Mutual drop-off date agreed upon between both parties.',
    isSample: true,
  },
  {
    id: 'disp_02',
    donationId: 'don_99',
    donorName: 'Individual Donor 4',
    institutionName: 'Sample Orphanage 2',
    issueType: 'Condition Mismatch',
    description: 'Received item condition differed from listed grade. Donated books had significant tears.',
    status: 'Under Review',
    createdAt: '2026-10-17T14:30:00Z',
    resolvedAt: null,
    resolutionNotes: null,
    isSample: true,
  },
];
