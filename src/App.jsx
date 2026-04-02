import { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'

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
        <div key={i} style={{
          width: '6px', height: '6px', borderRadius: '50%', background: '#6b6a65',
          animation: `bounce 1.2s infinite ${i * 0.2}s`
        }} />
      ))}
    </div>
  )
}

function ChatInterface() {
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
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.page}>
      <style>{`@keyframes bounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-4px)} }`}</style>
      <div style={styles.window}>
        <div style={styles.header}>
          <div style={styles.avatar}><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><path d="M552 264C582.9 264 608 289.1 608 320C608 350.9 582.9 376 552 376L424.7 376L265.5 549.6C259.4 556.2 250.9 560 241.9 560L198.2 560C187.3 560 179.6 549.3 183 538.9L237.3 376L137.6 376L84.8 442C81.8 445.8 77.2 448 72.3 448L52.5 448C42.1 448 34.5 438.2 37 428.1L64 320L37 211.9C34.4 201.8 42.1 192 52.5 192L72.3 192C77.2 192 81.8 194.2 84.8 198L137.6 264L237.3 264L183 101.1C179.6 90.7 187.3 80 198.2 80L241.9 80C250.9 80 259.4 83.8 265.5 90.4L424.7 264L552 264z"/></svg></div>
          <div>
            <div style={styles.name}>AI travel concierge</div>
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
            placeholder="Type a message..."
          />
          <button style={styles.sendBtn} onClick={sendMessage}>Send</button>
        </div>
      </div>
    </div>
  )
}

export default ChatInterface