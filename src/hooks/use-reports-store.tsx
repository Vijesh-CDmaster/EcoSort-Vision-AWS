"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { useScanStore } from "@/components/scan/scan-store";

export type ReportCategory = "collection" | "contamination" | "recycling" | "bins" | "performance" | "all";
export type ReportFormat = "pdf" | "csv" | "json";
export type ScheduleFrequency = "daily" | "weekly" | "monthly" | "quarterly";

export interface GeneratedReport {
  id: string;
  title: string;
  description: string;
  category: ReportCategory;
  dateRange: {
    start: Date;
    end: Date;
  };
  generatedAt: Date;
  format: ReportFormat;
  data: ReportData;
  status: "ready" | "generating" | "failed";
  fileSize: string;
}

export interface ScheduledReport {
  id: string;
  title: string;
  category: ReportCategory;
  format: ReportFormat;
  frequency: ScheduleFrequency;
  nextRunAt: Date;
  lastRunAt?: Date;
  enabled: boolean;
  emailRecipients: string[];
  createdAt: Date;
}

export interface ReportData {
  summary: {
    totalScans: number;
    recyclingRate: number;
    contaminationRate: number;
    wasteByType: Record<string, number>;
    binDistribution: Record<string, number>;
    averageConfidence: number;
  };
  trends: {
    date: string;
    scans: number;
    recyclingRate: number;
    contaminationRate: number;
  }[];
  topWasteItems: {
    item: string;
    count: number;
    percentage: number;
  }[];
  contaminationIncidents: {
    item: string;
    wrongBin: string;
    correctBin: string;
    count: number;
  }[];
}

interface ReportsContextType {
  reports: GeneratedReport[];
  scheduledReports: ScheduledReport[];
  isGenerating: boolean;
  
  // Report generation
  generateReport: (
    category: ReportCategory,
    dateRange: "week" | "month" | "quarter" | "year" | "custom",
    format: ReportFormat,
    customRange?: { start: Date; end: Date }
  ) => Promise<GeneratedReport>;
  
  // Report download
  downloadReport: (reportId: string) => void;
  deleteReport: (reportId: string) => void;
  
  // Scheduled reports
  createScheduledReport: (config: Omit<ScheduledReport, "id" | "createdAt" | "nextRunAt" | "lastRunAt">) => void;
  updateScheduledReport: (id: string, updates: Partial<ScheduledReport>) => void;
  deleteScheduledReport: (id: string) => void;
  toggleScheduledReport: (id: string) => void;
  
  // Get real-time stats
  getRealTimeStats: () => ReportData["summary"];
}

const ReportsContext = createContext<ReportsContextType | undefined>(undefined);

const REPORTS_STORAGE_KEY = "ecosort-reports";
const SCHEDULED_REPORTS_STORAGE_KEY = "ecosort-scheduled-reports";

// Helper to get date range
function getDateRange(range: "week" | "month" | "quarter" | "year" | "custom", customRange?: { start: Date; end: Date }) {
  const end = new Date();
  let start = new Date();
  
  switch (range) {
    case "week":
      start.setDate(end.getDate() - 7);
      break;
    case "month":
      start.setMonth(end.getMonth() - 1);
      break;
    case "quarter":
      start.setMonth(end.getMonth() - 3);
      break;
    case "year":
      start.setFullYear(end.getFullYear() - 1);
      break;
    case "custom":
      if (customRange) {
        return { start: customRange.start, end: customRange.end };
      }
      break;
  }
  
  return { start, end };
}

// Helper to calculate next run date
function calculateNextRun(frequency: ScheduleFrequency): Date {
  const now = new Date();
  const next = new Date();
  
  switch (frequency) {
    case "daily":
      next.setDate(now.getDate() + 1);
      next.setHours(8, 0, 0, 0);
      break;
    case "weekly":
      next.setDate(now.getDate() + (7 - now.getDay() + 1)); // Next Monday
      next.setHours(8, 0, 0, 0);
      break;
    case "monthly":
      next.setMonth(now.getMonth() + 1, 1);
      next.setHours(8, 0, 0, 0);
      break;
    case "quarterly":
      const quarterMonth = Math.floor(now.getMonth() / 3) * 3 + 3;
      next.setMonth(quarterMonth, 1);
      next.setHours(8, 0, 0, 0);
      break;
  }
  
  return next;
}

