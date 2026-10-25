// Seed Sample Notifications

export const SAMPLE_NOTIFICATIONS = [
  {
    id: 'notif_01',
    userId: 'usr_donor_demo',
    title: 'Match Suggested',
    message: 'Your donation of 40 Notebooks matched with Sample Orphanage 1 (Match Score: 84.8%).',
    type: 'match',
    read: false,
    createdAt: '2026-10-14T10:05:00Z',
    isSample: true,
  },
  {
    id: 'notif_02',
    userId: 'usr_donor_demo',
    title: 'Reservation Confirmed',
    message: 'Sample Old-Age Home 1 reserved your donation of 12 Cotton Sarees.',
    type: 'reservation',
    read: true,
    createdAt: '2026-10-15T15:00:00Z',
    isSample: true,
  },
  {
    id: 'notif_03',
    userId: 'usr_inst_demo',
    title: 'New Donation Match Available',
    message: 'A donor in Madhapur listed 40 Notebook sets matching your High urgency need.',
    type: 'match',
    read: false,
    createdAt: '2026-10-14T10:02:00Z',
    isSample: true,
  },
  {
    id: 'notif_04',
    userId: 'usr_inst_oldage',
    title: 'Prototype Verification Status: Pending',
    message: 'Your institutional profile has been submitted for prototype review by our administrative team.',
    type: 'verification',
    read: false,
    createdAt: '2026-03-01T16:05:00Z',
    isSample: true,
  },
];
