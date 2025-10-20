import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const childSchema = z.object({
  name: z.string().trim().min(1, { message: "Name is required" }).max(100),
  age: z.number().min(1, { message: "Age must be at least 1" }).max(17, { message: "Age must be less than 18" }),
  guardian_name: z.string().trim().min(1, { message: "Guardian name is required" }).max(100),
  contact_number: z.string().trim().min(1, { message: "Contact number is required" }).max(20),
  admission_date: z.string().min(1, { message: "Admission date is required" }),
});

interface ChildDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  child?: any;
  onSuccess: () => void;
}

const ChildDialog = ({ open, onOpenChange, child, onSuccess }: ChildDialogProps) => {
  const [formData, setFormData] = useState({
    name: "",
    age: "",
    guardian_name: "",
    contact_number: "",
    admission_date: new Date().toISOString().split("T")[0],
    class: "",
    admission_number: "",
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (child) {
      setFormData({
        name: child.name,
        age: child.age.toString(),
        guardian_name: child.guardian_name,
        contact_number: child.contact_number,
        admission_date: child.admission_date,
        class: child.class || "",
        admission_number: child.admission_number || "",
      });
    } else {
      setFormData({
        name: "",
        age: "",
        guardian_name: "",
        contact_number: "",
        admission_date: new Date().toISOString().split("T")[0],
        class: "",
        admission_number: "",
      });
    }
  }, [child, open]);

  const handleSubmit = async () => {
    try {
      const validated = childSchema.parse({
        ...formData,
        age: parseInt(formData.age),
      });

      setLoading(true);

      if (child) {
        const { error } = await supabase
          .from("children")
          .update({
            name: validated.name,
            age: validated.age,
            guardian_name: validated.guardian_name,
            contact_number: validated.contact_number,
            admission_date: validated.admission_date,
            class: formData.class || null,
            admission_number: formData.admission_number || null,
          })
          .eq("id", child.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Child record updated successfully",
        });
      } else {
        const { error } = await supabase.from("children").insert([{
          name: validated.name,
          age: validated.age,
          guardian_name: validated.guardian_name,
          contact_number: validated.contact_number,
          admission_date: validated.admission_date,
          class: formData.class || null,
          admission_number: formData.admission_number || null,
        }]);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Child added successfully",
        });
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{child ? "Edit Child" : "Add New Child"}</DialogTitle>
          <DialogDescription>
            {child ? "Update child information" : "Enter child details below"}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="John Doe"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="age">Age</Label>
            <Input
              id="age"
              type="number"
              value={formData.age}
              onChange={(e) => setFormData({ ...formData, age: e.target.value })}
              placeholder="3"
              min="1"
              max="17"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="guardian_name">Guardian Name</Label>
            <Input
              id="guardian_name"
              value={formData.guardian_name}
              onChange={(e) => setFormData({ ...formData, guardian_name: e.target.value })}
              placeholder="Jane Doe"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact_number">Contact Number</Label>
            <Input
              id="contact_number"
              value={formData.contact_number}
              onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
              placeholder="+1234567890"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admission_date">Admission Date</Label>
            <Input
              id="admission_date"
              type="date"
              value={formData.admission_date}
              onChange={(e) => setFormData({ ...formData, admission_date: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="class">Class (Optional)</Label>
            <Input
              id="class"
              value={formData.class}
              onChange={(e) => setFormData({ ...formData, class: e.target.value })}
              placeholder="e.g., Pre-K, Kindergarten"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admission_number">Admission Number (Optional)</Label>
            <Input
              id="admission_number"
              value={formData.admission_number}
              onChange={(e) => setFormData({ ...formData, admission_number: e.target.value })}
              placeholder="e.g., ADM001"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Saving..." : child ? "Update" : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ChildDialog;
