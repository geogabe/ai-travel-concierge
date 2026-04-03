import { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import { v4 as uuidv4 } from 'uuid'

const colors = {
  tomoroGreen: '#00ff88',
  bg: '#0e0e0f',
  surface: '#1e1e20',
  border: 'rgba(255,255,255,0.08)',
  text: '#e8e6e0',
  muted: '#6b6a65',
}

const styles = {
  page: { minHeight: '100vh', background: '#0e0e0f', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' },
  window: { width: '520px', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', background: '#0e0e0f', display: 'flex', flexDirection: 'column', height: '600px' },
  header: { padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '10px' },
  avatar: { width: '28px', height: '28px', borderRadius: '50%', background: colors.tomoroGreen, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '500', color: '#1a1535' },
  name: { fontSize: '13px', fontWeight: '500', color: '#e8e6e0' },
  status: { fontSize: '11px', color: '#5dcaa5', marginTop: '2px' },
  messages: { flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' },
  inputRow: { padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: '8px' },
  input: { flex: 1, background: '#1e1e20', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '9px 14px', fontSize: '13px', color: '#e8e6e0', outline: 'none', fontFamily: 'sans-serif' },
  sendBtn: { background: colors.tomoroGreen, border: 'none', borderRadius: '10px', padding: '9px 16px', fontSize: '13px', fontWeight: '500', color: '#1a1535', cursor: 'pointer' },
}

function Message({ role, content }) {
  const isUser = role === 'user'
  return (
    <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
      <div style={{
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
      }}className="prose">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div style={{ display: 'flex', gap: '4px', padding: '12px 14px', background: '#1e1e20', borderRadius: '12px', borderBottomLeftRadius: '4px', border: '1px solid rgba(255,255,255,0.06)', width: 'fit-content' }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: '6px', height: '6px', borderRadius: '50%', background: '#6b6a65',
          animation: `bounce 1.2s infinite ${i * 0.2}s`
        }} />
      ))}
    </div>
  )
}

function ChatInterface() {
  const [sessionId] = useState(() => uuidv4())
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi Geoffroy — how can I help you today?' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [totalCost, setTotalCost] = useState(0)
  const bottomRef = useRef(null)
  const [usage, setUsage] = useState(null)

  useEffect(() => {
    const fetchUsage = async () => {
      const response = await fetch('https://ai-travel-concierge-backend-production.up.railway.app/usage')
      const data = await response.json()
      setUsage(data)
    }
    fetchUsage()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim()) return
    const newMessage = { role: 'user', content: input }
    setMessages(prev => [...prev, newMessage])
    setInput('')
    setLoading(true)
    try {
      const response = await fetch('https://ai-travel-concierge-backend-production.up.railway.app/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: sessionId,
          messages: [...messages, newMessage]
        })
      })
      if (!response.ok) {
      const errorData = await response.json()
      console.error('Anthropic API Error:', errorData)
      throw new Error(JSON.stringify(errorData))
    }
    const data = await response.json()
    const inputTokens = data.usage.input_tokens
    const outputTokens = data.usage.output_tokens
    const tokens = inputTokens + outputTokens
    setTotalCost(prev => prev + (tokens / 1000 * 0.001))
    const reply = data.content[0].text
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Hmmm, it seems like I got lost in translation!' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.page}>
      <style>{`
  @keyframes bounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-4px)} }
  .prose h1, .prose h2, .prose h3 { font-size: 14px; font-weight: 600; margin: 4px 0; }
  .prose p { margin: 4px 0; }
  .prose ul { padding-left: 16px; margin: 4px 0; }
  .prose li { margin: 2px 0; }
  .prose strong { font-weight: 600; }
`}</style>
      <div style={styles.window}>
        <div style={styles.header}>
          <div style={styles.avatar}><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-backpack4" viewBox="0 0 16 16">
  <path d="M4 9.5a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 .5.5v4a.5.5 0 0 1-.5.5h-7a.5.5 0 0 1-.5-.5zm1 .5v3h6v-3h-1v.5a.5.5 0 0 1-1 0V10z"/>
  <path d="M8 0a2 2 0 0 0-2 2H3.5a2 2 0 0 0-2 2v1c0 .52.198.993.523 1.349A.5.5 0 0 0 2 6.5V14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V6.5a.5.5 0 0 0-.023-.151c.325-.356.523-.83.523-1.349V4a2 2 0 0 0-2-2H10a2 2 0 0 0-2-2m0 1a1 1 0 0 0-1 1h2a1 1 0 0 0-1-1M3 14V6.937q.24.062.5.063h4v.5a.5.5 0 0 0 1 0V7h4q.26 0 .5-.063V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1m9.5-11a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/>
</svg></div>
          <div>
            <div style={styles.name}>Ecotravel advisor</div>
            <div style={styles.status}>● online</div>
          </div>
         <div style={{ marginLeft: 'auto', fontSize: '11px', color: colors.muted, fontFamily: 'monospace', textAlign: 'right' }}>
          <div style={{ color: colors.tomoroGreen }}>${usage ? usage.remaining.toFixed(4) : '...'}<span style={{ color: colors.muted }}> Remaining</span></div>
        </div>
        </div>
        <div style={styles.messages}>
          {messages.map((msg, i) => <Message key={i} role={msg.role} content={msg.content} />)}
          {loading && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>
        <div style={styles.inputRow}>
          <input
            style={styles.input}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Hi Geoffroy, how can I help you today?..."
          />
          <button style={styles.sendBtn} onClick={sendMessage}>Send</button>
        </div>
      </div>
    </div>
  )
}

export default ChatInterface