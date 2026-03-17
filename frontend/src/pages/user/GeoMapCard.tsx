import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
    ComposableMap,
    Geographies,
    Geography,
    ZoomableGroup
} from "react-simple-maps";
import { scaleLinear } from "d3-scale";

// ─── TopoJSON Sources ─────────────────────────────────────────────────────────
const GEO_URLS = {
    world: "https://unpkg.com/world-atlas@2.0.2/countries-110m.json",
    us_states: "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json",
};

// ─── US state abbreviation → full name ───────────────────────────────────────
const US_ABBREV_TO_FULL: Record<string, string> = {
    AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
    CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia",
    HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
    KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
    MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi",
    MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire",
    NJ: "New Jersey", NM: "New Mexico", NY: "New York", NC: "North Carolina",
    ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania",
    RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota", TN: "Tennessee",
    TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia", WA: "Washington",
    WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming", DC: "District of Columbia"
};

// ─── World country alias map ──────────────────────────────────────────────────
const WORLD_ALIAS: Record<string, string> = {
    "usa": "United States of America",
    "us": "United States of America",
    "united states": "United States of America",
    "uk": "United Kingdom",
    "uae": "United Arab Emirates",
    "russia": "Russian Federation",
    "south korea": "South Korea",
    "korea": "South Korea",
    "czech republic": "Czechia",
};

// ─── Types ────────────────────────────────────────────────────────────────────
interface GeoDataPoint { name: string; value: number; metrics?: Record<string, number>; }

interface GeoMapCardProps {
    data: GeoDataPoint[];
    mapType?: 'world' | 'us_states';
    chartTitle?: string;
    formatType?: string;
    isDark?: boolean;
}

// ─── Map config per type ──────────────────────────────────────────────────────
const MAP_CONFIG = {
    world: { center: [10, 0] as [number, number], scale: 140, maxZoom: 6 },
    us_states: { center: [-96, 38] as [number, number], scale: 800, maxZoom: 8 },
};

