import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Smartphone } from "lucide-react";

interface InstallGuideModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSamsungBrowser: boolean;
}

const InstallGuideModal = ({ open, onOpenChange, isSamsungBrowser }: InstallGuideModalProps) => {
  const browserName = isSamsungBrowser ? "Samsung Internet" : "your browser";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
            Install Daycare App
          </DialogTitle>
          <DialogDescription>
            Follow these steps to install the app from {browserName}:
          </DialogDescription>
        </DialogHeader>
        <ol className="space-y-3 text-sm text-foreground">
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">1</span>
            <span>Tap the browser menu button (<strong>⋮</strong> or <strong>☰</strong>) at the top or bottom of the screen.</span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">2</span>
            <span>Select <strong>"Add to Home Screen"</strong> or <strong>"Install App"</strong>.</span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">3</span>
            <span>Confirm the installation to add the app to your home screen.</span>
          </li>
        </ol>
        <p className="text-xs text-muted-foreground mt-2">
          Once installed, you can launch Daycare directly from your home screen like a native app.
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default InstallGuideModal;
