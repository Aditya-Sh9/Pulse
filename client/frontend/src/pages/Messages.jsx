import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useProject } from '../context/ProjectContext'
import { Search, Send, MessageSquare, Info, ArrowLeft, CheckCheck, Check, Loader2 } from 'lucide-react'
import UserProfileModal from '../components/UserProfileModal'
import { Skeleton } from '../components/Skeleton'

const MAX_MESSAGE_LENGTH = 2000

export default function Messages() {
  const { userId: urlUserId } = useParams()
  const navigate = useNavigate()
  const { currentUser } = useAuth()

  const {
    members,
    loading,
    realtimeMessages,
    setRealtimeMessages,
    unreadCounts,
    typingFrom,
    sendMessage,
    sendTyping,
    fetchChatHistory,
    markChatAsRead
  } = useProject()

  const [newMessage, setNewMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [showProfile, setShowProfile] = useState(false)

  const scrollRef = useRef(null)
  const messagesEndRef = useRef(null)
  const typingStopTimer = useRef(null)
  const isTypingSent = useRef(false)

  const contacts = useMemo(() => members.filter(m => m.id !== currentUser?.uid), [members, currentUser?.uid])
  // Derived rather than stored, so presence/profile updates show up live
  const selectedUser = contacts.find(m => m.id === urlUserId) || null
  const selectedUserExists = !!selectedUser

  const activeChatId = urlUserId && currentUser ? [currentUser.uid, urlUserId].sort().join('_') : null
  // The socket delivers messages from every conversation; only render this one
  const chatMessages = useMemo(
    () => realtimeMessages.filter(m => m.chatId === activeChatId),
    [realtimeMessages, activeChatId]
  )

  // Unread conversations first, then online, then alphabetical
  const filteredContacts = contacts
    .filter(c => c.name?.toLowerCase().includes(searchQuery.toLowerCase()) || c.email?.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) =>
      ((unreadCounts[b.id] || 0) > 0) - ((unreadCounts[a.id] || 0) > 0) ||
      (b.status === 'online') - (a.status === 'online') ||
      (a.name || '').localeCompare(b.name || '')
    )

  // Load the latest page when the conversation changes (not on every presence update)
  useEffect(() => {
    if (!urlUserId || !selectedUserExists) {
      setRealtimeMessages([])
      return
    }

    let isSubscribed = true
    setIsLoadingHistory(true)
    setRealtimeMessages([])

    fetchChatHistory(urlUserId).then(({ messages, hasMore: more }) => {
      if (!isSubscribed) return
      // Keep anything that arrived over the socket while history was loading
      setRealtimeMessages(prev => {
        const seen = new Set(messages.map(m => m._id))
        return [...messages, ...prev.filter(m => !seen.has(m._id))]
      })
      setHasMore(more)
      setIsLoadingHistory(false)
    })

    return () => { isSubscribed = false }
  }, [urlUserId, selectedUserExists, fetchChatHistory, setRealtimeMessages])

  const loadOlder = async () => {
    if (!chatMessages.length || loadingOlder) return
    const el = scrollRef.current
    const prevHeight = el?.scrollHeight || 0
    setLoadingOlder(true)
    const { messages, hasMore: more } = await fetchChatHistory(urlUserId, chatMessages[0].createdAt)
    setRealtimeMessages(prev => {
      const seen = new Set(prev.map(m => m._id))
      return [...messages.filter(m => !seen.has(m._id)), ...prev]
    })
    setHasMore(more)
    setLoadingOlder(false)
    // Keep the reader's place instead of jumping to the top
    requestAnimationFrame(() => { if (el) el.scrollTop = el.scrollHeight - prevHeight })
  }

  // Mark the open conversation read when it loads and whenever a new message lands in it
  const incomingCount = chatMessages.filter(m => m.senderId === urlUserId).length
  useEffect(() => {
    if (!urlUserId || !selectedUserExists || isLoadingHistory) return
    markChatAsRead(urlUserId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlUserId, selectedUserExists, isLoadingHistory, incomingCount])

  const lastMessageId = chatMessages[chatMessages.length - 1]?._id
  const otherIsTyping = !!typingFrom[urlUserId]
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [lastMessageId, otherIsTyping])

  // Stop the typing indicator when leaving a conversation
  useEffect(() => () => {
    clearTimeout(typingStopTimer.current)
    if (isTypingSent.current && urlUserId) sendTyping(urlUserId, false)
    isTypingSent.current = false
  }, [urlUserId, sendTyping])

  const handleChange = (value) => {
    setNewMessage(value)
    if (!selectedUser) return
    if (!isTypingSent.current && value.trim()) {
      sendTyping(selectedUser.id, true)
      isTypingSent.current = true
    }
    clearTimeout(typingStopTimer.current)
    typingStopTimer.current = setTimeout(() => {
      if (isTypingSent.current) sendTyping(selectedUser.id, false)
      isTypingSent.current = false
    }, 2500)
  }

  const handleSendMessage = (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedUser) return
    clearTimeout(typingStopTimer.current)
    isTypingSent.current = false
    sendMessage(selectedUser.id, newMessage.trim())
    setNewMessage('')
  }

  const formatTime = (dateString) => (dateString ? new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '')

  const formatDay = (dateString) => {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(Date.now() - 86400000)
    if (date.toDateString() === today.toDateString()) return 'Today'
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
    return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
  }

  // Receipt only under my latest message
  const lastMine = [...chatMessages].reverse().find(m => m.senderId === currentUser?.uid)

  return (
    <div className="flex h-full bg-base">

      {/* Contact list: full width on phones until a chat is open */}
      <div className={`w-full md:w-80 border-r border-raised bg-card flex-col flex-shrink-0 ${urlUserId ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-raised">
          <h1 className="text-lg font-bold text-white mb-4">Messages</h1>
          <div className="relative">
            <Search size={16} aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              aria-label="Search team members"
              placeholder="Search team..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-base border border-edge rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-accent-500 transition-colors placeholder-neutral-500"
            />
          </div>
        </div>

        <nav aria-label="Conversations" className="flex-1 overflow-y-auto custom-scrollbar p-2">
          {loading.members ? (
            <div className="space-y-2 p-1" role="status" aria-label="Loading team">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-3 p-3">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="flex-1 space-y-2"><Skeleton className="h-3 w-2/3" /><Skeleton className="h-3 w-1/3" /></div>
                </div>
              ))}
            </div>
          ) : filteredContacts.length > 0 ? (
            filteredContacts.map(contact => {
              const unreadCount = unreadCounts[contact.id] || 0
              const typing = typingFrom[contact.id]
              return (
                <button
                  type="button"
                  key={contact.id}
                  aria-current={selectedUser?.id === contact.id ? 'true' : undefined}
                  onClick={() => navigate(`/dashboard/messages/${contact.id}`, { replace: true })}
                  className={`w-full text-left flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors mb-1 ${selectedUser?.id === contact.id ? 'bg-accent-500/15 border border-accent-500/50' : 'hover:bg-raised border border-transparent'}`}
                >
                  <div className="relative flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-neutral-700 flex items-center justify-center text-sm font-bold text-white" aria-hidden="true">
                      {contact.avatar}
                    </div>
                    <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-card ${contact.status === 'online' ? 'bg-green-500' : 'bg-neutral-500'}`} aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm truncate ${unreadCount ? 'font-bold text-white' : 'font-semibold text-neutral-200'}`}>{contact.name}</p>
                    <p className={`text-xs truncate ${typing ? 'text-accent-300' : 'text-neutral-400 capitalize'}`}>
                      {typing ? 'typing…' : `${contact.status === 'online' ? 'Online' : 'Offline'} · ${contact.role || 'Member'}`}
                    </p>
                  </div>
                  {unreadCount > 0 && (
                    <span className="bg-red-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full tabular-nums" aria-label={`${unreadCount} unread`}>
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>
              )
            })
          ) : (
            <div className="p-8 text-center text-neutral-400 text-sm">No team members found.</div>
          )}
        </nav>
      </div>

      {/* Main Chat Area */}
      <section aria-label={selectedUser ? `Conversation with ${selectedUser.name}` : 'Conversation'} className={`flex-1 flex-col min-w-0 ${urlUserId ? 'flex' : 'hidden md:flex'}`}>
        {selectedUser ? (
          <>
            {/* Chat Header */}
            <div className="h-16 border-b border-raised bg-card flex items-center justify-between px-3 sm:px-6 flex-shrink-0 gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => navigate('/dashboard/messages')}
                  aria-label="Back to conversations"
                  className="md:hidden p-2 -ml-1 rounded-lg text-neutral-300 hover:text-white hover:bg-raised"
                >
                  <ArrowLeft size={18} />
                </button>
                <div className="w-10 h-10 rounded-full bg-neutral-700 flex items-center justify-center text-sm font-bold text-white flex-shrink-0" aria-hidden="true">
                  {selectedUser.avatar}
                </div>
                <div className="min-w-0">
                  <h2 className="font-bold text-white truncate">{selectedUser.name}</h2>
                  <p className="text-xs text-neutral-400" aria-live="polite">
                    {otherIsTyping ? <span className="text-accent-300">typing…</span> : <>{selectedUser.status === 'online' ? 'Online' : 'Offline'} · <span className="capitalize">{selectedUser.role || 'Member'}</span></>}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowProfile(true)}
                aria-label={`View ${selectedUser.name}'s profile`}
                className="text-neutral-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-raised"
              >
                <Info size={20} />
              </button>
            </div>

            {/* Messages Area */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar" role="log" aria-live="polite" aria-relevant="additions">
              {isLoadingHistory ? (
                <div className="space-y-4" role="status" aria-label="Loading conversation">
                  {[0, 1, 2].map(i => (
                    <div key={i} className={`flex ${i % 2 ? 'justify-end' : 'justify-start'}`}>
                      <Skeleton className={`h-10 rounded-2xl ${i % 2 ? 'w-1/3' : 'w-1/2'}`} />
                    </div>
                  ))}
                </div>
              ) : chatMessages.length > 0 ? (
                <>
                  {hasMore && (
                    <div className="flex justify-center">
                      <button
                        type="button"
                        onClick={loadOlder}
                        disabled={loadingOlder}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium text-neutral-300 bg-card border border-raised hover:bg-raised disabled:opacity-60"
                      >
                        {loadingOlder && <Loader2 size={12} className="animate-spin" aria-hidden="true" />} Load earlier messages
                      </button>
                    </div>
                  )}
                  {chatMessages.map((msg, index) => {
                    const isMine = msg.senderId === currentUser.uid
                    const prev = chatMessages[index - 1]
                    const showDay = !prev || new Date(prev.createdAt).toDateString() !== new Date(msg.createdAt).toDateString()
                    return (
                      <React.Fragment key={msg._id || index}>
                        {showDay && (
                          <div className="flex justify-center">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 bg-card border border-raised px-2.5 py-1 rounded-full">{formatDay(msg.createdAt)}</span>
                          </div>
                        )}
                        <div className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                          <div className={`max-w-[85%] sm:max-w-[70%] px-4 py-2.5 rounded-2xl ${isMine ? 'bg-accent-600 text-white rounded-tr-sm' : 'bg-card border border-raised text-neutral-100 rounded-tl-sm'}`}>
                            <p className="text-sm break-words whitespace-pre-wrap">{msg.text}</p>
                          </div>
                          <span className="text-[11px] text-neutral-400 mt-1 px-1 flex items-center gap-1">
                            {formatTime(msg.createdAt)}
                            {isMine && msg._id === lastMine?._id && (
                              msg.read
                                ? <span className="flex items-center gap-0.5 text-accent-300"><CheckCheck size={12} aria-hidden="true" /> Seen</span>
                                : <span className="flex items-center gap-0.5"><Check size={12} aria-hidden="true" /> Sent</span>
                            )}
                          </span>
                        </div>
                      </React.Fragment>
                    )
                  })}
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-neutral-400">
                  <MessageSquare size={48} className="opacity-30 mb-4" aria-hidden="true" />
                  <p className="text-sm">Start a conversation with {selectedUser.name}</p>
                </div>
              )}
              {otherIsTyping && !isLoadingHistory && (
                <div className="flex items-center gap-2 text-xs text-neutral-400" aria-hidden="true">
                  <span className="flex gap-1 bg-card border border-raised rounded-full px-3 py-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-bounce" />
                  </span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-3 sm:p-4 bg-card border-t border-raised">
              <form onSubmit={handleSendMessage} className="relative flex items-center">
                <input
                  type="text"
                  aria-label={`Message ${selectedUser.name}`}
                  value={newMessage}
                  maxLength={MAX_MESSAGE_LENGTH}
                  onChange={(e) => handleChange(e.target.value)}
                  placeholder={`Message ${selectedUser.name}...`}
                  className="w-full bg-base border border-edge rounded-xl pl-4 pr-12 py-3 text-sm text-white focus:outline-none focus:border-accent-500 transition-colors placeholder-neutral-500"
                />
                <button
                  type="submit"
                  aria-label="Send message"
                  disabled={!newMessage.trim()}
                  className="absolute right-2 p-2 bg-accent-600 text-white rounded-lg hover:bg-accent-500 disabled:opacity-50 disabled:hover:bg-accent-600 transition-colors"
                >
                  <Send size={16} />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-neutral-400 p-6 text-center">
            <MessageSquare size={64} className="opacity-20 mb-6" aria-hidden="true" />
            <h2 className="text-xl font-bold text-neutral-200 mb-2">
              {urlUserId && members.length > 0 ? 'Conversation not found' : 'Your Messages'}
            </h2>
            <p className="text-sm">Select a team member to start chatting.</p>
          </div>
        )}
      </section>

      <UserProfileModal user={showProfile ? selectedUser : null} onClose={() => setShowProfile(false)} />
    </div>
  )
}
