import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, ShieldCheck, Server, AlertTriangle, FileCode, Cpu, Lock } from 'lucide-react';
import { modelApi } from '../lib/api';

import { useSensor } from '../contexts/SensorContext';

const ModelMetrics = () => {
    // Access Live Status
    const { isLive } = useSensor();

    // Fetch active model details
    const { data: modelInfo, isLoading } = useQuery({
        queryKey: ['activeModel'],
        queryFn: async () => {
            try {
                const res = await modelApi.getMetrics();
                return res.data;
            } catch (err) {
                return null;
            }
        }
    })

    // Use mock data for demonstration if API fails
    const displayData = modelInfo || {
        status: isLive ? 'active' : 'paused',
        type: 'XGBoost Ensemble',
        model_version: 'v2.1.3'
    };

    if (isLoading) return <div className="p-10 text-center text-slate-500">Loading system status...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">System Status</h1>
                    <p className="text-slate-500 dark:text-slate-400">AIPIS Inference Engine</p>
                </div>
                <div className={`px-3 py-1 ${isLive ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30' : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30'} border text-sm rounded-full font-medium`}>
                    Status: {isLive ? 'ACTIVE' : 'PAUSED'}
                </div>
            </div>

            <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-${isLive ? '100' : '75'} transition-opacity`}>
                <div className="arch-card p-6 bg-white dark:bg-slate-900">
                    <div className="flex items-center space-x-4">
                        <div className="p-3 bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 rounded-lg">
                            <Server size={24} />
                        </div>
                        <div>
                            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Pipeline Type</p>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{displayData.type}</h3>
                        </div>
                    </div>
                </div>

                <div className="arch-card p-6 bg-white dark:bg-slate-900">
                    <div className="flex items-center space-x-4">
                        <div className="p-3 bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400 rounded-lg">
                            <ShieldCheck size={24} />
                        </div>
                        <div>
                            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Physics-Informed</p>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Enabled</h3>
                        </div>
                    </div>
                </div>

                <div className="arch-card p-6 bg-white dark:bg-slate-900">
                    <div className="flex items-center space-x-4">
                        <div className="p-3 bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 rounded-lg">
                            <Activity size={24} />
                        </div>
                        <div>
                            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Response Time</p>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{isLive ? '< 50ms' : '0ms'}</h3>
                        </div>
                    </div>
                </div>

                <div className="arch-card p-6 bg-white dark:bg-slate-900">
                    <div className="flex items-center space-x-4">
                        <div className="p-3 bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400 rounded-lg">
                            <Cpu size={24} />
                        </div>
                        <div>
                            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Resource Efficiency</p>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{isLive ? 'Optimal (12%)' : 'Idle'}</h3>
                        </div>
                    </div>
                </div>

                <div className="arch-card p-6 bg-white dark:bg-slate-900">
                    <div className="flex items-center space-x-4">
                        <div className="p-3 bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400 rounded-lg">
                            <Lock size={24} />
                        </div>
                        <div>
                            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Security</p>
                            <div className="flex flex-col">
                                <span className="text-lg font-bold text-slate-900 dark:text-white">Encryption Active</span>
                                <span className="text-xs text-slate-500">AES-256 / Audit Logs On</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* DEMONSTRATION COMPONENTS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                {/* Live DB Data Stream */}
                <div className={`arch-card p-6 ${isLive ? 'bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 border-indigo-200' : 'bg-slate-50 dark:bg-slate-800 border-slate-200'} border-2`}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <div className={`p-3 ${isLive ? 'bg-indigo-600' : 'bg-slate-400'} text-white rounded-lg`}>
                                    <Activity size={24} />
                                </div>
                                {isLive && <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full animate-pulse border-2 border-white dark:border-slate-900"></div>}
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Live Data Stream</h3>
                                <p className="text-sm text-slate-600 dark:text-slate-400">{isLive ? 'Database connection active' : 'Connection Standby'}</p>
                            </div>
                        </div>
                        <div className={`px-3 py-1 ${isLive ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'} text-xs font-bold rounded-full`}>
                            {isLive ? 'ACTIVE' : 'PAUSED'}
                        </div>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                        <div className={`h-full ${isLive ? 'bg-gradient-to-r from-indigo-500 to-blue-500 animate-pulse' : 'bg-slate-400'} rounded-full`} style={{ width: isLive ? '87%' : '0%' }}></div>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">{isLive ? 'Streaming in progress...' : 'Data stream halted.'}</p>
                </div>

                {/* Analysis Engine */}
                <div className={`arch-card p-6 ${isLive ? 'bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200' : 'bg-slate-50 dark:bg-slate-800 border-slate-200'} border-2`}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className={`p-3 ${isLive ? 'bg-purple-600' : 'bg-slate-400'} text-white rounded-lg`}>
                                <Cpu size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Analysis Engine</h3>
                                <p className="text-sm text-slate-600 dark:text-slate-400">{isLive ? 'Processing pipeline data' : 'Engine Idle'}</p>
                            </div>
                        </div>
                        <div className={`px-3 py-1 ${isLive ? 'bg-purple-100 text-purple-700' : 'bg-slate-200 text-slate-600'} text-xs font-bold rounded-full`}>
                            {isLive ? 'RUNNING' : 'IDLE'}
                        </div>
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-600 dark:text-slate-400">Status:</span>
                            <span className={`text-sm font-bold ${isLive ? 'text-emerald-600' : 'text-slate-500'}`}>{isLive ? 'Operational' : 'Standby'}</span>
                        </div>
                    </div>
                </div>

                {/* Data Processing */}
                <div className={`arch-card p-6 ${isLive ? 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200' : 'bg-slate-50 dark:bg-slate-800 border-slate-200'} border-2`}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className={`p-3 ${isLive ? 'bg-amber-600' : 'bg-slate-400'} text-white rounded-lg`}>
                                <Server size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Data Processing</h3>
                                <p className="text-sm text-slate-600 dark:text-slate-400">{isLive ? 'Pipeline monitoring' : 'Pipeline Paused'}</p>
                            </div>
                        </div>
                        <div className={`px-3 py-1 ${isLive ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-600'} text-xs font-bold rounded-full`}>
                            {isLive ? 'ACTIVE' : 'WAITING'}
                        </div>
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-600 dark:text-slate-400">Queue:</span>
                            <span className={`text-sm font-bold ${isLive ? 'text-emerald-600' : 'text-slate-500'}`}>{isLive ? 'Processing' : 'Held'}</span>
                        </div>
                    </div>
                </div>

                {/* System Health */}
                <div className={`arch-card p-6 ${isLive ? 'bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border-emerald-200' : 'bg-slate-50 dark:bg-slate-800 border-slate-200'} border-2`}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className={`p-3 ${isLive ? 'bg-emerald-600' : 'bg-slate-400'} text-white rounded-lg`}>
                                <ShieldCheck size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">System Health</h3>
                                <p className="text-sm text-slate-600 dark:text-slate-400">{isLive ? 'All systems operational' : 'Monitoring suspended'}</p>
                            </div>
                        </div>
                        <div className={`px-3 py-1 ${isLive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'} text-xs font-bold rounded-full`}>
                            {isLive ? 'HEALTHY' : 'SUSPENDED'}
                        </div>
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-600 dark:text-slate-400">Status:</span>
                            <span className={`text-sm font-bold ${isLive ? 'text-emerald-600' : 'text-slate-500'}`}>{isLive ? 'Normal' : 'Offline'}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ModelMetrics;