// Format file size
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export function ReportsProvider({ children }: { children: React.ReactNode }) {
  const [reports, setReports] = useState<GeneratedReport[]>([]);
  const [scheduledReports, setScheduledReports] = useState<ScheduledReport[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Scans now live in the PostgreSQL backend; the scan store holds them in state.
  const { scans } = useScanStore();
  
  // Load from localStorage on mount
  useEffect(() => {
    const storedReports = localStorage.getItem(REPORTS_STORAGE_KEY);
    const storedScheduled = localStorage.getItem(SCHEDULED_REPORTS_STORAGE_KEY);
    
    if (storedReports) {
      try {
        const parsed = JSON.parse(storedReports);
        setReports(parsed.map((r: any) => ({
          ...r,
          generatedAt: new Date(r.generatedAt),
          dateRange: {
            start: new Date(r.dateRange.start),
            end: new Date(r.dateRange.end),
          },
        })));
      } catch (e) {
        console.error("Failed to load reports", e);
      }
    }
    
    if (storedScheduled) {
      try {
        const parsed = JSON.parse(storedScheduled);
        setScheduledReports(parsed.map((s: any) => ({
          ...s,
          nextRunAt: new Date(s.nextRunAt),
          lastRunAt: s.lastRunAt ? new Date(s.lastRunAt) : undefined,
          createdAt: new Date(s.createdAt),
        })));
      } catch (e) {
        console.error("Failed to load scheduled reports", e);
      }
    }
  }, []);
  
  // Save reports to localStorage
  useEffect(() => {
    if (reports.length > 0) {
      localStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(reports));
    }
  }, [reports]);
  
  // Save scheduled reports to localStorage
  useEffect(() => {
    if (scheduledReports.length > 0) {
      localStorage.setItem(SCHEDULED_REPORTS_STORAGE_KEY, JSON.stringify(scheduledReports));
    }
  }, [scheduledReports]);
  
  // Scans are loaded from the backend by the scan store.
  const getScans = useCallback(() => scans, [scans]);
  
  // Calculate real-time stats from scans
  const getRealTimeStats = useCallback((): ReportData["summary"] => {
    const scans = getScans();
    
    if (scans.length === 0) {
      return {
        totalScans: 0,
        recyclingRate: 0,
        contaminationRate: 0,
        wasteByType: {},
        binDistribution: {},
        averageConfidence: 0,
      };
    }
    
    const wasteByType: Record<string, number> = {};
    const binDistribution: Record<string, number> = {};
    let totalConfidence = 0;
    let recyclableCount = 0;
    let contaminatedCount = 0;
    
    for (const scan of scans) {
      // Count waste types
      wasteByType[scan.wasteType] = (wasteByType[scan.wasteType] || 0) + 1;
      
      // Count bin distribution
      binDistribution[scan.binSuggestion] = (binDistribution[scan.binSuggestion] || 0) + 1;
      
      // Sum confidence
      totalConfidence += scan.binConfidence || 0;
      
      // Count recyclables (plastic, glass)
      if (scan.binSuggestion === "plastic" || scan.binSuggestion === "glass") {
        recyclableCount++;
      }
      
      // Count contaminated (low confidence scans)
      if ((scan.binConfidence || 0) < 0.7) {
        contaminatedCount++;
      }
    }
    
    return {
      totalScans: scans.length,
      recyclingRate: Math.round((recyclableCount / scans.length) * 100 * 10) / 10,
      contaminationRate: Math.round((contaminatedCount / scans.length) * 100 * 10) / 10,
      wasteByType,
      binDistribution,
      averageConfidence: Math.round((totalConfidence / scans.length) * 100 * 10) / 10,
    };
  }, [getScans]);
  
  // Generate report data from scans
  const generateReportData = useCallback((
    category: ReportCategory,
    dateRange: { start: Date; end: Date }
  ): ReportData => {
    const allScans = getScans();
    
    // Filter scans by date range
    const scans = allScans.filter((scan: any) => {
      const scanDate = new Date(scan.timestamp);
      return scanDate >= dateRange.start && scanDate <= dateRange.end;
    });
    
    // Calculate summary
    const wasteByType: Record<string, number> = {};
    const binDistribution: Record<string, number> = {};
    let totalConfidence = 0;
    let recyclableCount = 0;
    let contaminatedCount = 0;
    
    for (const scan of scans) {
      wasteByType[scan.wasteType] = (wasteByType[scan.wasteType] || 0) + 1;
      binDistribution[scan.binSuggestion] = (binDistribution[scan.binSuggestion] || 0) + 1;
      totalConfidence += scan.binConfidence || 0;
      
      if (scan.binSuggestion === "plastic" || scan.binSuggestion === "glass") {
        recyclableCount++;
      }
      
      if ((scan.binConfidence || 0) < 0.7) {
        contaminatedCount++;
      }
    }
    
    // Calculate trends (group by day)
    const trendMap = new Map<string, { scans: number; recyclable: number; contaminated: number }>();
    
    for (const scan of scans) {
      const date = new Date(scan.timestamp).toISOString().split("T")[0];
      const existing = trendMap.get(date) || { scans: 0, recyclable: 0, contaminated: 0 };
      
      existing.scans++;
      if (scan.binSuggestion === "plastic" || scan.binSuggestion === "glass") {
        existing.recyclable++;
      }
      if ((scan.binConfidence || 0) < 0.7) {
        existing.contaminated++;
      }
      
      trendMap.set(date, existing);
    }
    
    const trends = Array.from(trendMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, data]) => ({
        date,
        scans: data.scans,
        recyclingRate: data.scans > 0 ? Math.round((data.recyclable / data.scans) * 100) : 0,
        contaminationRate: data.scans > 0 ? Math.round((data.contaminated / data.scans) * 100) : 0,
      }));
    
    // Top waste items
    const topWasteItems = Object.entries(wasteByType)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([item, count]) => ({
        item,
        count,
        percentage: Math.round((count / scans.length) * 100 * 10) / 10,
      }));
    
    // Contamination incidents (scans with low confidence)
    const contaminationMap = new Map<string, { wrongBin: string; correctBin: string; count: number }>();
    
    for (const scan of scans) {
      if ((scan.binConfidence || 0) < 0.7) {
        const key = scan.wasteType;
        const existing = contaminationMap.get(key);
        
        if (existing) {
          existing.count++;
        } else {
          contaminationMap.set(key, {
            wrongBin: "unknown",
            correctBin: scan.binSuggestion,
            count: 1,
          });
        }
      }
    }
    
    const contaminationIncidents = Array.from(contaminationMap.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)
      .map(([item, data]) => ({
        item,
        ...data,
      }));
    
    return {
      summary: {
        totalScans: scans.length,
        recyclingRate: scans.length > 0 ? Math.round((recyclableCount / scans.length) * 100 * 10) / 10 : 0,
        contaminationRate: scans.length > 0 ? Math.round((contaminatedCount / scans.length) * 100 * 10) / 10 : 0,
        wasteByType,
        binDistribution,
        averageConfidence: scans.length > 0 ? Math.round((totalConfidence / scans.length) * 100 * 10) / 10 : 0,
      },
      trends,
      topWasteItems,
      contaminationIncidents,
    };
  }, [getScans]);
  
  // Generate report
  const generateReport = useCallback(async (
    category: ReportCategory,
    dateRangeType: "week" | "month" | "quarter" | "year" | "custom",
    format: ReportFormat,
    customRange?: { start: Date; end: Date }
  ): Promise<GeneratedReport> => {
    setIsGenerating(true);
    
    // Simulate async generation
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const dateRange = getDateRange(dateRangeType, customRange);
    const data = generateReportData(category, dateRange);
    
    const categoryTitles: Record<ReportCategory, string> = {
      collection: "Waste Collection Report",
      contamination: "Contamination Analysis Report",
      recycling: "Recycling Performance Report",
      bins: "Bin Monitoring Report",
      performance: "Overall Performance Report",
      all: "Comprehensive Waste Management Report",
    };
    
    const dateRangeTitles: Record<string, string> = {
      week: "Last 7 Days",
      month: "Last 30 Days",
      quarter: "Last Quarter",
      year: "Last Year",
      custom: "Custom Range",
    };
    
    const report: GeneratedReport = {
      id: crypto.randomUUID(),
      title: `${categoryTitles[category]} - ${dateRangeTitles[dateRangeType]}`,
      description: `Generated report covering ${data.summary.totalScans} scans from ${dateRange.start.toLocaleDateString()} to ${dateRange.end.toLocaleDateString()}`,
      category,
      dateRange,
      generatedAt: new Date(),
      format,
      data,
      status: "ready",
      fileSize: formatFileSize(JSON.stringify(data).length * 2), // Approximate
    };
    
    setReports(prev => [report, ...prev]);
    setIsGenerating(false);
    
    return report;
  }, [generateReportData]);
  
  // Download report
  const downloadReport = useCallback((reportId: string) => {
    const report = reports.find(r => r.id === reportId);
    if (!report) return;
    
    let content: string;
    let mimeType: string;
    let extension: string;
    
    switch (report.format) {
      case "csv":
        // Generate CSV content
        const csvRows = [
          ["Metric", "Value"],
          ["Total Scans", report.data.summary.totalScans.toString()],
          ["Recycling Rate", report.data.summary.recyclingRate + "%"],
          ["Contamination Rate", report.data.summary.contaminationRate + "%"],
          ["Average Confidence", report.data.summary.averageConfidence + "%"],
          [""],
          ["Waste Type", "Count"],
          ...Object.entries(report.data.summary.wasteByType).map(([type, count]) => [type, count.toString()]),
          [""],
          ["Bin", "Count"],
          ...Object.entries(report.data.summary.binDistribution).map(([bin, count]) => [bin, count.toString()]),
          [""],
          ["Date", "Scans", "Recycling Rate", "Contamination Rate"],
          ...report.data.trends.map(t => [t.date, t.scans.toString(), t.recyclingRate + "%", t.contaminationRate + "%"]),
        ];
        content = csvRows.map(row => row.join(",")).join("\n");
        mimeType = "text/csv";
        extension = "csv";
        break;
        
      case "json":
        content = JSON.stringify(report.data, null, 2);
        mimeType = "application/json";
        extension = "json";
        break;
        
      case "pdf":
      default:
        // Generate a text-based PDF-like content (real PDF would need a library)
        const pdfContent = `
ECOSORT WASTE MANAGEMENT REPORT
================================

Report: ${report.title}
Generated: ${report.generatedAt.toLocaleString()}
Period: ${report.dateRange.start.toLocaleDateString()} - ${report.dateRange.end.toLocaleDateString()}

SUMMARY
-------
Total Scans: ${report.data.summary.totalScans}
Recycling Rate: ${report.data.summary.recyclingRate}%
Contamination Rate: ${report.data.summary.contaminationRate}%
Average Confidence: ${report.data.summary.averageConfidence}%

WASTE DISTRIBUTION
------------------
${Object.entries(report.data.summary.wasteByType).map(([type, count]) => `${type}: ${count}`).join("\n")}

BIN DISTRIBUTION
----------------
${Object.entries(report.data.summary.binDistribution).map(([bin, count]) => `${bin}: ${count}`).join("\n")}

TOP WASTE ITEMS
---------------
${report.data.topWasteItems.map((item, i) => `${i + 1}. ${item.item}: ${item.count} (${item.percentage}%)`).join("\n")}

DAILY TRENDS
------------
${report.data.trends.map(t => `${t.date}: ${t.scans} scans, ${t.recyclingRate}% recycling, ${t.contaminationRate}% contamination`).join("\n")}

${report.data.contaminationIncidents.length > 0 ? `
CONTAMINATION INCIDENTS
-----------------------
${report.data.contaminationIncidents.map(inc => `${inc.item}: ${inc.count} incidents`).join("\n")}
` : ""}

---
Generated by EcoSort Vision
        `.trim();
        content = pdfContent;
        mimeType = "text/plain";
        extension = "txt";
        break;
    }
    
    // Create download
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ecosort-report-${report.id.slice(0, 8)}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [reports]);
  
  // Delete report
  const deleteReport = useCallback((reportId: string) => {
    setReports(prev => prev.filter(r => r.id !== reportId));
  }, []);
  
  // Create scheduled report
  const createScheduledReport = useCallback((config: Omit<ScheduledReport, "id" | "createdAt" | "nextRunAt" | "lastRunAt">) => {
    const scheduled: ScheduledReport = {
      ...config,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      nextRunAt: calculateNextRun(config.frequency),
    };
    
    setScheduledReports(prev => [...prev, scheduled]);
  }, []);
  
  // Update scheduled report
  const updateScheduledReport = useCallback((id: string, updates: Partial<ScheduledReport>) => {
    setScheduledReports(prev => prev.map(s => {
      if (s.id !== id) return s;
      
      const updated = { ...s, ...updates };
      
      // Recalculate next run if frequency changed
      if (updates.frequency) {
        updated.nextRunAt = calculateNextRun(updates.frequency);
      }
      
      return updated;
    }));
  }, []);
  
  // Delete scheduled report
  const deleteScheduledReport = useCallback((id: string) => {
    setScheduledReports(prev => prev.filter(s => s.id !== id));
  }, []);
  
  // Toggle scheduled report
  const toggleScheduledReport = useCallback((id: string) => {
    setScheduledReports(prev => prev.map(s => 
      s.id === id ? { ...s, enabled: !s.enabled } : s
    ));
  }, []);
  
  const value = useMemo(() => ({
    reports,
    scheduledReports,
    isGenerating,
    generateReport,
    downloadReport,
    deleteReport,
    createScheduledReport,
    updateScheduledReport,
    deleteScheduledReport,
    toggleScheduledReport,
    getRealTimeStats,
  }), [
    reports,
    scheduledReports,
    isGenerating,
    generateReport,
    downloadReport,
    deleteReport,
    createScheduledReport,
    updateScheduledReport,
    deleteScheduledReport,
    toggleScheduledReport,
    getRealTimeStats,
  ]);
  
  return (
    <ReportsContext.Provider value={value}>
      {children}
    </ReportsContext.Provider>
  );
}

export function useReportsStore() {
  const context = useContext(ReportsContext);
  if (!context) {
    throw new Error("useReportsStore must be used within ReportsProvider");
  }
  return context;
}
