import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    AreaChart,
    Area,
    Legend,
    Cell,
} from 'recharts';

// Mock data
const dailyActiveUsers = [
    { date: 'Mon', users: 245 },
    { date: 'Tue', users: 312 },
    { date: 'Wed', users: 289 },
    { date: 'Thu', users: 356 },
    { date: 'Fri', users: 401 },
    { date: 'Sat', users: 198 },
    { date: 'Sun', users: 176 },
];

const queryTypes = [
    { type: 'Visualizations', count: 1234, color: '#7c3aed' }, // Purple
    { type: 'Data Queries', count: 987, color: '#2962ff' },    // Blue
    { type: 'Exports', count: 654, color: '#00c2ff' },         // Cyan
    { type: 'Imports', count: 432, color: '#22c55e' },         // Green
    { type: 'API Calls', count: 876, color: '#ff6b35' },       // Orange
];

const storageUsage = [
    { month: 'Jan', storage: 45 },
    { month: 'Feb', storage: 62 },
    { month: 'Mar', storage: 89 },
    { month: 'Apr', storage: 124 },
    { month: 'May', storage: 178 },
    { month: 'Jun', storage: 234 },
    { month: 'Jul', storage: 312 },
];

export default function AdminAnalytics() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-navy">Platform Analytics</h2>
                <p className="text-gray-600 text-sm">Detailed platform usage statistics</p>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
                    <p className="text-gray-600 text-sm">Avg Session Duration</p>
                    <p className="text-2xl font-bold text-navy">14m 32s</p>
                </div>
                <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
                    <p className="text-gray-600 text-sm">Bounce Rate</p>
                    <p className="text-2xl font-bold text-navy">24.5%</p>
                </div>
                <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
                    <p className="text-gray-600 text-sm">API Requests/Day</p>
                    <p className="text-2xl font-bold text-navy">45.2K</p>
                </div>
                <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
                    <p className="text-gray-600 text-sm">Error Rate</p>
                    <p className="text-2xl font-bold text-green-600">0.12%</p>
                </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Daily Active Users */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                    <h3 className="text-lg font-bold text-navy mb-4">Daily Active Users</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <AreaChart data={dailyActiveUsers}>
                            <defs>
                                <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="date" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                itemStyle={{ fontSize: '12px', fontWeight: 500 }}
                            />
                            <Area type="monotone" dataKey="users" stroke="#7c3aed" fillOpacity={1} fill="url(#colorUsers)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Query Types */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                    <h3 className="text-lg font-bold text-navy mb-4">Query Types Distribution</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={queryTypes}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="type" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                cursor={{ fill: '#f3f4f6' }}
                            />
                            <Bar dataKey="count" radius={[4, 4, 4, 4]} barSize={40}>
                                {queryTypes.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Bar>
                            <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="circle" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Storage Usage */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <h3 className="text-lg font-bold text-navy mb-4">Storage Usage (GB)</h3>
                <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={storageUsage}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="month" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                        />
                        <Legend wrapperStyle={{ paddingTop: '10px' }} />
                        <Line
                            type="monotone"
                            dataKey="storage"
                            stroke="#ff6b35"
                            strokeWidth={3}
                            dot={{ stroke: '#ff6b35', strokeWidth: 2, r: 4, fill: '#fff' }}
                            activeDot={{ r: 6, strokeWidth: 0 }}
                            name="Storage (GB)"
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
