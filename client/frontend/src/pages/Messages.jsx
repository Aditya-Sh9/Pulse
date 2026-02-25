import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useProject } from '../context/ProjectContext'
import { Search, Send, MessageSquare, Info } from 'lucide-react'

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

  const [selectedUser, setSelectedUser] = useState(null)
  const [newMessage, setNewMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)

  const messagesEndRef = useRef(null)

  const contacts = React.useMemo(() => members.filter(m => m.id !== currentUser?.uid), [members, currentUser?.uid]);

  const filteredContacts = contacts.filter(c =>
    c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  useEffect(() => {
    if (!urlUserId) {
      setSelectedUser(null)
      setRealtimeMessages([])
      return
    }

    const user = contacts.find(m => m.id === urlUserId)
    if (!user) return

    let isSubscribed = true

    setSelectedUser(user)
    setIsLoadingHistory(true)
    setRealtimeMessages([])

    fetchChatHistory(user.id).then(history => {
      if (isSubscribed) {
        setRealtimeMessages(history)
        setIsLoadingHistory(false)
        markChatAsRead(user.id)
        markMessagesAsReadForUser(user.id)
      }
    })

    return () => {
      isSubscribed = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlUserId, contacts])

  // Automatically mark messages as read if they arrive while chatting with that specific user
  useEffect(() => {
    if (selectedUser) {
      markChatAsRead(selectedUser.id);
      markMessagesAsReadForUser(selectedUser.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [realtimeMessages, selectedUser?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [realtimeMessages])

  const handleSendMessage = (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedUser) return

    sendMessage(selectedUser.id, newMessage.trim())
    setNewMessage('')
  }

  const formatTime = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="flex h-full bg-[#0F1117]">

      {/* Sidebar - Contact List */}
      <div className="w-80 border-r border-[#2B2D31] bg-[#1E1F21] flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-[#2B2D31]">
          <h2 className="text-lg font-bold text-white mb-4">Messages</h2>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search team..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#111] border border-[#3E4045] rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
          {filteredContacts.length > 0 ? (
            filteredContacts.map(contact => {
              // Calculate unread badge count for this specific user
              const unreadCount = notifications.filter(
                n => n.type === 'message' && n.taskId === contact.id && !n.read
              ).length;

              return (
                <div
                  key={contact.id}
                  onClick={() => navigate(`/dashboard/messages/${contact.id}`, { replace: true })}
                  className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors mb-1 ${selectedUser?.id === contact.id ? 'bg-[#3C245C] border border-purple-500/50' : 'hover:bg-[#2B2D31] border border-transparent'
                    }`}
                >
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold text-white shadow-inner">
                      {contact.avatar}
                    </div>
                    <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#1E1F21] ${contact.status === 'online' ? 'bg-green-500' : 'bg-gray-500'
                      }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-200 truncate">{contact.name}</p>
                    <p className="text-xs text-gray-500 truncate capitalize">{contact.role || 'Member'}</p>
                  </div>

                  {/* UNREAD BADGE */}
                  {unreadCount > 0 && (
                    <div className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg">
                      {unreadCount}
                    </div>
                  )}
                </div>
              )
            })
          ) : (
            <div className="p-8 text-center text-gray-500 text-sm">
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
            <div className="h-16 border-b border-[#2B2D31] bg-[#1E1F21] flex items-center justify-between px-6 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold text-white">
                  {selectedUser.avatar}
                </div>
                <div>
                  <h3 className="font-bold text-white">{selectedUser.name}</h3>
                  <p className="text-xs text-gray-400 capitalize">{selectedUser.role || 'Member'}</p>
                </div>
              </div>
              <button className="text-gray-400 hover:text-white transition-colors">
                <Info size={20} />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
              {isLoadingHistory ? (
                <div className="h-full flex items-center justify-center text-purple-500">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-current"></div>
                </div>
              ) : realtimeMessages.length > 0 ? (
                realtimeMessages.map((msg, index) => {
                  const isMine = msg.senderId === currentUser.uid
                  return (
                    <div key={msg._id || msg.id || index} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                      <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl ${isMine
                        ? 'bg-purple-600 text-white rounded-tr-sm'
                        : 'bg-[#1E1F21] border border-[#2B2D31] text-gray-200 rounded-tl-sm'
                        }`}>
                        <p className="text-sm break-words">{msg.text}</p>
                      </div>
                      <span className="text-[10px] text-gray-500 mt-1 px-1">
                        {formatTime(msg.createdAt)}
                      </span>
                    </div>
                  )
                })
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-500">
                  <MessageSquare size={48} className="opacity-20 mb-4" />
                  <p className="text-sm">Start a conversation with {selectedUser.name}</p>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 bg-[#1E1F21] border-t border-[#2B2D31]">
              <form onSubmit={handleSendMessage} className="relative flex items-center">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={`Message ${selectedUser.name}...`}
                  className="w-full bg-[#111] border border-[#3E4045] rounded-xl pl-4 pr-12 py-3 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="absolute right-2 p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 disabled:opacity-50 disabled:hover:bg-purple-600 transition-colors"
                >
                  <Send size={16} />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-500">
            <MessageSquare size={64} className="opacity-10 mb-6" />
            <h2 className="text-xl font-bold text-gray-300 mb-2">Your Messages</h2>
            <p className="text-sm">Select a team member to start chatting.</p>
          </div>
        )}
      </div>
    </div>
  )
}