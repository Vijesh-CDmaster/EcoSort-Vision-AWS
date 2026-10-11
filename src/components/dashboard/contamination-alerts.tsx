
"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowUpDown, AlertTriangle, Bell, MoreHorizontal, Eye, ExternalLink, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { useScanStore, type WasteBin, type ScanRecord } from "@/components/scan/scan-store";
import { useSettingsStore } from "@/hooks/use-settings-store";
import { titleCase, toBinLabel, type WasteBinLabel } from "@/lib/utils";

type Alert = {
  id: string;
  type: "Contamination" | "Bin Full";
  description: string;
  severity: "high" | "medium" | "low";
  timestamp: number;
  bin: WasteBinLabel;
  contaminant?: string;
  status: "new" | "acknowledged";
  imageUrl?: string;
};

function deriveContaminationAlerts(scans: ScanRecord[], alertThreshold: number): Alert[] {
  const alerts: Alert[] = [];
  for (const s of scans.slice(0, 50)) {
    const lowConf = (s.binConfidence ?? 0) < alertThreshold;
    if (!lowConf) continue;

    const contaminant = titleCase(s.wasteType || "unknown");
    const bin = toBinLabel(String(s.binSuggestion));

    alerts.push({
      id: `scan-${s.id}`,
      type: "Contamination",
      description: `Low-confidence item detected (${contaminant}). Please review.`,
      severity: "high",
      timestamp: s.timestamp,
      bin,
      contaminant,
      status: "new",
      imageUrl: s.imageUrl || PlaceHolderImages.find(p => p.id === 'scanner-placeholder')?.imageUrl || '',
    });
  }
  return alerts;
}

