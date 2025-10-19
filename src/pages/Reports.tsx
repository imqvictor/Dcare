import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, DollarSign, AlertCircle, TrendingUp, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface Stats {
  totalChildren: number;
  todayCollections: number;
  outstandingDebts: number;
  activeToday: number;
  absentToday: number;
  averageDailyFee: number;
}

interface ReportData {
  date: string;
  totalPaid: number;
  totalUnpaid: number;
  presentCount: number;
  absentCount: number;
}

const Reports = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [reportData, setReportData] = useState<ReportData[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState<"daily" | "weekly" | "monthly">("weekly");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    setStartDate(weekAgo.toISOString().split("T")[0]);
    setEndDate(today.toISOString().split("T")[0]);

    fetchStats();
    fetchReportData(weekAgo.toISOString().split("T")[0], today.toISOString().split("T")[0]);
  }, []);

  const fetchStats = async () => {
    try {
      const today = new Date().toISOString().split("T")[0];

      const { count: childrenCount } = await supabase
        .from("children")
        .select("*", { count: "exact", head: true });

      const { data: childrenData } = await supabase
        .from("children")
        .select("amount_charged");

      const averageFee = childrenData && childrenData.length > 0
        ? childrenData.reduce((sum, c) => sum + Number(c.amount_charged), 0) / childrenData.length
        : 0;

      const { data: todayPayments } = await supabase
        .from("payments")
        .select("amount, status, attendance_status, debt_amount")
        .eq("payment_date", today);

      const todayCollections = todayPayments
        ?.filter((p) => p.status === "paid")
        .reduce((sum, p) => sum + Number(p.amount), 0) || 0;

      const activeToday = todayPayments?.filter((p) => p.attendance_status === "present").length || 0;
      const absentToday = todayPayments?.filter((p) => p.attendance_status === "absent").length || 0;

      const { data: allPayments } = await supabase
        .from("payments")
        .select("debt_amount");

      const outstandingDebts = allPayments
        ?.reduce((sum, p) => sum + Number(p.debt_amount), 0) || 0;

      setStats({
        totalChildren: childrenCount || 0,
        todayCollections,
        outstandingDebts,
        activeToday,
        absentToday,
        averageDailyFee: averageFee,
      });
    } catch (error: any) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReportData = async (start: string, end: string) => {
    try {
      const { data: payments } = await supabase
        .from("payments")
        .select("*")
        .gte("payment_date", start)
        .lte("payment_date", end)
        .order("payment_date", { ascending: true });

      if (!payments) {
        setReportData([]);
        return;
      }

      const groupedData = payments.reduce((acc, payment) => {
        const date = payment.payment_date;
        if (!acc[date]) {
          acc[date] = {
            date,
            totalPaid: 0,
            totalUnpaid: 0,
            presentCount: 0,
            absentCount: 0,
          };
        }

        if (payment.status === "paid") {
          acc[date].totalPaid += Number(payment.amount);
        } else {
          acc[date].totalUnpaid += Number(payment.amount);
        }

        if (payment.attendance_status === "present") {
          acc[date].presentCount++;
        } else if (payment.attendance_status === "absent") {
          acc[date].absentCount++;
        }

        return acc;
      }, {} as Record<string, ReportData>);

      setReportData(Object.values(groupedData));
    } catch (error: any) {
      console.error("Error fetching report data:", error);
    }
  };

  const handleReportTypeChange = (type: "daily" | "weekly" | "monthly") => {
    setReportType(type);
    const today = new Date();
    let start: Date;

    if (type === "daily") {
      start = today;
    } else if (type === "weekly") {
      start = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else {
      start = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const startStr = start.toISOString().split("T")[0];
    const endStr = today.toISOString().split("T")[0];

    setStartDate(startStr);
    setEndDate(endStr);
    fetchReportData(startStr, endStr);
  };

  const handleCustomDateRange = () => {
    if (startDate && endDate) {
      fetchReportData(startDate, endDate);
    }
  };

  const formatCurrency = (amount: number) => {
    return `KES ${amount.toFixed(2)}`;
  };

  const totalPaid = reportData.reduce((sum, d) => sum + d.totalPaid, 0);
  const totalUnpaid = reportData.reduce((sum, d) => sum + d.totalUnpaid, 0);
  const totalPresent = reportData.reduce((sum, d) => sum + d.presentCount, 0);

  const chartData = reportData.map((d) => ({
    date: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    Paid: d.totalPaid,
    Unpaid: d.totalUnpaid,
  }));

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold">Dashboard & Reports</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Children",
      value: stats?.totalChildren || 0,
      icon: Users,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Today's Collections",
      value: formatCurrency(stats?.todayCollections || 0),
      icon: DollarSign,
      color: "text-success",
      bgColor: "bg-success-light",
    },
    {
      title: "Outstanding Debts",
      value: formatCurrency(stats?.outstandingDebts || 0),
      icon: AlertCircle,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
    },
    {
      title: "Active Today",
      value: stats?.activeToday || 0,
      icon: TrendingUp,
      color: "text-success",
      bgColor: "bg-success-light",
    },
    {
      title: "Absent Today",
      value: stats?.absentToday || 0,
      icon: AlertCircle,
      color: "text-warning",
      bgColor: "bg-warning-light",
    },
    {
      title: "Avg. Daily Fee",
      value: formatCurrency(stats?.averageDailyFee || 0),
      icon: DollarSign,
      color: "text-accent-foreground",
      bgColor: "bg-accent",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Dashboard & Reports</h2>
        <p className="text-muted-foreground">Overview and analytics for Mama Care</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-3">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title} className="transition-all hover:shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </CardTitle>
                <div className={`rounded-lg p-2 ${card.bgColor}`}>
                  <Icon className={`h-5 w-5 ${card.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{card.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Reports
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <Label>Report Type</Label>
              <Select value={reportType} onValueChange={(value: any) => handleReportTypeChange(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[200px]">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="flex-1 min-w-[200px]">
              <Label>End Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <div className="flex items-end">
              <Button onClick={handleCustomDateRange}>
                Apply Filter
              </Button>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Total Collected</p>
              <p className="text-2xl font-bold text-success">{formatCurrency(totalPaid)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Unpaid</p>
              <p className="text-2xl font-bold text-destructive">{formatCurrency(totalUnpaid)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Attendance</p>
              <p className="text-2xl font-bold text-primary">{totalPresent} days</p>
            </div>
          </div>

          {chartData.length > 0 && (
            <Card className="border-0 shadow-none">
              <CardHeader>
                <CardTitle className="text-lg">Payment Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                    />
                    <Legend />
                    <Bar dataKey="Paid" fill="hsl(var(--success))" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="Unpaid" fill="hsl(var(--destructive))" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {reportData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No data available for the selected period
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Present</TableHead>
                    <TableHead>Absent</TableHead>
                    <TableHead>Collected</TableHead>
                    <TableHead>Unpaid</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.map((row) => (
                    <TableRow key={row.date} className="hover:bg-muted/50">
                      <TableCell className="font-medium">
                        {new Date(row.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-success font-semibold">
                        {row.presentCount}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {row.absentCount}
                      </TableCell>
                      <TableCell className="text-success font-semibold">
                        {formatCurrency(row.totalPaid)}
                      </TableCell>
                      <TableCell className="text-destructive font-semibold">
                        {formatCurrency(row.totalUnpaid)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;
