import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import ChildDialog from "@/components/ChildDialog";
import { useNavigate } from "react-router-dom";
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

interface Child {
  id: string;
  name: string;
  age: number;
  guardian_name: string;
  contact_number: string;
  admission_date: string;
  class: string | null;
  admission_number: string | null;
}

interface TodayAttendance {
  [childId: string]: {
    present: boolean;
    absent: boolean;
    paid: boolean;
    unpaid: boolean;
  };
}

const Children = () => {
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [childToDelete, setChildToDelete] = useState<string | null>(null);
  const [attendance, setAttendance] = useState<TodayAttendance>({});
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchChildren();
  }, []);

  const fetchChildren = async () => {
    try {
      const { data, error } = await supabase
        .from("children")
        .select("*")
        .order("admission_date", { ascending: false });

      if (error) throw error;
      setChildren(data || []);
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

  const handleEdit = (child: Child) => {
    setSelectedChild(child);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!childToDelete) return;

    try {
      const { error } = await supabase
        .from("children")
        .delete()
        .eq("id", childToDelete);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Child record deleted successfully",
      });
      fetchChildren();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setChildToDelete(null);
    }
  };

  const handleAttendance = async (childId: string, childName: string, status: "present" | "absent") => {
    const today = new Date().toISOString().split("T")[0];
    const time = new Date().toLocaleTimeString();
    
    try {
      const amount = status === "present" ? -150 : 0;
      const note = status === "present" 
        ? `Child arrived at ${time}` 
        : "Child did not report";

      const { error } = await supabase
        .from("payments")
        .insert({
          child_id: childId,
          amount: Math.abs(amount),
          payment_date: today,
          status: "unpaid",
          note,
          attendance_status: status,
          arrival_time: status === "present" ? new Date().toISOString() : null,
          debt_amount: Math.abs(amount),
        });

      if (error) throw error;

      setAttendance(prev => ({
        ...prev,
        [childId]: {
          ...prev[childId],
          [status]: true,
          present: status === "present",
          absent: status === "absent",
        }
      }));

      toast({
        title: status === "present" ? "✅ Child marked present" : "⚠️ Child marked absent",
        description: status === "present" 
          ? `${childName} — Ksh 150 pending` 
          : `${childName} did not report`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handlePayment = async (childId: string, childName: string, status: "paid" | "unpaid") => {
    const today = new Date().toISOString().split("T")[0];
    
    try {
      // Find today's payment record
      const { data: existingPayment } = await supabase
        .from("payments")
        .select("*")
        .eq("child_id", childId)
        .eq("payment_date", today)
        .single();

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
          debt_amount: status === "paid" ? 0 : 150,
        })
        .eq("id", existingPayment.id);

      if (error) throw error;

      setAttendance(prev => ({
        ...prev,
        [childId]: {
          ...prev[childId],
          paid: status === "paid",
          unpaid: status === "unpaid",
        }
      }));

      toast({
        title: status === "paid" ? "💰 Payment recorded" : "🚨 Payment not received",
        description: status === "paid"
          ? `${childName} — Ksh 150`
          : `${childName} — debt recorded`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Children</h2>
          <p className="text-muted-foreground">Manage registered children</p>
        </div>
        <Button onClick={() => { setSelectedChild(null); setDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          Add Child
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registered Children</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : children.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No children registered yet
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Child Name</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Attendance</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {children.map((child) => {
                    const childAttendance = attendance[child.id] || { present: false, absent: false, paid: false, unpaid: false };
                    const today = new Date().toLocaleDateString();
                    
                    return (
                      <TableRow key={child.id}>
                        <TableCell 
                          className="font-medium cursor-pointer hover:text-primary underline"
                          onClick={() => navigate(`/child/${child.id}`)}
                        >
                          {child.name}
                        </TableCell>
                        <TableCell>{today}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant={childAttendance.present ? "default" : "outline"}
                              className={childAttendance.present ? "bg-primary" : ""}
                              onClick={() => handleAttendance(child.id, child.name, "present")}
                              disabled={childAttendance.present || childAttendance.absent}
                            >
                              Present
                            </Button>
                            <Button
                              size="sm"
                              variant={childAttendance.absent ? "secondary" : "outline"}
                              onClick={() => handleAttendance(child.id, child.name, "absent")}
                              disabled={childAttendance.present || childAttendance.absent}
                            >
                              Absent
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className={childAttendance.paid ? "bg-success hover:bg-success/90" : ""}
                              variant={childAttendance.paid ? "default" : "outline"}
                              onClick={() => handlePayment(child.id, child.name, "paid")}
                              disabled={!childAttendance.present || childAttendance.paid || childAttendance.unpaid}
                            >
                              Paid
                            </Button>
                            <Button
                              size="sm"
                              className={childAttendance.unpaid ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground" : ""}
                              variant={childAttendance.unpaid ? "default" : "outline"}
                              onClick={() => handlePayment(child.id, child.name, "unpaid")}
                              disabled={!childAttendance.present || childAttendance.paid || childAttendance.unpaid}
                            >
                              Unpaid
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          {childAttendance.present && (
                            <span className={childAttendance.paid ? "text-success font-semibold" : "text-destructive font-semibold"}>
                              {childAttendance.paid ? "" : "-"}Ksh 150.00
                            </span>
                          )}
                          {childAttendance.absent && <span className="text-muted-foreground">Ksh 0.00</span>}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(child)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setChildToDelete(child.id);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
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

      <ChildDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        child={selectedChild}
        onSuccess={fetchChildren}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the child record and all associated payments.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Children;