function clampPercent(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

function computeBinLevel(scansCount: number) {
  // Simple demo heuristic: each scan adds ~5% until full.
  return clampPercent(scansCount * 5);
}

function deriveBinFullAlerts(scans: ScanRecord[], binFullThreshold: number): Alert[] {
    const alerts: Alert[] = [];
    const byBin: Record<WasteBin, ScanRecord[]> = { plastic: [], glass: [], compost: [], landfill: [] };
    
    for (const s of scans) {
        if (byBin[s.binSuggestion]) {
            byBin[s.binSuggestion].push(s);
        }
    }

    const latestTimestamp = scans.length > 0 ? scans[0].timestamp : Date.now();

    for (const binKey of Object.keys(byBin) as WasteBin[]) {
        const binScans = byBin[binKey];
        const level = computeBinLevel(binScans.length);

        if (level >= binFullThreshold) {
            alerts.push({
                id: `bin-full-${binKey}-${latestTimestamp}`,
                type: "Bin Full",
                description: `The ${titleCase(binKey)} bin is nearly full (${level}%). Schedule collection.`,
                severity: "medium",
                timestamp: latestTimestamp,
                bin: toBinLabel(binKey),
                status: "new",
            });
        }
    }
    return alerts;
}


const SeverityBadge = ({ severity }: { severity: Alert["severity"] }) => {
  const variant = {
    high: "destructive",
    medium: "secondary",
    low: "outline",
  }[severity] as "destructive" | "secondary" | "outline";
  
  return <Badge variant={variant}>{severity}</Badge>;
};

const ContaminationDetailsDialog = ({ alert }: { alert: Alert }) => {
    const [formattedDate, setFormattedDate] = React.useState('');

    React.useEffect(() => {
        setFormattedDate(new Date(alert.timestamp).toLocaleString());
    }, [alert.timestamp]);

    return (
        <AlertDialogContent>
        <AlertDialogHeader>
            <AlertDialogTitle>Alert Details</AlertDialogTitle>
            <AlertDialogDescription>
            Detailed information about the alert event.
            </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-4">
            {alert.imageUrl && (
              <div className="relative aspect-video rounded-lg overflow-hidden">
                  <Image
                      src={alert.imageUrl}
                      alt={`Image for alert ${alert.id}`}
                      fill
                      objectFit="cover"
                  />
              </div>
            )}
            <div>
            <p><strong>Bin:</strong> {alert.bin}</p>
            {alert.contaminant && <p><strong>Contaminant:</strong> {alert.contaminant}</p>}
            <p><strong>Description:</strong> {alert.description}</p>
            <p><strong>Time:</strong> {formattedDate}</p>
            <p><strong>Severity:</strong> <span className="capitalize">{alert.severity}</span></p>
            </div>
        </div>
        <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
        </AlertDialogFooter>
        </AlertDialogContent>
    );
};

const FormattedDate = ({ timestamp }: { timestamp: number }) => {
    const [formattedDate, setFormattedDate] = React.useState('');
  
    React.useEffect(() => {
      setFormattedDate(new Date(timestamp).toLocaleString());
    }, [timestamp]);
  
    return <div suppressHydrationWarning>{formattedDate}</div>;
};

export function ContaminationAlerts({ limit }: { limit?: number }) {
  const { scans } = useScanStore();
  const { alertThreshold, binFullThreshold } = useSettingsStore();
  const [acknowledged, setAcknowledged] = React.useState<Record<string, boolean>>({});

  const data = React.useMemo(() => {
    const contaminationAlerts = deriveContaminationAlerts(scans as any, alertThreshold);
    const binFullAlerts = deriveBinFullAlerts(scans as any, binFullThreshold);

    const allAlertsRaw = [...contaminationAlerts, ...binFullAlerts].sort(
      (a, b) => b.timestamp - a.timestamp
    );

    const uniqueAlerts = Array.from(new Map(allAlertsRaw.map(a => [a.id, a])).values());

    const allAlerts = uniqueAlerts.map(a => (acknowledged[a.id] ? { ...a, status: "acknowledged" as const } : a));
    
    if (limit) {
      return allAlerts.slice(0, limit);
    }
    return allAlerts;
  }, [scans, acknowledged, limit, alertThreshold, binFullThreshold]);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});

  const acknowledgeAlert = (id: string) => {
    setAcknowledged(prev => ({ ...prev, [id]: true }));
  };
  
  const columns: ColumnDef<Alert>[] = [
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => {
        const alert = row.original;
        const icon = {
            "Contamination": <AlertTriangle className="h-4 w-4 text-destructive" />,
            "Bin Full": <Trash2 className="h-4 w-4 text-yellow-500" />
        }[alert.type];

        return (
            <div className="flex items-center gap-2">
                {icon}
                <span className="capitalize">{alert.type}</span>
            </div>
        )
      },
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => <div className="max-w-xs truncate">{row.getValue("description")}</div>,
    },
    {
      accessorKey: "timestamp",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          suppressHydrationWarning
        >
          Timestamp
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <FormattedDate timestamp={row.getValue("timestamp")} />,
    },
    {
        accessorKey: "bin",
        header: "Bin",
    },
    {
        accessorKey: "severity",
        header: "Severity",
        cell: ({ row }) => <SeverityBadge severity={row.getValue("severity")} />,
    },
    {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <Badge variant={row.getValue("status") === 'new' ? 'outline' : 'default'}>{row.getValue("status")}</Badge>,
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const alert = row.original;
        return (
          <AlertDialog>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0" suppressHydrationWarning>
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <AlertDialogTrigger asChild>
                    <DropdownMenuItem>
                        <Eye className="mr-2 h-4 w-4"/>
                        View Details
                    </DropdownMenuItem>
                </AlertDialogTrigger>
                <DropdownMenuItem
                    disabled={alert.status === 'acknowledged'}
                    onClick={() => acknowledgeAlert(alert.id)}
                >
                  Acknowledge
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <ContaminationDetailsDialog alert={alert} />
          </AlertDialog>
        );
      },
    },
  ];


  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    initialState: {
        pagination: {
            pageSize: limit || 5,
        },
    },
    state: {
      sorting,
      columnFilters,
      columnVisibility,
    },
  });

  return (
    <Card>
       <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle>System Alerts</CardTitle>
          <CardDescription>
            {limit ? `Showing the ${limit} most recent alerts.` : "Review and manage all system alerts."}
          </CardDescription>
        </div>
        {limit && (
          <Button asChild variant="outline" size="sm">
            <Link href="/contamination-alerts">
              View All
              <ExternalLink className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <div className="w-full">
          {!limit && (
            <div className="flex items-center py-4">
                <Input
                placeholder="Filter alerts by description..."
                value={(table.getColumn("description")?.getFilterValue() as string) ?? ""}
                onChange={(event) =>
                    table.getColumn("description")?.setFilterValue(event.target.value)
                }
                className="max-w-sm"
                suppressHydrationWarning
                />
            </div>
            )}
            <div className="rounded-md border">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      return (
                        <TableHead key={header.id}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </TableHead>
                      );
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && "selected"}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center"
                    >
                      No alerts.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {!limit && (
           <div className="flex items-center justify-end space-x-2 py-4">
                <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                suppressHydrationWarning
                >
                Previous
                </Button>
                <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                suppressHydrationWarning
                >
                Next
                </Button>
            </div>
            )}
        </div>
      </CardContent>
    </Card>
  );
}
