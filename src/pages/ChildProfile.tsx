import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Edit, Trash2 } from "lucide-react";
import ChildDialog from "@/components/ChildDialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";

interface Child {
  id: string;
  name: string;
  age: number;
  class: string | null;
  admission_number: string | null;
  guardian_name: string;
  contact_number: string;
  admission_date: string;
  amount_charged: number;
}

interface Payment {
  id: string;
  amount: number;
  payment_date: string;
  status: string;
  note: string | null;
  debt_amount: number;
  attendance_status: string | null;
}

const ChildProfile = () => {
  const { childId } = useParams();
  const navigate = useNavigate();
  const [child, setChild] = useState<Child | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (childId) {
      fetchChildData();
    }
  }, [childId]);

  const fetchChildData = async () => {
    try {
      const { data: childData, error: childError } = await supabase
        .from("children")
        .select("*")
        .eq("id", childId)
        .maybeSingle();

      if (childError) throw childError;

      if (!childData) {
        toast({
          title: "Child not found",
          variant: "destructive",
        });
        navigate("/children");
        return;
      }

      setChild(childData);

      const { data: paymentsData, error: paymentsError } = await supabase
        .from("payments")
        .select("*")
        .eq("child_id", childId)
        .order("payment_date", { ascending: false });

      if (paymentsError) throw paymentsError;
      setPayments(paymentsData || []);
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

  const handleDelete = async () => {
    if (!child) return;

    try {
      const { error } = await supabase
        .from("children")
        .delete()
        .eq("id", child.id);

      if (error) throw error;

      toast({
        title: "Child deleted",
        description: `${child.name}'s record has been permanently removed`,
      });
      navigate("/children");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleQuickAttendance = async (status: "present" | "absent") => {
    if (!child) return;

    const today = new Date().toISOString().split("T")[0];
    const time = new Date().toLocaleTimeString();

    try {
      const { data: existingPayment } = await supabase
        .from("payments")
        .select("*")
        .eq("child_id", child.id)
        .eq("payment_date", today)
        .maybeSingle();

      if (existingPayment) {
        toast({
          title: "Already recorded",
          description: "Attendance already marked for today",
          variant: "destructive",
        });
        return;
      }

      const amount = status === "present" ? child.amount_charged : 0;
      const note = status === "present"
        ? `Child arrived at ${time}`
        : "Child did not report";

      const { error } = await supabase
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

      if (error) throw error;

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
        title: status === "present" ? "Marked present" : "Marked absent",
        description: status === "present"
          ? `${child.name} - KES ${amount} pending`
          : `${child.name} did not report`,
      });

      await fetchChildData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleQuickPayment = async (status: "paid" | "unpaid") => {
    if (!child) return;

    const today = new Date().toISOString().split("T")[0];

    try {
      const { data: existingPayment } = await supabase
        .from("payments")
        .select("*")
        .eq("child_id", child.id)
        .eq("payment_date", today)
        .maybeSingle();

      if (!existingPayment) {
        toast({
          title: "Error",
          description: "Please mark attendance first",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from("payments")
        .update({
          status,
          debt_amount: status === "paid" ? 0 : child.amount_charged,
        })
        .eq("id", existingPayment.id);

      if (error) throw error;

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

      await fetchChildData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return `KES ${Math.abs(amount).toFixed(2)}`;
  };

  const totalPaid = payments
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const totalDebt = payments.reduce((sum, p) => sum + Number(p.debt_amount), 0);

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (!child) {
    return <div className="text-center py-8">Child not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditDialogOpen(true)}
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDeleteDialogOpen(true)}
            className="text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-2xl">{child.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-muted-foreground">Age</p>
              <p className="text-lg font-semibold">{child.age} years</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Class</p>
              <p className="text-lg font-semibold">{child.class || "Not assigned"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Admission Number</p>
              <p className="text-lg font-semibold">{child.admission_number || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Guardian Name</p>
              <p className="text-lg font-semibold">{child.guardian_name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Contact</p>
              <p className="text-lg font-semibold">{child.contact_number}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Daily Fee (KES)</p>
              <p className="text-lg font-semibold text-primary">{formatCurrency(child.amount_charged)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Admission Date</p>
              <p className="text-lg font-semibold">
                {new Date(child.admission_date).toLocaleDateString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => handleQuickAttendance("present")} className="flex-1 sm:flex-none">
              Mark Present
            </Button>
            <Button onClick={() => handleQuickAttendance("absent")} variant="secondary" className="flex-1 sm:flex-none">
              Mark Absent
            </Button>
            <Button onClick={() => handleQuickPayment("paid")} className="bg-success hover:bg-success/90 flex-1 sm:flex-none">
              Mark Paid
            </Button>
            <Button onClick={() => handleQuickPayment("unpaid")} variant="destructive" className="flex-1 sm:flex-none">
              Mark Unpaid
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="shadow-md bg-success/10 border-success/20">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Paid</p>
            <p className="text-3xl font-bold text-success">
              {formatCurrency(totalPaid)}
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-md bg-destructive/10 border-destructive/20">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Outstanding Balance</p>
            <p className="text-3xl font-bold text-destructive">
              {formatCurrency(totalDebt)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Payment History ({payments.length} records)</CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No payment history available
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Attendance</TableHead>
                    <TableHead>Note</TableHead>
                    <TableHead>Debt</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">
                        {new Date(payment.payment_date).toLocaleDateString()}
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
                      <TableCell>
                        {payment.attendance_status === "present" && (
                          <Badge variant="outline" className="border-primary text-primary">
                            Present
                          </Badge>
                        )}
                        {payment.attendance_status === "absent" && (
                          <Badge variant="outline" className="border-muted-foreground text-muted-foreground">
                            Absent
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                        {payment.note || "-"}
                      </TableCell>
                      <TableCell className="text-destructive font-semibold">
                        {payment.debt_amount > 0
                          ? formatCurrency(payment.debt_amount)
                          : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <ChildDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        child={child}
        onSuccess={fetchChildData}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {child.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove {child.name}'s record and all associated payment history. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ChildProfile;
