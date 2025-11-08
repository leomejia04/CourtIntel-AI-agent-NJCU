import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
}

export const Input: React.FC<InputProps> = ({ label, hint, ...rest }) => {
  return (
    <label className="flex flex-col gap-2 text-sm">
      <span className="text-[#F3F4F6BF] font-medium">{label}</span>
      <input
        className="rounded-lg border border-[#1F4FFF33] bg-[#0A2342] px-3 py-2 text-[#F3F4F6] shadow-inner focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F4FFF]"
        {...rest}
      />
      {hint && <span className="text-xs text-[#AEB3C2]">{hint}</span>}
    </label>
  );
};

