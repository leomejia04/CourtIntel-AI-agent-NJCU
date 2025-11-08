import React, { PropsWithChildren } from "react";

interface CardProps {
  title?: string;
  actions?: React.ReactNode;
  padding?: "md" | "lg";
  className?: string;
}

const paddingMap = {
  md: "p-5",
  lg: "p-7",
};

export const Card: React.FC<PropsWithChildren<CardProps>> = ({
  title,
  actions,
  padding = "lg",
  className = "",
  children,
}) => {
  return (
    <section
      className={`rounded-2xl bg-[#000000] bg-opacity-80 shadow-xl backdrop-blur-md text-[#F3F4F6] ${paddingMap[padding]} flex flex-col gap-4 ${className}`}
    >
      {(title || actions) && (
        <header className="flex items-center justify-between gap-4 border-b border-[#1F4FFF1A] pb-3">
          {title && <h2 className="text-lg font-semibold">{title}</h2>}
          {actions}
        </header>
      )}
      <div className="flex-1">{children}</div>
    </section>
  );
};

