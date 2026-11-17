import React from 'react';
import { Loader2 } from 'lucide-react';

export interface LoadingStateProps {
  message?: string;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading data...',
  className = '',
}) => {
  return (
    <div
      className={`py-12 px-4 flex flex-col items-center justify-center text-center gap-3 ${className}`}
    >
      <Loader2 className="w-8 h-8 text-[#267C83] animate-spin" />
      <p className="text-sm font-medium text-[#64748B]">{message}</p>
    </div>
  );
};

export default LoadingState;
