import React from 'react';
import { Clock, Database, Activity } from 'lucide-react';
import { Badge } from '../ui/Badge';

/**
 * Status & Summary Component
 * Displays segment status, summary text, and metadata
 */
export default function StatusSummary({
    status,
    statusColor,
    summary,
    lastUpdated,
    dataSource,
    segmentName
}) {
    const getStatusBadgeColor = (color) => {
        const colors = {
            emerald: 'bg-emerald-100 text-emerald-700 border-emerald-200',
            amber: 'bg-amber-100 text-amber-700 border-amber-200',
            orange: 'bg-orange-100 text-orange-700 border-orange-200',
            rose: 'bg-rose-100 text-rose-700 border-rose-200'
        };
        return colors[color] || colors.emerald;
    };

    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-slate-500 dark:text-slate-400 text-sm font-bold uppercase tracking-wider">
                    Status & Summary
                </h3>
                <Badge
                    variant="outline"
                    className={getStatusBadgeColor(statusColor)}
                >
                    {status}
                </Badge>
            </div>

            {/* Summary Text */}
            <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
                {summary}
            </p>

            {/* Metadata Footer */}
            <div className="flex items-center gap-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-1.5">
                    <Clock size={12} />
                    <span>Updated: {new Date(lastUpdated).toLocaleTimeString()}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <Database size={12} />
                    <span className="capitalize">{dataSource}</span>
                </div>
            </div>
        </div>
    );
}
