import { supabase } from '../lib/supabaseClient.js'
import { ONBOARDING_KEY } from './storage.js'

const AVATAR_BUCKET = 'avatars'
const MAX_AVATAR_BYTES = 2 * 1024 * 1024

function readLocalOnboarding() {
  try {
    const raw = window.localStorage.getItem(ONBOARDING_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

/**
 * Map a profile-write failure to an actionable message. RLS denials can only
 * be fixed database-side (no client change may bypass them), so say exactly that.
 */
export function friendlyProfileError(err) {
  const message = err?.message ?? ''
  if (/row-level security/i.test(message)) {
    return 'Profile save was rejected by database security. Re-run the migration profiles policies in Supabase, then try again.'
  }
  return message || 'Profile update failed.'
}

export async function fetchProfile(userId) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
  if (error) throw error
  return data
}

export async function upsertProfile({ id, display_name, bio, avatar_url, interests, goal }) {
  const row = { id }
  if (display_name !== undefined) row.display_name = display_name
  if (bio !== undefined) row.bio = bio
  if (avatar_url !== undefined) row.avatar_url = avatar_url
  if (interests !== undefined) row.interests = interests
  if (goal !== undefined) row.goal = goal
  const { data, error } = await supabase
    .from('profiles')
    .upsert(row)
    .select()
    .maybeSingle()
  if (error) throw error
  return data
}

/** Create a basic student profile for a Supabase user when none exists yet. */
export async function ensureStudentProfile(user) {
  try {
    const existing = await fetchProfile(user.id)
    if (existing) return existing
  } catch {
    return null
  }
  const local = readLocalOnboarding()
  const display_name =
    local?.name?.trim() || user.email?.split('@')[0] || 'Student'
  try {
    return await upsertProfile({
      id: user.id,
      display_name,
      interests: local?.interests ?? [],
      goal: local?.goal ?? '',
    })
  } catch {
    return null
  }
}

function avatarExtension(file) {
  if (file.type === 'image/png') return 'png'
  if (file.type === 'image/webp') return 'webp'
  return 'jpg'
}

/**
 * Upload a profile photo to the student's own avatars/ folder.
 * @returns {Promise<string>} public URL of the uploaded photo
 */
export async function uploadAvatar(userId, file) {
  if (!file || !String(file.type || '').startsWith('image/')) {
    throw new Error('Please choose an image file.')
  }
  if (file.size > MAX_AVATAR_BYTES) {
    throw new Error('Photo must be smaller than 2 MB.')
  }
  const path = `${userId}/avatar.${avatarExtension(file)}`
  try {
    const { data: existing } = await supabase.storage.from(AVATAR_BUCKET).list(userId)
    const stale = (existing ?? []).map((o) => `${userId}/${o.name}`).filter((p) => p !== path)
    if (stale.length > 0) await supabase.storage.from(AVATAR_BUCKET).remove(stale)
  } catch {
    // Best-effort cleanup; the upsert below still replaces the current photo.
  }
  const { error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type })
  if (error) {
    if (/bucket not found/i.test(error.message ?? '')) {
      throw new Error(
        'Photo storage is not set up yet. Run the database migration in Supabase, then try again.',
      )
    }
    throw error
  }
  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path)
  return data.publicUrl
}
