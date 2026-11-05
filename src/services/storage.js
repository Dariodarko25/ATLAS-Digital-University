// Shared localStorage keys so Dashboard, Explore, and Onboarding stay in sync.
export const ONBOARDING_KEY = 'atlas-onboarding'
export const ENROLLED_KEY = 'atlas-enrolled'
export const PROGRESS_KEY = 'atlas-progress'

/** Shape: { name: string, interests: string[], goal: string, completedAt: string } */
export const emptyProfile = { name: '', interests: [], goal: '', completedAt: '' }
