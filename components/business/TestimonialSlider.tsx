import ModernCard from '../ui/ModernCard';

interface Testimonial {
  quote: string;
  name: string;
  role?: string;
  company?: string;
  rating?: number;
}

interface TestimonialSliderProps {
  testimonials: Testimonial[];
}

export default function TestimonialSlider({ testimonials }: TestimonialSliderProps) {
  return (
    <div className="relative">
      <div
        aria-label="Testimonials"
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="region"
        tabIndex={0}
      >
        {testimonials.map((testimonial, index) => (
          <ModernCard
            className="min-w-[85%] snap-start border-white/10 bg-zinc-950/60 p-6 sm:min-w-[55%] lg:min-w-[35%]"
            key={`${testimonial.name}-${index}`}
            variant="minimal"
          >
            <p className="text-sm leading-relaxed text-zinc-200">“{testimonial.quote}”</p>
            <div className="mt-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-white">{testimonial.name}</p>
                <p className="text-xs text-zinc-400">{[testimonial.role, testimonial.company].filter(Boolean).join(' · ')}</p>
              </div>
              {testimonial.rating ? (
                <span aria-label={`${testimonial.rating} out of 5 stars`} className="flex items-center gap-1 text-accent-300" role="img">
                  {Array.from({ length: testimonial.rating }).map((_, starIndex) => (
                    <span aria-hidden="true" key={starIndex}>
                      ★
                    </span>
                  ))}
                </span>
              ) : null}
            </div>
          </ModernCard>
        ))}
      </div>
    </div>
  );
}
