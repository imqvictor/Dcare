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
  age: z.string().trim().min(1, { message: "Age is required" }).max(50),
  admission_number: z.string().trim().min(1, { message: "Admission number is required" }).max(20),
  guardian_name: z.string().trim().min(1, { message: "Guardian name is required" }).max(100),
  contact_number: z.string().trim()
    .min(1, { message: "Guardian phone is required" })
    .refine((val) => {
      const digitsOnly = val.replace(/\D/g, '');
      return digitsOnly.length >= 10;
    }, { message: "no less than ten" })
    .refine((val) => {
      const digitsOnly = val.replace(/\D/g, '');
      return digitsOnly.length <= 10;
    }, { message: "no more than ten" }),
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
    name: "",
    age: "",
    admission_number: "",
    guardian_name: "",
    contact_number: "",
    admission_date: new Date().toISOString().split("T")[0],
    payment_amount: "",
  });
  const [loading, setLoading] = useState(false);
  const [contactError, setContactError] = useState("");
  const { toast } = useToast();

  const validateContact = (value: string) => {
    const digitsOnly = value.replace(/\D/g, '');
    if (digitsOnly.length < 10) {
      setContactError("no less than ten");
    } else if (digitsOnly.length > 10) {
      setContactError("no more than ten");
    } else {
      setContactError("");
    }
  };

  useEffect(() => {
    if (child) {
      setFormData({
        name: child.name || "",
        age: child.age?.toString() || "",
        admission_number: child.admission_number || "",
        guardian_name: child.guardian_name,
        contact_number: child.contact_number,
        admission_date: child.admission_date,
        payment_amount: child.payment_amount?.toString() || "",
      });
    } else {
      setFormData({
        name: "",
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
        payment_amount: parseFloat(formData.payment_amount),
      });

      setLoading(true);

      if (child) {
        const { error } = await supabase
          .from("children")
          .update({
            name: validated.name,
            age: parseInt(validated.age.replace(/\D/g, '')) || 0,
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
          name: validated.name,
          age: parseInt(validated.age.replace(/\D/g, '')) || 0,
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
      <DialogContent className="sm:max-w-2xl bg-[#0f1729] border-[#1e2a47] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="text-center flex-shrink-0">
          <DialogTitle className="text-2xl font-bold text-white">{child ? "Edit Child" : "Add New Child"}</DialogTitle>
          <DialogDescription className="text-center bg-[#1a2438] rounded-lg p-4 mt-4 text-gray-300">
            Child Registration Form
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-6 overflow-y-auto flex-1 pr-2">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-gray-200">Name*</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="John Doe"
              className="bg-[#1a2438] border-[#2d3b56] text-white placeholder:text-gray-500 focus:border-primary focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="age" className="text-gray-200">Age*</Label>
              <Input
                id="age"
                type="text"
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: e.target.value })}
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
                onChange={(e) => {
                  setFormData({ ...formData, contact_number: e.target.value });
                  validateContact(e.target.value);
                }}
                placeholder="0712345678"
                className={`bg-[#1a2438] border-[#2d3b56] text-white placeholder:text-gray-500 focus:border-primary focus:ring-primary ${contactError ? "border-red-500 focus:border-red-500" : ""}`}
              />
              {contactError && (
                <p className="text-sm text-red-500">{contactError}</p>
              )}
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
        <DialogFooter className="mt-6 flex justify-center gap-4 flex-shrink-0">
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
