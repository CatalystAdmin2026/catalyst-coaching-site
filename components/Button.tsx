import Link from "next/link";
import type { ComponentPropsWithoutRef } from "react";

type Variant = "gold" | "outline";
type Size = "sm" | "md" | "lg";

type ButtonProps = {
  href?: string;
  variant?: Variant;
  size?: Size;
  children: React.ReactNode;
  className?: string;
} & Omit<ComponentPropsWithoutRef<"button">, "className">;

const variants: Record<Variant, string> = {
  gold: "bg-[#C9A24D] text-black hover:bg-[#D4B56A]",
  outline:
    "border border-[#C9A24D] text-white hover:bg-[#C9A24D] hover:text-black",
};

const sizes: Record<Size, string> = {
  sm: "px-5 py-2 text-xs",
  md: "px-7 py-3 text-sm",
  lg: "px-10 py-4 text-sm",
};

const base =
  "inline-block font-semibold tracking-wide transition-colors duration-200 text-center leading-none";

export default function Button({
  href,
  variant = "gold",
  size = "md",
  children,
  className = "",
  ...props
}: ButtonProps) {
  const classes = `${base} ${variants[variant]} ${sizes[size]} ${className}`;

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}
