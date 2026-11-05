import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Search, UserPlus, Users, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import {
  isSetupError,
  loadCommunityData,
  removeConnection,
  respondRequest,
  searchStudents,
  sendRequest,
} from '../services/community.js'

const SETUP_MESSAGE = 'Community setup is incomplete — run the database migration in Supabase.'

function initialsOf(name) {
  return (name?.trim() || 'S')
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function PeerAvatar({ peer, size = 'md' }) {
  const cls = size === 'lg' ? 'h-16 w-16 text-2xl' : 'h-10 w-10 text-base'
  if (peer?.avatar_url) {
    return <img src={peer.avatar_url} alt="" className={`${cls} rounded-xl object-cover`} />
  }
  return (
    <span
      aria-hidden="true"
      className={`font-display flex ${cls} shrink-0 items-center justify-center rounded-xl bg-[#2e7bff] font-bold text-white`}
    >
      {initialsOf(peer?.display_name)}
    </span>
  )
}

export default function Community() {
  const { user: authUser, loading } = useAuth()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searched, setSearched] = useState(false)
  const [searching, setSearching] = useState(false)
  const [connections, setConnections] = useState([])
  const [peers, setPeers] = useState({})
  const [selectedId, setSelectedId] = useState(null)
  const [notice, setNotice] = useState('')

  const myId = authUser?.id ?? null

  const refresh = useCallback(async () => {
    if (!myId) return
    try {
      const { conns, peers } = await loadCommunityData(myId)
      setConnections(conns)
      setPeers(peers)
    } catch (err) {
      setNotice(isSetupError(err) ? SETUP_MESSAGE : 'Community data is unavailable right now.')
    }
  }, [myId])

  useEffect(() => {
    if (!myId) return
    let active = true
    loadCommunityData(myId)
      .then(({ conns, peers }) => {
        if (!active) return
        setConnections(conns)
        setPeers(peers)
      })
      .catch((err) => {
        if (active) {
          setNotice(isSetupError(err) ? SETUP_MESSAGE : 'Community data is unavailable right now.')
        }
      })
    return () => {
      active = false
    }
  }, [myId])

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <p className="text-sm text-[#9aa3bd]">Loading community…</p>
      </div>
    )
  }

  if (!authUser) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 text-center">
        <Users size={36} className="mx-auto text-[#2e7bff]" aria-hidden="true" />
        <h1 className="font-display mt-3 text-3xl">Student community</h1>
        <p className="mt-2 text-sm text-[#9aa3bd]">
          Sign in to search for students and connect with them.
        </p>
        <Link to="/login" className="btn-primary mt-5 inline-block px-5 py-2.5 text-sm">
          Sign in
        </Link>
      </div>
    )
  }

  const incoming = connections.filter((c) => c.addressee_id === myId && c.status === 'pending')
  const outgoing = connections.filter((c) => c.requester_id === myId && c.status === 'pending')
  const accepted = connections.filter((c) => c.status === 'accepted')
  const selected =
    selectedId != null
      ? (peers[selectedId] ?? results.find((r) => r.id === selectedId) ?? null)
      : null
  const selectedRelation =
    selectedId != null
      ? (connections.find((c) => c.requester_id === selectedId || c.addressee_id === selectedId) ??
        null)
      : null

  const runSearch = async (e) => {
    e?.preventDefault()
    if (!query.trim()) return
    setSearching(true)
    try {
      const rows = await searchStudents(query)
      setResults(rows.filter((r) => r.id !== myId))
      setSearched(true)
    } catch (err) {
      setNotice(isSetupError(err) ? SETUP_MESSAGE : 'Search failed. Please try again.')
    } finally {
      setSearching(false)
    }
  }

  const send = async (peerId) => {
    try {
      await sendRequest(myId, peerId)
      setNotice('Connection request sent.')
      await refresh()
    } catch (err) {
      setNotice(
        err?.code === '23505'
          ? 'A request already exists with this student.'
          : 'Could not send the request.',
      )
    }
  }

  const respond = async (id, status) => {
    try {
      await respondRequest(id, status)
      setNotice(status === 'accepted' ? 'Connection accepted.' : 'Request declined.')
      await refresh()
    } catch {
      setNotice('Could not update the request.')
    }
  }

  const remove = async (id) => {
    try {
      await removeConnection(id)
      setNotice('Connection removed.')
      await refresh()
    } catch {
      setNotice('Could not remove the connection.')
    }
  }

  const peerName = (id) => peers[id]?.display_name || 'Student'

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <p className="text-sm text-[#9aa3bd]">ATLAS students</p>
      <h1 className="font-display mt-1 text-3xl sm:text-4xl">Community</h1>

      {notice && (
        <p role="status" className="card mt-5 border-[#22d3ee55] px-4 py-3 text-sm text-[#22d3ee]">
          {notice}
        </p>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Search */}
        <section aria-label="Search students" className="card p-5 sm:p-6">
          <h2 className="flex items-center gap-2 font-semibold">
            <Search size={18} className="text-[#6ea8ff]" aria-hidden="true" /> Find students
          </h2>
          <form onSubmit={runSearch} className="mt-3 flex gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name…"
              aria-label="Search students by name"
              className="min-w-0 flex-1 rounded-[10px] border border-[#6ea8ff33] bg-[#0a1128] px-4 py-2.5 text-sm text-white placeholder:text-[#9aa3bd88] focus:border-[#6ea8ff88] focus:outline-none"
            />
            <button type="submit" disabled={searching} className="btn-primary px-4 py-2 text-sm disabled:opacity-50">
              {searching ? '…' : 'Search'}
            </button>
          </form>
          <ul className="mt-4 space-y-2">
            {results.map((peer) => (
              <li key={peer.id}>
                <button
                  onClick={() => setSelectedId(peer.id)}
                  className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition ${
                    selectedId === peer.id
                      ? 'border-[#2e7bff] bg-[#2e7bff14]'
                      : 'border-white/10 bg-navy-800 hover:border-electric/50'
                  }`}
                >
                  <PeerAvatar peer={peer} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">
                      {peer.display_name || 'Student'}
                    </span>
                    {peer.bio && (
                      <span className="block truncate text-xs text-muted-ink">{peer.bio}</span>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {searched && results.length === 0 && (
            <p className="mt-3 text-sm text-[#9aa3bd]">No students found for that name.</p>
          )}
        </section>

        {/* Peer detail */}
        <section aria-label="Student profile" className="card p-5 sm:p-6">
          {selected ? (
            <div>
              <div className="flex items-center gap-4">
                <PeerAvatar peer={selected} size="lg" />
                <div className="min-w-0">
                  <h2 className="font-display text-2xl">{selected.display_name || 'Student'}</h2>
                  {selected.bio && (
                    <p className="mt-1 text-sm leading-relaxed text-[#c6cddd]">{selected.bio}</p>
                  )}
                </div>
              </div>
              {selected.interests?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {selected.interests.map((interest) => (
                    <span
                      key={interest}
                      className="rounded-full border border-[#6ea8ff2e] px-3 py-1 text-xs font-medium text-[#9aa3bd]"
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-4">
                {!selectedRelation && (
                  <button onClick={() => send(selected.id)} className="btn-primary flex items-center gap-1.5 px-4 py-2 text-sm">
                    <UserPlus size={15} aria-hidden="true" /> Connect
                  </button>
                )}
                {selectedRelation?.status === 'pending' &&
                  selectedRelation.requester_id === myId && (
                    <p className="text-sm text-[#9aa3bd]">Request sent — waiting for a reply.</p>
                  )}
                {selectedRelation?.status === 'pending' &&
                  selectedRelation.addressee_id === myId && (
                    <span className="flex flex-wrap gap-2">
                      <button
                        onClick={() => respond(selectedRelation.id, 'accepted')}
                        className="btn-primary flex items-center gap-1.5 px-4 py-2 text-sm"
                      >
                        <Check size={15} aria-hidden="true" /> Accept
                      </button>
                      <button
                        onClick={() => respond(selectedRelation.id, 'rejected')}
                        className="rounded-[10px] border border-[#6ea8ff2e] px-4 py-2 text-sm font-medium text-[#9aa3bd] hover:text-white"
                      >
                        Decline
                      </button>
                    </span>
                  )}
                {selectedRelation?.status === 'accepted' && (
                  <p className="flex items-center gap-1.5 text-sm font-medium text-[#4ade80]">
                    <Check size={15} aria-hidden="true" /> Connected
                  </p>
                )}
                {selectedRelation?.status === 'rejected' && (
                  <p className="text-sm text-[#9aa3bd]">This request was declined.</p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm leading-relaxed text-[#9aa3bd]">
              Search for a student and select them to view their profile.
            </p>
          )}
        </section>
      </div>

      {!notice && connections.length === 0 && (
        <div className="card mt-6 flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center sm:p-6">
          <Users size={24} className="shrink-0 text-[#6ea8ff]" aria-hidden="true" />
          <div>
            <p className="font-medium">No connections yet</p>
            <p className="mt-0.5 text-sm text-[#9aa3bd]">
              Search above to find fellow students and send your first connection request.
            </p>
          </div>
        </div>
      )}

      {/* Requests + connections */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section aria-label="Incoming requests" className="card p-5">
          <h2 className="font-semibold">Requests for you ({incoming.length})</h2>
          {incoming.length === 0 ? (
            <p className="mt-2 text-sm text-[#9aa3bd]">No pending requests.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {incoming.map((c) => (
                <li key={c.id} className="flex items-center gap-2 text-sm">
                  <PeerAvatar peer={peers[c.requester_id]} />
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {peerName(c.requester_id)}
                  </span>
                  <button
                    onClick={() => respond(c.id, 'accepted')}
                    aria-label={`Accept request from ${peerName(c.requester_id)}`}
                    className="rounded-lg border border-[#6ea8ff2e] p-2 text-[#4ade80] hover:border-[#4ade80]"
                  >
                    <Check size={15} aria-hidden="true" />
                  </button>
                  <button
                    onClick={() => respond(c.id, 'rejected')}
                    aria-label={`Decline request from ${peerName(c.requester_id)}`}
                    className="rounded-lg border border-[#6ea8ff2e] p-2 text-[#9aa3bd] hover:text-white"
                  >
                    <X size={15} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-label="Sent requests" className="card p-5">
          <h2 className="font-semibold">Sent ({outgoing.length})</h2>
          {outgoing.length === 0 ? (
            <p className="mt-2 text-sm text-[#9aa3bd]">No sent requests.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {outgoing.map((c) => (
                <li key={c.id} className="flex items-center gap-2 text-sm">
                  <PeerAvatar peer={peers[c.addressee_id]} />
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {peerName(c.addressee_id)}
                  </span>
                  <button
                    onClick={() => remove(c.id)}
                    className="rounded-lg border border-[#6ea8ff2e] px-3 py-1.5 text-xs font-medium text-[#9aa3bd] hover:text-white"
                  >
                    Cancel
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-label="My connections" className="card p-5">
          <h2 className="font-semibold">Connected ({accepted.length})</h2>
          {accepted.length === 0 ? (
            <p className="mt-2 text-sm text-[#9aa3bd]">No connections yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {accepted.map((c) => {
                const peerId = c.requester_id === myId ? c.addressee_id : c.requester_id
                return (
                  <li key={c.id} className="flex items-center gap-2 text-sm">
                    <PeerAvatar peer={peers[peerId]} />
                    <span className="min-w-0 flex-1 truncate font-medium">{peerName(peerId)}</span>
                    <button
                      onClick={() => remove(c.id)}
                      className="rounded-lg border border-[#6ea8ff2e] px-3 py-1.5 text-xs font-medium text-[#9aa3bd] hover:text-white"
                    >
                      Remove
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
