import React, { useState } from 'react'
import { X, Mail, Send, CheckCircle2, AlertCircle, Copy } from 'lucide-react'
import { useProject } from '../context/ProjectContext'
import { copyToClipboard } from '../utils/links'

export default function InviteModal({ isOpen, onClose }) {
  const { apiFetch, showToast } = useProject()

  const [email, setEmail] = useState('')
  const [sentTo, setSentTo] = useState('')
  const [status, setStatus] = useState('idle') // idle, sending, success, error
  const [errorText, setErrorText] = useState('')

  if (!isOpen) return null

  const inviteLink = `${window.location.origin}/signup`

  const handleSendInvite = async (e) => {
    e.preventDefault()
    if (!email) return

    setStatus('sending')
    setErrorText('')

    try {
      // The server composes the email (sender, copy and link) so only the address is sent
      await apiFetch('/api/invite', {
        method: 'POST',
        body: JSON.stringify({ to_email: email.trim() })
      })

      setSentTo(email.trim())
      setStatus('success')
      setEmail('')
      setTimeout(() => {
        setStatus('idle')
        onClose()
      }, 2000)
    } catch (error) {
      console.error('Invite failed:', error)
      setErrorText(error.message)
      setStatus('error')
    }
  }

  const copyLink = async () => {
    const ok = await copyToClipboard(inviteLink)
    showToast(ok ? 'Invite link copied' : 'Could not access the clipboard', ok ? 'success' : 'error')
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-card border border-edge rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">

        {/* Top Glow/Pulse Line */}

        {/* Header */}
        <div className="px-6 py-4 border-b border-raised flex justify-between items-center bg-panel">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-accent-500"></div>
            Invite Member
          </h3>
          <button onClick={onClose} aria-label="Close" className="text-neutral-500 hover:text-white transition-colors p-1 hover:bg-white/5 rounded-md">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">

          {status === 'success' ? (
            <div className="text-center py-4 animate-in fade-in zoom-in-95">
              <div className="w-16 h-16 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/30">
                <CheckCircle2 size={32} />
              </div>
              <h4 className="text-xl font-bold text-white mb-2">Invitation Sent!</h4>
              <p className="text-neutral-400 text-sm leading-relaxed">
                An interactive invite has been dispatched to <br/>
                <span className="text-accent-400 font-medium">{sentTo}</span>
              </p>
            </div>
          ) : (
            <form onSubmit={handleSendInvite} className="space-y-5">
              <div>
                <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-[0.1em] mb-2 block">
                  Colleague's Email
                </label>
                <div className="relative group">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 group-focus-within:text-accent-400 transition-colors" />
                  <input
                    type="email"
                    required
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-base border border-edge text-white rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500 transition-all placeholder-neutral-600"
                  />
                </div>
              </div>

              {status === 'error' && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-400 text-xs animate-shake">
                  <AlertCircle size={14} />
                  {errorText || 'Could not send the invitation. Try again.'}
                </div>
              )}

              <button
                type="submit"
                disabled={status === 'sending'}
                className="w-full py-3 rounded-xl bg-white text-black font-bold text-sm hover:bg-neutral-200 shadow-white/5 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                {status === 'sending' ? (
                  <>Sending Pulse...</>
                ) : (
                  <>Send Invitation <Send size={16} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" /></>
                )}
              </button>
            </form>
          )}

          {/* Divider */}
          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-raised"></div>
            <span className="flex-shrink-0 mx-4 text-[10px] text-neutral-600 uppercase font-bold tracking-widest">Workspace Link</span>
            <div className="flex-grow border-t border-raised"></div>
          </div>

          {/* Copy Link Section */}
          <div className="flex items-center gap-2 bg-base p-1.5 rounded-xl border border-raised">
            <code className="flex-1 text-[11px] text-neutral-500 truncate px-3 font-mono">
              {inviteLink}
            </code>
            <button
              onClick={copyLink}
              className="p-2.5 bg-card hover:bg-raised rounded-lg text-neutral-400 hover:text-white transition-colors border border-edge"
              title="Copy to clipboard"
              aria-label="Copy invite link"
            >
              <Copy size={14} />
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
