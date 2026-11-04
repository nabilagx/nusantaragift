
import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "outline";

interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  fullWidth?: boolean;
}

export default function Button({
  children,
  variant = "primary",
  fullWidth = false,
  className = "",
  ...props
}: ButtonProps) {
  const baseStyles =
    "inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 font-semibold transition-all duration-200 ease-in-out hover:-translate-y-0.5 active:translate-y-0 active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold/50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0";

  const variants: Record<ButtonVariant, string> = {
    primary:
      "bg-brand text-white shadow-md shadow-brand/20 hover:bg-[#762B22] hover:shadow-lg active:bg-[#5F211B]",
    secondary:
      "bg-gold text-[#222222] shadow-md shadow-gold/30 hover:brightness-95 hover:shadow-lg active:brightness-90",
    outline:
      "border-2 border-brand bg-transparent text-brand hover:bg-brand hover:text-white active:bg-[#762B22] active:text-white",
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${
        fullWidth ? "w-full" : ""
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
