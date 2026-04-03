import { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import { v4 as uuidv4 } from 'uuid'

const API = 'https://ai-travel-concierge-backend-production.up.railway.app'

const colors = {
  tomoroGreen: '#00ff88',
  bg: '#0e0e0f',
  surface: '#1e1e20',
  border: 'rgba(255,255,255,0.08)',
  text: '#e8e6e0',
  muted: '#6b6a65',
}

function Message({ role, content }) {
  const isUser = role === 'user'
  return (
    <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
      <div className="prose" style={{
        maxWidth: '75%',
        padding: '10px 14px',
        textAlign: 'left',
        borderRadius: '12px',
        borderBottomRightRadius: isUser ? '4px' : '12px',
        borderBottomLeftRadius: isUser ? '12px' : '4px',
        background: isUser ? colors.tomoroGreen : '#1e1e20',
        color: isUser ? '#1a1535' : '#e8e6e0',
        border: isUser ? 'none' : '1px solid rgba(255,255,255,0.06)',
        fontSize: '13px',
        lineHeight: '1.5',
        overflow: 'hidden',
      }}>
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div style={{ display: 'flex', gap: '4px', padding: '12px 14px', background: '#1e1e20', borderRadius: '12px', borderBottomLeftRadius: '4px', border: '1px solid rgba(255,255,255,0.06)', width: 'fit-content' }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#6b6a65', animation: `bounce 1.2s infinite ${i * 0.2}s` }} />
      ))}
    </div>
  )
}

