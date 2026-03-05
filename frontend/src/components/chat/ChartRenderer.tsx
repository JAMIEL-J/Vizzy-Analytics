import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { KPICard } from './KPICard';
import {
    BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';


interface ChartRendererProps {
    type: string;
    data: any;
    title?: string;
    currency?: string;
    variant?: 'default' | 'minimal';
}

// Professional color palette for distinct data points
const CHART_COLORS = [
    '#6366f1', // Indigo
    '#10b981', // Emerald
    '#f59e0b', // Amber
    '#ec4899', // Pink
    '#06b6d4', // Cyan
    '#8b5cf6', // Violet
    '#f43f5e', // Rose
    '#84cc16', // Lime
    '#3b82f6', // Blue
    '#14b8a6', // Teal
];
interface CustomTooltipProps {
    active?: boolean;
    payload?: any[];
    label?: string;
    currency?: string;
    isCurrency?: boolean;
    isPercentage?: boolean;
}

const CustomTooltip = ({ active, payload, label, currency, isCurrency, isPercentage }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
        let formattedValue = '';
        const value = payload[0].value || 0;

        if (isPercentage) {
            formattedValue = new Intl.NumberFormat('en-US', {
                style: 'decimal',
                minimumFractionDigits: 0,
                maximumFractionDigits: 2,
            }).format(value) + '%';
        } else {
            formattedValue = new Intl.NumberFormat('en-US', {
                style: isCurrency ? 'currency' : 'decimal',
                currency: 'USD',
                minimumFractionDigits: 0,
                maximumFractionDigits: 2,
            }).format(value).replace('$', isCurrency ? (currency || '$') : '');
        }

        return (
            <div className="bg-white dark:bg-[#1C1F26] p-3 border border-gray-100 dark:border-gray-700 shadow-lg rounded-lg">
                <p className="text-gray-500 dark:text-gray-400 text-xs font-medium mb-1">{label}</p>
                <p className="text-gray-900 dark:text-white text-sm font-bold">
                    {formattedValue}
                </p>
            </div>
        );
    }
    return null;
};

