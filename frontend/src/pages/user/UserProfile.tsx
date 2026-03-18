import { useEffect, useMemo, useState } from 'react';

import { userApi, type UserProfileStats } from '../../lib/api/user';

export default function UserProfile() {
    const [profile, setProfile] = useState<UserProfileStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await userApi.getProfileStats();
                setProfile(data);
            } catch (err: any) {
                setError(err?.response?.data?.detail || 'Failed to load profile analytics');
            } finally {
                setLoading(false);
            }
        };

        load();
    }, []);

    const kpis = useMemo(() => {
        if (!profile) return [];
        return [
            { label: 'Total Datasets', value: profile.totals.total_datasets },
            { label: 'Dashboards Generated', value: profile.totals.total_dashboards_generated },
            { label: 'Total Analysis Runs', value: profile.totals.total_analyses },
            { label: 'Chat Sessions', value: profile.totals.total_chat_sessions },
        ];
    }, [profile]);

    const sourceRows = useMemo(() => {
        if (!profile) return [];
        return Object.entries(profile.dataset_sources)
            .map(([name, value]) => ({ name: name.toUpperCase(), value }))
            .sort((a, b) => b.value - a.value);
    }, [profile]);

    const topFeatures = useMemo(() => {
        if (!profile) return [];
        return [...profile.feature_usage]
            .sort((a, b) => b.count - a.count)
            .slice(0, 8);
    }, [profile]);

    const monthlyRows = useMemo(() => {
        if (!profile) return [];
        return [...profile.monthly_activity].map((row) => {
            const [y, m] = row.month.split('-');
            const monthLabel = new Date(Number(y), Number(m) - 1, 1).toLocaleString('en-US', {
                month: 'short',
                year: 'numeric',
            });
            return { ...row, monthLabel };
        });
    }, [profile]);

    return (
        <div className="p-6 md:p-8 max-w-[1400px] mx-auto w-full">
            <div className="mb-6">
                <h1 className="text-2xl md:text-3xl font-serif tracking-wide text-themed-main">User Profile</h1>
                <p className="text-sm text-themed-muted mt-1">Clean activity summary across datasets, dashboards, chat, and analysis workflows.</p>
            </div>

            {loading && (
                <div className="glass-panel rounded-sm p-8 text-themed-muted">Loading profile analytics...</div>
            )}

            {error && (
                <div className="glass-panel rounded-sm p-8 text-red-600 dark:text-red-400">{error}</div>
            )}

            {!loading && !error && profile && (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
                        {kpis.map((kpi) => (
                            <div key={kpi.label} className="glass-panel rounded-sm p-4 border border-border-main">
                                <p className="text-xs uppercase tracking-widest text-themed-muted mb-2">{kpi.label}</p>
                                <p className="text-3xl font-serif text-themed-main">{kpi.value.toLocaleString()}</p>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
                        <div className="glass-panel rounded-sm p-5 border border-border-main xl:col-span-2">
                            <h2 className="text-sm uppercase tracking-widest text-themed-muted mb-4">Dashboard Tracking</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="rounded-sm border border-border-main bg-bg-card p-4">
                                    <p className="text-xs uppercase tracking-widest text-themed-muted mb-2">Generated Dashboards</p>
                                    <p className="text-3xl font-serif text-themed-main">{profile.totals.total_dashboards_generated.toLocaleString()}</p>
                                    <p className="text-xs text-themed-muted mt-2">Recorded from dashboard analysis executions.</p>
                                </div>
                                <div className="rounded-sm border border-border-main bg-bg-card p-4">
                                    <p className="text-xs uppercase tracking-widest text-themed-muted mb-2">Saved Dashboards</p>
                                    <p className="text-3xl font-serif text-themed-main">{profile.totals.total_saved_dashboards.toLocaleString()}</p>
                                    <p className="text-xs text-themed-muted mt-2">User-saved dashboard configurations.</p>
                                </div>
                            </div>
                            <p className="text-sm text-themed-muted mt-4">
                                Total Analysis Runs includes dashboard, chart, text-query, and interpretive analysis executions.
                            </p>
                        </div>

                        <div className="glass-panel rounded-sm p-5 border border-border-main">
                            <h2 className="text-sm uppercase tracking-widest text-themed-muted mb-4">Dataset Sources</h2>
                            <div className="space-y-2">
                                {sourceRows.length === 0 && (
                                    <p className="text-sm text-themed-muted">No source activity recorded.</p>
                                )}
                                {sourceRows.map((row) => (
                                    <div key={row.name} className="flex items-center justify-between rounded-sm border border-border-main bg-bg-card px-3 py-2">
                                        <span className="text-xs uppercase tracking-widest text-themed-muted">{row.name}</span>
                                        <span className="font-semibold text-themed-main">{row.value.toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        <div className="glass-panel rounded-sm p-5 border border-border-main">
                            <h2 className="text-sm uppercase tracking-widest text-themed-muted mb-4">Feature Usage</h2>
                            <div className="space-y-2">
                                {topFeatures.map((item) => (
                                    <div key={item.feature} className="flex items-center justify-between rounded-sm border border-border-main bg-bg-card px-3 py-2.5">
                                        <span className="text-sm text-themed-main">{item.feature}</span>
                                        <span className="text-sm font-semibold text-themed-main">{item.count.toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="glass-panel rounded-sm p-5 border border-border-main">
                            <h2 className="text-sm uppercase tracking-widest text-themed-muted mb-4">Monthly Activity (Last 12 Months)</h2>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-left text-xs uppercase tracking-widest text-themed-muted border-b border-border-main">
                                            <th className="py-2 pr-3">Month</th>
                                            <th className="py-2 pr-3">Uploads</th>
                                            <th className="py-2 pr-3">Generated</th>
                                            <th className="py-2 pr-3">Saved</th>
                                            <th className="py-2 pr-3">Analyses</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {monthlyRows.map((row) => (
                                            <tr key={row.month} className="border-b border-border-main/60">
                                                <td className="py-2 pr-3 text-themed-main">{row.monthLabel}</td>
                                                <td className="py-2 pr-3 text-themed-main">{row.uploads.toLocaleString()}</td>
                                                <td className="py-2 pr-3 text-themed-main">{row.generated_dashboards.toLocaleString()}</td>
                                                <td className="py-2 pr-3 text-themed-main">{row.saved_dashboards.toLocaleString()}</td>
                                                <td className="py-2 pr-3 text-themed-main">{row.analyses.toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
