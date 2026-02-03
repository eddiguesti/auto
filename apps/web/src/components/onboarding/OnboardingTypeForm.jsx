import { useState } from 'react'

export default function OnboardingTypeForm({ onSubmit, onBack }) {
  const [name, setName] = useState('')
  const [birthPlace, setBirthPlace] = useState('')
  const [birthCountry, setBirthCountry] = useState('')
  const [birthYear, setBirthYear] = useState('')
  const [additionalContext, setAdditionalContext] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e) => {
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
      <p className="text-warmgray mb-6 text-center">
        This helps personalize your memoir journey
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-ink mb-1">
            What's your name?
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Margaret, John, Elizabeth"
            className="w-full px-4 py-3 rounded-xl border border-sepia/20 focus:border-sepia focus:outline-none"
          />
        </div>

        {/* Birth Place */}
        <div>
          <label className="block text-sm font-medium text-ink mb-1">
            Where were you born?
          </label>
          <input
            type="text"
            value={birthPlace}
            onChange={(e) => setBirthPlace(e.target.value)}
            placeholder="e.g., Manchester, London, Birmingham"
            className="w-full px-4 py-3 rounded-xl border border-sepia/20 focus:border-sepia focus:outline-none"
          />
        </div>

        {/* Birth Country */}
        <div>
          <label className="block text-sm font-medium text-ink mb-1">
            Country
          </label>
          <input
            type="text"
            value={birthCountry}
            onChange={(e) => setBirthCountry(e.target.value)}
            placeholder="e.g., England, Scotland, Wales"
            className="w-full px-4 py-3 rounded-xl border border-sepia/20 focus:border-sepia focus:outline-none"
          />
        </div>

        {/* Birth Year */}
        <div>
          <label className="block text-sm font-medium text-ink mb-1">
            What year were you born?
          </label>
          <select
            value={birthYear}
            onChange={(e) => setBirthYear(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-sepia/20 focus:border-sepia focus:outline-none bg-white"
          >
            <option value="">Select year (optional)</option>
            {years.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>

        {/* Additional Context */}
        <div>
          <label className="block text-sm font-medium text-ink mb-1">
            Anything else you'd like to share?
            <span className="text-warmgray font-normal"> (optional)</span>
          </label>
          <textarea
            value={additionalContext}
            onChange={(e) => setAdditionalContext(e.target.value)}
            placeholder="e.g., I grew up on a farm, my family moved a lot, I was the youngest of 5 children..."
            rows={3}
            className="w-full px-4 py-3 rounded-xl border border-sepia/20 focus:border-sepia focus:outline-none resize-none"
          />
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onBack}
            className="flex-1 px-6 py-3 border border-sepia/20 text-warmgray rounded-xl hover:bg-sepia/5 transition"
          >
            Back
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 px-6 py-3 bg-sepia text-white rounded-xl hover:bg-ink transition disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : 'Continue'}
          </button>
        </div>
      </form>
    </div>
  )
}
