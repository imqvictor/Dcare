import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useNavigate } from "react-router-dom";
import { FileText } from "lucide-react";

interface PaymentSummary {
  date: string;
  paid: number;
  debt: number;
}

interface DebtOverview {
  child_id: string;
  child_name: string;
  total_debt: number;
  last_payment_date: string;
}

const Reports = () => {
  const [paymentSummary, setPaymentSummary] = useState<PaymentSummary[]>([]);
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [debtOverview, setDebtOverview] = useState<DebtOverview[]>([]);
  const [topPerformers, setTopPerformers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  const COLORS = ['#22c55e', '#ef4444'];

  useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    try {
      // Fetch payment summary for last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { data: payments, error: paymentsError } = await supabase
        .from("payments")
        .select("*")
        .gte("payment_date", sevenDaysAgo.toISOString().split("T")[0]);

      if (paymentsError) throw paymentsError;

      // Group by date
      const summaryMap = new Map<string, { paid: number; debt: number }>();
      payments?.forEach((p) => {
        const date = p.payment_date;
        const current = summaryMap.get(date) || { paid: 0, debt: 0 };
        if (p.status === "paid") {
          current.paid += Number(p.amount);
        } else {
          current.debt += Number(p.debt_amount);
        }
        summaryMap.set(date, current);
      });

      const summary = Array.from(summaryMap.entries()).map(([date, data]) => ({
        date: new Date(date).toLocaleDateString(),
        paid: data.paid,
        debt: data.debt,
      }));
      setPaymentSummary(summary);

      // Attendance overview
      const presentCount = payments?.filter(p => p.attendance_status === "present").length || 0;
      const absentCount = payments?.filter(p => p.attendance_status === "absent").length || 0;
      setAttendanceData([
        { name: "Present", value: presentCount },
        { name: "Absent", value: absentCount },
      ]);

      // Debt overview - sum up all debt_amount per child
      const { data: debtData } = await supabase
        .from("payments")
        .select("child_id, debt_amount, payment_date, children(name)")
        .gt("debt_amount", 0);

      const debtMap = new Map<string, { name: string; debt: number; date: string }>();
      debtData?.forEach((d: any) => {
        const current = debtMap.get(d.child_id);
        const currentDate = current?.date || d.payment_date;
        debtMap.set(d.child_id, {
          name: d.children.name,
          debt: (current?.debt || 0) + Number(d.debt_amount),
          date: new Date(d.payment_date) > new Date(currentDate) ? d.payment_date : currentDate,
        });
      });

      const debtList = Array.from(debtMap.entries())
        .map(([child_id, data]) => ({
          child_id,
          child_name: data.name,
          total_debt: data.debt,
          last_payment_date: data.date,
        }))
        .sort((a, b) => b.total_debt - a.total_debt);
      setDebtOverview(debtList);

      // Top performers
      const { data: topData } = await supabase
        .from("payments")
        .select("child_id, amount, children(name)")
        .eq("status", "paid");

      const performerMap = new Map<string, { name: string; total: number }>();
      topData?.forEach((p: any) => {
        const current = performerMap.get(p.child_id);
        performerMap.set(p.child_id, {
          name: p.children.name,
          total: (current?.total || 0) + Number(p.amount),
        });
      });

      const performers = Array.from(performerMap.entries())
        .map(([child_id, data]) => ({ child_id, ...data }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);
      setTopPerformers(performers);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `Ksh ${amount.toFixed(2)}`;
  };

  if (loading) {
    return <div className="text-center py-8">Loading reports...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <FileText className="h-8 w-8 text-primary" />
          Reports & Analytics
        </h1>
        <p className="text-muted-foreground mt-1">View payment summaries, attendance, and debt overview</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Payment Summary (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={paymentSummary}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Legend />
                <Bar dataKey="paid" fill="#22c55e" name="Paid" />
                <Bar dataKey="debt" fill="#ef4444" name="Debt" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Attendance Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={attendanceData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {attendanceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top Performing Children</CardTitle>
        </CardHeader>
        <CardContent>
          {topPerformers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No payment data available
            </div>
          ) : (
            <div className="space-y-4">
              {topPerformers.map((child, index) => (
                <div
                  key={child.child_id}
                  className="flex items-center justify-between p-4 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted"
                  onClick={() => navigate(`/child/${child.child_id}`)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                      {index + 1}
                    </div>
                    <span className="font-medium">{child.name}</span>
                  </div>
                  <span className="text-success font-bold">
                    {formatCurrency(child.total)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Debt Overview</CardTitle>
          {debtOverview.length > 0 && (
            <div className="mt-2 p-4 bg-destructive/10 rounded-lg">
              <p className="text-sm text-muted-foreground">Overall Total Debt</p>
              <p className="text-2xl font-bold text-destructive">
                {formatCurrency(debtOverview.reduce((sum, debt) => sum + debt.total_debt, 0))}
              </p>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {debtOverview.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No outstanding debts
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Child Name</TableHead>
                    <TableHead>Total Debt</TableHead>
                    <TableHead>Last Payment Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {debtOverview.map((debt) => (
                    <TableRow key={debt.child_id}>
                      <TableCell
                        className="font-medium cursor-pointer hover:text-primary underline"
                        onClick={() => navigate(`/child/${debt.child_id}`)}
                      >
                        {debt.child_name}
                      </TableCell>
                      <TableCell className="text-destructive font-bold">
                        {formatCurrency(debt.total_debt)}
                      </TableCell>
                      <TableCell>
                        {new Date(debt.last_payment_date).toLocaleDateString()}
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
