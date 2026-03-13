import { toast } from "sonner";

/**
 * Show an error toast with Close and Copy buttons.
 * - Close dismisses the toast.
 * - Copy copies the full error message to clipboard.
 */
export function toastError(message: string) {
  toast.error(message, {
    duration: Infinity,
    cancel: {
      label: "Close",
      onClick: () => {},
    },
    action: {
      label: "Copy",
      onClick: () => {
        navigator.clipboard.writeText(message);
        toast.success("Error copied to clipboard");
      },
    },
  });
}
