# EasyMemoir Style Guide

> Design system for the EasyMemoir application, optimized for our dual audience:
>
> - **Primary buyers:** 35-year-olds purchasing as a gift
> - **End users:** Seniors who will use the product

---

## Typography

### Font Stack

| Role                  | Font         | Source                                                    | Fallback              | Usage                                 |
| --------------------- | ------------ | --------------------------------------------------------- | --------------------- | ------------------------------------- |
| **Display/Headlines** | Boska        | [Fontshare](https://www.fontshare.com/fonts/boska)        | Georgia, serif        | H1, H2, H3, hero text, section titles |
| **Body/Memoir Text**  | Lora         | [Google Fonts](https://fonts.google.com/specimen/Lora)    | Georgia, serif        | Paragraphs, memoir content, quotes    |
| **UI/Interface**      | General Sans | [Fontshare](https://www.fontshare.com/fonts/general-sans) | system-ui, sans-serif | Buttons, labels, navigation, forms    |

### Tailwind Classes

```jsx
// Headlines
<h1 className="font-display">Elegant Headline</h1>

// Body text / Memoir content
<p className="font-serif">Your life story text...</p>

// UI elements
<button className="font-sans">Get Started</button>
```

### Font Weights

| Font         | Available Weights               | Recommended Use                              |
| ------------ | ------------------------------- | -------------------------------------------- |
| Boska        | 300 (Light), 400, 500, 600, 700 | 400-500 for headlines, 300 italic for quotes |
| Lora         | 400, 500, 600 + italics         | 400 for body, 500 for emphasis               |
| General Sans | 400, 500, 600, 700              | 400 body, 500 buttons, 600 emphasis          |

### Font Sizing

| Context             | Size    | Tailwind Class                     |
| ------------------- | ------- | ---------------------------------- |
| Hero headline       | 48-72px | `text-5xl sm:text-6xl lg:text-7xl` |
| Section heading     | 36-48px | `text-4xl sm:text-5xl`             |
| Subheading          | 24-32px | `text-2xl sm:text-3xl`             |
| Body text (landing) | 17-18px | `text-lg`                          |
| Body text (in-app)  | 18-20px | `text-lg sm:text-xl`               |
| UI text             | 14-16px | `text-sm` or `text-base`           |

### Typography Best Practices

- **Letter-spacing on headlines:** `tracking-wide` or `tracking-[0.02em]`
- **Line-height for body:** `leading-relaxed` (1.625)
- **Line-height for headlines:** `leading-tight` (1.25)
- **Generous white space** around text blocks

---

## Color Palette

### Heritage Colors (Primary Palette)

Optimized for seniors (warm tones, high contrast, avoids blue-heavy schemes).

| Name                         | Hex       | Tailwind Class       | Usage                      |
| ---------------------------- | --------- | -------------------- | -------------------------- |
| **Cream** (Background)       | `#FBF7F2` | `bg-heritage-cream`  | Main page background       |
| **Card** (Elevated surfaces) | `#FFFCF9` | `bg-heritage-card`   | Cards, modals, elevated UI |
| **Ink** (Primary text)       | `#3D3833` | `text-heritage-ink`  | Headlines, important text  |
| **Text** (Body text)         | `#6B6560` | `text-heritage-text` | Paragraphs, secondary text |

### Accent Colors

| Name            | Hex       | Tailwind Class             | Usage                         |
| --------------- | --------- | -------------------------- | ----------------------------- |
| **Sepia**       | `#9C7B5C` | `text-heritage-sepia`      | Links, accents, heritage feel |
| **Sepia Light** | `#D4C4B0` | `bg-heritage-sepia-light`  | Borders, subtle backgrounds   |
| **Sepia Dark**  | `#7A6248` | `text-heritage-sepia-dark` | Hover states                  |

### CTA Colors

| Name                 | Hex       | Tailwind Class                | Usage                              |
| -------------------- | --------- | ----------------------------- | ---------------------------------- |
| **CTA** (Terracotta) | `#D97853` | `bg-heritage-cta`             | Primary buttons, important actions |
| **CTA Hover**        | `#C4613D` | `hover:bg-heritage-cta-hover` | Button hover state                 |
| **CTA Light**        | `#E8946F` | `bg-heritage-cta-light`       | Secondary/ghost buttons            |

### Success/Feedback Colors

| Name               | Hex       | Tailwind Class           | Usage                        |
| ------------------ | --------- | ------------------------ | ---------------------------- |
| **Sage** (Success) | `#7A9B76` | `text-heritage-sage`     | Success messages, checkmarks |
| **Sage Light**     | `#A8C4A4` | `bg-heritage-sage-light` | Success backgrounds          |

### Color Rationale

Based on research for senior-friendly design:

- **Warm colors** are easier for aging eyes to perceive
- **Terracotta CTA** provides high visibility and warmth
- **Sepia tones** evoke heritage, nostalgia, and trust
- **Avoid blue** as primary color (seniors struggle with short wavelengths)
- **High contrast** (4.5:1+ ratio) for all text

---

## Component Patterns

### Buttons

```jsx
// Primary CTA
<button className="font-sans bg-heritage-cta text-white px-8 py-4 rounded-full text-lg font-medium hover:bg-heritage-cta-hover transition-colors shadow-lg">
  Start Your Memoir
</button>

// Secondary
<button className="font-sans bg-heritage-sepia-light/40 text-heritage-ink px-6 py-3 rounded-full hover:bg-heritage-sepia-light/60 transition-colors border border-heritage-sepia-light">
  Learn More
</button>

// Ghost
<button className="font-sans text-heritage-text hover:text-heritage-ink transition-colors">
  See how it works
</button>
```

### Cards

```jsx
<div className="bg-heritage-card rounded-3xl p-8 border border-heritage-sepia-light/30 shadow-lg">
  <h3 className="font-display text-2xl text-heritage-ink mb-4">Card Title</h3>
  <p className="font-serif text-heritage-text">Card content...</p>
</div>
```

### Section Headers

```jsx
<div className="text-center mb-16">
  <p className="font-sans text-heritage-sepia uppercase tracking-[0.25em] text-xs sm:text-sm mb-4 font-medium">
    Section Label
  </p>
  <h2 className="font-display text-4xl sm:text-5xl text-heritage-ink">Section Headline</h2>
</div>
```

### Memoir Text Block

```jsx
<div className="font-serif text-lg text-heritage-text leading-relaxed">
  <p className="mb-6">
    I still remember the summer of 1962, the way the sunlight filtered through grandmother's lace
    curtains...
  </p>
</div>
```

---

## Spacing

| Name            | Value            | Tailwind           | Usage                   |
| --------------- | ---------------- | ------------------ | ----------------------- |
| Section padding | 80-112px         | `py-20 sm:py-28`   | Between major sections  |
| Content gap     | 48-64px          | `gap-12 lg:gap-16` | Between content blocks  |
| Card padding    | 32px             | `p-8`              | Inside cards            |
| Button padding  | 16-20px vertical | `py-4 sm:py-5`     | Comfortable tap targets |

---

## Shadows

```js
// Tailwind config
boxShadow: {
  soft: '0 2px 8px rgba(45, 42, 38, 0.08)',
  medium: '0 4px 12px rgba(45, 42, 38, 0.1)',
  button: '0 3px 0 #3A6147'
}
```

---

## Border Radius

| Element        | Radius     | Tailwind       |
| -------------- | ---------- | -------------- |
| Buttons        | Full round | `rounded-full` |
| Cards          | 24px       | `rounded-3xl`  |
| Input fields   | 12px       | `rounded-xl`   |
| Small elements | 8px        | `rounded-lg`   |

---

## Accessibility Notes

### For Senior Users

1. **Minimum text size:** 16px (18-20px preferred)
2. **Contrast ratio:** 4.5:1 minimum for all text
3. **Touch targets:** 44x44px minimum
4. **Avoid:** Blue-green color combinations
5. **Line height:** 1.5-1.8 for body text
6. **Avoid italics** for long passages

### WCAG Compliance

- All color combinations meet WCAG AA standards
- CTA buttons exceed 4.5:1 contrast ratio
- Text on all backgrounds meets accessibility requirements

---

## Loading Fonts

### In HTML (index.html)

```html
<!-- Fontshare fonts -->
<link
  href="https://api.fontshare.com/v2/css?f[]=boska@300,400,500,600,700,300i,400i,500i&f[]=general-sans@400,500,600,700&display=swap"
  rel="stylesheet"
/>

<!-- Google Fonts fallback -->
<link
  href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;0,600;1,400;1,500&display=swap"
  rel="stylesheet"
/>
```

### In Tailwind (tailwind.config.js)

```js
fontFamily: {
  display: ['Boska', 'Georgia', 'serif'],
  serif: ['Lora', 'Georgia', 'serif'],
  sans: ['General Sans', 'system-ui', 'sans-serif']
}
```

---

## Quick Reference

### Most Used Classes

```jsx
// Headlines
'font-display text-4xl sm:text-5xl text-heritage-ink'

// Body text
'font-serif text-lg text-heritage-text leading-relaxed'

// UI text
'font-sans text-sm text-heritage-text'

// Primary button
'font-sans bg-heritage-cta text-white px-8 py-4 rounded-full hover:bg-heritage-cta-hover'

// Section label
'font-sans text-heritage-sepia uppercase tracking-[0.25em] text-xs'

// Card
'bg-heritage-card rounded-3xl p-8 border border-heritage-sepia-light/30'
```

---

## Mobile App (React Native / Expo)

### Font Setup

> **Note:** Fontshare fonts (Boska, General Sans) are not available via `expo-google-fonts`. The mobile app uses **Lora** for both display and body text to maintain the heritage feel.

#### Package Installation

```bash
npm install @expo-google-fonts/lora expo-font
```

#### Loading Fonts (App.tsx)

```tsx
import {
  useFonts,
  Lora_400Regular,
  Lora_500Medium,
  Lora_600SemiBold,
  Lora_700Bold,
  Lora_400Regular_Italic,
  Lora_500Medium_Italic
} from '@expo-google-fonts/lora'

const [fontsLoaded] = useFonts({
  Lora_400Regular,
  Lora_500Medium,
  Lora_600SemiBold,
  Lora_700Bold,
  Lora_400Regular_Italic,
  Lora_500Medium_Italic
})
```

### Mobile Font Families (theme.ts)

```ts
export const fonts = {
  // Display headings
  display: 'Lora_700Bold',
  displayMedium: 'Lora_600SemiBold',
  displayRegular: 'Lora_500Medium',

  // Body text
  body: 'Lora_400Regular',
  bodyMedium: 'Lora_500Medium',
  bodySemiBold: 'Lora_600SemiBold',
  bodyItalic: 'Lora_400Regular_Italic',

  // UI elements - system fonts
  sans: Platform.select({
    ios: 'System',
    android: 'Roboto'
  })
}
```

### Mobile Color Reference

The mobile app uses the same heritage color palette:

```ts
export const colors = {
  background: '#FBF7F2', // heritage-cream
  text: '#3D3833', // heritage-ink
  textSecondary: '#6B6560', // heritage-text
  sepia: '#9C7B5C', // heritage-sepia
  sepiaLight: '#D4C4B0', // heritage-sepia-light
  cta: '#D97853', // heritage-cta
  ctaHover: '#C4613D', // heritage-cta-hover
  success: '#7A9B76' // heritage-sage
}
```

### Mobile Typography Styles

| Context | Font             | Size | Usage           |
| ------- | ---------------- | ---- | --------------- |
| Display | Lora_700Bold     | 38px | Hero headlines  |
| H1      | Lora_700Bold     | 32px | Screen titles   |
| H2      | Lora_600SemiBold | 26px | Section headers |
| Body    | Lora_400Regular  | 18px | Memoir text     |
| UI      | System/Roboto    | 16px | Buttons, labels |
| Caption | System/Roboto    | 14px | Secondary UI    |

---

_Last updated: February 2026_
_Based on research for memoir apps targeting UK market with senior end-users_
