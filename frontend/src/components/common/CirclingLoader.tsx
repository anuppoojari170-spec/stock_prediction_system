import React from "react";

interface CirclingLoaderProps {
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
  label?: string;
  color?: string; // e.g. "text-[#386BFF]" or "text-[#00C087]" or "text-[#F04452]"
}

export const CirclingLoader: React.FC<CirclingLoaderProps> = ({
  size = "md",
  className = "",
  label,
  color = "text-[#386BFF]",
}) => {
  const sizeMap = {
    xs: "w-3 h-3",
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  const strokeWidthMap = {
    xs: 3,
    sm: 3,
    md: 3.5,
    lg: 4,
  };

  return (
    <div className={`inline-flex flex-col items-center justify-center ${className}`}>
      <svg
        className={`animate-spin ${color} ${sizeMap[size]}`}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth={strokeWidthMap[size]}
        />
        <path
          className="opacity-90"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      {label && (
        <span className="mt-2 text-xs font-mono text-[#94A3B8] tracking-wide select-none">
          {label}
        </span>
      )}
    </div>
  );
};

