import { useEffect, useMemo, useRef, useState } from 'react';
import { userApi, type UserProfileStats } from '../../lib/api/user';

export default function UserProfile() {
    const [profile, setProfile] = useState<UserProfileStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [profileMessage, setProfileMessage] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({ name: '', email: '' });
    const [isMilestoneDismissed, setIsMilestoneDismissed] = useState(false);
    const monthlySummaryRef = useRef<HTMLDivElement | null>(null);

    const milestoneStorageKey = useMemo(() => {
        return profile?.user?.id
            ? `vizzy.profile.milestone.dismissed.${profile.user.id}`
            : 'vizzy.profile.milestone.dismissed';
    }, [profile?.user?.id]);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await userApi.getProfileStats();
                setProfile(data);
                setEditForm({
                    name: data.user.name || '',
                    email: data.user.email || '',
                });
            } catch (err: any) {
                setError(err?.response?.data?.detail || 'Failed to load profile analytics');
            } finally {
                setLoading(false);
            }
        };

        load();
    }, []);

    useEffect(() => {
        if (!profile) return;
        const dismissed = localStorage.getItem(milestoneStorageKey) === '1';
        setIsMilestoneDismissed(dismissed);
    }, [profile, milestoneStorageKey]);

    const kpis = useMemo(() => {
        if (!profile) return [];

        const monthly = [...profile.monthly_activity].sort((a, b) => (a.month > b.month ? 1 : -1));
        const latest = monthly[monthly.length - 1];
        const previous = monthly.length > 1 ? monthly[monthly.length - 2] : null;

        const getTrend = (metricKey: 'datasets' | 'analyses' | 'generated_dashboards' | 'chats') => {
            const current = Number(latest?.[metricKey] ?? 0);
            const prev = Number(previous?.[metricKey] ?? 0);

            if (!previous) {
                return {
                    trend: current > 0 ? 'New activity this month' : 'No activity yet',
                    trendUp: current > 0,
                };
            }

            if (prev === 0) {
                return {
                    trend: current > 0 ? 'New activity this month' : 'No change from last month',
                    trendUp: current >= prev,
                };
            }

            const pct = ((current - prev) / prev) * 100;
            return {
                trend: `${Math.abs(pct).toFixed(1)}% from last month`,
                trendUp: pct >= 0,
            };
        };

        const datasetsTrend = getTrend('datasets');
        const analysesTrend = getTrend('analyses');
        const dashboardsTrend = getTrend('generated_dashboards');
        const chatsTrend = getTrend('chats');

        return [
            {
                label: 'Total Datasets',
                value: profile.totals.total_datasets,
                icon: 'database',
                trend: datasetsTrend.trend,
                trendUp: datasetsTrend.trendUp,
            },
            {
                label: 'Analyses Run',
                value: profile.totals.total_analyses,
                icon: 'analytics',
                trend: analysesTrend.trend,
                trendUp: analysesTrend.trendUp,
            },
            {
                label: 'Generated Dashboards',
                value: profile.totals.total_dashboards_generated,
                icon: 'dashboard',
                trend: dashboardsTrend.trend,
                trendUp: dashboardsTrend.trendUp,
            },
            {
                label: 'Chat Sessions',
                value: profile.totals.total_chat_sessions,
                icon: 'chat',
                trend: chatsTrend.trend,
                trendUp: chatsTrend.trendUp,
            },
        ];
    }, [profile]);

    const topFeatures = useMemo(() => {
        if (!profile) return [];
        const total = profile.feature_usage.reduce((sum, item) => sum + item.count, 0);
        return [...profile.feature_usage]
            .sort((a, b) => b.count - a.count)
            .slice(0, 4)
            .map(f => ({
                ...f,
                percentage: total > 0 ? Math.round((f.count / total) * 100) : 0
            }));
    }, [profile]);

    const monthlyRows = useMemo(() => {
        if (!profile) return [];
        const now = new Date();
        const currentYear = now.getFullYear();

        return [...profile.monthly_activity]
            .filter((row) => {
                const [y] = row.month.split('-');
                return Number(y) === currentYear;
            })
            .map((row) => {
            const [y, m] = row.month.split('-');
            const monthLabel = new Date(Number(y), Number(m) - 1, 1).toLocaleString('en-US', {
                month: 'long',
                year: 'numeric',
            });
            const productiveActions = row.generated_dashboards + row.saved_dashboards + row.analyses;
            const totalActions = productiveActions + row.uploads + row.chats;
            const successRate = totalActions > 0 ? ((productiveActions / totalActions) * 100).toFixed(1) : '0.0';
            return { ...row, monthLabel, successRate };
            })
            .sort((a, b) => (a.month < b.month ? 1 : -1));
    }, [profile]);

    const profileIdentity = useMemo(() => {
        if (!profile?.user?.email) {
            return {
                displayName: 'User',
                email: 'N/A',
                plan: 'Standard',
                initial: 'U',
            };
        }

        const email = profile.user.email;
        const explicitName = (profile.user.name || '').trim();
        const displayName = explicitName || (() => {
            const localPart = email.split('@')[0] || '';
            return localPart
                .replace(/[._-]+/g, ' ')
                .split(' ')
                .filter(Boolean)
                .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
                .join(' ')
                || 'User';
        })();

        const role = String(profile.user.role || 'user').toLowerCase();
        const plan = role === 'admin' ? 'Admin' : 'Standard';

        return {
            displayName,
            email,
            plan,
            initial: displayName.charAt(0).toUpperCase() || 'U',
        };
    }, [profile]);

    const monthlySummaryInsight = useMemo(() => {
        if (!profile) {
            return {
                growthPct: 0,
                monthActions: 0,
                quarterActions: 0,
                title: 'Monthly activity snapshot',
                message: 'No activity data available yet.',
                badgeValue: '0',
                badgeLabel: 'ACTIONS THIS MONTH',
            };
        }

        const sorted = [...profile.monthly_activity].sort((a, b) => (a.month > b.month ? 1 : -1));
        const latest = sorted[sorted.length - 1];
        const previous = sorted.length > 1 ? sorted[sorted.length - 2] : null;
        const quarter = sorted.slice(-3);

        const toActions = (row: any) => (row?.uploads || 0) + (row?.generated_dashboards || 0) + (row?.saved_dashboards || 0) + (row?.analyses || 0) + (row?.chats || 0);

        const monthActions = toActions(latest);
        const prevActions = toActions(previous);
        const quarterActions = quarter.reduce((sum, row) => sum + toActions(row), 0);
        const growthPct = prevActions > 0 ? ((monthActions - prevActions) / prevActions) * 100 : (monthActions > 0 ? 100 : 0);

        const featureList = [...(profile.feature_usage || [])].sort((a, b) => b.count - a.count);
        const topFeature = featureList[0];
        const topFeatureText = topFeature ? `${topFeature.feature.toLowerCase()} (${topFeature.count.toLocaleString()})` : 'core analytics tools';

        const title = growthPct >= 0 ? 'You reached a monthly activity milestone!' : 'Your monthly activity summary';
        const message = `This month you completed ${monthActions.toLocaleString()} tracked actions (${Math.abs(growthPct).toFixed(0)}% ${growthPct >= 0 ? 'up' : 'down'} vs last month). This quarter you have ${quarterActions.toLocaleString()} total actions. Most used feature: ${topFeatureText}.`;

        return {
            growthPct,
            monthActions,
            quarterActions,
            title,
            message,
            badgeValue: `${Math.abs(growthPct).toFixed(0)}%`,
            badgeLabel: 'MONTH-OVER-MONTH',
        };
    }, [profile]);

    const openEditProfile = () => {
        if (!profile) return;
        setProfileMessage(null);
        setEditForm({
            name: profile.user.name || '',
            email: profile.user.email || '',
        });
        setIsEditOpen(true);
    };

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile) return;

        setIsSavingProfile(true);
        setProfileMessage(null);

        try {
            await userApi.updateMyProfile({
                name: editForm.name.trim(),
                email: editForm.email.trim(),
            });

            const refreshed = await userApi.getProfileStats();
            setProfile(refreshed);
            setEditForm({
                name: refreshed.user.name || '',
                email: refreshed.user.email || '',
            });
            setIsEditOpen(false);
            setProfileMessage('Profile updated successfully.');
        } catch (err: any) {
            setProfileMessage(err?.response?.data?.detail || 'Failed to update profile.');
        } finally {
            setIsSavingProfile(false);
        }
    };

    const scrollToAudit = () => {
        monthlySummaryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const dismissMilestone = () => {
        setIsMilestoneDismissed(true);
        localStorage.setItem(milestoneStorageKey, '1');
    };

    return (
        <main className="flex-1 p-6 lg:p-10 space-y-10 overflow-y-auto w-full selection:bg-primary selection:text-white bg-background text-on-surface min-h-full font-body relative">
            <div className="absolute inset-0 z-0 opacity-[0.02] dark:opacity-[0.03] pointer-events-none" style={{ backgroundImage: "radial-gradient(var(--color-primary, #6C63FF) 1px, transparent 1px)", backgroundSize: "24px 24px" }}></div>
            
            {loading && (
                <div className="py-20 text-center relative z-10">
                    <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-on-surface-variant font-medium">Loading profile analytics...</p>
                </div>
            )}

            {error && (
                <div className="bg-error-container/20 border border-error/30 rounded-2xl p-8 text-error font-medium md:text-center text-sm relative z-10">
                    {error}
                </div>
            )}

            {!loading && !error && profile && (
                <div className="relative z-10 space-y-10 animate-fade-in-up">
                    {profileMessage && (
                        <div className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-on-surface">
                            {profileMessage}
                        </div>
                    )}
                    {/* Profile Header Section */}
                    <section className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-outline-variant/10">
                        <div className="flex items-center gap-6">
                            <div className="relative">
                                <div className="w-24 h-24 rounded-2xl object-cover shadow-xl border border-outline-variant/20 bg-surface-container-high flex items-center justify-center text-4xl font-headline text-primary font-bold">
                                    {profileIdentity.initial}
                                </div>
                                <div className="absolute -bottom-2 -right-2 bg-primary text-on-primary p-1.5 rounded-lg shadow-lg">
                                    <span className="material-symbols-outlined text-sm" data-icon="verified" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <div className="flex items-center gap-3">
                                    <h1 className="text-3xl font-bold tracking-tight text-on-surface font-headline">{profileIdentity.displayName}</h1>
                                    <span className="px-2.5 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-bold uppercase tracking-wider border border-primary/30">{profileIdentity.plan}</span>
                                </div>
                                <p className="text-on-surface-variant flex items-center gap-2 text-sm">
                                    <span className="material-symbols-outlined text-base">mail</span>
                                    {profileIdentity.email}
                                </p>
                                <p className="text-on-surface-variant text-sm flex items-center gap-2">
                                    <span className="material-symbols-outlined text-base">calendar_today</span>
                                    Active Account
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-4 md:mt-0">
                            <button
                                type="button"
                                onClick={openEditProfile}
                                className="px-4 py-2 rounded-xl bg-surface-container-high text-on-surface font-semibold text-sm hover:bg-surface-container-highest transition-colors border border-outline-variant/20"
                            >
                                Edit Profile
                            </button>
                            <button className="px-4 py-2 rounded-xl bg-primary text-on-primary font-semibold text-sm hover:brightness-110 transition-all shadow-lg shadow-primary/20">Upgrade Plan</button>
                        </div>
                    </section>

                    {/* Activity KPIs - Bento Grid Style */}
                    <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                        {kpis.map((kpi, idx) => (
                            <div key={idx} className="bg-surface-container-lowest dark:bg-surface p-6 rounded-xl border border-outline-variant/10 shadow-sm flex flex-col gap-4 transition-all hover:shadow-md">
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                    <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>{kpi.icon}</span>
                                </div>
                                <div>
                                    <div className="text-on-surface-variant text-xs font-semibold uppercase tracking-wider">{kpi.label}</div>
                                    <div className="text-4xl font-bold mt-1 text-on-surface font-headline">{kpi.value.toLocaleString()}</div>
                                </div>
                                <div className={`flex items-center gap-1.5 text-xs font-medium ${kpi.trendUp ? 'text-secondary dark:text-secondary-fixed' : 'text-error'}`}>
                                    <span className="material-symbols-outlined text-sm">{kpi.trendUp ? 'trending_up' : 'trending_down'}</span>
                                    <span>{kpi.trend}</span>
                                </div>
                            </div>
                        ))}
                    </section>

                    {/* Usage & Insights Grid */}
                    <section className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                        {/* Feature Usage List */}
                        <div className="lg:col-span-2 bg-surface-container-lowest dark:bg-surface p-6 rounded-xl border border-outline-variant/10 shadow-sm">
                            <h2 className="text-lg font-bold mb-6 flex items-center gap-2 font-headline text-on-surface">
                                <span className="material-symbols-outlined text-primary">bolt</span>
                                Feature Usage
                            </h2>
                            <div className="space-y-6">
                                {topFeatures.map((f, i) => (
                                    <div key={i} className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="font-medium text-on-surface uppercase">{f.feature}</span>
                                            <span className="text-on-surface-variant">{f.percentage}%</span>
                                        </div>
                                        <div className="h-2 w-full bg-surface-container-high rounded-full overflow-hidden">
                                            <div className="h-full bg-primary rounded-full transition-all duration-1000" style={{ width: `${f.percentage}%` }}></div>
                                        </div>
                                    </div>
                                ))}
                                {topFeatures.length === 0 && (
                                    <p className="text-sm text-on-surface-variant italic">No feature usage recorded yet.</p>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={scrollToAudit}
                                className="w-full mt-8 py-2.5 text-sm font-semibold text-primary border border-primary/20 rounded-lg hover:bg-primary/5 transition-colors"
                            >
                                View Detailed Usage Logs
                            </button>
                        </div>

                        {/* Monthly Activity Table */}
                        <div ref={monthlySummaryRef} className="lg:col-span-3 bg-surface-container-lowest dark:bg-surface p-6 rounded-xl border border-outline-variant/10 shadow-sm overflow-hidden flex flex-col">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-lg font-bold flex items-center gap-2 font-headline text-on-surface">
                                    <span className="material-symbols-outlined text-primary">history</span>
                                    Monthly Activity Summary
                                </h2>
                                <button className="text-on-surface-variant hover:text-primary transition-colors">
                                    <span className="material-symbols-outlined">more_horiz</span>
                                </button>
                            </div>
                            <div className="overflow-x-auto flex-1">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="text-on-surface-variant text-[10px] font-bold uppercase tracking-widest border-b border-outline-variant/10">
                                            <th className="pb-4 px-2">Month</th>
                                            <th className="pb-4 px-2">Uploads</th>
                                            <th className="pb-4 px-2">Analyses</th>
                                            <th className="pb-4 px-2">Success Rate</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm">
                                        {monthlyRows.map((row, i) => (
                                            <tr key={i} className="border-b border-outline-variant/5 hover:bg-surface-container-high/40 transition-colors">
                                                <td className="py-4 px-2 font-medium text-on-surface">{row.monthLabel}</td>
                                                <td className="py-4 px-2 text-on-surface-variant">{row.uploads.toLocaleString()}</td>
                                                <td className="py-4 px-2 text-on-surface-variant">{row.analyses.toLocaleString()}</td>
                                                <td className="py-4 px-2">
                                                    <span className="flex items-center gap-1 text-secondary dark:text-secondary-fixed">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-secondary dark:bg-secondary-fixed"></span> {row.successRate}%
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {monthlyRows.length === 0 && (
                                    <p className="text-sm text-on-surface-variant italic mt-4 text-center">No monthly activity recorded yet.</p>
                                )}
                            </div>
                        </div>
                    </section>

                    {/* Bottom Narrative Insights */}
                    {!isMilestoneDismissed && (
                    <section className="bg-primary p-8 rounded-2xl text-on-primary flex flex-col md:flex-row items-center gap-8 relative overflow-hidden shadow-lg">
                        <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
                        <div className="flex-1 space-y-4 z-10">
                            <h2 className="text-2xl font-bold font-headline">{monthlySummaryInsight.title}</h2>
                            <p className="text-on-primary-container max-w-2xl opacity-90">
                                {monthlySummaryInsight.message}
                            </p>
                            <div className="flex gap-4 pt-2">
                                <button
                                    type="button"
                                    onClick={scrollToAudit}
                                    className="bg-white text-primary px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg hover:bg-surface-container-low transition-colors"
                                >
                                    View Full Audit
                                </button>
                                <button
                                    type="button"
                                    onClick={dismissMilestone}
                                    className="bg-primary-container text-on-primary-container px-5 py-2.5 rounded-xl font-bold text-sm hover:brightness-110 transition-colors border border-on-primary-container/20"
                                >
                                    Dismiss
                                </button>
                            </div>
                        </div>
                        <div className="w-48 h-48 bg-white/5 rounded-2xl flex items-center justify-center backdrop-blur-md z-10 border border-white/10 shrink-0">
                            <div className="text-center">
                                <div className="text-4xl font-bold font-headline">{monthlySummaryInsight.badgeValue}</div>
                                <div className="text-xs uppercase tracking-widest opacity-80 mt-1">{monthlySummaryInsight.badgeLabel}</div>
                            </div>
                        </div>
                    </section>
                    )}

                    {isEditOpen && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
                            <div className="w-full max-w-lg rounded-2xl border border-outline-variant/20 bg-surface-container-lowest dark:bg-surface p-6 shadow-2xl">
                                <div className="mb-4 flex items-center justify-between">
                                    <h3 className="text-xl font-bold font-headline text-on-surface">Edit Profile</h3>
                                    <button
                                        type="button"
                                        onClick={() => setIsEditOpen(false)}
                                        className="rounded-md p-1 text-on-surface-variant hover:bg-surface-container-high"
                                    >
                                        <span className="material-symbols-outlined">close</span>
                                    </button>
                                </div>

                                <form className="space-y-4" onSubmit={handleSaveProfile}>
                                    <div>
                                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Name</label>
                                        <input
                                            type="text"
                                            required
                                            value={editForm.name}
                                            onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                                            className="w-full rounded-lg border border-outline-variant/30 bg-surface-container-high px-3 py-2 text-sm text-on-surface outline-none focus:border-primary"
                                            placeholder="Your name"
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Email</label>
                                        <input
                                            type="email"
                                            required
                                            value={editForm.email}
                                            onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
                                            className="w-full rounded-lg border border-outline-variant/30 bg-surface-container-high px-3 py-2 text-sm text-on-surface outline-none focus:border-primary"
                                            placeholder="you@company.com"
                                        />
                                    </div>

                                    <div className="pt-2 flex items-center justify-end gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setIsEditOpen(false)}
                                            className="rounded-lg border border-outline-variant/30 px-4 py-2 text-sm font-semibold text-on-surface-variant hover:bg-surface-container-high"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isSavingProfile}
                                            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:brightness-110 disabled:opacity-60"
                                        >
                                            {isSavingProfile ? 'Saving...' : 'Save Changes'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </main>
    );
}