export const ChartRenderer: React.FC<ChartRendererProps> = ({ type, data, title, currency, variant = 'default' }) => {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const gridColor = isDark ? '#1F2937' : '#E5E7EB';
    const axisColor = isDark ? '#9CA3AF' : '#6B7280';
    const cursorFill = isDark ? 'rgba(255,255,255,0.05)' : '#F9FAFB';

    // Determine if this should be formatted as a percentage
    const isPercentage =
        data.is_percentage === true ||
        data.data?.is_percentage === true ||
        data.format === 'percent' ||
        data.format === 'percentage' ||
        data.format_type === 'percentage' ||
        data.data?.format === 'percent' ||
        data.data?.format_type === 'percentage' ||
        data.response_type === 'percentage';

    // Determine if this chart should use currency formatting
    const shouldUseCurrency = () => {
        // If explicitly a percentage, never use currency
        if (isPercentage) return false;

        // EXPLICIT money keywords (unambiguous)
        const explicitMoneyKeywords = [
            'revenue', 'profit', 'income', 'earnings', 'cost', 'expense',
            'price', 'charges', 'payment', 'budget', 'salary', 'wage',
            'fee', 'sales', 'discount'
        ];

        const titleLower = (title || '').toLowerCase();
        const dataStr = JSON.stringify(data).toLowerCase();

        return explicitMoneyKeywords.some(keyword =>
            titleLower.includes(keyword) || dataStr.includes(keyword)
        );
    };

    const isCurrencyChart = shouldUseCurrency();
    const effectiveCurrency = currency || '$'; // Fallback to $ if explicitly using currency

    // Handle NL2SQL wrapper
    if (type === 'nl2sql') {
        const payload = data.chart || {};
        return (
            <ChartRenderer
                type={payload.type || (data.response_type === 'text' ? 'kpi' : 'table')}
                data={payload}
                title={payload.title || title}
                currency={currency}
                variant={variant}
            />
        );
    }

    const renderKPI = () => {
        const value = data.value !== undefined ? data.value : (data.data?.value !== undefined ? data.data.value : 0);
        const label = data.label || data.data?.label || title || "Metric";
        const suffix = data.suffix || data.data?.suffix || (isPercentage ? '%' : '');
        const change = data.change;

        return (
            <KPICard
                value={value}
                label={label}
                change={change}
                prefix={data.prefix || (isCurrencyChart ? effectiveCurrency : undefined)}
                suffix={suffix}
                variant={variant}
            />
        );
    };

    const formatYAxisValue = (val: number) => {
        if (isPercentage) {
            return new Intl.NumberFormat('en-US', {
                style: 'decimal',
                minimumFractionDigits: 0,
                maximumFractionDigits: 2
            }).format(val) + '%';
        }

        return new Intl.NumberFormat('en-US', {
            style: isCurrencyChart ? 'currency' : 'decimal',
            currency: 'USD',
            notation: "compact",
            compactDisplay: "short",
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }).format(val).replace('$', effectiveCurrency);
    };

    const renderBarChart = () => {
        let chartData = [];
        // Handle different data formats including NL2SQL nested data
        if (data.data?.rows) {
            chartData = data.data.rows.map((row: any) => {
                const keys = Object.keys(row);
                return {
                    name: row[keys[0]],
                    value: row[keys[1]]
                };
            });
        } else if (data.x && data.y) {
            chartData = data.x.map((x: any, i: number) => ({
                name: x,
                value: data.y[i]
            }));
        }

        if (chartData.length === 0) return <div className="p-4 text-gray-400 text-sm">No chart data available</div>;

        return (
            <div className="h-96 w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 20, right: 30, left: 40, bottom: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                        <XAxis
                            dataKey="name"
                            tick={{ fontSize: 12, fill: axisColor }}
                            axisLine={{ stroke: gridColor }}
                            tickLine={false}
                            interval={0}
                            angle={0}
                            textAnchor="middle"
                            height={60}
                        />
                        <YAxis
                            tick={{ fontSize: 12, fill: axisColor }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(value: any) => formatYAxisValue(Number(value))}
                        />
                        <Tooltip content={<CustomTooltip currency={effectiveCurrency} isCurrency={isCurrencyChart} isPercentage={isPercentage} />} cursor={{ fill: cursorFill }} />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={40}>
                            {chartData.map((_: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        );
    };

    const renderLineChart = () => {
        let chartData = [];
        if (data.data?.series) {
            chartData = data.data.series.map((s: any) => ({
                name: s.timestamp || Object.values(s)[0],
                value: s.value !== undefined ? s.value : Object.values(s)[1]
            }));
        } else if (data.x && data.y) {
            chartData = data.x.map((x: any, i: number) => ({
                name: x,
                value: data.y[i]
            }));
        }

        if (chartData.length === 0) return <div className="p-4 text-gray-400 text-sm">No line data available</div>;

        return (
            <div className="h-96 w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 20, right: 30, left: 40, bottom: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                        <XAxis
                            dataKey="name"
                            tick={{ fontSize: 12, fill: axisColor }}
                            axisLine={{ stroke: gridColor }}
                            tickLine={false}
                            interval="preserveStartEnd"
                            angle={0}
                            textAnchor="middle"
                            height={60}
                        />
                        <YAxis
                            tick={{ fontSize: 12, fill: axisColor }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(value: any) => formatYAxisValue(Number(value))}
                        />
                        <Tooltip content={<CustomTooltip currency={effectiveCurrency} isCurrency={isCurrencyChart} isPercentage={isPercentage} />} />
                        <Line
                            type="monotone"
                            dataKey="value"
                            stroke="#6366f1"
                            strokeWidth={3}
                            dot={false}
                            activeDot={{ r: 6, strokeWidth: 0, fill: '#6366f1' }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        );
    };

    const renderPieChart = () => {
        let chartData = [];
        if (data.data?.rows) {
            chartData = data.data.rows.map((row: any) => {
                const keys = Object.keys(row);
                return {
                    name: row[keys[0]],
                    value: row[keys[1]]
                };
            });
        } else if (data.labels && data.values) {
            chartData = data.labels.map((l: any, i: number) => ({
                name: l,
                value: data.values[i]
            }));
        }

        return (
            <div className="h-96 w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={80}
                            outerRadius={120}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {chartData.map((_: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} strokeWidth={2} stroke={isDark ? "#1C1F26" : "#fff"} />
                            ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip currency={effectiveCurrency} isCurrency={isCurrencyChart} isPercentage={isPercentage} />} />
                        <Legend
                            layout="horizontal"
                            verticalAlign="bottom"
                            align="center"
                            wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }}
                            iconType="circle"
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        );
    };

    const renderTable = () => {
        const rows = data.data?.rows || data.rows || [];
        if (rows.length === 0) return <p className="p-4 text-gray-500 italic">No table data found.</p>;

        const headers = data.data?.columns || Object.keys(rows[0]);

        return (
            <div className="overflow-x-auto rounded-lg border border-gray-100 dark:border-gray-800 shadow-sm mt-4">
                <table className="min-w-full text-sm text-left text-gray-500 dark:text-gray-400">
                    <thead className="text-xs text-gray-700 dark:text-gray-300 uppercase bg-gray-50 dark:bg-[#1C1F26] border-b border-gray-100 dark:border-gray-800">
                        <tr>
                            {headers.map((h: string) => <th key={h} className="px-4 py-3 font-semibold">{h.replace('_', ' ')}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.slice(0, 10).map((row: any, i: number) => (
                            <tr key={i} className="bg-white dark:bg-[#111318] border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-[#1C1F26] transition-colors">
                                {headers.map((h: string) => (
                                    <td key={h} className="px-4 py-3 text-gray-900 dark:text-gray-200">
                                        {typeof row[h] === 'number' && !h.toLowerCase().includes('id') ?
                                            formatYAxisValue(row[h]) :
                                            String(row[h] || '-')
                                        }
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
                {rows.length > 10 && (
                    <div className="px-4 py-2 bg-gray-50 dark:bg-[#1C1F26] text-xs text-center text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-800 font-medium">
                        Showing top 10 of {rows.length} results
                    </div>
                )}
            </div>
        );
    }

    const renderDashboard = () => {
        // ... (existing logic for multi-widget dashboards)
        const dashboard = data.widgets ? data : data.dashboard;

        if (!dashboard || !dashboard.widgets) return null;

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-4">
                {dashboard.widgets.map((widget: any, index: number) => {
                    const colSpan = widget.type === 'kpi' ? 'col-span-1' : 'col-span-1 md:col-span-2';

                    return (
                        <div key={index} className={`${colSpan} bg-white dark:bg-[#1C1F26] p-4 rounded-lg border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow`}>
                            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 border-b border-gray-50 dark:border-gray-800 pb-2">{widget.title}</h4>
                            <ChartRenderer
                                type={widget.type}
                                data={{ data: widget.data }}
                                title={widget.title}
                                currency={effectiveCurrency}
                                variant="minimal"
                            />
                        </div>
                    );
                })}
            </div>
        );
    };

    switch (type) {
        case 'kpi': return renderKPI();
        case 'bar': return renderBarChart();
        case 'line': return renderLineChart();
        case 'pie': return renderPieChart();
        case 'table': return renderTable();
        case 'dashboard': return renderDashboard();
        default: return (
            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-800 text-xs font-mono text-gray-700 dark:text-gray-400">
                <span className="text-primary-blue font-bold mb-2 block uppercase text-[10px]">Raw Data Debugger</span>
                {JSON.stringify(data, null, 2)}
            </div>
        );
    }
};

export default ChartRenderer;
