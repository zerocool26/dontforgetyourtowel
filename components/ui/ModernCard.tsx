import type { ReactNode } from 'react';

interface ModernCardProps {
  children: ReactNode;
  className?: string;
  variant?: 'minimal';
}

export default function ModernCard({ children, className = '' }: ModernCardProps) {
  return <div className={`rounded-2xl ${className}`.trim()}>{children}</div>;
}
