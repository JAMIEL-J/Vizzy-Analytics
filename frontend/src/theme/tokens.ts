export const VIZZY_THEME = {
    primary: '#6c63ff',
    primaryDark: '#3525cd',
    primaryMid: '#4f46e5',
    primarySoft: '#7f77ff',
    primaryMuted: '#9f99ff',
    secondary: '#00d4aa',
    secondarySoft: '#8be6d1',
    secondaryDeep: '#0ea5a4',
    neutralDeep: '#2c2c54',
} as const;

export const VIZZY_CHART_COLORS = [
    VIZZY_THEME.primary,     // Original Primary
    '#3B82F6',               // Vibrant Blue
    '#10B981',               // Emerald Green
    '#F59E0B',               // Amber Yellow
    '#EF4444',               // Red
    '#8B5CF6',               // Violet
    '#EC4899',               // Pink
    '#06B6D4',               // Cyan
    '#F97316',               // Orange
    '#14B8A6',               // Teal
    VIZZY_THEME.secondary,   // Original Secondary
] as const;
