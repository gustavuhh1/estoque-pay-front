import * as React from "react"
import { cn } from "@/lib/utils"

function Table({ className, ...props }: React.ComponentProps<"table">) {
  return <div className="w-full overflow-x-auto"><table data-slot="table" className={cn("w-full caption-bottom text-sm", className)} {...props} /></div>
}
function TableHeader({ className, ...props }: React.ComponentProps<"thead">) { return <thead className={cn("border-b border-[var(--color-border)]", className)} {...props} /> }
function TableBody({ className, ...props }: React.ComponentProps<"tbody">) { return <tbody className={cn("divide-y divide-[var(--color-border)]", className)} {...props} /> }
function TableRow({ className, ...props }: React.ComponentProps<"tr">) { return <tr className={cn("transition-colors hover:bg-[var(--color-paper)]/70", className)} {...props} /> }
function TableHead({ className, ...props }: React.ComponentProps<"th">) { return <th className={cn("px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-slate)]", className)} {...props} /> }
function TableCell({ className, ...props }: React.ComponentProps<"td">) { return <td className={cn("px-4 py-3.5 align-middle text-sm text-[var(--color-ink)]", className)} {...props} /> }

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell }
