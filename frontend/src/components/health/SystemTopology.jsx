import React, { useState } from 'react';
import { useSensor } from '../../contexts/SensorContext';
import { AlertTriangle, Activity, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

/**
 * System Topology (Legacy AIPIS Style)
 * "Integrated VTwin Overview"
 * Features: Wireframe Cards, Dashed Connectors, Inline Hover Effects
 */
export default function SystemTopology({ onSegmentSelect }) {
    const { sensors, segmentHealth, getSensorReading } = useSensor();
    const [hoveredSensor, setHoveredSensor] = useState(null);

    if (!sensors || sensors.length === 0) return null;

    return (
        <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-xl shadow-sm overflow-x-auto">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-8">System Topology Health</h2>
            <div className="flex items-center justify-between min-w-[1000px] px-4">
                {sensors.map((sensor, i) => {
                    const reading = getSensorReading(sensor.id);
                    const isWarning = sensor.status === 'warning';
                    const isCritical = sensor.status === 'critical';

                    // Derive segment key for this node (Node A -> Segment A-B)
                    let currentSegmentKey = 'A-B';
                    if (sensor.id === 'SENSOR_B') currentSegmentKey = 'B-C';
                    if (sensor.id === 'SENSOR_C') currentSegmentKey = 'C-D';
                    if (sensor.id === 'SENSOR_D' || sensor.id === 'SENSOR_E') currentSegmentKey = 'D-E';

                    // Connector Logic
                    let connector = null;
                    if (i < sensors.length - 1) {
                        const nextSensor = sensors[i + 1];
                        const segKey = `${sensor.id.split('_')[1]}-${nextSensor.id.split('_')[1]}`;
                        const health = segmentHealth[segKey] || 100;
                        let colorClass = 'bg-blue-200 dark:bg-blue-900';
                        let statusColor = 'text-blue-500';
                        if (health < 90) { colorClass = 'bg-amber-200 dark:bg-amber-900'; statusColor = 'text-amber-500'; }
                        if (health < 75) { colorClass = 'bg-red-200 dark:bg-red-900'; statusColor = 'text-red-500'; }

                        connector = (
                            <div
                                className="flex-1 h-32 flex flex-col items-center justify-center relative min-w-[100px] group cursor-pointer"
                                onClick={() => {
                                    if (onSegmentSelect) onSegmentSelect(segKey);
                                    toast.success(`Selected Segment: ${segKey}`);
                                }}
                            >
                                {/* Dashed Line */}
                                <div className={`w-full border-t-2 group-hover:border-t-4 transition-all duration-200 border-dashed ${health < 90 ? 'border-amber-500' : 'border-slate-300 dark:border-slate-600'} relative`} />

                                {/* Efficiency Label */}
                                <div className={`absolute -top-3 px-1 bg-white dark:bg-slate-900 text-[10px] font-mono ${statusColor} group-hover:font-bold`}>
                                    EFF:{health.toFixed(0)}%
                                </div>

                                {/* Arrow Icon */}
                                <div className={`absolute bottom-10 ${statusColor} group-hover:scale-125 transition-transform duration-200`}>
                                    <ArrowRight className="w-5 h-5 stroke-2" />
                                </div>
                            </div>
                        );
                    }

                    return (
                        <React.Fragment key={sensor.id}>
                            <div className="relative z-10">
                                {/* WIREFRAME CARD */}
                                <div
                                    className={`w-48 p-3 border-2 transition-all duration-300 font-mono relative bg-white/50 dark:bg-slate-900/50 cursor-pointer hover:shadow-lg hover:-translate-y-1
                                        ${isCritical ? 'border-red-600 border-double' :
                                            isWarning ? 'border-amber-500 border-dashed' :
                                                'border-slate-400 dark:border-slate-600'
                                        }`}
                                    onMouseEnter={() => setHoveredSensor(sensor.id)}
                                    onMouseLeave={() => setHoveredSensor(null)}
                                    onClick={() => {
                                        if (onSegmentSelect) onSegmentSelect(currentSegmentKey);
                                    }}
                                >
                                    {/* HOVER POPUP */}
                                    {(hoveredSensor === sensor.id) && (
                                        <div className="absolute -top-24 left-0 right-0 z-20 animate-in fade-in zoom-in slide-in-from-bottom-2 duration-200 pointer-events-none">
                                            <div className={`p-2 shadow-xl border-2 text-xs font-bold font-mono text-center
                                                ${isCritical ? 'bg-red-600 text-white border-red-800' :
                                                    isWarning ? 'bg-amber-400 text-amber-900 border-amber-600' :
                                                        'bg-blue-500 text-white border-blue-700'}
                                            `}>
                                                <div className="flex items-center justify-center gap-1 mb-1 border-b border-white/20 pb-1">
                                                    {isCritical || isWarning ? <AlertTriangle className="w-3 h-3 fill-current" /> : <Activity className="w-3 h-3" />}
                                                    <span>{isCritical || isWarning ? 'SIGNAL DETECTED' : 'SYSTEM STATUS'}</span>
                                                </div>
                                                <div className="space-y-1 text-[9px] text-left px-1">
                                                    <div className="flex justify-between"><span>FLOW:</span><span>{reading.flow?.toFixed(1) || 0} L/m</span></div>
                                                    <div className="flex justify-between"><span>TEMP:</span><span>{reading.temp?.toFixed(1) || 0} °C</span></div>
                                                </div>
                                                {/* Arrow Pointer */}
                                                <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px]
                                                    ${isCritical ? 'border-t-red-800' : isWarning ? 'border-t-amber-600' : 'border-t-blue-700'}
                                                `} />
                                            </div>
                                        </div>
                                    )}

                                    {/* HEADER */}
                                    <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-200 dark:border-slate-700 border-dashed">
                                        <span className="font-bold text-slate-700 dark:text-slate-200 text-xs uppercase">{sensor.name}</span>
                                        {isCritical || isWarning ? (
                                            <AlertTriangle className={`w-4 h-4 cursor-pointer animate-pulse ${isCritical ? 'text-red-600' : 'text-amber-600'}`} />
                                        ) : (
                                            <div className="text-[10px] text-slate-400 font-bold">[OK]</div>
                                        )}
                                    </div>

                                    {/* METRICS */}
                                    <div className="space-y-1">
                                        <div className="flex justify-between items-baseline">
                                            <span className="text-[10px] text-slate-500 uppercase">P_IN:</span>
                                            <span className="font-bold text-sm text-slate-700 dark:text-slate-200">
                                                {reading.pressure.toFixed(1)} <span className="text-[8px] text-slate-400">PSI</span>
                                            </span>
                                        </div>
                                        {/* Retro Text Bar */}
                                        <div className="text-[8px] tracking-tighter text-slate-300 dark:text-slate-700 overflow-hidden whitespace-nowrap mb-2">
                                            <span className={isCritical ? 'text-red-600' : isWarning ? 'text-amber-600' : 'text-slate-500'}>
                                                {'|'.repeat(Math.max(0, Math.min(20, Math.floor(reading.pressure / 5))))}
                                            </span>
                                            <span className="opacity-20">{'|'.repeat(Math.max(0, 20 - Math.floor(Math.max(0, reading.pressure) / 5)))}</span>
                                        </div>

                                        {/* ACOUSTIC READING (Compact) */}
                                        <div className="flex justify-between items-center border-t border-dashed border-slate-200 dark:border-slate-700 pt-1">
                                            <span className="text-[9px] text-slate-400 font-mono">ACOUSTIC</span>
                                            <div className={`text-[10px] font-bold font-mono ${reading.acoustic > 80 ? 'text-red-500 animate-pulse' : reading.acoustic > 60 ? 'text-amber-500' : 'text-slate-600 dark:text-slate-400'}`}>
                                                {reading.acoustic?.toFixed(1)} dB
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* LOCATION TAG */}
                                <div className="absolute -bottom-6 left-0 right-0 text-center">
                                    <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest">
                                        [{sensor.location.split(' ')[2] || 'LOC'}]
                                    </span>
                                </div>
                            </div>
                            {connector}
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
}
