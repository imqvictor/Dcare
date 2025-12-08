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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { normalizeAgeUnit } from "@/lib/age-utils";

const childSchema = z.object({
  name: z.string().trim().min(1, { message: "Name is required" }).max(100),
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
  age_value: z.number().min(1, { message: "Age is required" }).optional(),
  age_unit: z.enum(['months', 'years']).optional(),
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
    admission_number: "",
    guardian_name: "",
    contact_number: "",
    admission_date: new Date().toISOString().split("T")[0],
    payment_amount: "",
    age_value: "",
    age_unit: "years" as string,
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
        admission_number: child.admission_number || "",
        guardian_name: child.guardian_name,
        contact_number: child.contact_number,
        admission_date: child.admission_date,
        payment_amount: child.payment_amount?.toString() || "",
        age_value: child.age_value?.toString() || "",
        age_unit: child.age_unit || "years",
      });
    } else {
      setFormData({
        name: "",
        admission_number: "",
        guardian_name: "",
        contact_number: "",
        admission_date: new Date().toISOString().split("T")[0],
        payment_amount: "",
        age_value: "",
        age_unit: "years",
      });
    }
  }, [child, open]);

  const handleSubmit = async () => {
    try {
      const ageValue = formData.age_value ? parseInt(formData.age_value) : undefined;
      const normalizedAgeUnit = normalizeAgeUnit(formData.age_unit);
      
      const validated = childSchema.parse({
        ...formData,
        payment_amount: parseFloat(formData.payment_amount),
        age_value: ageValue,
        age_unit: normalizedAgeUnit,
      });

      setLoading(true);

      const childData: any = {
        name: validated.name,
        guardian_name: validated.guardian_name,
        contact_number: validated.contact_number,
        admission_date: validated.admission_date,
        admission_number: validated.admission_number,
        payment_amount: validated.payment_amount,
      };

      // Only include age fields if age was provided
      if (ageValue) {
        childData.age_value = ageValue;
        childData.age_unit = normalizedAgeUnit;
        // Only set registration date on new entries or if age changed
        if (!child || child.age_value !== ageValue || child.age_unit !== normalizedAgeUnit) {
          childData.age_registered_at = new Date().toISOString();
        }
      }

      if (child) {
        const { error } = await supabase
          .from("children")
          .update(childData)
          .eq("id", child.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Child record updated successfully",
        });
      } else {
        const { error } = await supabase.from("children").insert([childData]);

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
              <Label htmlFor="admission_number" className="text-gray-200">Admission Number*</Label>
              <Input
                id="admission_number"
                value={formData.admission_number}
                onChange={(e) => setFormData({ ...formData, admission_number: e.target.value })}
                placeholder="ADM001"
                className="bg-[#1a2438] border-[#2d3b56] text-white placeholder:text-gray-500 focus:border-primary focus:ring-primary"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="age" className="text-gray-200">Age</Label>
              <div className="flex gap-2">
                <Input
                  id="age"
                  type="number"
                  min="1"
                  value={formData.age_value}
                  onChange={(e) => setFormData({ ...formData, age_value: e.target.value })}
                  placeholder="e.g. 3"
                  className="bg-[#1a2438] border-[#2d3b56] text-white placeholder:text-gray-500 focus:border-primary focus:ring-primary flex-1"
                />
                <Select
                  value={formData.age_unit}
                  onValueChange={(value) => setFormData({ ...formData, age_unit: value })}
                >
                  <SelectTrigger className="w-[120px] bg-[#1a2438] border-[#2d3b56] text-white">
                    <SelectValue placeholder="Unit" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a2438] border-[#2d3b56]">
                    <SelectItem value="month" className="text-white hover:bg-[#2d3b56]">month</SelectItem>
                    <SelectItem value="months" className="text-white hover:bg-[#2d3b56]">months</SelectItem>
                    <SelectItem value="year" className="text-white hover:bg-[#2d3b56]">year</SelectItem>
                    <SelectItem value="years" className="text-white hover:bg-[#2d3b56]">years</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
