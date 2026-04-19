import { cva, type VariantProps } from "class-variance-authority"

/**
 * Premium redesign — pill CTAs with ink primary.
 *   - default / ink : near-black CTA (neobank signature)
 *   - brand         : mint green button with ink text
 *   - ghost-premium : surface + border pill for secondary actions
 * Existing variant keys (default, destructive, outline, secondary, ghost, link)
 * remain callable — no breaking change for current call sites.
 */
export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:translate-y-px",
  {
    variants: {
      variant: {
        default: "bg-ink text-white hover:bg-black hover:shadow-soft-dark",
        ink: "bg-ink text-white hover:bg-black hover:shadow-soft-dark",
        brand:
          "bg-brand text-ink hover:bg-brand-dark hover:text-white hover:shadow-soft-brand",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90",
        outline:
          "border border-border bg-surface text-ink hover:border-ink hover:bg-surface-2",
        secondary:
          "bg-surface-2 text-ink hover:bg-surface-2/80",
        ghost:
          "text-ink hover:bg-surface-2",
        "ghost-premium":
          "border border-border bg-surface text-ink hover:bg-surface-2",
        link: "text-brand-deep underline-offset-4 hover:underline rounded-none",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3.5 text-[13px]",
        lg: "h-12 px-6 text-[15px] font-bold",
        xl: "h-14 px-8 text-base font-bold",
        icon: "h-11 w-11 rounded-[14px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export type ButtonVariantsProps = VariantProps<typeof buttonVariants>
