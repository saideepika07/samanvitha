// Seed Sample Users for Prototype Phase
// NOTE: Every seed record is flagged with isSample: true.
// Passwords here are for frontend demonstration only.
// In production, secure hashed authentication with backend tokens will replace this.

export const SAMPLE_USERS = [
  {
    id: 'usr_admin_demo',
    email: 'admin@samanvitha.org',
    password: 'DemoPassword123!', // Comment: Frontend mock only. Replace with secure backend auth.
    name: 'Admin Reviewer',
    role: 'admin',
    phone: '+91 90000 00001',
    createdAt: '2026-01-01T00:00:00Z',
    isSample: true,
  },
  {
    id: 'usr_donor_demo',
    email: 'donor@samanvitha.org',
    password: 'DemoPassword123!',
    name: 'Sravani V.',
    role: 'donor',
    accountType: 'individual', // individual, household, shop, business
    phone: '+91 98765 43210',
    location: 'Madhapur, Hyderabad',
    createdAt: '2026-02-10T11:00:00Z',
    isSample: true,
  },
  {
    id: 'usr_donor_business',
    email: 'retailer@samanvitha.org',
    password: 'DemoPassword123!',
    name: 'Sri Krishna Books & Stationers',
    role: 'donor',
    accountType: 'shop',
    phone: '+91 98480 12345',
    location: 'Koti, Hyderabad',
    createdAt: '2026-02-15T09:30:00Z',
    isSample: true,
  },
  {
    id: 'usr_inst_demo',
    email: 'institution@samanvitha.org',
    password: 'DemoPassword123!',
    name: 'Sample Orphanage 1',
    role: 'institution',
    institutionType: 'orphanage',
    contactPerson: 'S. Kameswara Rao',
    phone: '+91 91234 56789',
    address: 'Plot 12, Peerzadiguda, Hyderabad',
    verificationStatus: 'Approved',
    createdAt: '2026-02-12T14:00:00Z',
    isSample: true,
  },
  {
    id: 'usr_inst_oldage',
    email: 'oldage@samanvitha.org',
    password: 'DemoPassword123!',
    name: 'Sample Old-Age Home 1',
    role: 'institution',
    institutionType: 'old_age_home',
    contactPerson: 'M. Padmavathi',
    phone: '+91 92345 67890',
    address: 'Survey 48, Shamshabad, Hyderabad',
    verificationStatus: 'Pending',
    createdAt: '2026-03-01T16:00:00Z',
    isSample: true,
  },
];
