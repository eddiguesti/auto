import { IconStarFilled } from '@tabler/icons-react'

/**
 * TestimonialSection - Customer testimonial with large serif quote on a calm band.
 *
 * Props:
 *   quote  - The testimonial text
 *   name   - Customer name
 *   detail - Additional info (age, location, etc.)
 */

const DEFAULT_TESTIMONIAL = {
  quote:
    "I never thought I'd write my life story. But talking to Clio felt so natural— like chatting with an old friend. Now my grandchildren will know who I really was.",
  name: 'Margaret T.',
  detail: 'Age 78, Birmingham'
}

export default function TestimonialSection({
  quote = DEFAULT_TESTIMONIAL.quote,
  name = DEFAULT_TESTIMONIAL.name,
  detail = DEFAULT_TESTIMONIAL.detail
}) {
  return (
    <section className="py-20 sm:py-28 px-4 sm:px-6 bg-cream">
      <div className="max-w-3xl mx-auto text-center">
        <div className="flex justify-center gap-1.5 mb-8" aria-label="Five star rating">
          {[...Array(5)].map((_, i) => (
            <IconStarFilled key={i} size={20} className="text-bronze-400" aria-hidden="true" />
          ))}
        </div>
        <blockquote className="font-serif italic text-2xl sm:text-3xl text-ink mb-8 [text-wrap:balance]">
          {quote}
        </blockquote>
        <div>
          <p className="text-ink font-medium">{name}</p>
          <p className="text-sepia-500 text-sm mt-0.5">{detail}</p>
        </div>
      </div>
    </section>
  )
}
