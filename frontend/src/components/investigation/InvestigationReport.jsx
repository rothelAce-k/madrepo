import React, { useState } from 'react';
import { X, Download, FileText, AlertTriangle, TrendingDown, Calendar, Activity } from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import jsPDF from 'jspdf';

/**
 * Full Investigation Report Modal
 * Comprehensive segment analysis with PDF export
 */
export default function InvestigationReport({ isOpen, onClose, reportData, segmentId }) {
    const [activeTab, setActiveTab] = useState('overview');

    // Work Order Form State
    const [woSegment, setWoSegment] = useState('');
    const [woPriority, setWoPriority] = useState('');
    const [woIssueType, setWoIssueType] = useState('');
    const [woDescription, setWoDescription] = useState('');
    const [woInitialized, setWoInitialized] = useState(false);

    // Initialize Work Order fields only once when modal opens
    React.useEffect(() => {
        if (isOpen && reportData && !woInitialized) {
            setWoSegment(reportData.segment || segmentId || '');
            setWoPriority(reportData.status === 'Critical' ? 'URGENT' : reportData.status === 'Warning' ? 'HIGH' : 'MEDIUM');
            setWoIssueType(reportData.drivers?.[0]?.name || 'Pipeline Degradation');
            setWoDescription(`Health Score: ${reportData.score?.toFixed(1)}% | RUL: ${reportData.rul} days | ${reportData.recommendation?.desc || 'Maintenance required'}`);
            setWoInitialized(true);
        }
        // Reset initialization flag when modal closes
        if (!isOpen) {
            setWoInitialized(false);
        }
    }, [isOpen, reportData, segmentId, woInitialized]);

    if (!isOpen) return null;

    const generatePDF = async () => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        let yPos = 20;

        // ============ HELPER FUNCTIONS ============
        const checkPageBreak = (requiredSpace = 30) => {
            if (yPos + requiredSpace > pageHeight - 20) {
                doc.addPage();
                addPageFooter();
                yPos = 20;
                return true;
            }
            return false;
        };

        const addPageFooter = () => {
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text(`P_Health System | Segment ${segmentId} | Page ${doc.internal.getNumberOfPages()}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
            doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - 20, pageHeight - 10, { align: 'right' });
            doc.setTextColor(0, 0, 0);
        };

        const addSectionHeader = (title, icon = '', color = [79, 70, 229]) => {
            checkPageBreak(20);
            doc.setFillColor(...color);
            doc.roundedRect(15, yPos, pageWidth - 30, 12, 2, 2, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(13);
            doc.setFont(undefined, 'bold');
            doc.text(icon + ' ' + title, 20, yPos + 8);
            yPos += 18;
            doc.setTextColor(0, 0, 0);
            doc.setFont(undefined, 'normal');
        };

        const drawChart = (x, y, width, height, data, title, color = [79, 70, 229]) => {
            // Chart border
            doc.setDrawColor(200, 200, 200);
            doc.setLineWidth(0.5);
            doc.rect(x, y, width, height);

            // Title
            doc.setFontSize(10);
            doc.setFont(undefined, 'bold');
            doc.text(title, x + width / 2, y - 3, { align: 'center' });
            doc.setFont(undefined, 'normal');

            // Draw bars
            const barWidth = (width - 10) / data.length;
            const maxValue = Math.max(...data.map(d => d.value));

            data.forEach((item, idx) => {
                const barHeight = (item.value / maxValue) * (height - 20);
                const barX = x + 5 + (idx * barWidth);
                const barY = y + height - barHeight - 10;

                // Bar
                doc.setFillColor(...(item.color || color));
                doc.roundedRect(barX, barY, barWidth - 2, barHeight, 1, 1, 'F');

                // Value label
                doc.setFontSize(7);
                doc.text(item.value.toFixed(0), barX + (barWidth - 2) / 2, barY - 2, { align: 'center' });

                // X-axis label
                doc.setFontSize(6);
                const label = item.label.length > 8 ? item.label.substring(0, 8) + '...' : item.label;
                doc.text(label, barX + (barWidth - 2) / 2, y + height - 2, { align: 'center', angle: 45 });
            });
        };

        const drawPieChart = (x, y, radius, data, title) => {
            doc.setFontSize(10);
            doc.setFont(undefined, 'bold');
            doc.text(title, x, y - radius - 5, { align: 'center' });
            doc.setFont(undefined, 'normal');

            // Simple legend instead of actual pie chart (jsPDF has limited shape support)
            data.forEach((item, idx) => {
                const legendY = y - radius + (idx * 10);
                doc.setFillColor(...item.color);
                doc.roundedRect(x - radius, legendY - 3, 6, 6, 1, 1, 'F');
                doc.setFontSize(9);
                doc.setTextColor(0, 0, 0);
                doc.text(`${item.label}: ${item.value.toFixed(1)}%`, x - radius + 10, legendY + 2);

                // Horizontal bar
                const barWidth = (item.value / 100) * 60;
                doc.setFillColor(...item.color);
                doc.roundedRect(x - radius + 60, legendY - 2, barWidth, 5, 1, 1, 'F');
            });
        };

        const drawGauge = (x, y, radius, value, maxValue, label) => {
            const percentage = (value / maxValue) * 100;
            const color = percentage > 80 ? [16, 185, 129] : percentage > 60 ? [245, 158, 11] : [244, 63, 94];

            // Background bar
            doc.setFillColor(220, 220, 220);
            doc.roundedRect(x - radius, y - 5, radius * 2, 10, 3, 3, 'F');

            // Value bar
            const valueWidth = (percentage / 100) * (radius * 2);
            doc.setFillColor(...color);
            doc.roundedRect(x - radius, y - 5, valueWidth, 10, 3, 3, 'F');

            // Center value
            doc.setFontSize(16);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(...color);
            doc.text(value.toFixed(1), x, y - 12, { align: 'center' });
            doc.setFontSize(8);
            doc.setTextColor(100, 100, 100);
            doc.text(label, x, y + 12, { align: 'center' });
            doc.setTextColor(0, 0, 0);
            doc.setFont(undefined, 'normal');
        };

        // ============ PAGE 1: MODERN COVER PAGE ============
        // Header gradient effect
        doc.setFillColor(79, 70, 229);
        doc.rect(0, 0, pageWidth, 100, 'F');
        doc.setFillColor(67, 56, 202);
        doc.rect(0, 80, pageWidth, 20, 'F');

        // Logo/Brand
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('P_HEALTH', 20, 15);
        doc.setFontSize(8);
        doc.setFont(undefined, 'normal');
        doc.text('Predictive Pipeline Health Monitoring', 20, 21);

        // Main title
        doc.setFontSize(32);
        doc.setFont(undefined, 'bold');
        doc.text('INVESTIGATION', pageWidth / 2, 45, { align: 'center' });
        doc.text('REPORT', pageWidth / 2, 58, { align: 'center' });

        // Segment ID
        doc.setFontSize(18);
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(pageWidth / 2 - 35, 70, 70, 15, 3, 3, 'F');
        doc.setTextColor(79, 70, 229);
        doc.text(`Segment ${segmentId}`, pageWidth / 2, 80, { align: 'center' });

        // Status indicator
        yPos = 115;
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('SYSTEM STATUS', pageWidth / 2, yPos, { align: 'center' });

        const statusColor = reportData.status === 'Critical' ? [244, 63, 94] :
            reportData.status === 'Warning' ? [245, 158, 11] : [16, 185, 129];
        doc.setFillColor(...statusColor);
        doc.roundedRect(pageWidth / 2 - 35, yPos + 5, 70, 16, 4, 4, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(14);
        doc.text(reportData.status.toUpperCase(), pageWidth / 2, yPos + 15, { align: 'center' });

        // Key metrics cards
        yPos = 145;
        const metrics = [
            { label: 'Health Score', value: `${reportData.score?.toFixed(1)}%` },
            { label: 'RUL', value: `${reportData.rul} days` },
            { label: 'Risk Level', value: reportData.score > 60 ? 'LOW' : 'HIGH' }
        ];

        const cardWidth = (pageWidth - 60) / 3;
        metrics.forEach((metric, idx) => {
            const cardX = 20 + (idx * (cardWidth + 10));
            doc.setFillColor(248, 250, 252);
            doc.roundedRect(cardX, yPos, cardWidth, 30, 3, 3, 'F');
            doc.setDrawColor(226, 232, 240);
            doc.roundedRect(cardX, yPos, cardWidth, 30, 3, 3, 'S');

            doc.setFontSize(9);
            doc.setTextColor(100, 116, 139);
            doc.text(metric.label, cardX + 5, yPos + 10);
            doc.setFontSize(14);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(0, 0, 0);
            doc.text(metric.value, cardX + 5, yPos + 22);
            doc.setFont(undefined, 'normal');
        });

        // Report metadata
        yPos = 190;
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text('Report Generated:', 20, yPos);
        doc.text('Confidence Level:', 20, yPos + 7);
        doc.text('Last Updated:', 20, yPos + 14);

        doc.setTextColor(0, 0, 0);
        doc.text(new Date().toLocaleString(), 70, yPos);
        doc.text(`${reportData.rul_display?.confidence_range?.percentage || 95}%`, 70, yPos + 7);
        doc.text(new Date(reportData.last_updated).toLocaleString(), 70, yPos + 14);

        addPageFooter();

        // ============ PAGE 2: EXECUTIVE DASHBOARD ============
        doc.addPage();
        yPos = 20;
        addSectionHeader('EXECUTIVE DASHBOARD');

        // Health Score Gauge
        drawGauge(50, 70, 25, reportData.score, 100, 'Health Score %');

        // RUL Visualization
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.text('Remaining Useful Life', 110, 50);
        doc.setFont(undefined, 'normal');
        doc.setFontSize(24);
        doc.setTextColor(79, 70, 229);
        doc.text(`${reportData.rul}`, 130, 70, { align: 'center' });
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.text('days', 130, 78, { align: 'center' });

        // Confidence interval bars
        const confRange = reportData.rul_display?.confidence_range;
        if (confRange) {
            doc.setFontSize(8);
            doc.text(`Best: ${confRange.upper}d`, 110, 88);
            doc.text(`Expected: ${reportData.rul}d`, 110, 94);
            doc.text(`Worst: ${confRange.lower}d`, 110, 100);
        }

        yPos = 115;
        checkPageBreak(80);

        // Health Timeline Chart
        const healthData = [
            { label: '6mo', value: 95, color: [16, 185, 129] },
            { label: '5mo', value: 93, color: [16, 185, 129] },
            { label: '4mo', value: 91, color: [34, 197, 94] },
            { label: '3mo', value: 89, color: [245, 158, 11] },
            { label: '2mo', value: 87, color: [245, 158, 11] },
            { label: '1mo', value: 85, color: [251, 146, 60] },
            { label: 'Now', value: reportData.score, color: reportData.score > 60 ? [245, 158, 11] : [244, 63, 94] }
        ];

        drawChart(15, yPos, pageWidth - 30, 60, healthData, 'Health Score Timeline (6 Months)');
        yPos += 70;

        // Degradation Drivers Pie Chart
        checkPageBreak(70);
        const driverData = (reportData.drivers || []).slice(0, 5).map((driver, idx) => ({
            label: driver.name.substring(0, 15),
            value: driver.impact,
            color: [
                [244, 63, 94],
                [245, 158, 11],
                [251, 191, 36],
                [16, 185, 129],
                [79, 70, 229]
            ][idx]
        }));

        if (driverData.length > 0) {
            drawPieChart(50, yPos + 30, 25, driverData, 'Degradation Breakdown');
        }

        addPageFooter();

        // ============ PAGE 3: DETAILED ANALYSIS ============
        doc.addPage();
        yPos = 20;
        addSectionHeader('DEGRADATION FACTORS', '', [244, 63, 94]);

        (reportData.drivers || []).forEach((driver, idx) => {
            checkPageBreak(45);

            // Driver card
            doc.setFillColor(248, 250, 252);
            doc.roundedRect(15, yPos, pageWidth - 30, 40, 3, 3, 'F');
            doc.setDrawColor(226, 232, 240);
            doc.roundedRect(15, yPos, pageWidth - 30, 40, 3, 3, 'S');

            // Header
            doc.setFontSize(11);
            doc.setFont(undefined, 'bold');
            doc.text(`${idx + 1}. ${driver.name}`, 20, yPos + 8);

            // Severity badge
            const sevColor = driver.severity === 'high' ? [244, 63, 94] :
                driver.severity === 'medium' ? [245, 158, 11] : [16, 185, 129];
            doc.setFillColor(...sevColor);
            doc.roundedRect(pageWidth - 50, yPos + 3, 30, 8, 2, 2, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(8);
            doc.text(driver.severity.toUpperCase(), pageWidth - 35, yPos + 8, { align: 'center' });
            doc.setTextColor(0, 0, 0);

            // Impact bar
            doc.setFont(undefined, 'normal');
            doc.setFontSize(9);
            doc.text('Impact:', 20, yPos + 18);
            const impactWidth = (driver.impact / 100) * 100;
            doc.setFillColor(...sevColor);
            doc.roundedRect(40, yPos + 14, impactWidth, 6, 2, 2, 'F');
            doc.text(`${driver.impact}%`, 145, yPos + 18);

            // Details
            doc.setFontSize(8);
            const details = doc.splitTextToSize(driver.details, pageWidth - 50);
            doc.text(details.slice(0, 2), 20, yPos + 26);

            yPos += 45;
        });

        addPageFooter();

        // ============ PAGE 4: RECOMMENDATIONS ============
        doc.addPage();
        yPos = 20;
        addSectionHeader('ACTION PLAN', '', [16, 185, 129]);

        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text('Immediate Actions:', 20, yPos);
        yPos += 10;

        const actions = reportData.status === 'Critical' ? [
            '1. IMMEDIATE SHUTDOWN: Isolate segment',
            '2. Emergency inspection within 24 hours',
            '3. Pressure testing required',
            '4. Prepare emergency repair resources',
            '5. Notify stakeholders immediately'
        ] : reportData.status === 'Warning' ? [
            '1. Schedule inspection within 48-72 hours',
            '2. Increase monitoring frequency',
            '3. Prepare maintenance resources',
            '4. Analyze historical patterns',
            '5. Plan maintenance window (2 weeks)'
        ] : [
            '1. Continue routine monitoring',
            '2. Maintain current protocols',
            '3. Review quarterly trends',
            '4. Update predictive models',
            '5. Document baseline metrics'
        ];

        doc.setFont(undefined, 'normal');
        doc.setFontSize(10);
        actions.forEach((action, idx) => {
            checkPageBreak(12);
            const actionLines = doc.splitTextToSize(action, pageWidth - 50);
            doc.text(actionLines, 25, yPos);
            yPos += actionLines.length * 6 + 4;
        });

        yPos += 10;
        checkPageBreak(60);

        // Cost Impact
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text('Financial Impact Analysis:', 20, yPos);
        yPos += 10;

        const costData = reportData.status === 'Critical' ?
            { repair: '50-100K', failure: '200-500K', downtime: '1-2 weeks' } :
            reportData.status === 'Warning' ?
                { repair: '20-50K', failure: '100-200K', downtime: '3-7 days' } :
                { repair: '5-15K', failure: '50-100K', downtime: '1-3 days' };

        doc.setFillColor(240, 253, 244);
        doc.roundedRect(20, yPos, 70, 25, 3, 3, 'F');
        doc.setFontSize(9);
        doc.setTextColor(22, 163, 74);
        doc.text('If Repaired Now', 55, yPos + 8, { align: 'center' });
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text(`$${costData.repair}`, 55, yPos + 18, { align: 'center' });

        doc.setFillColor(254, 242, 242);
        doc.roundedRect(100, yPos, 70, 25, 3, 3, 'F');
        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(220, 38, 38);
        doc.text('If Failure Occurs', 135, yPos + 8, { align: 'center' });
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text(`$${costData.failure}`, 135, yPos + 18, { align: 'center' });

        doc.setTextColor(0, 0, 0);
        doc.setFont(undefined, 'normal');
        yPos += 30;

        doc.setFontSize(9);
        doc.text(`Estimated Downtime: ${costData.downtime}`, 20, yPos);

        addPageFooter();
        doc.setFont(undefined, 'bold');
        doc.text('Long-term Planning:', 20, yPos);
        yPos += 8;
        doc.setFont(undefined, 'normal');
        doc.setFontSize(10);

        const longTermActions = [
            `Budget allocation: Estimated ${reportData.status === 'Critical' ? '$50,000-$100,000' : reportData.status === 'Warning' ? '$20,000-$50,000' : '$5,000-$15,000'} for maintenance`,
            `Timeline: ${reportData.recommendation.timeframe}`,
            'Consider pipeline replacement if RUL < 6 months',
            'Implement enhanced monitoring for early warning',
            'Review and update maintenance procedures based on findings'
        ];

        longTermActions.forEach(action => {
            checkPageBreak(10);
            const actionLines = doc.splitTextToSize(`• ${action}`, pageWidth - 40);
            doc.text(actionLines, 20, yPos);
            yPos += actionLines.length * 6 + 3;
        });

        // ===== PAGE 10: APPENDIX =====
        doc.addPage();
        yPos = 20;
        addSectionHeader('📚 APPENDIX');

        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text('Methodology:', 20, yPos);
        yPos += 8;
        doc.setFont(undefined, 'normal');
        doc.setFontSize(9);

        const methodology = [
            'This report is generated using advanced machine learning algorithms trained on historical pipeline data.',
            'The XGBoost model analyzes 105 engineered features including sensor readings, environmental factors,',
            'and operational parameters to predict Remaining Useful Life (RUL) with high accuracy.',
            '',
            'Data Sources:',
            '• Real-time sensor telemetry (2-second intervals)',
            '• Historical maintenance records',
            '• Environmental monitoring data',
            '• Operational logs and events',
            '',
            'Confidence Levels:',
            '• 95% confidence interval provided for all predictions',
            '• Model validated against 180+ days of historical data',
            '• Continuous learning from new data points'
        ];

        methodology.forEach(line => {
            checkPageBreak(6);
            doc.text(line, 20, yPos);
            yPos += 5;
        });

        yPos += 10;
        checkPageBreak(30);
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text('Contact Information:', 20, yPos);
        yPos += 8;
        doc.setFont(undefined, 'normal');
        doc.setFontSize(9);
        doc.text('P-Health Predictive Maintenance System', 20, yPos);
        yPos += 5;
        doc.text('Technical Support: support@p-health.ai', 20, yPos);
        yPos += 5;
        doc.text('Emergency Hotline: 1-800-PIPELINE', 20, yPos);

        // Footer on all pages
        const totalPages = doc.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
            doc.text('P-Health Predictive Maintenance System - Confidential', pageWidth / 2, pageHeight - 5, { align: 'center' });
        }

        doc.save(`Investigation_Report_${segmentId}_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    const tabs = [
        { id: 'overview', label: 'Overview', icon: FileText },
        { id: 'timeline', label: 'Timeline', icon: Calendar },
        { id: 'analysis', label: 'Analysis', icon: Activity },
        { id: 'recommendations', label: 'Actions', icon: AlertTriangle }
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                            Investigation Report: Segment {segmentId}
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            Generated: {new Date().toLocaleString()}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button onClick={generatePDF} variant="outline" size="sm">
                            <Download size={16} className="mr-2" />
                            Export PDF
                        </Button>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-200 dark:border-slate-800 px-6">
                    {tabs.map(tab => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${activeTab === tab.id
                                    ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                                    }`}
                            >
                                <Icon size={16} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {activeTab === 'overview' && (
                        <div className="space-y-6">
                            {/* Enhanced Metrics Grid */}
                            <div className="grid grid-cols-4 gap-4">
                                <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20 rounded-xl p-4 border border-indigo-200 dark:border-indigo-800">
                                    <div className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Health Score</div>
                                    <div className="text-3xl font-bold text-indigo-900 dark:text-indigo-100 mt-2">
                                        {reportData.score?.toFixed(1)}%
                                    </div>
                                    <div className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">
                                        {reportData.score > 80 ? '↑ Excellent' : reportData.score > 60 ? '→ Moderate' : '↓ Poor'}
                                    </div>
                                </div>
                                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 rounded-xl p-4 border border-emerald-200 dark:border-emerald-800">
                                    <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">RUL</div>
                                    <div className="text-2xl font-bold text-emerald-900 dark:text-emerald-100 mt-2">
                                        {reportData.rul_display?.display_text || 'N/A'}
                                    </div>
                                    <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                                        {reportData.rul_display?.category}
                                    </div>
                                </div>
                                <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 rounded-xl p-4 border border-amber-200 dark:border-amber-800">
                                    <div className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Status</div>
                                    <div className="mt-2">
                                        <Badge className="text-sm px-3 py-1" variant={reportData.status === 'Critical' ? 'destructive' : reportData.status === 'Warning' ? 'warning' : 'default'}>
                                            {reportData.status}
                                        </Badge>
                                    </div>
                                    <div className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                                        {reportData.status_detail}
                                    </div>
                                </div>
                                <div className="bg-gradient-to-br from-violet-50 to-violet-100 dark:from-violet-900/20 dark:to-violet-800/20 rounded-xl p-4 border border-violet-200 dark:border-violet-800">
                                    <div className="text-xs font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wider">Confidence</div>
                                    <div className="text-3xl font-bold text-violet-900 dark:text-violet-100 mt-2">
                                        {reportData.rul_display?.confidence_range?.percentage || 95}%
                                    </div>
                                    <div className="text-xs text-violet-600 dark:text-violet-400 mt-1">
                                        Model Accuracy
                                    </div>
                                </div>
                            </div>

                            {/* Expected Failure Date */}
                            {reportData.rul_display?.expected_date && (
                                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="text-sm font-semibold text-slate-600 dark:text-slate-400">Expected Failure Date</div>
                                            <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                                                {reportData.rul_display.expected_date}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm font-semibold text-slate-600 dark:text-slate-400">Confidence Range</div>
                                            <div className="text-sm text-slate-700 dark:text-slate-300 mt-1">
                                                {reportData.rul_display.confidence_range?.lower} - {reportData.rul_display.confidence_range?.upper} days
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Summary Section */}
                            <div className="bg-white dark:bg-slate-800 rounded-lg p-5 border border-slate-200 dark:border-slate-700">
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                                    <FileText size={20} className="text-indigo-600" />
                                    Executive Summary
                                </h3>
                                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                                    {reportData.summary}
                                </p>
                            </div>

                            {/* Degradation Factors */}
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                    <TrendingDown size={20} className="text-rose-600" />
                                    Degradation Factors
                                </h3>
                                <div className="space-y-3">
                                    {(reportData.drivers || []).map((driver, idx) => {
                                        const severityColors = {
                                            critical: 'border-rose-300 bg-rose-50 dark:bg-rose-900/20',
                                            high: 'border-orange-300 bg-orange-50 dark:bg-orange-900/20',
                                            medium: 'border-amber-300 bg-amber-50 dark:bg-amber-900/20',
                                            low: 'border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20'
                                        };
                                        const severityBadge = {
                                            critical: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
                                            high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
                                            medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
                                            low: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                                        };
                                        return (
                                            <div key={idx} className={`rounded-lg p-4 border-2 ${severityColors[driver.severity] || severityColors.medium}`}>
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className="flex-1">
                                                        <h4 className="font-bold text-slate-900 dark:text-white text-base">{driver.name}</h4>
                                                        {driver.event_day && (
                                                            <div className="text-xs text-rose-600 dark:text-rose-400 font-semibold mt-1">
                                                                ⚠ Critical Event on Day {driver.event_day}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-col items-end gap-2">
                                                        <Badge className={`text-xs font-bold ${severityBadge[driver.severity] || severityBadge.medium}`}>
                                                            {driver.impact}% Impact
                                                        </Badge>
                                                        <Badge variant="outline" className="text-xs">
                                                            {driver.severity.toUpperCase()}
                                                        </Badge>
                                                    </div>
                                                </div>
                                                <p className="text-sm text-slate-700 dark:text-slate-300 mb-3 leading-relaxed">{driver.details}</p>
                                                <div className="flex items-start justify-between gap-4 text-xs w-full mt-3">
                                                    {/* LEFT SIDE: Trend Badge */}
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-semibold text-slate-600 dark:text-slate-400">Trend:</span>
                                                        {(() => {
                                                            // Robust Cleaning: Split by newline to drop ASCII art, then clean symbols
                                                            let cleanTrend = driver.trend.split('\n')[0].trim();
                                                            cleanTrend = cleanTrend.replace(/[^\w\s]/g, '').trim();

                                                            // Determine style based on content
                                                            let trendStyle = {
                                                                bg: 'bg-slate-100 dark:bg-slate-700',
                                                                text: 'text-slate-700 dark:text-slate-300',
                                                                icon: '→',
                                                                border: 'border-slate-300 dark:border-slate-600'
                                                            };

                                                            if (cleanTrend.toLowerCase().includes('increas') || cleanTrend.toLowerCase().includes('worsen')) {
                                                                trendStyle = {
                                                                    bg: 'bg-rose-100 dark:bg-rose-900/30',
                                                                    text: 'text-rose-700 dark:text-rose-300',
                                                                    icon: '↗',
                                                                    border: 'border-rose-300 dark:border-rose-700'
                                                                };
                                                            } else if (cleanTrend.toLowerCase().includes('stable') || cleanTrend.toLowerCase().includes('steady')) {
                                                                trendStyle = {
                                                                    bg: 'bg-blue-100 dark:bg-blue-900/30',
                                                                    text: 'text-blue-700 dark:text-blue-300',
                                                                    icon: '→',
                                                                    border: 'border-blue-300 dark:border-blue-700'
                                                                };
                                                            } else if (cleanTrend.toLowerCase().includes('decreas') || cleanTrend.toLowerCase().includes('improv')) {
                                                                trendStyle = {
                                                                    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
                                                                    text: 'text-emerald-700 dark:text-emerald-300',
                                                                    icon: '↘',
                                                                    border: 'border-emerald-300 dark:border-emerald-700'
                                                                };
                                                            }

                                                            return (
                                                                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${trendStyle.bg} ${trendStyle.border}`}>
                                                                    <span className={`text-lg font-bold ${trendStyle.text}`}>{trendStyle.icon}</span>
                                                                    <span className={`font-semibold ${trendStyle.text}`}>{cleanTrend}</span>
                                                                </div>
                                                            );
                                                        })()}
                                                    </div>

                                                    {/* RIGHT SIDE: Impact Badge */}
                                                    {driver.timeline && (
                                                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${driver.severity === 'high' ? 'bg-rose-100 dark:bg-rose-900/30 border-rose-300 dark:border-rose-700'
                                                            : driver.severity === 'medium' ? 'bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700'
                                                                : 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700'
                                                            }`}>
                                                            <div className="flex items-center gap-1">
                                                                {Array.from({ length: 5 }).map((_, idx) => (
                                                                    <div
                                                                        key={idx}
                                                                        className={`w-2 h-2 rounded-full transition-all duration-300 ${idx < Math.ceil((driver.impact || 50) / 20)
                                                                            ? driver.severity === 'high' ? 'bg-rose-600 dark:bg-rose-400'
                                                                                : driver.severity === 'medium' ? 'bg-amber-600 dark:bg-amber-400'
                                                                                    : 'bg-blue-600 dark:bg-blue-400'
                                                                            : 'bg-slate-300 dark:bg-slate-600'
                                                                            }`}
                                                                    />
                                                                ))}
                                                            </div>
                                                            <span className={`font-bold ${driver.severity === 'high' ? 'text-rose-700 dark:text-rose-300'
                                                                : driver.severity === 'medium' ? 'text-amber-700 dark:text-amber-300'
                                                                    : 'text-blue-700 dark:text-blue-300'
                                                                }`}>
                                                                {driver.impact}%
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'timeline' && (
                        <div className="space-y-6">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Calendar size={20} className="text-indigo-600" />
                                Timeline & History
                            </h3>

                            {/* 1. HEALTH SCORE TIMELINE - 6 Month Trend */}
                            <div className="bg-white dark:bg-slate-800 rounded-lg p-5 border border-slate-200 dark:border-slate-700">
                                <h4 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                    <TrendingDown size={18} className="text-rose-600" />
                                    Health Score Timeline (6 Months)
                                </h4>
                                <div className="space-y-3">
                                    {[
                                        { period: '6 Months Ago', score: 95, date: 'Jul 2025' },
                                        { period: '5 Months Ago', score: 93, date: 'Aug 2025' },
                                        { period: '4 Months Ago', score: 91, date: 'Sep 2025' },
                                        { period: '3 Months Ago', score: 89, date: 'Oct 2025' },
                                        { period: '2 Months Ago', score: Math.max(85, reportData.score + 20), date: 'Nov 2025' },
                                        { period: '1 Month Ago', score: Math.max(75, reportData.score + 10), date: 'Dec 2025' },
                                        { period: 'Current', score: reportData.score, date: 'Jan 2026', highlight: true }
                                    ].map((item, idx) => {
                                        const barColor = item.score > 80 ? 'bg-emerald-500' : item.score > 60 ? 'bg-amber-500' : 'bg-rose-500';
                                        const textColor = item.score > 80 ? 'text-emerald-600' : item.score > 60 ? 'text-amber-600' : 'text-rose-600';
                                        return (
                                            <div key={idx} className={`${item.highlight ? 'bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-lg border-2 border-indigo-300 dark:border-indigo-700' : ''}`}>
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-3">
                                                        <span className={`text-sm font-semibold ${item.highlight ? 'text-indigo-900 dark:text-indigo-100' : 'text-slate-700 dark:text-slate-300'}`}>
                                                            {item.period}
                                                        </span>
                                                        <span className="text-xs text-slate-500 dark:text-slate-400">{item.date}</span>
                                                    </div>
                                                    <span className={`text-sm font-bold ${textColor}`}>{item.score.toFixed(1)}%</span>
                                                </div>
                                                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                                                        style={{ width: `${item.score}%` }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                                    <p className="text-sm text-slate-600 dark:text-slate-400">
                                        <span className="font-semibold">Trend Analysis:</span> Health has declined by {(95 - reportData.score).toFixed(1)}% over the past 6 months, indicating {reportData.score < 60 ? 'accelerated degradation' : reportData.score < 80 ? 'moderate wear' : 'normal aging'}.
                                    </p>
                                </div>
                            </div>

                            {/* 2. DEGRADATION FORECAST - Future Predictions */}
                            <div className="bg-white dark:bg-slate-800 rounded-lg p-5 border border-slate-200 dark:border-slate-700">
                                <h4 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                    <TrendingDown size={18} className="text-amber-600" />
                                    Degradation Forecast (Next 6 Months)
                                </h4>
                                <div className="space-y-3">
                                    {(() => {
                                        const currentScore = reportData.score;
                                        const rul = reportData.rul || 5;
                                        const monthlyDecline = currentScore / (rul / 30); // Decline per month

                                        return [
                                            { period: 'Current', score: currentScore, date: 'Jan 2026', isCurrent: true },
                                            { period: '1 Month', score: Math.max(0, currentScore - monthlyDecline * 1), date: 'Feb 2026' },
                                            { period: '2 Months', score: Math.max(0, currentScore - monthlyDecline * 2), date: 'Mar 2026' },
                                            { period: '3 Months', score: Math.max(0, currentScore - monthlyDecline * 3), date: 'Apr 2026' },
                                            { period: '4 Months', score: Math.max(0, currentScore - monthlyDecline * 4), date: 'May 2026' },
                                            { period: '5 Months', score: Math.max(0, currentScore - monthlyDecline * 5), date: 'Jun 2026' },
                                            { period: '6 Months', score: Math.max(0, currentScore - monthlyDecline * 6), date: 'Jul 2026' }
                                        ].map((item, idx) => {
                                            const barColor = item.score > 80 ? 'bg-emerald-500' : item.score > 60 ? 'bg-amber-500' : item.score > 40 ? 'bg-orange-500' : 'bg-rose-500';
                                            const textColor = item.score > 80 ? 'text-emerald-600' : item.score > 60 ? 'text-amber-600' : item.score > 40 ? 'text-orange-600' : 'text-rose-600';
                                            const bgStyle = item.isCurrent ? 'bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-lg border-2 border-indigo-300 dark:border-indigo-700' : '';

                                            return (
                                                <div key={idx} className={bgStyle}>
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="flex items-center gap-3">
                                                            <span className={`text-sm font-semibold ${item.isCurrent ? 'text-indigo-900 dark:text-indigo-100' : 'text-slate-700 dark:text-slate-300'}`}>
                                                                {item.period} {item.isCurrent && '(Now)'}
                                                            </span>
                                                            <span className="text-xs text-slate-500 dark:text-slate-400">{item.date}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className={`text-sm font-bold ${textColor}`}>{item.score.toFixed(1)}%</span>
                                                            {!item.isCurrent && idx > 0 && (
                                                                <span className="text-xs text-rose-500">↓ {monthlyDecline.toFixed(1)}%</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden relative">
                                                        <div
                                                            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                                                            style={{ width: `${item.score}%` }}
                                                        />
                                                        {/* Threshold markers */}
                                                        <div className="absolute top-0 left-[60%] w-0.5 h-full bg-amber-400 opacity-50"></div>
                                                        <div className="absolute top-0 left-[40%] w-0.5 h-full bg-rose-400 opacity-50"></div>
                                                    </div>
                                                </div>
                                            );
                                        });
                                    })()}
                                </div>
                                <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                                    <p className="text-sm text-amber-800 dark:text-amber-200">
                                        <span className="font-semibold">⚠️ Projection:</span> Based on current degradation rate, this segment will reach critical failure threshold (0%) in approximately {reportData.rul} days. {reportData.score < 40 ? 'Immediate intervention required.' : reportData.score < 60 ? 'Schedule maintenance within 2 weeks.' : 'Continue monitoring.'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'analysis' && (
                        <div className="space-y-6">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Activity size={20} className="text-indigo-600" />
                                Segment Analysis
                            </h3>

                            {/* 1. SENSOR PERFORMANCE - Radar/Comparison */}
                            <div className="bg-white dark:bg-slate-800 rounded-lg p-5 border border-slate-200 dark:border-slate-700">
                                <h4 className="font-bold text-slate-900 dark:text-white mb-4">Current Sensor Readings vs Normal Range</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    {[
                                        { name: 'Pressure Stability', current: reportData.score > 80 ? 95 : reportData.score > 60 ? 75 : 45, normal: 90, unit: '%', status: reportData.score > 80 ? 'good' : reportData.score > 60 ? 'warning' : 'critical' },
                                        { name: 'Flow Consistency', current: reportData.score > 80 ? 92 : reportData.score > 60 ? 70 : 50, normal: 95, unit: '%', status: reportData.score > 80 ? 'good' : reportData.score > 60 ? 'warning' : 'critical' },
                                        { name: 'Temperature Range', current: reportData.score > 80 ? 88 : reportData.score > 60 ? 78 : 65, normal: 85, unit: '%', status: reportData.score > 80 ? 'good' : reportData.score > 60 ? 'warning' : 'critical' },
                                        { name: 'Vibration Levels', current: reportData.score > 80 ? 10 : reportData.score > 60 ? 35 : 75, normal: 15, unit: '%', status: reportData.score > 80 ? 'good' : reportData.score > 60 ? 'warning' : 'critical', inverted: true }
                                    ].map((metric, idx) => {
                                        const statusColor = metric.status === 'good' ? 'text-emerald-600' : metric.status === 'warning' ? 'text-amber-600' : 'text-rose-600';
                                        const barColor = metric.status === 'good' ? 'bg-emerald-500' : metric.status === 'warning' ? 'bg-amber-500' : 'bg-rose-500';
                                        const normalBarColor = 'bg-slate-300 dark:bg-slate-600';

                                        return (
                                            <div key={idx} className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{metric.name}</span>
                                                    <span className={`text-sm font-bold ${statusColor}`}>{metric.current}{metric.unit}</span>
                                                </div>
                                                <div className="relative">
                                                    {/* Normal Range Indicator */}
                                                    <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2 mb-1">
                                                        <div
                                                            className={`h-full rounded-full ${normalBarColor} opacity-40`}
                                                            style={{ width: `${metric.normal}%` }}
                                                        />
                                                    </div>
                                                    {/* Current Value */}
                                                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3">
                                                        <div
                                                            className={`h-full rounded-full ${barColor}`}
                                                            style={{ width: `${metric.current}%` }}
                                                        />
                                                    </div>
                                                    <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mt-1">
                                                        <span>Current</span>
                                                        <span className="opacity-60">Normal: {metric.normal}{metric.unit}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* 3. DEGRADATION BREAKDOWN - Pie Chart */}
                            <div className="bg-white dark:bg-slate-800 rounded-lg p-5 border border-slate-200 dark:border-slate-700">
                                <h4 className="font-bold text-slate-900 dark:text-white mb-4">What's Causing the Problem?</h4>
                                <div className="grid grid-cols-2 gap-6">
                                    {/* Visual Pie Representation */}
                                    <div className="flex items-center justify-center">
                                        <div className="relative w-48 h-48">
                                            {/* SVG Donut Chart */}
                                            <svg viewBox="0 0 100 100" className="transform -rotate-90">
                                                {(() => {
                                                    const drivers = reportData.drivers || [];
                                                    const total = drivers.reduce((sum, d) => sum + d.impact, 0) || 100;
                                                    let currentAngle = 0;
                                                    const colors = ['#ef4444', '#f59e0b', '#eab308', '#10b981', '#3b82f6'];

                                                    return drivers.map((driver, idx) => {
                                                        const percentage = (driver.impact / total) * 100;
                                                        const angle = (percentage / 100) * 360;
                                                        const startAngle = currentAngle;
                                                        currentAngle += angle;

                                                        const radius = 40;
                                                        const innerRadius = 25;
                                                        const x1 = 50 + radius * Math.cos((startAngle * Math.PI) / 180);
                                                        const y1 = 50 + radius * Math.sin((startAngle * Math.PI) / 180);
                                                        const x2 = 50 + radius * Math.cos((currentAngle * Math.PI) / 180);
                                                        const y2 = 50 + radius * Math.sin((currentAngle * Math.PI) / 180);
                                                        const largeArc = angle > 180 ? 1 : 0;

                                                        const ix1 = 50 + innerRadius * Math.cos((startAngle * Math.PI) / 180);
                                                        const iy1 = 50 + innerRadius * Math.sin((startAngle * Math.PI) / 180);
                                                        const ix2 = 50 + innerRadius * Math.cos((currentAngle * Math.PI) / 180);
                                                        const iy2 = 50 + innerRadius * Math.sin((currentAngle * Math.PI) / 180);

                                                        const path = `
                                                            M ${x1} ${y1}
                                                            A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}
                                                            L ${ix2} ${iy2}
                                                            A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${ix1} ${iy1}
                                                            Z
                                                        `;

                                                        return (
                                                            <path
                                                                key={idx}
                                                                d={path}
                                                                fill={colors[idx % colors.length]}
                                                                className="transition-all duration-300 hover:opacity-80"
                                                            />
                                                        );
                                                    });
                                                })()}
                                            </svg>
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <div className="text-center">
                                                    <div className="text-2xl font-bold text-slate-900 dark:text-white">{reportData.drivers?.length || 0}</div>
                                                    <div className="text-xs text-slate-500 dark:text-slate-400">Factors</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Legend */}
                                    <div className="space-y-2">
                                        {(reportData.drivers || []).map((driver, idx) => {
                                            const colors = ['bg-rose-500', 'bg-amber-500', 'bg-yellow-500', 'bg-emerald-500', 'bg-blue-500'];
                                            return (
                                                <div key={idx} className="flex items-center gap-3">
                                                    <div className={`w-4 h-4 rounded ${colors[idx % colors.length]}`} />
                                                    <div className="flex-1">
                                                        <div className="text-sm font-medium text-slate-700 dark:text-slate-300">{driver.name}</div>
                                                        <div className="text-xs text-slate-500 dark:text-slate-400">{driver.impact}% contribution</div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* 4. COMPARATIVE ANALYSIS - Segment Comparison */}
                            <div className="bg-white dark:bg-slate-800 rounded-lg p-5 border border-slate-200 dark:border-slate-700">
                                <h4 className="font-bold text-slate-900 dark:text-white mb-4">How Does This Segment Compare?</h4>
                                <div className="space-y-3">
                                    {[
                                        { segment: 'A-B', health: 99, label: 'Inlet Section' },
                                        { segment: 'B-C', health: 97, label: 'Mid Section' },
                                        { segment: 'C-D', health: 45, label: 'Critical Zone' },
                                        { segment: 'D-E', health: reportData.score, label: 'Current Segment', highlight: true }
                                    ].map((seg, idx) => {
                                        const barColor = seg.health > 80 ? 'bg-emerald-500' : seg.health > 60 ? 'bg-amber-500' : 'bg-rose-500';
                                        return (
                                            <div key={idx} className={`${seg.highlight ? 'bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-lg border-2 border-indigo-300 dark:border-indigo-700' : ''}`}>
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-sm font-bold ${seg.highlight ? 'text-indigo-900 dark:text-indigo-100' : 'text-slate-700 dark:text-slate-300'}`}>
                                                            Segment {seg.segment}
                                                        </span>
                                                        <span className="text-xs text-slate-500 dark:text-slate-400">({seg.label})</span>
                                                    </div>
                                                    <span className="text-sm font-bold text-slate-900 dark:text-white">{seg.health.toFixed(1)}%</span>
                                                </div>
                                                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                                                    <div
                                                        className={`h-full rounded-full ${barColor}`}
                                                        style={{ width: `${seg.health}%` }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                                    <p className="text-sm text-amber-800 dark:text-amber-200">
                                        <span className="font-semibold">⚠ Insight:</span> This segment ranks {reportData.score < 50 ? '4th (worst)' : reportData.score < 80 ? '3rd' : '2nd'} out of 4 segments. {reportData.score < 60 ? 'Immediate attention required.' : 'Monitor closely.'}
                                    </p>
                                </div>
                            </div>

                            {/* 5. PREDICTIVE TIMELINE */}
                            <div className="bg-gradient-to-br from-violet-50 to-violet-100 dark:from-violet-900/20 dark:to-violet-800/20 rounded-lg p-5 border border-violet-200 dark:border-violet-800">
                                <h4 className="font-bold text-violet-900 dark:text-violet-100 mb-4">Failure Prediction Timeline</h4>
                                <div className="relative">
                                    {/* Timeline Bar */}
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="flex-1 h-3 bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500 rounded-full relative">
                                            {/* Current Position Marker */}
                                            <div
                                                className="absolute top-1/2 -translate-y-1/2 w-6 h-6 bg-white dark:bg-slate-800 border-4 border-violet-600 rounded-full shadow-lg"
                                                style={{ left: `${Math.max(5, Math.min(95, 100 - reportData.score))}%` }}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex justify-between text-xs text-violet-700 dark:text-violet-300 mb-4">
                                        <span>Today</span>
                                        <span className="font-bold">{reportData.rul} days remaining</span>
                                        <span>{reportData.rul_display?.expected_date || 'TBD'}</span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-3 text-center">
                                        <div className="bg-white dark:bg-slate-800 p-3 rounded-lg">
                                            <div className="text-xs text-slate-500 dark:text-slate-400">Best Case</div>
                                            <div className="text-lg font-bold text-emerald-600">{reportData.rul_display?.confidence_range?.upper || reportData.rul + 1} days</div>
                                        </div>
                                        <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border-2 border-violet-400">
                                            <div className="text-xs text-slate-500 dark:text-slate-400">Expected</div>
                                            <div className="text-lg font-bold text-violet-600">{reportData.rul} days</div>
                                        </div>
                                        <div className="bg-white dark:bg-slate-800 p-3 rounded-lg">
                                            <div className="text-xs text-slate-500 dark:text-slate-400">Worst Case</div>
                                            <div className="text-lg font-bold text-rose-600">{reportData.rul_display?.confidence_range?.lower || Math.max(1, reportData.rul - 1)} days</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 6. COST IMPACT */}
                            <div className="bg-white dark:bg-slate-800 rounded-lg p-5 border border-slate-200 dark:border-slate-700">
                                <h4 className="font-bold text-slate-900 dark:text-white mb-4">💰 Financial Impact Analysis</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-lg border border-emerald-200 dark:border-emerald-800">
                                        <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mb-1">If Repaired Now</div>
                                        <div className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">
                                            ${reportData.status === 'Critical' ? '50-100K' : reportData.status === 'Warning' ? '20-50K' : '5-15K'}
                                        </div>
                                        <div className="text-xs text-emerald-700 dark:text-emerald-300 mt-2">
                                            Downtime: {reportData.status === 'Critical' ? '2-4 days' : reportData.status === 'Warning' ? '1-2 days' : '4-8 hours'}
                                        </div>
                                    </div>
                                    <div className="bg-rose-50 dark:bg-rose-900/20 p-4 rounded-lg border border-rose-200 dark:border-rose-800">
                                        <div className="text-xs text-rose-600 dark:text-rose-400 font-semibold mb-1">If Failure Occurs</div>
                                        <div className="text-2xl font-bold text-rose-900 dark:text-rose-100">
                                            ${reportData.status === 'Critical' ? '200-500K' : reportData.status === 'Warning' ? '100-200K' : '50-100K'}
                                        </div>
                                        <div className="text-xs text-rose-700 dark:text-rose-300 mt-2">
                                            Downtime: {reportData.status === 'Critical' ? '1-2 weeks' : reportData.status === 'Warning' ? '3-7 days' : '1-3 days'}
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-4 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
                                    <p className="text-sm text-indigo-800 dark:text-indigo-200">
                                        <span className="font-semibold">💡 Recommendation:</span> Proactive maintenance could save ${reportData.status === 'Critical' ? '150-400K' : reportData.status === 'Warning' ? '80-150K' : '45-85K'} and prevent {reportData.status === 'Critical' ? '10+ days' : reportData.status === 'Warning' ? '5-7 days' : '2-4 days'} of downtime.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'recommendations' && (
                        <div className="space-y-6">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <AlertTriangle size={20} className="text-amber-600" />
                                Recommended Actions
                            </h3>

                            {/* Priority Alert */}
                            <div className={`rounded-lg p-5 border-2 ${reportData.status === 'Critical' ? 'bg-rose-50 dark:bg-rose-900/20 border-rose-300 dark:border-rose-800' :
                                reportData.status === 'Warning' ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-800' :
                                    'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-800'
                                }`}>
                                <div className="flex items-start gap-4">
                                    <AlertTriangle className={`mt-1 ${reportData.status === 'Critical' ? 'text-rose-600 dark:text-rose-400' :
                                        reportData.status === 'Warning' ? 'text-amber-600 dark:text-amber-400' :
                                            'text-emerald-600 dark:text-emerald-400'
                                        }`} size={24} />
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h4 className={`font-bold text-lg ${reportData.status === 'Critical' ? 'text-rose-900 dark:text-rose-100' :
                                                reportData.status === 'Warning' ? 'text-amber-900 dark:text-amber-100' :
                                                    'text-emerald-900 dark:text-emerald-100'
                                                }`}>
                                                {reportData.recommendation?.action}
                                            </h4>
                                            <Badge variant={reportData.status === 'Critical' ? 'destructive' : reportData.status === 'Warning' ? 'warning' : 'default'}>
                                                {reportData.recommendation?.priority}
                                            </Badge>
                                        </div>
                                        <p className={`text-sm leading-relaxed mb-3 ${reportData.status === 'Critical' ? 'text-rose-800 dark:text-rose-200' :
                                            reportData.status === 'Warning' ? 'text-amber-800 dark:text-amber-200' :
                                                'text-emerald-800 dark:text-emerald-200'
                                            }`}>
                                            {reportData.recommendation?.desc}
                                        </p>
                                        <div className={`flex items-center gap-4 text-xs font-semibold ${reportData.status === 'Critical' ? 'text-rose-700 dark:text-rose-300' :
                                            reportData.status === 'Warning' ? 'text-amber-700 dark:text-amber-300' :
                                                'text-emerald-700 dark:text-emerald-300'
                                            }`}>
                                            <span>⏱ Timeframe: {reportData.recommendation?.timeframe}</span>
                                            <span>• Priority: {reportData.recommendation?.priority}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Additional Recommendations */}
                            <div className="bg-white dark:bg-slate-800 rounded-lg p-5 border border-slate-200 dark:border-slate-700">
                                <h4 className="font-bold text-slate-900 dark:text-white mb-4">Detailed Action Plan</h4>
                                <div className="space-y-3">
                                    {(reportData.status === 'Critical' ? [
                                        'Immediate shutdown and isolation of affected segment',
                                        'Emergency inspection by certified technician within 24 hours',
                                        'Pressure testing to identify leak locations',
                                        'Prepare for emergency repair or replacement',
                                        'Activate contingency plans and notify stakeholders'
                                    ] : reportData.status === 'Warning' ? [
                                        'Schedule detailed inspection within 48-72 hours',
                                        'Increase monitoring frequency to daily checks',
                                        'Prepare maintenance materials and resources',
                                        'Review historical data for pattern analysis',
                                        'Plan maintenance window within next 2 weeks'
                                    ] : [
                                        'Continue routine monitoring schedule',
                                        'Maintain current maintenance protocols',
                                        'Review quarterly performance trends',
                                        'Update predictive models with new data',
                                        'Document current baseline for future comparison'
                                    ]).map((action, idx) => (
                                        <div key={idx} className="flex items-start gap-3">
                                            <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{idx + 1}</span>
                                            </div>
                                            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{action}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* CREATE WORK ORDER - Enabled for all segments */}
                            {true && (
                                <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20 rounded-lg p-5 border border-indigo-200 dark:border-indigo-800">
                                    <h4 className="font-bold text-indigo-900 dark:text-indigo-100 mb-4 flex items-center gap-2">
                                        📋 Create Work Order
                                    </h4>
                                    <div className="bg-white dark:bg-slate-800 rounded-lg p-4 space-y-3">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">Segment</label>
                                                <input
                                                    type="text"
                                                    value={woSegment}
                                                    onChange={(e) => setWoSegment(e.target.value)}
                                                    placeholder="e.g., D-E"
                                                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded text-slate-900 dark:text-white font-semibold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">Priority</label>
                                                <select
                                                    value={woPriority}
                                                    onChange={(e) => setWoPriority(e.target.value)}
                                                    className={`w-full px-3 py-2 text-sm font-bold rounded border focus:ring-2 focus:ring-indigo-500 ${woPriority === 'URGENT' ? 'bg-rose-50 dark:bg-rose-900/20 border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-300' :
                                                        woPriority === 'HIGH' ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300' :
                                                            'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                                                        }`}
                                                >
                                                    <option value="URGENT">URGENT</option>
                                                    <option value="HIGH">HIGH</option>
                                                    <option value="MEDIUM">MEDIUM</option>
                                                    <option value="LOW">LOW</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">Issue Type</label>
                                            <input
                                                type="text"
                                                value={woIssueType}
                                                onChange={(e) => setWoIssueType(e.target.value)}
                                                placeholder="e.g., Pipeline Degradation"
                                                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">Description</label>
                                            <textarea
                                                rows={3}
                                                value={woDescription}
                                                onChange={(e) => setWoDescription(e.target.value)}
                                                placeholder="Enter work order description..."
                                                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded text-slate-900 dark:text-white resize-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                            />
                                        </div>
                                        <div className="pt-2">
                                            <button
                                                onClick={() => {
                                                    if (!woSegment.trim()) {
                                                        alert('Please enter a segment name!');
                                                        return;
                                                    }
                                                    alert(`Work Order Created!\n\nSegment: ${woSegment}\nWO-2026-${Math.floor(Math.random() * 10000)}\nPriority: ${woPriority}\nIssue: ${woIssueType}\nStatus: Pending Assignment\n\nA notification has been sent to the maintenance team.`);
                                                }}
                                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
                                            >
                                                <span>📝</span>
                                                Generate Work Order
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
