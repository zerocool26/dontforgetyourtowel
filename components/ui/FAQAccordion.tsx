'use client';

import { useState } from 'react';

interface FAQItem {
  title: string;
  content: string;
}

interface FAQAccordionProps {
  items: FAQItem[];
}

export default function FAQAccordion({ items }: FAQAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="grid gap-4">
      {items.map((item, index) => {
        const isOpen = openIndex === index;
        return (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6" key={item.title}>
            <button
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-4 text-left text-sm font-semibold text-white"
              onClick={() => setOpenIndex(prev => (prev === index ? null : index))}
              type="button"
            >
              <span>{item.title}</span>
              <span className="text-zinc-400">{isOpen ? '−' : '+'}</span>
            </button>
            {isOpen ? <p className="mt-3 text-sm leading-relaxed text-zinc-300">{item.content}</p> : null}
          </div>
        );
      })}
    </div>
  );
}
