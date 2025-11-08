import type { ButtonHTMLAttributes, PropsWithChildren } from "react";
import React from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
  fullWidth?: boolean;
};

const baseStyles =
  "border-none rounded-lg font-semibold transition-transform duration-150 ease-out focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black";

const variants: Record<string, string> = {
  primary: `${baseStyles} bg-[#1F4FFF] text-white hover:scale-[1.02] disabled:opacity-60 disabled:hover:scale-100`,
  secondary: `${baseStyles} bg-transparent text-[#F3F4F6] border border-[#1F4FFF] hover:bg-[#1F4FFF1A] disabled:opacity-60`,
};

export const Button: React.FC<PropsWithChildren<ButtonProps>> = ({
  children,
  variant = "primary",
  fullWidth,
  className = "",
  ...rest
}) => {
  return (
    <button
      className={`${variants[variant]} ${fullWidth ? "w-full" : ""} px-4 py-3 shadow-lg ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
};

