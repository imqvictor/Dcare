import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Users, FileText, ChevronRight, DollarSign, AlertCircle, TrendingUp, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from "recharts";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

const Dashboard = () => {
  const navigate = useNavigate();
  const [totalChildren, setTotalChildren] = useState(0);
  const [todayCollection, setTodayCollection] = useState(0);
  const [totalDebt, setTotalDebt] = useState(0);
  const [totalPaidOverall, setTotalPaidOverall] = useState(0);
  const [monthlyCollection, setMonthlyCollection] = useState(0);
  const [yearlyData, setYearlyData] = useState<{ month: string; paid: number; debt: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();

    // Check for date change every minute
    const dateCheckInterval = setInterval(() => {
      const currentDate = new Date().toISOString().split("T")[0];
      const lastFetchDate = localStorage.getItem("lastDashboardFetchDate");
      
      if (lastFetchDate !== currentDate) {
        localStorage.setItem("lastDashboardFetchDate", currentDate);
        fetchDashboardData();
      }
    }, 60000); // Check every minute

    // Refetch when page becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchDashboardData();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Set initial date
    localStorage.setItem("lastDashboardFetchDate", new Date().toISOString().split("T")[0]);

    return () => {
      clearInterval(dateCheckInterval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const fetchDashboardData = async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];
      const lastDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split("T")[0];

      // Get total children count
      const { count, error: countError } = await supabase
        .from("children")
        .select("*", { count: "exact", head: true });

      if (countError) throw countError;
      setTotalChildren(count || 0);

      // Get today's amount to be collected (present children only)
      const { data: todayPayments, error: todayError } = await supabase
        .from("payments")
        .select("amount, children(payment_amount)")
        .eq("payment_date", today)
        .eq("attendance_status", "present");

      if (todayError) throw todayError;
      
      // Sum up the payment amounts for present children
      const todayTotal = todayPayments?.reduce((sum, payment) => {
        return sum + (payment.children as any)?.payment_amount || 0;
      }, 0) || 0;
      setTodayCollection(todayTotal);

      // Get total outstanding debt
      const { data: debtData, error: debtError } = await supabase
        .from("payments")
        .select("debt_amount");

      if (debtError) throw debtError;
      
      const totalDebtAmount = debtData?.reduce((sum, payment) => sum + (payment.debt_amount || 0), 0) || 0;
      setTotalDebt(totalDebtAmount);

      // Get total paid overall
      const { data: paidData, error: paidError } = await supabase
        .from("payments")
        .select("amount")
        .eq("status", "paid");

      if (paidError) throw paidError;
      
      const totalPaid = paidData?.reduce((sum, payment) => sum + payment.amount, 0) || 0;
      setTotalPaidOverall(totalPaid);

      // Get this month's collection
      const { data: monthlyData, error: monthlyError } = await supabase
        .from("payments")
        .select("amount")
        .eq("status", "paid")
        .gte("payment_date", firstDayOfMonth)
        .lte("payment_date", lastDayOfMonth);

      if (monthlyError) throw monthlyError;
      
      const monthlyTotal = monthlyData?.reduce((sum, payment) => sum + payment.amount, 0) || 0;
      setMonthlyCollection(monthlyTotal);

      // Fetch yearly data for line chart
      await fetchYearlyData();

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchYearlyData = async () => {
    try {
      const currentYear = new Date().getFullYear();
      const startOfYear = `${currentYear}-01-01`;
      const endOfYear = `${currentYear}-12-31`;

      // Get all payments for the current year
      const { data: yearPayments, error } = await supabase
        .from("payments")
        .select("amount, debt_amount, status, payment_date")
        .gte("payment_date", startOfYear)
        .lte("payment_date", endOfYear);

      if (error) throw error;

      // Initialize monthly data
      const monthlyStats: { [key: number]: { paid: number; debt: number } } = {};
      for (let i = 0; i < 12; i++) {
        monthlyStats[i] = { paid: 0, debt: 0 };
      }

      // Aggregate data by month
      yearPayments?.forEach((payment) => {
        const paymentMonth = new Date(payment.payment_date).getMonth();
        if (payment.status === "paid") {
          monthlyStats[paymentMonth].paid += payment.amount || 0;
        }
        monthlyStats[paymentMonth].debt += payment.debt_amount || 0;
      });

      // Format data for chart
      const chartData = MONTHS.map((month, index) => ({
        month,
        paid: monthlyStats[index].paid,
        debt: monthlyStats[index].debt,
      }));

      setYearlyData(chartData);
    } catch (error) {
      console.error("Error fetching yearly data:", error);
    }
  };

  const formatCurrency = (amount: number) => {
    return `Ksh ${amount.toFixed(2)}`;
  };

  const chartConfig = {
    paid: {
      label: "Paid (Ksh)",
      color: "hsl(var(--success))",
    },
    debt: {
      label: "Debt (Ksh)",
      color: "hsl(var(--destructive))",
    },
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <BarChart3 className="h-8 w-8 text-primary" />
          Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">View analytics and reports</p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Children</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-2xl font-bold">Loading...</div>
            ) : (
              <div className="text-3xl font-bold text-primary">{totalChildren}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Registered children
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-success/10 to-success/5 border-success/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Collection Target</CardTitle>
            <DollarSign className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-2xl font-bold">Loading...</div>
            ) : (
              <div className="text-3xl font-bold text-success">{formatCurrency(todayCollection)}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              From present children today
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-destructive/10 to-destructive/5 border-destructive/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Outstanding Debt</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-2xl font-bold">Loading...</div>
            ) : (
              <div className="text-3xl font-bold text-destructive">{formatCurrency(totalDebt)}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Accumulated debt
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Amount Paid</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-2xl font-bold">Loading...</div>
            ) : (
              <div className="text-3xl font-bold text-primary">{formatCurrency(totalPaidOverall)}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              All-time collection
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month's Collection</CardTitle>
            <Calendar className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-2xl font-bold">Loading...</div>
            ) : (
              <div className="text-3xl font-bold text-accent">{formatCurrency(monthlyCollection)}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {new Date().toLocaleString('default', { month: 'long' })} total
            </p>
          </CardContent>
        </Card>

        <Card 
          className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 cursor-pointer hover:border-primary/40 transition-all hover:shadow-md"
          onClick={() => navigate("/reports")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reports</CardTitle>
            <FileText className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold text-foreground">View Analytics</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Payment summary, attendance & debt overview
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Yearly Payment Line Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Summary – {new Date().getFullYear()}</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={yearlyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                />
                <YAxis 
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                  tickFormatter={(value) => `Ksh ${value.toLocaleString()}`}
                />
                <ChartTooltip 
                  content={<ChartTooltipContent />}
                  formatter={(value: number) => [`Ksh ${value.toLocaleString()}`, '']}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="paid" 
                  name="Paid (Ksh)"
                  stroke="hsl(var(--success))" 
                  strokeWidth={3}
                  dot={{ fill: 'hsl(var(--success))', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, strokeWidth: 2 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="debt" 
                  name="Debt (Ksh)"
                  stroke="hsl(var(--destructive))" 
                  strokeWidth={3}
                  dot={{ fill: 'hsl(var(--destructive))', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;