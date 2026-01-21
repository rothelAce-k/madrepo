import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    HelpCircle, BookOpen, Search, ChevronDown, ChevronRight,
    Zap, Activity, LayoutDashboard, FileText, MessageSquare,
    Shield, Phone, Mail, Globe, PlayCircle, Info
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from '../components/ui/Button';

// FAQ Content
const FAQS = [
    {
        question: "How is the Health Score calculated?",
        answer: "The Health Score is an AI-driven metric derived from real-time sensor data (Pressure, Flow, Vibration, Acoustic) and historical degradation patterns. It uses a predictive model to estimate the condition of the pipeline segment from 0-100%."
    },
    {
        question: "What does 'RUL' mean?",
        answer: "RUL stands for 'Remaining Useful Life'. It is a prediction of how many days a pipeline segment can operate safely before requiring maintenance, based on current stress factors and degradation rates."
    },
    {
        question: "How do I interpret the 'Sensor Monitor' map?",
        answer: "The interactive map visualizes the geographical layout of the pipeline. Markers indicate sensor locations. Clicking a marker reveals real-time telemetry. Red markers indicate critical alerts, while Green indicates normal operation."
    },
    {
        question: "Can I export the investigation reports?",
        answer: "Yes. In the Health Monitor dashboard, clicking 'View Full Report' on any segment with a warning or critical status will generate a detailed PDF report containing technical analysis, charts, and recommendations."
    },
];

// Quick Start Guide
const GUIDES = [
    {
        title: "Monitoring System Health",
        desc: "Track overall system performance and identify critical segments.",
        icon: Activity,
        color: "indigo"
    },
    {
        title: "Analyzing Sensor Data",
        desc: "Deep dive into real-time telemetry for pressure and flow anomalies.",
        icon: Zap,
        color: "amber"
    },
    {
        title: "Generating Reports",
        desc: "Create comprehensive PDF reports for maintenance teams.",
        icon: FileText,
        color: "emerald"
    }
];

// Reusable FAQ Item Component
const FAQItem = ({ question, answer, isOpen, onClick }) => (
    <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-white dark:bg-slate-900 transition-all duration-200">
        <button
            onClick={onClick}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
        >
            <span className="font-semibold text-slate-700 dark:text-slate-200">{question}</span>
            <ChevronDown
                className={cn(
                    "w-5 h-5 text-slate-400 transition-transform duration-300",
                    isOpen && "transform rotate-180 text-indigo-500"
                )}
            />
        </button>
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                >
                    <div className="p-4 pt-0 text-slate-600 dark:text-slate-400 text-sm leading-relaxed border-t border-slate-100 dark:border-slate-800/50">
                        {answer}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    </div>
);

export default function HelpSupport() {
    const [searchTerm, setSearchTerm] = useState('');
    const [openFaqIndex, setOpenFaqIndex] = useState(0);

    const filteredFaqs = FAQS.filter(faq =>
        faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
        faq.answer.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-10">
            {/* HERO SECTION */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-800 p-8 md:p-12 text-white shadow-xl">
                <div className="relative z-10 max-w-3xl">
                    <h1 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight">
                        How can we help you?
                    </h1>
                    <p className="text-indigo-100 text-lg mb-8 max-w-xl">
                        Explore our guides, FAQs, and documentation to get the most out of the Pipeline Integrity System.
                    </p>

                    {/* Search Bar */}
                    <div className="relative max-w-lg group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-indigo-300 group-focus-within:text-indigo-500 transition-colors" />
                        </div>
                        <input
                            type="text"
                            placeholder="Data, Monitoring, Reports..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="block w-full pl-11 pr-4 py-4 rounded-xl text-slate-900 placeholder-slate-400 bg-white/95 focus:bg-white border-none ring-4 ring-white/10 focus:ring-white/30 shadow-lg transition-all"
                        />
                    </div>
                </div>

                {/* Decorative Background Elements */}
                <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-72 h-72 bg-indigo-500/30 rounded-full blur-3xl pointer-events-none" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* LEFT COLUMN: GUIDES & FEATURES */}
                <div className="lg:col-span-2 space-y-8">

                    {/* QUICK START CARDS */}
                    <section>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                            <BookOpen className="w-5 h-5 text-indigo-500" />
                            Getting Started
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {GUIDES.map((guide, idx) => (
                                <div key={idx} className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 hover:shadow-md transition-all group cursor-pointer">
                                    <div className={`w-10 h-10 rounded-lg bg-${guide.color}-100 dark:bg-${guide.color}-900/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                                        <guide.icon className={`w-5 h-5 text-${guide.color}-600 dark:text-${guide.color}-400`} />
                                    </div>
                                    <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-1">{guide.title}</h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                        {guide.desc}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* FAQ SECTION */}
                    <section>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                            <HelpCircle className="w-5 h-5 text-indigo-500" />
                            Frequently Asked Questions
                        </h2>
                        <div className="space-y-3">
                            {filteredFaqs.length > 0 ? (
                                filteredFaqs.map((faq, idx) => (
                                    <FAQItem
                                        key={idx}
                                        question={faq.question}
                                        answer={faq.answer}
                                        isOpen={openFaqIndex === idx}
                                        onClick={() => setOpenFaqIndex(openFaqIndex === idx ? -1 : idx)} // Toggle
                                    />
                                ))
                            ) : (
                                <div className="p-8 text-center bg-slate-50 dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                                    <p className="text-slate-500">No results found for "{searchTerm}"</p>
                                </div>
                            )}
                        </div>
                    </section>
                </div>

                {/* RIGHT COLUMN: SUPPORT */}
                <div className="space-y-6">
                    {/* CONTACT CARD */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                        <div className="p-6">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Contact Support</h3>
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
                                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                                        <Phone size={16} />
                                    </div>
                                    <span className="text-sm">+1 (555) 123-4567</span>
                                </div>
                                <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
                                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                                        <Mail size={16} />
                                    </div>
                                    <span className="text-sm">support@aipis-system.com</span>
                                </div>
                                <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
                                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                                        <Globe size={16} />
                                    </div>
                                    <span className="text-sm">docs.aipis-system.com</span>
                                </div>
                            </div>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 border-t border-slate-100 dark:border-slate-800">
                            <Button className="w-full" variant="outline">
                                <MessageSquare className="w-4 h-4 mr-2" />
                                Start Live Chat
                            </Button>
                        </div>
                    </div>

                    {/* VERSION INFO */}
                    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border border-slate-700 p-6 text-center shadow-lg">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/10 mb-4 ring-4 ring-white/5">
                            <Shield className="w-6 h-6 text-emerald-400" />
                        </div>
                        <h4 className="text-white font-bold mb-1">System Status</h4>
                        <p className="text-emerald-400 text-sm font-mono mb-4">● Online & Secure</p>
                        <div className="text-xs text-slate-400 space-y-1">
                            <p>Version: v2.4.0-stable</p>
                            <p>Build: 2026.01.22</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
