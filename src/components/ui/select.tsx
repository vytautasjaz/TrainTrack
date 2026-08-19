import { cn } from "@/lib/utils";
import * as React from "react";

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, ...props }, ref) => {
    return (
      <select ref={ref} className={cn("input-field", className)} {...props} />
    );
  },
);
Select.displayName = "Select";
