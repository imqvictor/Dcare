import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { Undo2, RefreshCw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Child {
  id: string;
  name: string;
  amount_charged: number;
}

interface TodayPayment {
  id: string;
  child_id: string;
  amount: number;
  payment_date: string;
  status: string;
  attendance_status: string;
  arrival_time: string | null;
  created_at: string;
  children: {
    name: string;
  };
}

interface DailyRecord {
  child_id: string;
  attendance_marked: boolean;
  payment_marked: boolean;
}

const TodaysPayment = () => {
  const [children, setChildren] = useState<Child[]>([]);
  const [payments, setPayments] = useState<TodayPayment[]>([]);
  const [dailyRecords, setDailyRecords] = useState<Record<string, DailyRecord>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkMidnightRefresh();
    fetchData();

    const midnightCheck = setInterval(checkMidnightRefresh, 60000);

    return () => clearInterval(midnightCheck);
  }, []);

  const checkMidnightRefresh = () => {
    const lastRefresh = localStorage.getItem("lastRefresh");
    const today = new Date().toDateString();

    if (lastRefresh !== today) {
      handleMidnightRefresh();
    }
  };

  const handleMidnightRefresh = async () => {
    setRefreshing(true);
    const today = new Date().toDateString();

    try {
      const todayDate = new Date().toISOString().split("T")[0];

      await supabase
        .from("daily_records")
        .delete()
        .lt("record_date", todayDate);

      localStorage.setItem("lastRefresh", today);

      toast({
        title: "System Refreshed",
        description: "Daily records have been reset for a new day",
      });

      await fetchData();
    } catch (error: any) {
      console.error("Midnight refresh error:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const fetchData = async () => {
    try {
      const today = new Date().toISOString().split("T")[0];

      const { data: childrenData, error: childrenError } = await supabase
        .from("children")
        .select("id, name, amount_charged")
        .order("name");

      if (childrenError) throw childrenError;
      setChildren(childrenData || []);

      const { data: paymentsData, error: paymentsError } = await supabase
        .from("payments")
        .select("*, children(name)")
        .eq("payment_date", today)
        .order("created_at", { ascending: false });

      if (paymentsError) throw paymentsError;
      setPayments(paymentsData || []);

      const { data: recordsData, error: recordsError } = await supabase
        .from("daily_records")
        .select("*")
        .eq("record_date", today);

      if (recordsError) throw recordsError;

      const recordsMap: Record<string, DailyRecord> = {};
      recordsData?.forEach((record) => {
        recordsMap[record.child_id] = {
          child_id: record.child_id,
          attendance_marked: record.attendance_marked,
          payment_marked: record.payment_marked,
        };
      });
      setDailyRecords(recordsMap);
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

  const handleAttendance = async (child: Child, status: "present" | "absent") => {
    const today = new Date().toISOString().split("T")[0];
    const time = new Date().toLocaleTimeString();

    try {
      const amount = status === "present" ? child.amount_charged : 0;
      const note = status === "present"
        ? `Child arrived at ${time}`
        : "Child did not report";

      const { error: paymentError } = await supabase
        .from("payments")
        .insert({
          child_id: child.id,
          amount: amount,
          payment_date: today,
          status: "unpaid",
          note,
          attendance_status: status,
          arrival_time: status === "present" ? new Date().toISOString() : null,
          debt_amount: amount,
          can_undo: true,
        });

      if (paymentError) throw paymentError;

      const { error: recordError } = await supabase
        .from("daily_records")
        .upsert({
          child_id: child.id,
          record_date: today,
          attendance_marked: true,
          payment_marked: false,
        }, { onConflict: "child_id,record_date" });

      if (recordError) throw recordError;

      toast({
        title: status === "present" ? "Child marked present" : "Child marked absent",
        description: status === "present"
          ? `${child.name} - KES ${amount} pending`
          : `${child.name} did not report`,
      });

      await fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handlePayment = async (child: Child, status: "paid" | "unpaid") => {
    const today = new Date().toISOString().split("T")[0];

    try {
      const { data: existingPayment, error: fetchError } = await supabase
        .from("payments")
        .select("*")
        .eq("child_id", child.id)
        .eq("payment_date", today)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (!existingPayment) {
        toast({
          title: "Error",
          description: "Please mark attendance first",
          variant: "destructive",
        });
        return;
      }

      const { error: updateError } = await supabase
        .from("payments")
        .update({
          status,
          debt_amount: status === "paid" ? 0 : child.amount_charged,
        })
        .eq("id", existingPayment.id);

      if (updateError) throw updateError;

      const { error: recordError } = await supabase
        .from("daily_records")
        .update({ payment_marked: true })
        .eq("child_id", child.id)
        .eq("record_date", today);

      if (recordError) throw recordError;

      toast({
        title: status === "paid" ? "Payment recorded" : "Payment not received",
        description: status === "paid"
          ? `${child.name} - KES ${child.amount_charged}`
          : `${child.name} - debt recorded`,
      });

      await fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleUndo = async (childId: string, childName: string) => {
    const today = new Date().toISOString().split("T")[0];

    try {
      const { error: deletePaymentError } = await supabase
        .from("payments")
        .delete()
        .eq("child_id", childId)
        .eq("payment_date", today);

      if (deletePaymentError) throw deletePaymentError;

      const { error: deleteRecordError } = await supabase
        .from("daily_records")
        .delete()
        .eq("child_id", childId)
        .eq("record_date", today);

      if (deleteRecordError) throw deleteRecordError;

      toast({
        title: "Action undone successfully",
        description: `Record removed for ${childName}`,
      });

      await fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getChildPayment = (childId: string) => {
    return payments.find((p) => p.child_id === childId);
  };

  const formatCurrency = (amount: number) => {
    return `KES ${Math.abs(amount).toFixed(2)}`;
  };

  const formatTime = (isoString: string | null) => {
    if (!isoString) return "-";
    return new Date(isoString).toLocaleTimeString();
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Today's Activity</h2>
          <p className="text-muted-foreground">Daily attendance and payment tracking</p>
        </div>
        {refreshing && (
          <RefreshCw className="h-5 w-5 animate-spin text-primary" />
        )}
      </div>

      <Alert className="bg-accent/50 border-accent">
        <AlertDescription className="text-sm">
          System auto-refreshes daily at midnight. All attendance and payment records reset for a new day.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Daily Records - {new Date().toLocaleDateString()}</CardTitle>
        </CardHeader>
        <CardContent>
          {children.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No children registered yet
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Child Name</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Attendance</TableHead>
                    <TableHead>Payment Status</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {children.map((child) => {
                    const record = dailyRecords[child.id];
                    const payment = getChildPayment(child.id);
                    const attendanceMarked = record?.attendance_marked || false;
                    const paymentMarked = record?.payment_marked || false;

                    return (
                      <TableRow key={child.id}>
                        <TableCell
                          className="font-medium cursor-pointer hover:text-primary underline"
                          onClick={() => navigate(`/child/${child.id}`)}
                        >
                          {child.name}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {formatCurrency(child.amount_charged)}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant={payment?.attendance_status === "present" ? "default" : "outline"}
                              className={payment?.attendance_status === "present" ? "bg-primary" : ""}
                              onClick={() => handleAttendance(child, "present")}
                              disabled={attendanceMarked}
                            >
                              Present
                            </Button>
                            <Button
                              size="sm"
                              variant={payment?.attendance_status === "absent" ? "secondary" : "outline"}
                              onClick={() => handleAttendance(child, "absent")}
                              disabled={attendanceMarked}
                            >
                              Absent
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className={payment?.status === "paid" ? "bg-success hover:bg-success/90" : ""}
                              variant={payment?.status === "paid" ? "default" : "outline"}
                              onClick={() => handlePayment(child, "paid")}
                              disabled={!attendanceMarked || paymentMarked || payment?.attendance_status === "absent"}
                            >
                              Paid
                            </Button>
                            <Button
                              size="sm"
                              className={payment?.status === "unpaid" && paymentMarked ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground" : ""}
                              variant={payment?.status === "unpaid" && paymentMarked ? "default" : "outline"}
                              onClick={() => handlePayment(child, "unpaid")}
                              disabled={!attendanceMarked || paymentMarked || payment?.attendance_status === "absent"}
                            >
                              Unpaid
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {payment?.arrival_time ? formatTime(payment.arrival_time) : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {payment && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleUndo(child.id, child.name)}
                              className="text-warning hover:text-warning/80"
                            >
                              <Undo2 className="h-4 w-4 mr-1" />
                              Undo
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {payments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Today's Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Present</p>
                <p className="text-2xl font-bold text-primary">
                  {payments.filter((p) => p.attendance_status === "present").length}
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Paid</p>
                <p className="text-2xl font-bold text-success">
                  {formatCurrency(
                    payments
                      .filter((p) => p.status === "paid")
                      .reduce((sum, p) => sum + Number(p.amount), 0)
                  )}
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Outstanding</p>
                <p className="text-2xl font-bold text-destructive">
                  {formatCurrency(
                    payments
                      .filter((p) => p.status === "unpaid")
                      .reduce((sum, p) => sum + Number(p.amount), 0)
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TodaysPayment;
