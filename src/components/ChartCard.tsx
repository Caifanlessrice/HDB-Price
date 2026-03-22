import type { ReactNode } from "react";

interface ChartCardProps {
  title: string;
  icon: ReactNode;
  badge?: string;
  className?: string;
  children: ReactNode;
}

export function ChartCard({
  title,
  icon,
  badge,
  className = "",
  children,
}: ChartCardProps) {
  return (
    <div className={`card ${className}`}>
      <div className="card-header">
        <h3>
          {icon} {title}
        </h3>
        {badge && <span className="card-badge">{badge}</span>}
      </div>
      <div className="chart-wrap">{children}</div>
    </div>
  );
}
