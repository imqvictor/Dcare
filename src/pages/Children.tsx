import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import ChildDialog from "@/components/ChildDialog";
import { useNavigate } from "react-router-dom";
import { useMidnightReset } from "@/hooks/use-midnight-reset";
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
  guardian_name: string;
  contact_number: string;
  admission_date: string;
  class: string | null;
  admission_number: string | null;
  payment_amount: number;
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
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "paid" | "unpaid">("all");
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleMidnightReset = useCallback(() => {
    console.log("Midnight reset triggered - refreshing attendance data");
    setAttendance({});
    fetchTodaysAttendance();
  }, []);

  // Use the midnight reset hook for precise reset at 00:00
  useMidnightReset(handleMidnightReset);

  useEffect(() => {
    fetchChildren();
    fetchTodaysAttendance();
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

  const fetchTodaysAttendance = async () => {
    const today = new Date().toISOString().split("T")[0];
    
    try {
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("payment_date", today);

      if (error) throw error;

      const attendanceMap: TodayAttendance = {};
      data?.forEach((payment) => {
        attendanceMap[payment.child_id] = {
          present: payment.attendance_status === "present",
          absent: payment.attendance_status === "absent",
          paid: payment.status === "paid",
          unpaid: payment.status === "unpaid", // Only true when explicitly set to unpaid
        };
      });

      setAttendance(attendanceMap);
    } catch (error: any) {
      console.error("Error fetching today's attendance:", error);
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

  const handleAttendance = async (childId: string, childName: string, status: "present" | "absent", paymentAmount: number) => {
    const today = new Date().toISOString().split("T")[0];
    const time = new Date().toLocaleTimeString();
    
    try {
      // Check if a record already exists for today
      const { data: existingRecord } = await supabase
        .from("payments")
        .select("*")
        .eq("child_id", childId)
        .eq("payment_date", today)
        .maybeSingle();

      const amount = status === "present" ? paymentAmount : 0;
      const note = status === "present" 
        ? `Child arrived at ${time}` 
        : "Child did not report";

      if (existingRecord) {
        // Update existing record
        const { error } = await supabase
          .from("payments")
          .update({
            attendance_status: status,
            arrival_time: status === "present" ? new Date().toISOString() : null,
            note,
          })
          .eq("id", existingRecord.id);

        if (error) throw error;
      } else {
        // Create new record with pending status
        const { error } = await supabase
          .from("payments")
          .insert({
            child_id: childId,
            amount: Math.abs(amount),
            payment_date: today,
            status: "pending",
            note,
            attendance_status: status,
            arrival_time: status === "present" ? new Date().toISOString() : null,
            debt_amount: Math.abs(amount),
          });

        if (error) throw error;
      }

      setAttendance(prev => ({
        ...prev,
        [childId]: {
          present: status === "present",
          absent: status === "absent",
          paid: existingRecord?.status === "paid" || false,
          unpaid: existingRecord?.status === "unpaid" || false,
        }
      }));

      toast({
        title: status === "present" ? "✅ Child marked present" : "⚠️ Child marked absent",
        description: status === "present" 
          ? `${childName} — Ksh ${paymentAmount.toFixed(2)} pending` 
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

  const handlePayment = async (childId: string, childName: string, status: "paid" | "unpaid", paymentAmount: number) => {
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
          debt_amount: status === "paid" ? 0 : paymentAmount,
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
          ? `${childName} — Ksh ${paymentAmount.toFixed(2)}`
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

  const isChildDayComplete = (childId: string) => {
    const childAttendance = attendance[childId] || { present: false, absent: false, paid: false, unpaid: false };
    // Day is complete if: absent was marked OR (present was marked AND payment status was determined)
    return childAttendance.absent || (childAttendance.present && (childAttendance.paid || childAttendance.unpaid));
  };

  const isAbsentButtonDisabled = (childId: string) => {
    const childAttendance = attendance[childId] || { present: false, absent: false, paid: false, unpaid: false };
    // Disable Absent if Present is already marked or day is complete
    return childAttendance.present || isChildDayComplete(childId);
  };

  const filteredChildren = children.filter((child) => {
    const childAttendance = attendance[child.id] || { present: false, absent: false, paid: false, unpaid: false };
    const matchesSearch = child.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         child.guardian_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === "all" ||
                         (filterStatus === "paid" && childAttendance.paid) ||
                         (filterStatus === "unpaid" && childAttendance.unpaid);
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Children</h2>
          <p className="text-muted-foreground">Manage registered children</p>
        </div>
        <Button 
          onClick={() => { setSelectedChild(null); setDialogOpen(true); }}
          className="rounded-full"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Child
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or guardian..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={filterStatus === "all" ? "default" : "outline"}
            onClick={() => setFilterStatus("all")}
            size="sm"
          >
            All
          </Button>
          <Button
            variant={filterStatus === "paid" ? "default" : "outline"}
            onClick={() => setFilterStatus("paid")}
            size="sm"
          >
            Paid
          </Button>
          <Button
            variant={filterStatus === "unpaid" ? "default" : "outline"}
            onClick={() => setFilterStatus("unpaid")}
            size="sm"
          >
            Unpaid
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">Loading...</div>
      ) : filteredChildren.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No children found
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredChildren.map((child) => {
            const childAttendance = attendance[child.id] || { present: false, absent: false, paid: false, unpaid: false };
            
            return (
              <Card 
                key={child.id} 
                className="bg-card hover:shadow-lg transition-all duration-300 cursor-pointer"
                onClick={() => navigate(`/child/${child.id}`)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-2xl font-bold">{child.name}</h3>
                    <Badge 
                      variant={childAttendance.paid ? "default" : "secondary"}
                      className={childAttendance.paid ? "bg-primary" : "bg-muted"}
                    >
                      {childAttendance.paid ? "Paid" : "Unpaid"}
                    </Badge>
                  </div>

                  <div className="mb-6">
                    <p className="text-sm text-muted-foreground mb-1">Payment Amount</p>
                    <p className="text-xl font-semibold">
                      <span className={childAttendance.paid ? "text-primary" : "text-foreground"}>
                        Ksh {child.payment_amount.toFixed(2)}
                      </span>
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3" onClick={(e) => e.stopPropagation()}>
                    <Button
                      size="sm"
                      variant={childAttendance.present ? "default" : "outline"}
                      className={`transition-all duration-300 ${
                        childAttendance.present ? "bg-btn-present hover:bg-btn-present/90 text-btn-present-foreground scale-105" : "hover:scale-105"
                      } ${isChildDayComplete(child.id) ? "opacity-50 cursor-not-allowed" : ""}`}
                      onClick={() => handleAttendance(child.id, child.name, "present", child.payment_amount)}
                      disabled={isChildDayComplete(child.id)}
                    >
                      Present
                    </Button>
                    <Button
                      size="sm"
                      variant={childAttendance.absent ? "default" : "outline"}
                      className={`transition-all duration-300 ${
                        childAttendance.absent ? "bg-btn-absent hover:bg-btn-absent/90 text-btn-absent-foreground scale-105" : "hover:scale-105"
                      } ${isAbsentButtonDisabled(child.id) ? "opacity-50 cursor-not-allowed" : ""}`}
                      onClick={() => handleAttendance(child.id, child.name, "absent", child.payment_amount)}
                      disabled={isAbsentButtonDisabled(child.id)}
                    >
                      Absent
                    </Button>
                    <Button
                      size="sm"
                      variant={childAttendance.paid ? "default" : "outline"}
                      className={`transition-all duration-300 ${
                        childAttendance.paid ? "bg-btn-paid hover:bg-btn-paid/90 text-btn-paid-foreground scale-105" : "hover:scale-105"
                      } ${!childAttendance.present || isChildDayComplete(child.id) ? "opacity-50 cursor-not-allowed" : ""}`}
                      onClick={() => handlePayment(child.id, child.name, "paid", child.payment_amount)}
                      disabled={!childAttendance.present || isChildDayComplete(child.id)}
                    >
                      Paid
                    </Button>
                    <Button
                      size="sm"
                      variant={childAttendance.unpaid ? "default" : "outline"}
                      className={`transition-all duration-300 ${
                        childAttendance.unpaid ? "bg-btn-unpaid hover:bg-btn-unpaid/90 text-btn-unpaid-foreground scale-105" : "hover:scale-105"
                      } ${!childAttendance.present || isChildDayComplete(child.id) ? "opacity-50 cursor-not-allowed" : ""}`}
                      onClick={() => handlePayment(child.id, child.name, "unpaid", child.payment_amount)}
                      disabled={!childAttendance.present || isChildDayComplete(child.id)}
                    >
                      Unpaid
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

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