// ─── Component ────────────────────────────────────────────────────────────────
const GeoMapCard: React.FC<GeoMapCardProps> = ({ data, mapType = 'world', chartTitle, formatType, isDark = true }) => {
    const [tooltipContent, setTooltipContent] = useState<{ title: string, dimension: string, value: string, metric: string, hasData: boolean, multiMetrics?: { label: string, formatted: string }[] } | null>(null);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);

    const geoUrl = GEO_URLS[mapType];
    const cfg = MAP_CONFIG[mapType];

    // Build O(1) lookup map from normalized name → data point
    const dataLookup = useMemo(() => {
        const map = new Map<string, GeoDataPoint>();
        data.forEach(d => {
            const raw = d.name.trim();
            const lower = raw.toLowerCase();
            // Raw match
            map.set(lower, d);

            // ONLY expand abbreviations if it's a US states map
            if (mapType === 'us_states') {
                const expanded = US_ABBREV_TO_FULL[raw.toUpperCase()];
                if (expanded) map.set(expanded.toLowerCase(), d);
            }

            // ONLY apply world aliases if it's a world map
            if (mapType === 'world') {
                const aliased = WORLD_ALIAS[lower];
                if (aliased) map.set(aliased.toLowerCase(), d);
            }
        });
        console.log(`[GeoMapCard] mapType=${mapType} data=`, data.length, 'entries');
        return map;
    }, [data, mapType]);

    const maxValue = useMemo(() =>
        data.length > 0 ? Math.max(...data.map(d => d.value)) : 1,
        [data]);

    // Choropleth scale: dark base → orange primary
    const colorScale = useMemo(() =>
        scaleLinear<string>()
            .domain([0, maxValue * 0.1, maxValue])
            .range(isDark ? ["#111111", "#cc5429", "#ff6933"] : ["#f1f5f9", "#ffa17a", "#ff6933"])
            .clamp(true),
        [maxValue, isDark]);

    const resolveData = (geo: any): GeoDataPoint | undefined => {
        const name = geo.properties?.name?.toLowerCase().trim() ?? '';
        if (dataLookup.has(name)) return dataLookup.get(name);
        // Reverse alias: TopoJSON name → raw alias
        const reverseAlias = Object.entries(WORLD_ALIAS).find(([, v]) => v.toLowerCase() === name);
        if (reverseAlias && dataLookup.has(reverseAlias[0])) return dataLookup.get(reverseAlias[0]);
        return undefined;
    };

    const chartTitleLower = (chartTitle || '').toLowerCase();
    const forceNotMoney = ['tenure', 'age', 'duration', 'months', 'years', 'days'].some(k => chartTitleLower.includes(k));
    const isMoney = formatType === 'currency' || (!formatType && !forceNotMoney && ['revenue', 'charges', 'cost', 'price', 'amount', 'sales', 'income', 'expense', 'profit', 'dollar', 'payment']
        .some(k => chartTitleLower.includes(k)));
    const isPercent = formatType === 'percentage' || formatType === 'percent' || (!formatType && (chartTitleLower.includes('rate') || chartTitleLower.includes('%')));

    const fmtVal = (v: any): string => {
        if (typeof v !== 'number') return String(v ?? '');
        if (isMoney) return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(v);
        if (isPercent) return `${v.toLocaleString(undefined, { maximumFractionDigits: 1 })}%`;
        if (formatType === 'number') return v.toLocaleString(undefined, { maximumFractionDigits: 0 });
        return Number.isInteger(v) ? v.toLocaleString() : v.toLocaleString(undefined, { maximumFractionDigits: 2 });
    };

    const handleMouseEnter = (geo: any, d: GeoDataPoint | undefined, e: React.MouseEvent) => {
        const name = geo.properties?.name ?? '';
        const value = d ? fmtVal(d.value) : 'No data';

        let metricName = "Value";
        if (chartTitle) {
            const parts = chartTitle.split(/ by | per /i);
            if (parts.length === 2) {
                metricName = parts[0].trim();
            } else {
                metricName = chartTitle;
            }
        }

        // Build multi-metric entries for the tooltip
        let multiMetrics: { label: string, formatted: string }[] | undefined;
        if (d?.metrics && Object.keys(d.metrics).length > 0) {
            multiMetrics = Object.entries(d.metrics).map(([label, val]) => ({
                label,
                formatted: fmtVal(val)
            }));
        }

        setTooltipContent({
            title: chartTitle || metricName,
            dimension: name,
            value: value,
            metric: metricName,
            hasData: !!d,
            multiMetrics
        });
        setTooltipPos({ x: e.clientX, y: e.clientY });
    };

    const matchedCount = useMemo(() => [...dataLookup.keys()].length, [dataLookup]);

    return (
        <div className="relative w-full h-[220px] overflow-hidden rounded-sm glass-panel border border-border-main shadow-[0_0_15px_rgba(255,105,51,0.05)] transition-colors duration-300">
            {/* Top badge */}
            <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5 bg-bg-card/50 dark:bg-black/50 backdrop-blur-md px-2 py-0.5 border border-border-main rounded-sm shadow-sm transition-colors">
                <svg className="w-3 h-3 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                        d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
                </svg>
                <span className="text-[9px] font-mono tracking-widest uppercase font-bold text-primary">
                    {mapType === 'us_states' ? 'US States' : 'World Map'}
                </span>
                <span className="text-[8px] font-mono uppercase tracking-widest text-themed-muted">· {matchedCount} regions</span>
            </div>

            {/* Zoom controls */}
            <div className="absolute top-2 right-8 z-10 flex flex-col gap-0.5">
                <button onClick={() => setZoom(z => Math.min(z * 1.4, cfg.maxZoom))}
                    className="w-5 h-5 flex items-center justify-center bg-bg-card/50 dark:bg-black/50 backdrop-blur-md border border-border-main rounded-sm text-themed-muted text-xs hover:text-primary transition-all shadow-sm cursor-pointer">+</button>
                <button onClick={() => setZoom(z => Math.max(z / 1.4, 1))}
                    className="w-5 h-5 flex items-center justify-center bg-bg-card/50 dark:bg-black/50 backdrop-blur-md border border-border-main rounded-sm text-themed-muted text-xs hover:text-primary transition-all shadow-sm cursor-pointer">−</button>
            </div>

            <ComposableMap
                projectionConfig={{ scale: cfg.scale }}
                style={{ width: "100%", height: "100%" }}
                projection={mapType === 'us_states' ? 'geoAlbersUsa' : 'geoMercator'}
            >
                <ZoomableGroup center={cfg.center} zoom={zoom} maxZoom={cfg.maxZoom}>
                    <Geographies geography={geoUrl}>
                        {({ geographies }: { geographies: any[] }) =>
                            geographies.map((geo: any) => {
                                const d = resolveData(geo);
                                return (
                                    <Geography
                                        key={geo.rsmKey}
                                        geography={geo}
                                        onMouseEnter={(e: React.MouseEvent) => handleMouseEnter(geo, d, e)}
                                        onMouseMove={(e: React.MouseEvent) => setTooltipPos({ x: e.clientX, y: e.clientY })}
                                        onMouseLeave={() => setTooltipContent(null)}
                                        style={{
                                            default: {
                                                fill: d ? colorScale(d.value) : (isDark ? "#1a1a1a" : "#f1f5f9"),
                                                outline: "none",
                                                stroke: isDark ? "#0a0a0a" : "#cbd5e1",
                                                strokeWidth: mapType === 'us_states' ? 0.4 : 0.15,
                                                transition: "fill 0.2s ease, stroke 0.2s ease",
                                            },
                                            hover: {
                                                fill: d ? "#ff6933" : (isDark ? "#2a2a2a" : "#e2e8f0"),
                                                outline: "none",
                                                stroke: isDark ? "#ffffff30" : "#ff6933",
                                                strokeWidth: 0.5,
                                                cursor: "pointer",
                                            },
                                            pressed: {
                                                fill: "#cc5429",
                                                outline: "none",
                                            }
                                        }}
                                    />
                                );
                            })
                        }
                    </Geographies>
                </ZoomableGroup>
            </ComposableMap>

            {/* Floating tooltip */}
            {tooltipContent && typeof document !== 'undefined' && createPortal(
                <div
                    className="fixed z-[99999] pointer-events-none rounded-sm px-4 py-3 border border-border-main backdrop-blur-md transition-colors duration-75 min-w-[160px] bg-bg-card/95 dark:bg-black/95 shadow-xl text-themed-main font-mono"
                    style={{
                        left: tooltipPos.x,
                        top: tooltipPos.y - 12,
                        transform: 'translate(-50%, -100%)'
                    }}
                >
                    {tooltipContent.title && <p className="text-[10px] uppercase font-bold tracking-widest mb-2 pb-2 border-b border-border-main opacity-70 leading-tight">{tooltipContent.title}</p>}
                    <div className="mb-3">
                        <p className="text-[10px] opacity-50 uppercase tracking-widest mb-0.5">{mapType === 'us_states' ? 'State' : 'Region'}</p>
                        <p className="text-sm font-bold truncate max-w-[200px] text-primary">{tooltipContent.dimension}</p>
                    </div>

                    <div className="flex flex-col gap-2">
                        {tooltipContent.multiMetrics ? (
                            tooltipContent.multiMetrics.map((m, idx) => (
                                <div key={m.label} className="flex items-center justify-between gap-6">
                                    <div className="flex items-center gap-2">
                                        <span className={`w-2 h-2 rounded-full inline-block ${idx === 0 ? 'bg-[#818CF8]' : idx === 1 ? 'bg-[#F472B6]' : 'bg-[#34D399]'}`} />
                                        <span className="text-xs opacity-70 whitespace-nowrap">{m.label}:</span>
                                    </div>
                                    <span className="text-sm font-bold tabular-nums">{m.formatted}</span>
                                </div>
                            ))
                        ) : (
                            <div className="flex items-center justify-between gap-6">
                                <div className="flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full inline-block ${tooltipContent.hasData ? 'bg-[#818CF8]' : 'bg-gray-400'}`} />
                                    <span className="text-xs opacity-70 whitespace-nowrap">{tooltipContent.metric}:</span>
                                </div>
                                <span className="text-sm font-bold tabular-nums">
                                    {tooltipContent.value}
                                </span>
                            </div>
                        )}
                    </div>
                </div>,
                document.body
            )}

            {/* Legend */}
            <div className="absolute bottom-2 right-2 flex items-center gap-1.5 bg-bg-card/50 dark:bg-black/50 border border-border-main backdrop-blur-md px-2 py-1 rounded-sm transition-colors font-mono shadow-sm">
                <span className="text-[8px] text-themed-muted uppercase tracking-widest">Low</span>
                <div className="w-14 h-1 rounded-sm opacity-80" style={{
                    background: isDark 
                        ? 'linear-gradient(to right, #111111, #cc5429, #ff6933)'
                        : 'linear-gradient(to right, #f1f5f9, #ffa17a, #ff6933)'
                }} />
                <span className="text-[8px] text-primary font-bold transition-colors uppercase tracking-widest">Peak</span>
            </div>
        </div>
    );
};

export default GeoMapCard;
