import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useProject } from '../context/ProjectContext'
import { Search, Send, MessageSquare, Info } from 'lucide-react'
import UserProfileModal from '../components/UserProfileModal'

const MAX_MESSAGE_LENGTH = 2000

export default function Messages() {
  const { userId: urlUserId } = useParams()
  const navigate = useNavigate()
  const { currentUser } = useAuth()

  const {
    members,
    notifications,
    realtimeMessages,
    setRealtimeMessages,
    sendMessage,
    fetchChatHistory,
    markChatAsRead,
    markMessagesAsReadForUser
  } = useProject()

  const [newMessage, setNewMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [showProfile, setShowProfile] = useState(false)

  const messagesEndRef = useRef(null)

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

  const filteredContacts = contacts.filter(c =>
    c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Load history when the conversation changes (not on every presence update)
  useEffect(() => {
    if (!urlUserId || !selectedUserExists) {
      setRealtimeMessages([])
      return
    }

    let isSubscribed = true
    setIsLoadingHistory(true)
    setRealtimeMessages([])

    fetchChatHistory(urlUserId).then(history => {
      if (!isSubscribed) return
      // Keep anything that arrived over the socket while history was loading
      setRealtimeMessages(prev => {
        const seen = new Set(history.map(m => m._id))
        return [...history, ...prev.filter(m => !seen.has(m._id))]
      })
      setIsLoadingHistory(false)
    })

    return () => { isSubscribed = false }
  }, [urlUserId, selectedUserExists, fetchChatHistory, setRealtimeMessages])

  // Mark the open conversation read when it loads and whenever a new message lands in it
  const incomingCount = chatMessages.filter(m => m.senderId === urlUserId).length
  useEffect(() => {
    if (!urlUserId || !selectedUserExists || isLoadingHistory) return
    markChatAsRead(urlUserId)
    markMessagesAsReadForUser(urlUserId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlUserId, selectedUserExists, isLoadingHistory, incomingCount])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages.length])

  const handleSendMessage = (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedUser) return

    sendMessage(selectedUser.id, newMessage.trim())
    setNewMessage('')
  }

  const formatTime = (dateString) => {
    if (!dateString) return ''
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const formatDay = (dateString) => {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(Date.now() - 86400000)
    if (date.toDateString() === today.toDateString()) return 'Today'
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
    return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
  }

  return (
    <div className="flex h-full bg-base">

      {/* Sidebar - Contact List */}
      <div className="w-80 border-r border-raised bg-card flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-raised">
          <h2 className="text-lg font-bold text-white mb-4">Messages</h2>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              aria-label="Search team members"
              placeholder="Search team..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-base border border-edge rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-accent-500 transition-colors"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
          {filteredContacts.length > 0 ? (
            filteredContacts.map(contact => {
              // Calculate unread badge count for this specific user
              const unreadCount = notifications.filter(
                n => n.type === 'message' && n.taskId === contact.id && !n.read
              ).length

              return (
                <button
                  type="button"
                  key={contact.id}
                  aria-current={selectedUser?.id === contact.id ? 'true' : undefined}
                  onClick={() => navigate(`/dashboard/messages/${contact.id}`, { replace: true })}
                  className={`w-full text-left flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors mb-1 ${selectedUser?.id === contact.id ? 'bg-accent-500/15 border border-accent-500/50' : 'hover:bg-raised border border-transparent'
                    }`}
                >
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-neutral-700 flex items-center justify-center text-sm font-bold text-white">
                      {contact.avatar}
                    </div>
                    <div
                      aria-label={contact.status === 'online' ? 'Online' : 'Offline'}
                      className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-card ${contact.status === 'online' ? 'bg-green-500' : 'bg-neutral-500'}`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-neutral-200 truncate">{contact.name}</p>
                    <p className="text-xs text-neutral-500 truncate capitalize">{contact.role || 'Member'}</p>
                  </div>

                  {/* UNREAD BADGE */}
                  {unreadCount > 0 && (
                    <div className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full" aria-label={`${unreadCount} unread`}>
                      {unreadCount}
                    </div>
                  )}
                </button>
              )
            })
          ) : (
            <div className="p-8 text-center text-neutral-500 text-sm">
              No team members found.
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedUser ? (
          <>
            {/* Chat Header */}
            <div className="h-16 border-b border-raised bg-card flex items-center justify-between px-6 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-neutral-700 flex items-center justify-center text-sm font-bold text-white">
                  {selectedUser.avatar}
                </div>
                <div>
                  <h3 className="font-bold text-white">{selectedUser.name}</h3>
                  <p className="text-xs text-neutral-400">
                    {selectedUser.status === 'online' ? 'Online' : 'Offline'} · <span className="capitalize">{selectedUser.role || 'Member'}</span>
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
            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar" aria-live="polite">
              {isLoadingHistory ? (
                <div className="h-full flex items-center justify-center text-accent-500" role="status" aria-label="Loading conversation">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-current"></div>
                </div>
              ) : chatMessages.length > 0 ? (
                chatMessages.map((msg, index) => {
                  const isMine = msg.senderId === currentUser.uid
                  const prev = chatMessages[index - 1]
                  const showDay = !prev || new Date(prev.createdAt).toDateString() !== new Date(msg.createdAt).toDateString()
                  return (
                    <React.Fragment key={msg._id || index}>
                      {showDay && (
                        <div className="flex justify-center">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 bg-card border border-raised px-2.5 py-1 rounded-full">{formatDay(msg.createdAt)}</span>
                        </div>
                      )}
                      <div className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                        <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl ${isMine
                          ? 'bg-accent-600 text-white rounded-tr-sm'
                          : 'bg-card border border-raised text-neutral-200 rounded-tl-sm'
                          }`}>
                          <p className="text-sm break-words whitespace-pre-wrap">{msg.text}</p>
                        </div>
                        <span className="text-[10px] text-neutral-500 mt-1 px-1">
                          {formatTime(msg.createdAt)}
                        </span>
                      </div>
                    </React.Fragment>
                  )
                })
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-neutral-500">
                  <MessageSquare size={48} className="opacity-20 mb-4" />
                  <p className="text-sm">Start a conversation with {selectedUser.name}</p>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 bg-card border-t border-raised">
              <form onSubmit={handleSendMessage} className="relative flex items-center">
                <input
                  type="text"
                  aria-label={`Message ${selectedUser.name}`}
                  value={newMessage}
                  maxLength={MAX_MESSAGE_LENGTH}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={`Message ${selectedUser.name}...`}
                  className="w-full bg-base border border-edge rounded-xl pl-4 pr-12 py-3 text-sm text-white focus:outline-none focus:border-accent-500 transition-colors"
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
          <div className="h-full flex flex-col items-center justify-center text-neutral-500">
            <MessageSquare size={64} className="opacity-10 mb-6" />
            <h2 className="text-xl font-bold text-neutral-300 mb-2">
              {urlUserId && members.length > 0 ? 'Conversation not found' : 'Your Messages'}
            </h2>
            <p className="text-sm">Select a team member to start chatting.</p>
          </div>
        )}
      </div>

      <UserProfileModal user={showProfile ? selectedUser : null} onClose={() => setShowProfile(false)} />
    </div>
  )
}