function Sidebar({ sessions, activeSessionId, onSelect, onNew, onDelete }) {
  return (
    <div style={{
      width: '220px',
      background: '#111113',
      borderRight: '1px solid rgba(255,255,255,0.06)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
    }}>
      <div style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <button onClick={onNew} style={{
          width: '100%',
          background: colors.tomoroGreen,
          border: 'none',
          borderRadius: '8px',
          padding: '8px 12px',
          fontSize: '12px',
          fontWeight: '500',
          color: '#1a1535',
          cursor: 'pointer',
        }}>
          + New conversation
        </button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
        {sessions.length === 0 && (
          <div style={{ fontSize: '11px', color: colors.muted, padding: '12px 8px' }}>
            No past conversations yet
          </div>
        )}
        {sessions.map(s => (
          <div key={s.session_id} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            borderRadius: '8px',
            background: s.session_id === activeSessionId ? '#1e1e20' : 'transparent',
            border: s.session_id === activeSessionId ? '1px solid rgba(255,255,255,0.08)' : '1px solid transparent',
            marginBottom: '4px',
            padding: '2px 4px',
          }}>
            <div
              onClick={() => onSelect(s.session_id)}
              style={{ flex: 1, padding: '6px 4px', cursor: 'pointer' }}
            >
              <div style={{ fontSize: '11px', color: colors.text, lineHeight: '1.4', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {s.title}
              </div>
              <div style={{ fontSize: '10px', color: colors.muted, marginTop: '2px' }}>
                {new Date(s.started_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
              </div>
            </div>
            <button
              onClick={() => onDelete(s.session_id)}
              style={{ background: 'none', border: 'none', color: colors.muted, cursor: 'pointer', fontSize: '14px', padding: '4px', lineHeight: 1, flexShrink: 0 }}
              title="Delete conversation"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function ChatInterface() {
  const [sessionId, setSessionId] = useState(() => uuidv4())
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi Geoffroy — how can I help you today?' }
  ])
  const [sessions, setSessions] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [usage, setUsage] = useState(null)
  const bottomRef = useRef(null)

  const fetchUsage = async () => {
    const res = await fetch(`${API}/usage`)
    const data = await res.json()
    setUsage(data)
  }

  const fetchSessions = async () => {
    const res = await fetch(`${API}/sessions`)
    const data = await res.json()
    setSessions(data)
  }

  useEffect(() => {
    fetchUsage()
    fetchSessions()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const startNewConversation = () => {
    setSessionId(uuidv4())
    setMessages([{ role: 'assistant', content: 'Hi Geoffroy — how can I help you today?' }])
  }

  const loadSession = async (sid) => {
    const res = await fetch(`${API}/sessions/${sid}`)
    const data = await res.json()
    setSessionId(sid)
    setMessages([
      { role: 'assistant', content: 'Hi Geoffroy — how can I help you today?' },
      ...data
    ])
  }

  const deleteSession = async (sid) => {
    await fetch(`${API}/sessions/${sid}`, { method: 'DELETE' })
    fetchSessions()
    if (sid === sessionId) startNewConversation()
  }

  const sendMessage = async () => {
    if (!input.trim()) return
    const newMessage = { role: 'user', content: input }
    setMessages(prev => [...prev, newMessage])
    setInput('')
    setLoading(true)
    try {
      const response = await fetch(`${API}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          messages: [...messages, newMessage]
        })
      })
      if (!response.ok) throw new Error('API error')
      const data = await response.json()
      const reply = data.content[0].text
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
      fetchUsage()
      fetchSessions()
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Hmmm, it seems like I got lost in translation!' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0e0e0f', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
      <style>{`
        @keyframes bounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-4px)} }
        .prose h1, .prose h2, .prose h3 { font-size: 14px; font-weight: 600; margin: 4px 0; }
        .prose p { margin: 4px 0; }
        .prose ul { padding-left: 16px; margin: 4px 0; }
        .prose li { margin: 2px 0; }
        .prose strong { font-weight: 600; }
      `}</style>

      <div style={{ display: 'flex', width: '820px', height: '620px', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', background: '#0e0e0f' }}>

        <Sidebar
          sessions={sessions}
          activeSessionId={sessionId}
          onSelect={loadSession}
          onNew={startNewConversation}
          onDelete={deleteSession}
        />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Header */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: colors.tomoroGreen, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1a1535' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path d="M4 9.5a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 .5.5v4a.5.5 0 0 1-.5.5h-7a.5.5 0 0 1-.5-.5zm1 .5v3h6v-3h-1v.5a.5.5 0 0 1-1 0V10z"/>
                <path d="M8 0a2 2 0 0 0-2 2H3.5a2 2 0 0 0-2 2v1c0 .52.198.993.523 1.349A.5.5 0 0 0 2 6.5V14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V6.5a.5.5 0 0 0-.023-.151c.325-.356.523-.83.523-1.349V4a2 2 0 0 0-2-2H10a2 2 0 0 0-2-2m0 1a1 1 0 0 0-1 1h2a1 1 0 0 0-1-1M3 14V6.937q.24.062.5.063h4v.5a.5.5 0 0 0 1 0V7h4q.26 0 .5-.063V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1m9.5-11a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/>
              </svg>
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '500', color: '#e8e6e0' }}>Ecotravel advisor</div>
              <div style={{ fontSize: '11px', color: '#5dcaa5', marginTop: '2px' }}>● online</div>
            </div>
            <div style={{ marginLeft: 'auto', fontSize: '11px', color: colors.muted, fontFamily: 'monospace', textAlign: 'right' }}>
              <div style={{ color: colors.tomoroGreen }}>${usage ? usage.remaining.toFixed(4) : '...'}<span style={{ color: colors.muted }}> Remaining</span></div>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {messages.map((msg, i) => <Message key={i} role={msg.role} content={msg.content} />)}
            {loading && <TypingIndicator />}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: '8px' }}>
            <input
              style={{ flex: 1, background: '#1e1e20', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '9px 14px', fontSize: '13px', color: '#e8e6e0', outline: 'none', fontFamily: 'sans-serif' }}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Hi Geoffroy, how can I help you today?..."
            />
            <button
              style={{ background: colors.tomoroGreen, border: 'none', borderRadius: '10px', padding: '9px 16px', fontSize: '13px', fontWeight: '500', color: '#1a1535', cursor: 'pointer' }}
              onClick={sendMessage}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ChatInterface