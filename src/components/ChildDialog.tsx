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
  first_name: z.string().trim().min(1, { message: "First name is required" }).max(50),
  last_name: z.string().trim().min(1, { message: "Last name is required" }).max(50),
  age: z.number().min(0, { message: "Age must be 0 or greater" }).max(18, { message: "Age must be 18 or less" }),
  admission_number: z.string().trim().min(1, { message: "Admission number is required" }).max(20),
  guardian_name: z.string().trim().min(1, { message: "Guardian name is required" }).max(100),
  contact_number: z.string().trim().min(1, { message: "Guardian phone is required" }).max(20),
  admission_date: z.string().min(1, { message: "Admission date is required" }),
  payment_amount: z.number().min(0, { message: "Payment amount must be 0 or greater" }),
});

interface ChildDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  child?: any;
  onSuccess: () => void;
}

const ChildDialog = ({ open, onOpenChange, child, onSuccess }: ChildDialogProps) => {
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    age: "",
    admission_number: "",
    guardian_name: "",
    contact_number: "",
    admission_date: new Date().toISOString().split("T")[0],
    payment_amount: "",
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (child) {
      const nameParts = child.name.split(" ");
      setFormData({
        first_name: nameParts[0] || "",
        last_name: nameParts.slice(1).join(" ") || "",
        age: child.age?.toString() || "",
        admission_number: child.admission_number || "",
        guardian_name: child.guardian_name,
        contact_number: child.contact_number,
        admission_date: child.admission_date,
        payment_amount: child.payment_amount?.toString() || "",
      });
    } else {
      setFormData({
        first_name: "",
        last_name: "",
        age: "",
        admission_number: "",
        guardian_name: "",
        contact_number: "",
        admission_date: new Date().toISOString().split("T")[0],
        payment_amount: "",
      });
    }
  }, [child, open]);

  const handleSubmit = async () => {
    try {
      const validated = childSchema.parse({
        ...formData,
        age: parseInt(formData.age),
        payment_amount: parseFloat(formData.payment_amount),
      });

      setLoading(true);

      const fullName = `${validated.first_name} ${validated.last_name}`.trim();

      if (child) {
        const { error } = await supabase
          .from("children")
          .update({
            name: fullName,
            age: validated.age,
            guardian_name: validated.guardian_name,
            contact_number: validated.contact_number,
            admission_date: validated.admission_date,
            admission_number: validated.admission_number,
            payment_amount: validated.payment_amount,
          })
          .eq("id", child.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Child record updated successfully",
        });
      } else {
        const { error } = await supabase.from("children").insert([{
          name: fullName,
          age: validated.age,
          guardian_name: validated.guardian_name,
          contact_number: validated.contact_number,
          admission_date: validated.admission_date,
          admission_number: validated.admission_number,
          payment_amount: validated.payment_amount,
        }]);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Child registered successfully",
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
      <DialogContent className="sm:max-w-2xl bg-[#0f1729] border-[#1e2a47]">
        <DialogHeader className="text-center">
          <DialogTitle className="text-2xl font-bold text-white">{child ? "Edit Child" : "Add New Child"}</DialogTitle>
          <DialogDescription className="text-center bg-[#1a2438] rounded-lg p-4 mt-4 text-gray-300">
            Child Registration Form
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name" className="text-gray-200">First Name*</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                placeholder="John"
                className="bg-[#1a2438] border-[#2d3b56] text-white placeholder:text-gray-500 focus:border-primary focus:ring-primary"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name" className="text-gray-200">Last Name*</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                placeholder="Doe"
                className="bg-[#1a2438] border-[#2d3b56] text-white placeholder:text-gray-500 focus:border-primary focus:ring-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="age" className="text-gray-200">Age*</Label>
              <Input
                id="age"
                type="number"
                min="0"
                max="18"
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                placeholder="5"
                className="bg-[#1a2438] border-[#2d3b56] text-white placeholder:text-gray-500 focus:border-primary focus:ring-primary"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admission_number" className="text-gray-200">Admission Number*</Label>
              <Input
                id="admission_number"
                value={formData.admission_number}
                onChange={(e) => setFormData({ ...formData, admission_number: e.target.value })}
                placeholder="ADM001"
                className="bg-[#1a2438] border-[#2d3b56] text-white placeholder:text-gray-500 focus:border-primary focus:ring-primary"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="admission_date" className="text-gray-200">Admission Date*</Label>
            <Input
              id="admission_date"
              type="date"
              value={formData.admission_date}
              onChange={(e) => setFormData({ ...formData, admission_date: e.target.value })}
              className="bg-[#1a2438] border-[#2d3b56] text-white placeholder:text-gray-500 focus:border-primary focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="guardian_name" className="text-gray-200">Guardian Name*</Label>
              <Input
                id="guardian_name"
                value={formData.guardian_name}
                onChange={(e) => setFormData({ ...formData, guardian_name: e.target.value })}
                placeholder="Jane Doe"
                className="bg-[#1a2438] border-[#2d3b56] text-white placeholder:text-gray-500 focus:border-primary focus:ring-primary"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_number" className="text-gray-200">Guardian Phone*</Label>
              <Input
                id="contact_number"
                value={formData.contact_number}
                onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
                placeholder="+254712345678"
                className="bg-[#1a2438] border-[#2d3b56] text-white placeholder:text-gray-500 focus:border-primary focus:ring-primary"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment_amount" className="text-gray-200">Payment Amount (KSH)*</Label>
            <Input
              id="payment_amount"
              type="number"
              step="0.01"
              min="0"
              value={formData.payment_amount}
              onChange={(e) => setFormData({ ...formData, payment_amount: e.target.value })}
              placeholder="500.00"
              className="bg-[#1a2438] border-[#2d3b56] text-white placeholder:text-gray-500 focus:border-primary focus:ring-primary"
            />
          </div>
        </div>
        <DialogFooter className="mt-6 flex justify-center gap-4">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="bg-transparent border-[#2d3b56] text-gray-300 hover:bg-[#1a2438] hover:text-white"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={loading}
            className="bg-primary hover:bg-primary/90 text-white px-8"
          >
            {loading ? "Saving..." : child ? "Update" : "Register"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ChildDialog;
