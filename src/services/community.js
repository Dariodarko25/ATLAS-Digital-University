import { supabase } from '../lib/supabaseClient.js'

// Public peer columns only — profiles holds no email, so community reads leak nothing.
const PEER_COLUMNS = 'id, display_name, bio, avatar_url, interests'

function escapeLike(value) {
  return value.replace(/[%_\\]/g, (c) => `\\${c}`)
}

/** True when the error means the migration was never applied (table missing). */
export function isSetupError(err) {
  if (!err) return false
  const code = String(err.code ?? '')
  const status = err.status
  const message = String(err.message ?? '')
  return (
    code.startsWith('PGRST2') ||
    status === 404 ||
    /schema cache|could not find the table|does not exist/i.test(message)
  )
}

export async function searchStudents(query, { limit = 20 } = {}) {
  const q = query.trim()
  if (!q) return []
  const { data, error } = await supabase
    .from('profiles')
    .select(PEER_COLUMNS)
    .ilike('display_name', `%${escapeLike(q)}%`)
    .order('display_name')
    .limit(limit)
  if (error) throw error
  return data ?? []
}

export async function getStudentProfile(studentId) {
  const { data, error } = await supabase
    .from('profiles')
    .select(PEER_COLUMNS)
    .eq('id', studentId)
    .maybeSingle()
  if (error) throw error
  return data
}

/** Connections plus the peer profiles behind them, keyed by peer id. */
export async function loadCommunityData(myId) {
  const conns = await listMyConnections()
  const peerIds = [
    ...new Set(conns.map((c) => (c.requester_id === myId ? c.addressee_id : c.requester_id))),
  ]
  const profiles = await getPeerProfiles(peerIds)
  return { conns, peers: Object.fromEntries(profiles.map((p) => [p.id, p])) }
}

/** All connections involving the signed-in student (RLS enforced). */
export async function listMyConnections() {
  const { data, error } = await supabase
    .from('connections')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getPeerProfiles(ids) {
  if (ids.length === 0) return []
  const { data, error } = await supabase.from('profiles').select(PEER_COLUMNS).in('id', ids)
  if (error) throw error
  return data ?? []
}

export async function sendRequest(requester_id, addressee_id) {
  const { data, error } = await supabase
    .from('connections')
    .insert({ requester_id, addressee_id })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function respondRequest(connectionId, status) {
  const { data, error } = await supabase
    .from('connections')
    .update({ status, responded_at: new Date().toISOString() })
    .eq('id', connectionId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function removeConnection(connectionId) {
  const { error } = await supabase.from('connections').delete().eq('id', connectionId)
  if (error) throw error
}
