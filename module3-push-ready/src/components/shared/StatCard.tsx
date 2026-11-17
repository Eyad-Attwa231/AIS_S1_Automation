import React from 'react';

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: string;
    isPositive?: boolean;
    label?: string;
  };
  accentColor?: string;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  accentColor = '#16324F',
  className = '',
}) => {
  return (
    <div
      className={`bg-white rounded-xl p-5 border border-[#E2E8F0] shadow-xs flex flex-col justify-between transition-all hover:shadow-sm ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-xs font-medium text-[#64748B] block mb-1">
            {title}
          </span>
          <span className="text-2xl font-bold text-[#16324F] tracking-tight">
            {value}
          </span>
        </div>
        {icon && (
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
            style={{
              backgroundColor: `${accentColor}15`,
              color: accentColor,
            }}
          >
            {icon}
          </div>
        )}
      </div>

      {(subtitle || trend) && (
        <div className="mt-3 pt-3 border-t border-[#F1F5F9] flex items-center justify-between text-xs">
          {subtitle && <span className="text-[#64748B]">{subtitle}</span>}
          {trend && (
            <span
              className={`inline-flex items-center gap-1 font-semibold ${
                trend.isPositive ? 'text-[#16A34A]' : 'text-[#DC2626]'
              }`}
            >
              <span>{trend.isPositive ? '↑' : '↓'}</span>
              <span>{trend.value}</span>
              {trend.label && (
                <span className="font-normal text-[#64748B]">
                  {trend.label}
                </span>
              )}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default StatCard;
