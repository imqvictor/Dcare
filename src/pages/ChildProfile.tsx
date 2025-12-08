import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import ChildDialog from "@/components/ChildDialog";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { calculateCurrentAge, formatAge } from "@/lib/age-utils";

interface Child {
  id: string;
  name: string;
  class: string | null;
  admission_number: string | null;
  guardian_name: string;
  contact_number: string;
  admission_date: string;
  payment_amount: number;
  age_value: number | null;
  age_unit: string | null;
  age_registered_at: string | null;
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
  const [partialPaymentAmount, setPartialPaymentAmount] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (childId) {
      fetchChildData();
    }
  }, [childId]);

  const fetchChildData = async () => {
    try {
      // Fetch child details
      const { data: childData, error: childError } = await supabase
        .from("children")
        .select("*")
        .eq("id", childId)
        .single();

      if (childError) throw childError;
      setChild(childData);

      // Fetch payment history
      const { data: paymentsData, error: paymentsError } = await supabase
        .from("payments")
        .select("*")
        .eq("child_id", childId)
        .order("payment_date", { ascending: false });

      if (paymentsError) throw paymentsError;
      setPayments(paymentsData || []);

      toast({
        title: "Success",
        description: "Child record loaded successfully",
      });
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

  // Calculate total paid as (amount charged - remaining debt) for each record
  // This correctly accounts for partial payments
  const totalPaid = payments.reduce((sum, p) => {
    const amountPaid = Number(p.amount) - Number(p.debt_amount || 0);
    return sum + Math.max(0, amountPaid);
  }, 0);

  const totalDebt = payments.reduce((sum, p) => sum + Number(p.debt_amount || 0), 0);

  const handlePartialPayment = async () => {
    const amount = parseFloat(partialPaymentAmount);
    
    if (!amount || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid payment amount",
        variant: "destructive",
      });
      return;
    }

    if (amount > totalDebt) {
      toast({
        title: "Amount exceeds remaining debt.",
        description: `Maximum payable amount is ${formatCurrency(totalDebt)}`,
        variant: "destructive",
      });
      return;
    }

    try {
      // Get payments with debt, sorted by date (oldest first)
      const paymentsWithDebt = payments
        .filter(p => Number(p.debt_amount) > 0)
        .sort((a, b) => new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime());

      let remainingAmount = amount;

      // Pay off debts starting from oldest
      for (const payment of paymentsWithDebt) {
        if (remainingAmount <= 0) break;

        const currentDebt = Number(payment.debt_amount);
        const paymentAmount = Math.min(remainingAmount, currentDebt);
        const newDebt = currentDebt - paymentAmount;

        const { error } = await supabase
          .from("payments")
          .update({ 
            debt_amount: newDebt,
            status: newDebt === 0 ? "paid" : payment.status
          })
          .eq("id", payment.id);

        if (error) throw error;

        remainingAmount -= paymentAmount;
      }

      toast({
        title: "Success",
        description: `Payment of ${formatCurrency(amount)} recorded successfully.`,
      });

      setPartialPaymentAmount("");
      fetchChildData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleClearFullBalance = async () => {
    try {
      const paymentsWithDebt = payments.filter(p => Number(p.debt_amount) > 0);
      
      if (paymentsWithDebt.length === 0) {
        toast({
          title: "No Debt",
          description: "There is no outstanding debt to clear",
        });
        return;
      }

      const { error } = await supabase
        .from("payments")
        .update({ debt_amount: 0, status: "paid" })
        .eq("child_id", childId)
        .gt("debt_amount", 0);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Outstanding balance cleared.",
      });

      fetchChildData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    try {
      // Delete all payment records first
      const { error: paymentsError } = await supabase
        .from("payments")
        .delete()
        .eq("child_id", childId);

      if (paymentsError) throw paymentsError;

      // Delete the child record
      const { error: childError } = await supabase
        .from("children")
        .delete()
        .eq("id", childId);

      if (childError) throw childError;

      toast({
        title: "Success",
        description: "Child and all records deleted successfully",
      });

      // Navigate back to children list
      navigate("/children");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (!child) {
    return <div className="text-center py-8">Child not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Child Information</CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditDialogOpen(true)}
            >
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="font-semibold">{child.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Admission Number</p>
              <p className="font-semibold">{child.admission_number || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Guardian Name</p>
              <p className="font-semibold">{child.guardian_name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Contact</p>
              <p className="font-semibold">{child.contact_number}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Admission Date</p>
              <p className="font-semibold">
                {new Date(child.admission_date).toLocaleDateString()}
              </p>
            </div>
            {child.age_value && child.age_unit && child.age_registered_at && (
              <div>
                <p className="text-sm text-muted-foreground">Age</p>
                <p className="font-semibold">
                  {formatAge(calculateCurrentAge(
                    child.age_value,
                    child.age_unit as 'months' | 'years',
                    new Date(child.age_registered_at)
                  ))}
                </p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">Daily Payment Amount</p>
              <p className="font-semibold text-primary">
                {formatCurrency(child.payment_amount)}
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4 mt-6 pt-6 border-t">
            <Card className="bg-success/10">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Total Paid</p>
                <p className="text-2xl font-bold text-success">
                  {formatCurrency(totalPaid)}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-destructive/10">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Total Debt</p>
                <p className="text-2xl font-bold text-destructive">
                  {formatCurrency(totalDebt)}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-muted/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Pay Debt</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2 items-center">
                  <Button 
                    onClick={handlePartialPayment}
                    disabled={totalDebt === 0 || !partialPaymentAmount}
                    className="shrink-0"
                    size="sm"
                  >
                    Pay
                  </Button>
                  <Input
                    type="number"
                    placeholder="Amount Paid"
                    value={partialPaymentAmount}
                    onChange={(e) => setPartialPaymentAmount(e.target.value)}
                    disabled={totalDebt === 0}
                    className="bg-background"
                    min="0"
                    step="0.01"
                  />
                </div>
                
                <Button 
                  onClick={handleClearFullBalance}
                  disabled={totalDebt === 0}
                  variant="outline"
                  className="w-full"
                  size="sm"
                >
                  Clear Full Balance
                </Button>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
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
                    <TableHead>Note</TableHead>
                    <TableHead>Debt</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
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
                      <TableCell className="text-muted-foreground">
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
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {child?.name} and all their payment records.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ChildProfile;
