import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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
  amount_charged: number;
}

const Children = () => {
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [childToDelete, setChildToDelete] = useState<Child | null>(null);
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
        .eq("id", childToDelete.id);

      if (error) throw error;

      toast({
        title: "Child deleted",
        description: `${childToDelete.name}'s record and all associated data have been permanently removed`,
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

  const formatCurrency = (amount: number) => {
    return `KES ${amount.toFixed(2)}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Children</h2>
          <p className="text-muted-foreground">Manage registered children and their information</p>
        </div>
        <Button onClick={() => { setSelectedChild(null); setDialogOpen(true); }} className="shadow-md">
          <Plus className="mr-2 h-4 w-4" />
          Add Child
        </Button>
      </div>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Registered Children ({children.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : children.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg mb-2">No children registered yet</p>
              <p className="text-sm">Click "Add Child" to register your first child</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Age</TableHead>
                    <TableHead>Guardian</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Daily Fee</TableHead>
                    <TableHead>Admission Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {children.map((child) => (
                    <TableRow key={child.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell
                        className="font-medium cursor-pointer hover:text-primary underline"
                        onClick={() => navigate(`/child/${child.id}`)}
                      >
                        {child.name}
                        {child.class && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            ({child.class})
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{child.age} years</TableCell>
                      <TableCell>{child.guardian_name}</TableCell>
                      <TableCell className="text-sm">{child.contact_number}</TableCell>
                      <TableCell className="font-semibold text-primary">
                        {formatCurrency(child.amount_charged)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(child.admission_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(child)}
                            className="hover:bg-accent"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setChildToDelete(child);
                              setDeleteDialogOpen(true);
                            }}
                            className="hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
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
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        child={selectedChild}
        onSuccess={fetchChildren}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {childToDelete?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove {childToDelete?.name}'s record and all associated payment history. This action cannot be undone.
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

export default Children;
