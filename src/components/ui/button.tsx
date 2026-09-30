import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-150 ease-out hover:-translate-y-px hover:shadow-sm motion-reduce:hover:translate-y-0 motion-reduce:hover:shadow-none active:scale-[0.98] active:translate-y-px active:shadow-none motion-reduce:active:scale-100 motion-reduce:active:translate-y-0 disabled:pointer-events-none disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none disabled:active:scale-100 disabled:active:translate-y-0 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive",
        outline:
          "border bg-background text-foreground shadow-xs hover:bg-background hover:text-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/30",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary",
        ghost:
          "hover:bg-transparent hover:text-inherit dark:hover:bg-transparent",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
