"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, GovernmentUser } from "@/hooks/use-auth-store";
import { useReportsStore, ReportCategory, ReportFormat, ScheduleFrequency } from "@/hooks/use-reports-store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  FileText,
  Download,
  Calendar,
  TrendingUp,
  Recycle,
  AlertTriangle,
  Truck,
  BarChart3,
  Plus,
  Trash2,
  Clock,
  Play,
  Pause,
  FileSpreadsheet,
  FileJson,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ReportsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
  const {
    reports,
    scheduledReports,
    isGenerating,
    generateReport,
    downloadReport,
    deleteReport,
    createScheduledReport,
    deleteScheduledReport,
    toggleScheduledReport,
    getRealTimeStats,
  } = useReportsStore();
  
  const [shouldRedirect, setShouldRedirect] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("month");
  const [reportFormat, setReportFormat] = useState<ReportFormat>("pdf");
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  
  // Schedule form state
  const [scheduleForm, setScheduleForm] = useState({
    title: "",
    category: "all" as ReportCategory,
    format: "pdf" as ReportFormat,
    frequency: "weekly" as ScheduleFrequency,
    emailRecipients: "",
    enabled: true,
  });
  
  // Get real-time stats
  const stats = getRealTimeStats();

  // Check access on mount
  useEffect(() => {
    if (!isAuthenticated || !user) {
      setShouldRedirect(true);
      return;
    }

    if (user.role !== "government") {
      setShouldRedirect(true);
      return;
    }

    const govUser = user as GovernmentUser;
    if (!govUser.permissions.includes("manage_users")) {
      setShouldRedirect(true);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (shouldRedirect) {
      router.push("/");
    }
  }, [shouldRedirect, router]);

  if (shouldRedirect || !user || user.role !== "government") {
    return null;
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "collection":
        return <Truck className="h-5 w-5 text-blue-500" />;
      case "contamination":
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case "recycling":
        return <Recycle className="h-5 w-5 text-green-500" />;
      case "bins":
        return <BarChart3 className="h-5 w-5 text-purple-500" />;
      case "performance":
        return <TrendingUp className="h-5 w-5 text-orange-500" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  const getFormatIcon = (format: ReportFormat) => {
    switch (format) {
      case "csv":
        return <FileSpreadsheet className="h-4 w-4" />;
      case "json":
        return <FileJson className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ready":
        return <Badge className="bg-green-500">Ready</Badge>;
      case "generating":
        return <Badge className="bg-blue-500">Generating...</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const filteredReports = reports.filter(
    (r) => categoryFilter === "all" || r.category === categoryFilter
  );

  const handleGenerateReport = async () => {
    try {
      await generateReport(
        categoryFilter as ReportCategory,
        dateRange as "week" | "month" | "quarter" | "year",
        reportFormat
      );
      
      toast({
        title: "Report Generated",
        description: "Your report is ready for download.",
      });
      
      setShowGenerateDialog(false);
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: "Failed to generate report. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCreateSchedule = () => {
    if (!scheduleForm.title) {
      toast({
        title: "Title Required",
        description: "Please enter a title for the scheduled report.",
        variant: "destructive",
      });
      return;
    }
    
    createScheduledReport({
      title: scheduleForm.title,
      category: scheduleForm.category,
      format: scheduleForm.format,
      frequency: scheduleForm.frequency,
      emailRecipients: scheduleForm.emailRecipients
        .split(",")
        .map(e => e.trim())
        .filter(e => e),
      enabled: scheduleForm.enabled,
    });
    
    toast({
      title: "Schedule Created",
      description: `Report "${scheduleForm.title}" scheduled successfully.`,
    });
    
    setShowScheduleDialog(false);
    resetScheduleForm();
  };

  const resetScheduleForm = () => {
    setScheduleForm({
      title: "",
      category: "all",
      format: "pdf",
      frequency: "weekly",
      emailRecipients: "",
      enabled: true,
    });
  };

  const frequencyLabels: Record<ScheduleFrequency, string> = {
    daily: "Daily at 8:00 AM",
    weekly: "Weekly on Monday",
    monthly: "Monthly on the 1st",
    quarterly: "Quarterly",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-8 w-8" />
            Reports & Analytics
          </h1>
          <p className="text-muted-foreground">
            Generate and download system reports based on real-time data
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" onClick={() => resetScheduleForm()}>
                <Clock className="h-4 w-4 mr-2" />
                Schedule Report
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Schedule Automated Report</DialogTitle>
                <DialogDescription>
                  Configure a report to be generated automatically
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="schedule-title">Report Title *</Label>
                  <Input
                    id="schedule-title"
                    placeholder="e.g., Weekly Performance Summary"
                    value={scheduleForm.title}
                    onChange={(e) => setScheduleForm(prev => ({ ...prev, title: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={scheduleForm.category}
                    onValueChange={(value) => setScheduleForm(prev => ({ ...prev, category: value as ReportCategory }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="collection">Waste Collection</SelectItem>
                      <SelectItem value="contamination">Contamination</SelectItem>
                      <SelectItem value="recycling">Recycling</SelectItem>
                      <SelectItem value="bins">Bin Monitoring</SelectItem>
                      <SelectItem value="performance">Performance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Format</Label>
                    <Select
                      value={scheduleForm.format}
                      onValueChange={(value) => setScheduleForm(prev => ({ ...prev, format: value as ReportFormat }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pdf">PDF / Text</SelectItem>
                        <SelectItem value="csv">CSV</SelectItem>
                        <SelectItem value="json">JSON</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Frequency</Label>
                    <Select
                      value={scheduleForm.frequency}
                      onValueChange={(value) => setScheduleForm(prev => ({ ...prev, frequency: value as ScheduleFrequency }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="schedule-emails">Email Recipients (optional)</Label>
                  <Input
                    id="schedule-emails"
                    placeholder="email@example.com, another@example.com"
                    value={scheduleForm.emailRecipients}
                    onChange={(e) => setScheduleForm(prev => ({ ...prev, emailRecipients: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Separate multiple emails with commas
                  </p>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable Schedule</Label>
                    <p className="text-sm text-muted-foreground">
                      Start generating reports immediately
                    </p>
                  </div>
                  <Switch
                    checked={scheduleForm.enabled}
                    onCheckedChange={(checked) => setScheduleForm(prev => ({ ...prev, enabled: checked }))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowScheduleDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateSchedule}>
                  Create Schedule
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
            <DialogTrigger asChild>
              <Button>
                <FileText className="h-4 w-4 mr-2" />
                Generate Report
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Generate New Report</DialogTitle>
                <DialogDescription>
                  Create a report from real-time scan data
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Report Category</Label>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="collection">Waste Collection</SelectItem>
                      <SelectItem value="contamination">Contamination</SelectItem>
                      <SelectItem value="recycling">Recycling</SelectItem>
                      <SelectItem value="bins">Bin Monitoring</SelectItem>
                      <SelectItem value="performance">Performance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Date Range</Label>
                  <Select value={dateRange} onValueChange={setDateRange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="week">Last 7 Days</SelectItem>
                      <SelectItem value="month">Last 30 Days</SelectItem>
                      <SelectItem value="quarter">Last Quarter</SelectItem>
                      <SelectItem value="year">Last Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Export Format</Label>
                  <Select value={reportFormat} onValueChange={(v) => setReportFormat(v as ReportFormat)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">PDF / Text Report</SelectItem>
                      <SelectItem value="csv">CSV Spreadsheet</SelectItem>
                      <SelectItem value="json">JSON Data</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">Real-Time Data Preview</h4>
                  <div className="text-sm space-y-1 text-muted-foreground">
                    <p>Total Scans: <span className="font-medium text-foreground">{stats.totalScans}</span></p>
                    <p>Recycling Rate: <span className="font-medium text-green-600">{stats.recyclingRate}%</span></p>
                    <p>Contamination Rate: <span className="font-medium text-red-500">{stats.contaminationRate}%</span></p>
                    <p>Avg Confidence: <span className="font-medium text-blue-600">{stats.averageConfidence}%</span></p>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowGenerateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleGenerateReport} disabled={isGenerating}>
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4 mr-2" />
                      Generate
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Real-Time Stats from Scan Data */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Recycle className="h-4 w-4" />
              Recycling Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.recyclingRate}%</div>
            <p className="text-xs text-muted-foreground">From {stats.totalScans} scans</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Truck className="h-4 w-4" />
              Total Scans
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalScans}</div>
            <p className="text-xs text-muted-foreground">All time records</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Contamination Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{stats.contaminationRate}%</div>
            <p className="text-xs text-muted-foreground">Low confidence items</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Avg Confidence
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.averageConfidence}%</div>
            <p className="text-xs text-muted-foreground">Detection accuracy</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Generate Buttons */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Report Generation</CardTitle>
          <CardDescription>
            Generate common reports with one click
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setCategoryFilter("all");
                setDateRange("week");
                setReportFormat("pdf");
                setShowGenerateDialog(true);
              }}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Weekly Summary
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setCategoryFilter("recycling");
                setDateRange("month");
                setReportFormat("csv");
                setShowGenerateDialog(true);
              }}
            >
              <Recycle className="h-4 w-4 mr-2" />
              Monthly Recycling (CSV)
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setCategoryFilter("contamination");
                setDateRange("month");
                setReportFormat("pdf");
                setShowGenerateDialog(true);
              }}
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Contamination Report
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setCategoryFilter("all");
                setDateRange("quarter");
                setReportFormat("json");
                setShowGenerateDialog(true);
              }}
            >
              <FileJson className="h-4 w-4 mr-2" />
              Quarterly Data Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Generated Reports List */}
      <Card>
        <CardHeader>
          <CardTitle>Generated Reports ({reports.length})</CardTitle>
          <CardDescription>
            Download reports generated from real-time scan data
          </CardDescription>
        </CardHeader>
        <CardContent>
          {reports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No reports generated yet</p>
              <p className="text-sm">Click &quot;Generate Report&quot; to create your first report</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredReports.map((report) => (
                <div
                  key={report.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-muted rounded-lg">
                      {getCategoryIcon(report.category)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{report.title}</h4>
                        {getFormatIcon(report.format)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {report.description}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>{new Date(report.generatedAt).toLocaleString()}</span>
                        <span>{report.fileSize}</span>
                        <span>{report.data.summary.totalScans} scans included</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(report.status)}
                    {report.status === "ready" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadReport(report.id)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-muted-foreground">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Report</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this report? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteReport(report.id)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scheduled Reports */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Scheduled Reports ({scheduledReports.length})</CardTitle>
            <CardDescription>
              Automated reports that generate on a schedule
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => {
            resetScheduleForm();
            setShowScheduleDialog(true);
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Schedule
          </Button>
        </CardHeader>
        <CardContent>
          {scheduledReports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No scheduled reports</p>
              <p className="text-sm">Click &quot;Schedule Report&quot; to automate report generation</p>
            </div>
          ) : (
            <div className="space-y-4">
              {scheduledReports.map((schedule) => (
                <div
                  key={schedule.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-muted rounded-lg">
                      {getCategoryIcon(schedule.category)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{schedule.title}</h4>
                        {schedule.enabled ? (
                          <Badge className="bg-green-500">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Paused</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {frequencyLabels[schedule.frequency]} • {schedule.format.toUpperCase()} format
                      </p>
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        <span>Next: {new Date(schedule.nextRunAt).toLocaleString()}</span>
                        {schedule.lastRunAt && (
                          <span>Last: {new Date(schedule.lastRunAt).toLocaleString()}</span>
                        )}
                      </div>
                      {schedule.emailRecipients.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          📧 {schedule.emailRecipients.join(", ")}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleScheduledReport(schedule.id)}
                      title={schedule.enabled ? "Pause" : "Resume"}
                    >
                      {schedule.enabled ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-muted-foreground">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Schedule</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this scheduled report?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteScheduledReport(schedule.id)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
