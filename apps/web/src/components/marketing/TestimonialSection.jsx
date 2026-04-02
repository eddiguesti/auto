/**
 * TestimonialSection - Customer testimonial with large quote, dark background.
 *
 * Props:
 *   quote  - The testimonial text
 *   name   - Customer name
 *   detail - Additional info (age, location, etc.)
 */

const DEFAULT_TESTIMONIAL = {
  quote:
    "I never thought I'd write my life story. But talking to Clio felt so natural\u2014 like chatting with an old friend. Now my grandchildren will know who I really was.",
  name: 'Margaret T.',
  detail: 'Age 78, Birmingham'
}

export default function TestimonialSection({
  quote = DEFAULT_TESTIMONIAL.quote,
  name = DEFAULT_TESTIMONIAL.name,
  detail = DEFAULT_TESTIMONIAL.detail
}) {
  return (
    <section className="py-20 sm:py-28 px-4 sm:px-6 bg-heritage-ink text-white">
      <div className="max-w-3xl mx-auto text-center">
        <svg
          className="w-14 h-14 mx-auto mb-8 text-heritage-sepia-light opacity-60"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
        </svg>
        <p className="font-display text-2xl sm:text-3xl italic mb-8 leading-relaxed text-white/95">
          {quote}
        </p>
        <div>
          <p className="font-sans text-white font-medium text-lg">{name}</p>
          <p className="font-sans text-white/60 text-base">{detail}</p>
        </div>
      </div>
    </section>
  )
}
