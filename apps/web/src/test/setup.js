import '@testing-library/jest-dom'

// Provide a localStorage mock if the jsdom environment doesn't have one
if (typeof globalThis.localStorage === 'undefined' || !globalThis.localStorage?.getItem) {
  const store = {}
  globalThis.localStorage = {
    getItem: key => store[key] ?? null,
    setItem: (key, value) => {
      store[key] = String(value)
    },
    removeItem: key => {
      delete store[key]
    },
    clear: () => {
      Object.keys(store).forEach(k => delete store[k])
    },
    get length() {
      return Object.keys(store).length
    },
    key: i => Object.keys(store)[i] ?? null
  }
}
