// Feature Flags Configuration
// -----------------------------------------------------------------------------
// USE_MOCK_DATA controls whether frontend services fall back to client-side
// mock data (localStorage) or strictly require real backend API endpoints.
// Default is FALSE. When true, mock services can be used, and a visible
// "Mock mode" banner is displayed across all pages.
// -----------------------------------------------------------------------------

export const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === 'true' || false;

export const FEATURE_FLAGS = {
  USE_MOCK_DATA,
  MOCK_RESET_LINK: false,
};

export const MOCK_RESET_LINK = FEATURE_FLAGS.MOCK_RESET_LINK;

export default FEATURE_FLAGS;
