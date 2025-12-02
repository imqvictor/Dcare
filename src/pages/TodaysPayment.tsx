import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface TodayPayment {
  id: string;
  child_id: string;
  amount: number;
  payment_date: string;
  status: string;
  debt_amount: number;
  children: {
    name: string;
  };
}

const TodaysPayment = () => {
  const [payments, setPayments] = useState<TodayPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchTodaysPayments();

    // Check for date change every minute
    const dateCheckInterval = setInterval(() => {
      const currentDate = new Date().toISOString().split("T")[0];
      const lastFetchDate = localStorage.getItem("lastPaymentFetchDate");
      
      if (lastFetchDate !== currentDate) {
        localStorage.setItem("lastPaymentFetchDate", currentDate);
        fetchTodaysPayments();
      }
    }, 60000); // Check every minute

    // Refetch when page becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchTodaysPayments();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Set initial date
    localStorage.setItem("lastPaymentFetchDate", new Date().toISOString().split("T")[0]);

    return () => {
      clearInterval(dateCheckInterval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const fetchTodaysPayments = async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("payments")
        .select("*, children(name)")
        .eq("payment_date", today)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPayments(data || []);
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
    return `Ksh ${Math.abs(amount).toFixed(2)}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Today's Payment</h2>
        <p className="text-muted-foreground">View all payments for today</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment Records - {new Date().toLocaleDateString()}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : payments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No payments recorded today
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Child Name</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Debt</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment, index) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium text-muted-foreground">
                        {index + 1}
                      </TableCell>
                      <TableCell 
                        className="font-medium cursor-pointer hover:text-primary underline"
                        onClick={() => navigate(`/child/${payment.child_id}`)}
                      >
                        {payment.children.name}
                      </TableCell>
                      <TableCell
                        className={
                          payment.status === "paid"
                            ? "text-success font-semibold"
                            : "text-destructive font-semibold"
                        }
                      >
                        {payment.status === "paid" ? "" : "-"}
                        {formatCurrency(payment.amount)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={payment.status === "paid" ? "default" : "secondary"}
                          className={
                            payment.status === "paid"
                              ? "bg-success text-success-foreground"
                              : "bg-destructive text-destructive-foreground"
                          }
                        >
                          {payment.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-destructive font-semibold">
                        {payment.debt_amount > 0 ? formatCurrency(payment.debt_amount) : "-"}
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

export default TodaysPayment;
