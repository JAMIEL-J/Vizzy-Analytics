import { useEffect, useMemo, useState } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    LineChart,
    Line,
    Legend,
} from 'recharts';

import { userApi, type UserProfileStats } from '../../lib/api/user';

const COLORS = ['#ff6933', '#ff9e66', '#cc4c18', '#fd8d3c', '#a63603', '#ffcfb3'];

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

    const sourcePie = useMemo(() => {
        if (!profile) return [];
        return Object.entries(profile.dataset_sources).map(([name, value]) => ({ name: name.toUpperCase(), value }));
    }, [profile]);

    return (
        <div className="p-6 md:p-8 max-w-[1400px] mx-auto w-full">
            <div className="mb-6">
                <h1 className="text-2xl md:text-3xl font-serif tracking-wide text-themed-main">User Profile</h1>
                <p className="text-sm text-themed-muted mt-1">Your usage analytics based on datasets, dashboards, chat, and analysis workflows.</p>
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

                    <div className="glass-panel rounded-sm p-4 border border-border-main mb-6 text-sm text-themed-muted">
                        <p>
                            Total Analysis Runs includes all orchestrated analysis executions recorded by the backend
                            (dashboard runs, chart analyses, text-query analyses, and interpretive analyses).
                        </p>
                        <p className="mt-1">
                            Saved Dashboards: <span className="text-themed-main font-semibold">{profile.totals.total_saved_dashboards.toLocaleString()}</span>
                        </p>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
                        <div className="glass-panel rounded-sm p-4 border border-border-main xl:col-span-2">
                            <h2 className="text-sm uppercase tracking-widest text-themed-muted mb-4">Monthly Activity</h2>
                            <div className="h-72">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={profile.monthly_activity}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-main)" />
                                        <XAxis dataKey="month" stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
                                        <YAxis stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
                                        <Tooltip />
                                        <Legend />
                                        <Line type="monotone" dataKey="uploads" stroke="#ff6933" strokeWidth={2.5} dot={false} />
                                        <Line type="monotone" dataKey="generated_dashboards" stroke="#cc4c18" strokeWidth={2.5} dot={false} />
                                        <Line type="monotone" dataKey="saved_dashboards" stroke="#ff9e66" strokeWidth={2.5} dot={false} />
                                        <Line type="monotone" dataKey="analyses" stroke="#fd8d3c" strokeWidth={2.5} dot={false} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="glass-panel rounded-sm p-4 border border-border-main">
                            <h2 className="text-sm uppercase tracking-widest text-themed-muted mb-4">Dataset Sources</h2>
                            <div className="h-72">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={sourcePie} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90}>
                                            {sourcePie.map((entry, index) => (
                                                <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    <div className="glass-panel rounded-sm p-4 border border-border-main">
                        <h2 className="text-sm uppercase tracking-widest text-themed-muted mb-4">Feature Usage Breakdown</h2>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={profile.feature_usage} layout="vertical" margin={{ left: 20, right: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-main)" />
                                    <XAxis type="number" stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
                                    <YAxis type="category" dataKey="feature" width={130} stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
                                    <Tooltip />
                                    <Bar dataKey="count" radius={[4, 4, 4, 4]}>
                                        {profile.feature_usage.map((entry, index) => (
                                            <Cell key={entry.feature} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
