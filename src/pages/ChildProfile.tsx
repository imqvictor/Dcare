import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";
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
  age: number;
  class: string | null;
  admission_number: string | null;
  guardian_name: string;
  contact_number: string;
  admission_date: string;
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

  const totalPaid = payments
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const totalDebt = payments.reduce((sum, p) => sum + Number(p.debt_amount), 0);

  const handlePayDebt = async () => {
    try {
      // Get all payments with debt
      const paymentsWithDebt = payments.filter(p => Number(p.debt_amount) > 0);
      
      if (paymentsWithDebt.length === 0) {
        toast({
          title: "No Debt",
          description: "There is no outstanding debt to clear",
        });
        return;
      }

      // Update all payments to clear debt
      const { error } = await supabase
        .from("payments")
        .update({ debt_amount: 0, status: "paid" })
        .eq("child_id", childId)
        .gt("debt_amount", 0);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Cleared debt of ${formatCurrency(totalDebt)}`,
      });

      // Refresh data
      fetchChildData();
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
        <CardHeader>
          <CardTitle>Child Information</CardTitle>
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
              <p className="text-sm text-muted-foreground">Age</p>
              <p className="font-semibold">{child.age} years</p>
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
            <Card className="bg-primary/10">
              <CardContent className="pt-6 flex flex-col items-center justify-center gap-2">
                <p className="text-sm text-muted-foreground">Clear Debt</p>
                <Button 
                  onClick={handlePayDebt}
                  disabled={totalDebt === 0}
                  className="w-full"
                >
                  Pay Debt
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
    </div>
  );
};

export default ChildProfile;
