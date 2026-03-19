export const TEAMS = [
  'Service Desk',
  'OST',
  'OST BaB',
  'Projects',
  'MGMT',
] as const;

export const ROLES = [
  'Support Engineer',
  'Senior Support',
  'OST',
  'Engineer',
  'MGMT',
  'SE',
  'Service',
] as const;

export const STATUS_COLORS: Record<string, string> = {
  // Available
  'Normal Work': '#22c55e',
  'Service Desk': '#22c55e',
  'SD': '#22c55e',
  'Projects': '#3b82f6',
  'VSOC': '#6366f1',
  'DWP': '#6366f1',
  'Argus': '#6366f1',
  'BaB': '#8b5cf6',
  'On-site': '#059669',
  'WFH': '#14b8a6',
  'Office': '#22c55e',

  // Unavailable
  'Annual Leave': '#ef4444',
  'Leave': '#ef4444',
  'A/L': '#ef4444',
  'Half Day': '#f97316',
  'Bank Holiday': '#f59e0b',
  'Sickness': '#dc2626',
  'Sick Leave': '#dc2626',
  'Compassionate Leave': '#dc2626',
  'Maternity Leave': '#a855f7',

  // Training
  'Training': '#f59e0b',
  'Study': '#f59e0b',
  'Revision': '#f59e0b',
  'Exam': '#f59e0b',

  // Other
  'On-Call': '#06b6d4',
  'Admin': '#64748b',
  'Induction': '#64748b',
  'Left': '#6b7280',
};

export const CATEGORY_COLORS = {
  available: '#22c55e',
  unavailable: '#ef4444',
  partial: '#f59e0b',
} as const;

export const UTILISATION_THRESHOLDS = {
  under: 0.9,
  ideal: 1.0,
  over: 1.1,
} as const;

export const UK_BANK_HOLIDAYS_2026 = [
  '2026-01-01', // New Year's Day
  '2026-04-03', // Good Friday
  '2026-04-06', // Easter Monday
  '2026-05-04', // Early May bank holiday
  '2026-05-25', // Spring bank holiday
  '2026-08-31', // Summer bank holiday
  '2026-12-25', // Christmas Day
  '2026-12-28', // Boxing Day (substitute)
] as const;

export const UK_BANK_HOLIDAYS_2025 = [
  '2025-01-01',
  '2025-04-18',
  '2025-04-21',
  '2025-05-05',
  '2025-05-26',
  '2025-08-25',
  '2025-12-25',
  '2025-12-26',
] as const;

export const UK_BANK_HOLIDAYS_2024 = [
  '2024-01-01',
  '2024-03-29',
  '2024-04-01',
  '2024-05-06',
  '2024-05-27',
  '2024-08-26',
  '2024-12-25',
  '2024-12-26',
] as const;

export const ALL_BANK_HOLIDAYS: Set<string> = new Set([
  ...UK_BANK_HOLIDAYS_2024,
  ...UK_BANK_HOLIDAYS_2025,
  ...UK_BANK_HOLIDAYS_2026,
]);
