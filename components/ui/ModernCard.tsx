import type { ComponentChildren } from 'preact';

interface ModernCardProps {
  children: ComponentChildren;
  className?: string;
  variant?: 'minimal';
}

export default function ModernCard({ children, className = '' }: ModernCardProps) {
  return <div className={`rounded-2xl ${className}`.trim()}>{children}</div>;
}
