import { useState } from 'react'
import { Button, Field, Input, Textarea } from '../ui'

// Matches the kit Input styling for controls the kit doesn't provide (select)
const SELECT_CLASSES = [
  'w-full px-4 py-3 rounded-xl text-base text-ink bg-surface',
  'border border-sepia-200',
  'hover:border-sepia-300',
  'focus:border-bronze-400 focus:ring-4 focus:ring-bronze-500/10 focus:outline-none',
  'transition-colors duration-150'
].join(' ')

export default function OnboardingTypeForm({ onSubmit, onBack }) {
  const [name, setName] = useState('')
  const [birthPlace, setBirthPlace] = useState('')
  const [birthCountry, setBirthCountry] = useState('')
  const [birthYear, setBirthYear] = useState('')
  const [additionalContext, setAdditionalContext] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async e => {
    e.preventDefault()
    setIsSubmitting(true)

    await onSubmit({
      name: name.trim() || null,
      birthPlace: birthPlace.trim() || null,
      birthCountry: birthCountry.trim() || null,
      birthYear: birthYear ? parseInt(birthYear) : null,
      additionalContext: additionalContext.trim() || null
    })
  }

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 100 }, (_, i) => currentYear - i)

  return (
    <div>
      <h2 className="text-2xl font-display text-ink mb-2 text-center">
        Tell me a bit about yourself
      </h2>
      <p className="text-sepia-600 text-base mb-6 text-center">
        This helps personalize your memoir journey
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <Field label="What's your name?">
          {(id, describedBy) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g., Margaret, John, Elizabeth"
            />
          )}
        </Field>

        {/* Birth Place */}
        <Field label="Where were you born?">
          {(id, describedBy) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              type="text"
              value={birthPlace}
              onChange={e => setBirthPlace(e.target.value)}
              placeholder="e.g., Manchester, London, Birmingham"
            />
          )}
        </Field>

        {/* Birth Country */}
        <Field label="Country">
          {(id, describedBy) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              type="text"
              value={birthCountry}
              onChange={e => setBirthCountry(e.target.value)}
              placeholder="e.g., England, Scotland, Wales"
            />
          )}
        </Field>

        {/* Birth Year */}
        <Field label="What year were you born?">
          {(id, describedBy) => (
            <select
              id={id}
              aria-describedby={describedBy}
              value={birthYear}
              onChange={e => setBirthYear(e.target.value)}
              className={SELECT_CLASSES}
            >
              <option value="">Select year (optional)</option>
              {years.map(year => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          )}
        </Field>

        {/* Additional Context */}
        <Field
          label={
            <>
              Anything else you'd like to share?
              <span className="text-sepia-500 font-normal"> (optional)</span>
            </>
          }
        >
          {(id, describedBy) => (
            <Textarea
              id={id}
              aria-describedby={describedBy}
              value={additionalContext}
              onChange={e => setAdditionalContext(e.target.value)}
              placeholder="e.g., I grew up on a farm, my family moved a lot, I was the youngest of 5 children..."
              rows={3}
            />
          )}
        </Field>

        {/* Buttons */}
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" size="lg" className="flex-1" onClick={onBack}>
            Back
          </Button>
          <Button type="submit" size="lg" className="flex-1" loading={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Continue'}
          </Button>
        </div>
      </form>
    </div>
  )
}
