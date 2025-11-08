import React from "react";

interface TabsProps<T extends string> {
  tabs: { id: T; label: string }[];
  active: T;
  onChange: (id: T) => void;
}

export const Tabs = <T extends string>({ tabs, active, onChange }: TabsProps<T>) => {
  return (
    <div className="flex gap-2">
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              isActive ? "bg-[#1F4FFF] text-white" : "bg-transparent text-[#F3F4F6BF] border border-[#1F4FFF33]"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};

