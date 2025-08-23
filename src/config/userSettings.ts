import { SettingDefinition } from '../types/userSettings';

// ---------- ALLOWED SETTINGS ----------

export const ALLOWED_USER_SETTINGS: Record<string, SettingDefinition> = {
  // Round-up
  roundup_enabled: {
    type: 'boolean',
    default: true,
    editable: true,
    premiumOnly: false,
    description: 'Enable round-up investments',
  },
  roundup_frequency: {
    type: 'enum',
    values: ['instant', 'daily', 'weekly'],
    default: 'instant',
    editable: true,
    premiumOnly: false,
    description: 'How often transactions are rounded up',
  },
  roundup_multiplier: {
    type: 'enum',
    values: [1, 2, 3],
    default: 1,
    editable: true,
    premiumOnly: true,
    description: 'Multiply each round-up amount by this factor',
  },
  roundup_threshold: {
    type: 'number',
    default: 5,
    editable: true,
    premiumOnly: false,
    description: 'Minimum accumulated amount to trigger round-up investment',
  },

  // Auto-Invest
  auto_invest_enabled: {
    type: 'boolean',
    default: false,
    editable: true,
    premiumOnly: true,
    description: 'Recurring deposit toggle',
  },
  auto_invest_amount: {
    type: 'number',
    default: 0,
    editable: true,
    premiumOnly: true,
    description: 'Amount to auto-invest per interval',
  },
  auto_invest_frequency: {
    type: 'enum',
    values: ['weekly', 'bi-weekly', 'monthly'],
    default: 'weekly',
    editable: true,
    premiumOnly: true,
    description: 'Schedule for auto-investment',
  },
  auto_invest_day: {
    type: 'string',
    default: 'monday',
    editable: true,
    premiumOnly: true,
    description: 'Day of week or date (e.g., "15" or "monday")',
  },
  auto_invest_destination_plan_id: {
    type: 'string',
    default: '',
    editable: true,
    premiumOnly: true,
    description: 'Auto-invest target plan ID',
  },
  auto_invest_max_cap: {
    type: 'number',
    default: 1000,
    editable: true,
    premiumOnly: true,
    description: 'Max auto-investment allowed per month',
  },

  // Portfolio
  auto_rebalance_enabled: {
    type: 'boolean',
    default: true,
    editable: true,
    premiumOnly: true,
    description: 'Automatically rebalance portfolio',
  },
  risk_profile: {
    type: 'enum',
    values: ['conservative', 'balanced', 'aggressive'],
    default: 'balanced',
    premiumOnly: false,
    editable: true,

    description: 'Used to suggest plans or ETF weighting',
  },

  // Alerts / Notifications
  investment_confirmation_alerts: {
    type: 'boolean',
    default: true,
    editable: true,
    premiumOnly: false,
    description: 'Notify on successful investment',
  },
  weekly_roundup_summary: {
    type: 'boolean',
    default: false,
    editable: true,
    premiumOnly: true,
    description: 'Weekly roundup performance summary',
  },
  portfolio_drift_alerts: {
    type: 'boolean',
    default: false,
    editable: true,
    premiumOnly: true,
    description: 'Alert when portfolio drifts from target allocation',
  },
  watchlist_alerts_enabled: {
    type: 'boolean',
    default: false,
    editable: true,
    premiumOnly: true,
    description: 'Notify when watchlisted ETFs move significantly',
  },
  roundup_threshold_alert_enabled: {
    type: 'boolean',
    default: true,
    editable: true,
    premiumOnly: true,
    description: 'Notify when round-up crosses defined threshold',
  },

  // Meta / UX
  dark_mode_enabled: {
    type: 'boolean',
    default: false,
    editable: true,
    premiumOnly: false,
    description: 'Dark theme preference',
  },
  educational_tips_enabled: {
    type: 'boolean',
    default: true,
    editable: true,
    premiumOnly: false,
    description: 'Show beginner-friendly investment tips',
  },
  experimental_features_opt_in: {
    type: 'boolean',
    default: false,
    editable: true,
    premiumOnly: false,
    description: 'Allow access to beta features',
  },
};
