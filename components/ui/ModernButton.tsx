import Link from 'next/link';
import type { ReactNode } from 'react';

type Variant = 'primary' | 'secondary';

interface ModernButtonProps {
  href?: string;
  children: ReactNode;
  variant?: Variant;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

function variantClasses(variant: Variant): string {
  if (variant === 'secondary') {
    return 'border border-white/15 bg-white/5 text-white hover:border-white/30 hover:bg-white/10';
  }

  return 'bg-accent-500 text-white hover:bg-accent-400';
}

export default function ModernButton({
  href,
  children,
  variant = 'primary',
  className = '',
  type = 'button',
}: ModernButtonProps) {
  const classes = `inline-flex items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${variantClasses(variant)} ${className}`.trim();

  if (href) {
    if (href.startsWith('http') || href.startsWith('mailto:')) {
      return (
        <a className={classes} href={href} rel="noreferrer" target={href.startsWith('http') ? '_blank' : undefined}>
          {children}
        </a>
      );
    }

    return (
      <Link className={classes} href={href}>
        {children}
      </Link>
    );
  }

  return (
    <button className={classes} type={type}>
      {children}
    </button>
  );
}
