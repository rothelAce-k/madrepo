import React, { useState, useMemo, useEffect } from 'react'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Select } from '../components/ui/Select'
import { toast } from 'react-hot-toast'
import {
    Activity, AlertTriangle, TrendingUp, TrendingDown,
    Shield, Droplets, Wind, Zap, ArrowRight, Gauge, CheckCircle, FileText, Network,
    Flame, Wrench, AlertCircle, Waves, ThermometerSun, Play, Pause, Loader2
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import { cn } from '../lib/utils'
import { useSensor } from '../contexts/SensorContext'
import StatusSummary from '../components/health/StatusSummary'
import InvestigationReport from '../components/investigation/InvestigationReport'
import SystemTopology from '../components/health/SystemTopology'

// Icon mapping for different driver types
const DRIVER_ICONS = {
    'Minimal Corrosion': Shield,
    'Stable Pressure': Gauge,
    'Moderate Corrosion Buildup': AlertCircle,
    'Pressure Fluctuations': Activity,
    'Flow Irregularities': Waves,
    'Pressure Surge Event': AlertTriangle,
    'Severe Corrosion': AlertCircle,
    'Active Leak': Droplets,
    'Structural Failure': AlertTriangle,
    'Elevated Corrosion': AlertCircle,
    'High Fatigue Stress': Wrench,
    'Mechanical Wear': Wrench,
    'Temperature Stress': ThermometerSun,
    'Vibration': Activity
};

const SectorRow = ({ name, score, trend, active, onClick }) => (
    <div
        onClick={onClick}
        className={cn(
            "flex items-center justify-between py-3 px-3 rounded-lg transition-all cursor-pointer border-b border-slate-100 dark:border-slate-800 last:border-0",
            active
                ? 'bg-indigo-50 border-l-4 border-l-indigo-500 dark:bg-indigo-900/20'
                : 'hover:bg-slate-50 dark:hover:bg-slate-800 border-l-4 border-l-transparent'
        )}
    >
        <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${score > 80 ? 'bg-emerald-500' : score > 60 ? 'bg-amber-500' : score > 40 ? 'bg-orange-500' : 'bg-rose-500'}`} />
            <span className={cn("font-medium text-sm", active ? 'text-indigo-700 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300')}>{name}</span>
        </div>
        <div className="flex items-center gap-4">
            <span className={`text-sm font-mono font-bold ${score > 80 ? 'text-emerald-600' : score > 60 ? 'text-amber-600' : score > 40 ? 'text-orange-600' : 'text-rose-600'}`}>
                {score.toFixed(1)}%
            </span>
            {score < 90 ? <TrendingDown size={14} className="text-rose-500" /> : <TrendingUp size={14} className="text-emerald-500" />}
        </div>
    </div>
)

export default function HealthMonitor() {
    const [selectedSegment, setSelectedSegment] = useState('overall');
    const [timeRange, setTimeRange] = useState('6m');
    const [historyData, setHistoryData] = useState([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [showReport, setShowReport] = useState(false);
    const [isRunningDiagnostics, setIsRunningDiagnostics] = useState(false);

    const { segmentHealth, systemHealth, systemHealthDetails, sensors, getSensorReading, isLive, runDiagnostics } = useSensor();

    const handleDiagnostics = async () => {
        setIsRunningDiagnostics(true);
        if (isLive) {
            // Stopping
            await runDiagnostics();
            toast('System Paused - Diagnotics Halted', { icon: '⏸️' });
        } else {
            // Starting
            toast('Diagnostics Initiated... Standby', { icon: '⏳' });
            await runDiagnostics(); // Waits 6s
            toast.success('LiveDB Data Connect Success -- DB2218JOQAER41', { duration: 4000 });
        }
        setIsRunningDiagnostics(false);
    };

    // FETCH HISTORY EFFECT
    useEffect(() => {
        const fetchHistory = async () => {
            if (!selectedSegment || selectedSegment === 'overall') {
                setHistoryData([]);
                return;
            }

            setIsLoadingHistory(true);
            try {
                const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
                const res = await fetch(`${apiUrl}/api/history/${selectedSegment}`);
                if (res.ok) {
                    const data = await res.json();
                    setHistoryData(data);
                }
            } catch (e) {
                console.error("History Fetch Error:", e);
            } finally {
                setIsLoadingHistory(false);
            }
        };

        fetchHistory();
    }, [selectedSegment]);

    // DERIVE REPORT DATA FROM BACKEND DETAILS
    const reportData = useMemo(() => {
        if (selectedSegment === 'overall') {
            const allSegments = Object.values(systemHealthDetails || {});
            const avgScore = allSegments.length > 0
                ? allSegments.reduce((sum, s) => sum + s.health_score, 0) / allSegments.length
                : 100;

            return {
                name: 'Overall System',
                score: avgScore,
                status: avgScore > 80 ? 'Good' : avgScore > 60 ? 'Warning' : 'Critical',
                status_detail: 'System Overview',
                summary: `Monitoring ${allSegments.length} pipeline segments. Average health: ${avgScore.toFixed(1)}%.`,
                drivers: [],
                driver_names: [],
                recommendation: {
                    action: 'System Monitoring',
                    type: 'Info',
                    priority: 'Routine',
                    timeframe: 'Continuous',
                    desc: 'All segments under continuous monitoring. Review individual segments for details.',
                    button: { show: false }
                },
                rul: 0,
                rul_display: { category: 'Monitoring', display_text: 'N/A', color: 'slate' },
                last_updated: new Date().toISOString(),
                data_source: 'simulation'
            };
        }

        const details = systemHealthDetails?.[selectedSegment] || {
            health_score: 100,
            status: 'Good',
            drivers: [],
            rul: 730,
            rul_display: { category: 'Good', display_text: '2 years', color: 'emerald' },
            status_detail: 'Optimal Performance',
            summary: 'Operating within normal parameters.',
            driver_names: []
        };

        let rec = {};
        if (details.status === 'Critical') {
            rec = {
                action: 'Emergency Maintenance',
                type: 'Critical',
                priority: 'Immediate',
                timeframe: 'NOW',
                desc: details.summary || 'Critical failure detected. Immediate action required.',
                button: { show: true, text: 'VIEW FULL REPORT', variant: 'outline' }
            };
        } else if (details.status === 'Warning') {
            rec = {
                action: 'Schedule Inspection',
                type: 'Warning',
                priority: 'High',
                timeframe: '48 Hours',
                desc: details.summary || 'Accelerated degradation observed. Schedule inspection.',
                button: { show: true, text: 'VIEW FULL REPORT', variant: 'outline' }
            };
        } else {
            rec = {
                action: 'System Nominal',
                type: 'Good',
                priority: 'Low',
                timeframe: 'Routine',
                desc: details.summary || 'Assets operating within normal parameters.',
                button: { show: true, text: 'VIEW FULL REPORT', variant: 'outline' }
            };
        }

        return {
            name: `Segment ${selectedSegment}`,
            score: details.health_score,
            status: details.status,
            status_detail: details.status_detail,
            summary: details.summary,
            drivers: details.drivers || [],
            driver_names: details.driver_names || [],
            recommendation: rec,
            rul: details.rul,
            rul_display: details.rul_display,
            last_updated: details.last_updated,
            data_source: details.data_source
        };
    }, [selectedSegment, systemHealthDetails]);

    const getStatusColor = (level) => {
        switch (level) {
            case 'Good': return { text: 'text-emerald-600', bg: 'bg-emerald-500' };
            case 'Warning': return { text: 'text-amber-600', bg: 'bg-amber-500' };
            case 'Critical': return { text: 'text-rose-600', bg: 'bg-rose-500' };
            default: return { text: 'text-slate-600', bg: 'bg-slate-500' };
        }
    }
    const colors = getStatusColor(reportData.status);

    const confidence = selectedSegment === 'overall' ? 95 :
        selectedSegment === 'C-D' ? 98 :
            selectedSegment === 'D-E' ? 96 :
                selectedSegment === 'B-C' ? 97 : 99;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Health Monitoring</h1>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">AI-Driven Degradation Analysis</p>
                </div>

                <div className="flex items-center gap-2">
                    <Select
                        value={selectedSegment}
                        onChange={(e) => setSelectedSegment(e.target.value)}
                        className="bg-white border-slate-200"
                    >
                        <option value="overall">Overall System</option>
                        <option value="A-B">Segment A-B (Good)</option>
                        <option value="B-C">Segment B-C (Disturbed)</option>
                        <option value="C-D">Segment C-D (Bad)</option>
                        <option value="D-E">Segment D-E (Poor)</option>
                    </Select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {/* 1. SYSTEM TOPOLOGY HEALTH (First) */}
                <div className="md:col-span-12">
                    <SystemTopology onSegmentSelect={setSelectedSegment} />
                </div>
                {/* 1. HEALTH GAUGE */}
                <div className="arch-card md:col-span-4 flex flex-col items-center justify-center p-6 bg-white dark:bg-slate-900 border border-slate-200 rounded-xl">
                    <h3 className="text-slate-500 text-sm font-bold uppercase tracking-wider mb-6 w-full text-left">Real-Time Health</h3>
                    <div className="relative w-56 h-56 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle cx="112" cy="112" r="96" stroke="currentColor" className="text-slate-100" strokeWidth="16" fill="transparent" />
                            <circle
                                cx="112" cy="112" r="96"
                                stroke="currentColor"
                                className={colors.text}
                                strokeWidth="16"
                                strokeLinecap="round"
                                fill="transparent"
                                strokeDasharray={2 * Math.PI * 96}
                                strokeDashoffset={2 * Math.PI * 96 * (1 - reportData.score / 100)}
                                style={{ transition: 'stroke-dashoffset 0.5s ease-out' }}
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className={`text-5xl font-bold ${colors.text}`}>{reportData.score.toFixed(1)}</span>
                            <span className="text-sm text-slate-400 font-bold mt-2">
                                {selectedSegment === 'overall' ? 'System Health' : reportData.rul_display?.display_text || 'N/A'}
                            </span>
                            <span className="text-xs text-slate-400 mt-1">
                                {selectedSegment === 'overall' ? 'Average' : reportData.rul_display?.category || 'Status'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* 2. HISTORY CHART */}
                <div className="arch-card md:col-span-8 flex flex-col p-6 bg-white dark:bg-slate-900 border border-slate-200 rounded-xl">
                    <div className="flex justify-between mb-4">
                        <h3 className="text-slate-500 text-sm font-bold uppercase">6-Month Degradation History</h3>
                        <Badge variant="outline" className="text-emerald-600 bg-emerald-50">Confidence: {confidence}%</Badge>
                    </div>
                    <div className="h-[300px] w-full">
                        {isLoadingHistory ? (
                            <div className="flex items-center justify-center h-full text-slate-400">Loading History...</div>
                        ) : selectedSegment === 'overall' ? (
                            <div className="flex items-center justify-center h-full text-slate-400">
                                <div className="text-center">
                                    <Network size={48} className="mx-auto mb-4 text-slate-300" />
                                    <p>Select a specific segment to view detailed history</p>
                                </div>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={historyData}>
                                    <defs>
                                        <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={reportData.status === 'Critical' ? '#e11d48' : reportData.status === 'Warning' ? '#f59e0b' : '#059669'} stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="day" hide />
                                    <YAxis domain={['auto', 'auto']} />
                                    <Tooltip />
                                    <Area
                                        type="monotone"
                                        dataKey="score"
                                        stroke={reportData.status === 'Critical' ? '#e11d48' : reportData.status === 'Warning' ? '#f59e0b' : '#059669'}
                                        fill="url(#colorScore)"
                                        strokeWidth={3}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>


            </div>

            {/* STATUS & SUMMARY */}
            {selectedSegment !== 'overall' && (
                <StatusSummary
                    status={reportData.status_detail}
                    statusColor={reportData.rul_display?.color || 'emerald'}
                    summary={reportData.summary}
                    lastUpdated={reportData.last_updated || new Date().toISOString()}
                    dataSource={reportData.data_source || 'simulation'}
                    segmentName={reportData.name}
                />
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* 3. DEGRADATION METRICS (ENHANCED) */}
                <div className="arch-card p-6 bg-white dark:bg-slate-900 border border-slate-200 rounded-xl">
                    <h3 className="text-slate-500 text-sm font-bold uppercase mb-4">Degradation Metrics</h3>
                    <div className="space-y-5">
                        {selectedSegment === 'overall' ? (
                            <div className="text-sm text-slate-400 text-center py-8">
                                Select a segment to view detailed metrics
                            </div>
                        ) : reportData.drivers.length > 0 ? (
                            reportData.drivers.map((driver, idx) => {
                                const IconComponent = DRIVER_ICONS[driver.name] || AlertCircle;

                                // Determine color classes based on severity
                                const getColorClasses = (color) => {
                                    const colorMap = {
                                        'rose': { icon: 'text-rose-600', bg: 'bg-rose-500', badge: 'bg-rose-100 text-rose-700' },
                                        'orange': { icon: 'text-orange-600', bg: 'bg-orange-500', badge: 'bg-orange-100 text-orange-700' },
                                        'amber': { icon: 'text-amber-600', bg: 'bg-amber-500', badge: 'bg-amber-100 text-amber-700' },
                                        'emerald': { icon: 'text-emerald-600', bg: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-700' },
                                        'slate': { icon: 'text-slate-600', bg: 'bg-slate-500', badge: 'bg-slate-100 text-slate-700' }
                                    };
                                    return colorMap[color] || colorMap['slate'];
                                };

                                const colors = getColorClasses(driver.color);

                                return (
                                    <div key={idx} className="space-y-2.5 pb-4 border-b border-slate-100 dark:border-slate-800 last:border-0 last:pb-0">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-2.5">
                                                <div className={`p-1.5 rounded-lg bg-${driver.color}-50 dark:bg-${driver.color}-900/20`}>
                                                    <IconComponent size={16} className={colors.icon} />
                                                </div>
                                                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                                    {driver.name}
                                                </span>
                                            </div>
                                            <Badge className={`text-xs font-mono font-bold ${colors.badge} border-0`}>
                                                {driver.impact}%
                                            </Badge>
                                        </div>
                                        {/* PROGRESS BAR */}
                                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${colors.bg} transition-all duration-700 ease-out shadow-sm`}
                                                style={{ width: `${driver.impact}%` }}
                                            ></div>
                                        </div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                            {driver.details}
                                        </p>
                                        <div className="flex items-center gap-2 text-xs text-slate-400">
                                            <span className="capitalize font-medium">{driver.trend}</span>
                                            <span className="text-slate-300">•</span>
                                            <span className="capitalize">{driver.severity} severity</span>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="text-sm text-slate-400">No degradation factors detected</div>
                        )}
                    </div>
                </div>

                {/* 4. RECOMMENDATION */}
                <div className="arch-card p-6 bg-white dark:bg-slate-900 border border-slate-200 rounded-xl">
                    <h3 className="text-slate-500 text-sm font-bold uppercase mb-4">Recommendation</h3>
                    <div className="space-y-4">
                        <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                            {reportData.recommendation.action}
                        </h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                            {reportData.recommendation.desc}
                        </p>
                        {reportData.recommendation.button?.show && selectedSegment !== 'overall' && (
                            <Button
                                onClick={() => setShowReport(true)}
                                variant={reportData.recommendation.button.variant}
                                className="w-full"
                            >
                                <FileText size={16} className="mr-2" />
                                {reportData.recommendation.button.text}
                            </Button>
                        )}
                    </div>
                </div>

                {/* 5. ACTIVE SEGMENTS */}
                <div className="arch-card p-6 bg-white dark:bg-slate-900 border border-slate-200 rounded-xl">
                    <h3 className="text-slate-500 text-sm font-bold uppercase mb-4">Active Segments</h3>
                    <div className="space-y-2">
                        {Object.entries(systemHealthDetails || {}).map(([segId, details]) => (
                            <SectorRow
                                key={segId}
                                name={`Segment ${segId}`}
                                score={details.health_score}
                                trend={details.health_score < 90 ? 'down' : 'up'}
                                active={segId === selectedSegment}
                                onClick={() => setSelectedSegment(segId)}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* INVESTIGATION REPORT MODAL */}
            {selectedSegment !== 'overall' && (
                <InvestigationReport
                    isOpen={showReport}
                    onClose={() => setShowReport(false)}
                    reportData={reportData}
                    segmentId={selectedSegment}
                />
            )}
        </div>
    )
}
