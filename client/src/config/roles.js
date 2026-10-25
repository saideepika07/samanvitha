// Roles & Account Types Configuration

export const ROLES = {
  DONOR: 'donor',
  INSTITUTION: 'institution',
  ADMIN: 'admin',
};

export const DONOR_ACCOUNT_TYPES = [
  { id: 'individual', label: 'Individual' },
  { id: 'household', label: 'Household' },
  { id: 'shop', label: 'Local Shop / Retailer' },
  { id: 'business', label: 'Company / Business' },
];

export const INSTITUTION_TYPES = [
  { id: 'orphanage', label: 'Orphanage' },
  { id: 'old_age_home', label: 'Old-Age Home' },
];

export const ROLE_LABELS = {
  [ROLES.DONOR]: 'Donor',
  [ROLES.INSTITUTION]: 'Institution',
  [ROLES.ADMIN]: 'Platform Administrator',
};
