import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LogIn, UserPlus } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'

const inputClass =
  'mt-1.5 w-full rounded-[10px] border border-[#6ea8ff33] bg-[#0a1128] px-4 py-2.5 text-[15px] text-white placeholder:text-[#9aa3bd88] focus:border-[#6ea8ff88] focus:outline-none'

export default function AuthPage() {
  const { user, loading, signIn, signUp } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  if (!loading && user) {
    navigate('/', { replace: true })
    return null
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setNotice('')
    setBusy(true)
    try {
      if (mode === 'login') {
        await signIn(email.trim(), password)
        navigate('/', { replace: true })
      } else {
        const data = await signUp(email.trim(), password)
        if (data?.session) navigate('/', { replace: true })
        else setNotice('Account created. Check your email to confirm it, then sign in.')
      }
    } catch (err) {
      setError(err?.message || 'Authentication failed. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <p className="text-sm text-[#9aa3bd]">Student access</p>
      <h1 className="font-display mt-1 text-3xl sm:text-4xl">
        {mode === 'login' ? 'Welcome back' : 'Create your account'}
      </h1>

      <div className="card mt-6 p-6 sm:p-8">
        <div className="flex gap-2" role="tablist" aria-label="Sign in or create account">
          <button
            role="tab"
            aria-selected={mode === 'login'}
            onClick={() => setMode('login')}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-[10px] px-4 py-2.5 text-sm font-semibold transition-colors ${
              mode === 'login' ? 'bg-[#2e7bff] text-white' : 'link-muted hover:bg-[#6ea8ff14]'
            }`}
          >
            <LogIn size={16} aria-hidden="true" /> Sign in
          </button>
          <button
            role="tab"
            aria-selected={mode === 'register'}
            onClick={() => setMode('register')}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-[10px] px-4 py-2.5 text-sm font-semibold transition-colors ${
              mode === 'register' ? 'bg-[#2e7bff] text-white' : 'link-muted hover:bg-[#6ea8ff14]'
            }`}
          >
            <UserPlus size={16} aria-hidden="true" /> Register
          </button>
        </div>

        <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
          <div>
            <label htmlFor="auth-email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="auth-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="auth-password" className="text-sm font-medium">
              Password
            </label>
            <input
              id="auth-password"
              type="password"
              required
              minLength={6}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              className={inputClass}
            />
          </div>

          {error && (
            <p role="alert" className="rounded-[10px] border border-[#ef444455] bg-[#ef44441a] px-4 py-2.5 text-sm text-[#fca5a5]">
              {error}
            </p>
          )}
          {notice && (
            <p role="status" className="rounded-[10px] border border-[#22d3ee55] bg-[#22d3ee14] px-4 py-2.5 text-sm text-[#22d3ee]">
              {notice}
            </p>
          )}

          <button type="submit" disabled={busy} className="btn-primary px-5 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-50">
            {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>
      </div>

      <p className="mt-5 text-center text-sm text-[#9aa3bd]">
        <Link to="/" className="underline underline-offset-4 hover:text-white">
          Back to home
        </Link>
      </p>
    </div>
  )
}
