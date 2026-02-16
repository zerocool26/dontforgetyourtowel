'use client';

import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';

type Animation = 'slide-up' | 'slide-left' | 'slide-right';

interface RevealOnScrollProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  animation?: Animation;
}

function initialTransform(animation: Animation): string {
  if (animation === 'slide-left') {
    return 'translateX(16px)';
  }
  if (animation === 'slide-right') {
    return 'translateX(-16px)';
  }
  return 'translateY(16px)';
}

export default function RevealOnScroll({
  children,
  className = '',
  delay = 0,
  animation = 'slide-up',
}: RevealOnScrollProps) {
  const [revealed, setRevealed] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) {
      return;
    }

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0]?.isIntersecting) {
          setRevealed(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className={className}
      ref={ref}
      style={{
        opacity: revealed ? 1 : 0,
        transform: revealed ? 'translate3d(0,0,0)' : initialTransform(animation),
        transition: `opacity 500ms ease ${delay}ms, transform 500ms ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}
