import { useState } from 'preact/hooks';

export interface FAQItem {
  title: string;
  content: string;
}

interface FAQAccordionProps {
  items: FAQItem[];
}

export default function FAQAccordion({ items }: FAQAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div class="grid gap-4">
      {items.map((item, index) => {
        const isOpen = openIndex === index;
        const panelId = `faq-panel-${index}`;
        const buttonId = `faq-button-${index}`;

        return (
          <div
            class="tone-border tone-surface overflow-hidden rounded-2xl border"
            key={item.title}
          >
            <button
              id={buttonId}
              type="button"
              class="tone-title flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400/60 [@media(hover:hover)]:hover:bg-white/5"
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() =>
                setOpenIndex(prev => (prev === index ? null : index))
              }
            >
              <span>{item.title}</span>
              <span
                class={`inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-lg transition-transform ${
                  isOpen ? 'rotate-45 text-accent-300' : 'text-zinc-400'
                }`}
                aria-hidden="true"
              >
                +
              </span>
            </button>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              class={`grid transition-[grid-template-rows] duration-300 motion-reduce:transition-none ${
                isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
              }`}
            >
              <div class="overflow-hidden">
                <p class="tone-body px-5 pb-5 text-sm leading-relaxed">
                  {item.content}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
