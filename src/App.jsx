import { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import { v4 as uuidv4 } from 'uuid'
import './styles.css'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'


// ─── Category detection ────────────────────────────────────────────────────────

function detectCategory(title = '') {
  const s = title.toLowerCase()
  if (/hôtel|gîte|logement|chambre|accommodation|airbnb|homexchange|nuit/.test(s)) return 'accommodation'
  if (/voyage|itinéraire|trip|planif|semaine|jours|circuit/.test(s)) return 'trip'
  if (/destination|où|partir|visiter|découvrir/.test(s)) return 'destination'
  return 'default'
}

// ─── SVG Icons ────────────────────────────────────────────────────────────────

function IconToggle() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M3 6h18M3 12h18M3 18h18"/>
    </svg>
  )
}

function IconDestination() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21C12 21 5 13.5 5 9a7 7 0 0 1 14 0c0 4.5-7 12-7 12z"/>
      <circle cx="12" cy="9" r="2.5"/>
    </svg>
  )
}

function IconTrip() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2"/>
      <path d="M3 9h18M8 5V3M16 5V3M7 13h2M11 13h2M15 13h2"/>
    </svg>
  )
}

function IconAccommodation() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21V9l9-6 9 6v12M9 21V15h6v6"/>
    </svg>
  )
}

function IconDefault() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  )
}

function CategoryIcon({ title }) {
  const cat = detectCategory(title)
  if (cat === 'destination')   return <IconDestination />
  if (cat === 'trip')          return <IconTrip />
  if (cat === 'accommodation') return <IconAccommodation />
  return <IconDefault />
}

// ─── Tool badges ───────────────────────────────────────────────────────────────

const TOOL_META = {
  search_trains:    { label: 'Trains',  icon: '🚆' },
  search_driving:   { label: 'Voiture', icon: '🚗' },
  calculate_carbon: { label: 'Carbone', icon: '🌿' },
  web_search:       { label: 'Web',     icon: '🔍' },
}

function ToolBadges({ toolsUsed = [] }) {
  const unique = [...new Set(toolsUsed)].filter(t => TOOL_META[t])
  if (!unique.length) return null
  return (
    <div className="message__badges">
      {unique.map(tool => (
        <span key={tool} className="tool-badge">
          {TOOL_META[tool].icon} {TOOL_META[tool].label}
        </span>
      ))}
    </div>
  )
}

// ─── Transport card ────────────────────────────────────────────────────────────

function CarbonBar({ co2, co2Max }) {
  const pct = Math.min(100, Math.round((co2 / co2Max) * 100))
  const cls = pct < 20 ? 'low' : pct < 60 ? 'mid' : 'high'
  return (
    <div className="transport-option__carbon-bar">
      <div
        className={`transport-option__carbon-fill transport-option__carbon-fill--${cls}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

function TransportOption({ option }) {
  const isRecommended = option.badge === 'recommended'
  return (
    <div className={`transport-option ${isRecommended ? 'transport-option--recommended' : ''}`}>
      {option.badge && (
        <span className={`transport-option__badge transport-option__badge--${option.badge}`}>
          {option.badgeLabel}
        </span>
      )}

      <div className="transport-option__mode">
        <div className="transport-option__icon" aria-hidden="true">{option.icon}</div>
        <div>
          <div className="transport-option__label">{option.label}</div>
          <div className="transport-option__sublabel">{option.sublabel}</div>
        </div>
      </div>

      <div className="transport-option__stats">
        <div className="transport-option__stat">
          <span className="transport-option__stat-label">Durée</span>
          <span className="transport-option__stat-value">{option.duration}</span>
        </div>
        <div className="transport-option__stat">
          <span className="transport-option__stat-label">Coût famille</span>
          <span className="transport-option__stat-value transport-option__stat-value--copper">
            {option.cost} €
          </span>
        </div>
        <div className="transport-option__stat">
          <span className="transport-option__stat-label">CO₂ total</span>
          <span className={`transport-option__stat-value transport-option__stat-value--${
            option.co2 < 20 ? 'sage' : option.co2 < 100 ? 'copper' : 'terra'
          }`}>
            {option.co2} kg
          </span>
        </div>
      </div>

      <CarbonBar co2={option.co2} co2Max={option.co2Max} />
    </div>
  )
}

function TransportCard({ data, narrative }) {
  const co2Max = Math.max(...data.options.map(o => o.co2))
  return (
    <div className="transport-card">
      <div className="transport-card__header">
        <span className="transport-card__route">{data.origin}</span>
        <span className="transport-card__arrow">→</span>
        <span className="transport-card__route">{data.destination}</span>
        <span className="transport-card__meta">{data.passengers} personnes</span>
      </div>
      <div className="transport-card__options">
        {data.options.map(opt => (
          <TransportOption key={opt.id} option={opt} co2Max={co2Max} />
        ))}
      </div>
      {narrative && (
        <>
          <div className="transport-card__divider" />
          <div className="transport-card__narrative">
            <ReactMarkdown>{narrative}</ReactMarkdown>
          </div>
        </>
      )}
    </div>
  )
}

// ─── itinerary map card ─────────────────────────────────────────────────────────────

function TripMap({ stops }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    const map = L.map(mapRef.current).setView(
      [stops[0].lat, stops[0].lng], 5
    )

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap'
    }).addTo(map)

    stops.forEach(stop => {
      L.marker([stop.lat, stop.lng])
        .addTo(map)
        .bindPopup(stop.city)
    })

    const coords = stops.map(s => [s.lat, s.lng])
    L.polyline(coords, { color: '#C47457', weight: 2 }).addTo(map)

    mapInstanceRef.current = map
  }, [stops])

  return <div ref={mapRef} style={{ height: '240px', borderRadius: '16px' }} />
}

// ─── Thinking dots ─────────────────────────────────────────────────────────────

function ThinkingDots() {
  return (
    <div className="thinking">
      <span className="thinking__dot" />
      <span className="thinking__dot" />
      <span className="thinking__dot" />
    </div>
  )
}

// ─── Message ───────────────────────────────────────────────────────────────────

function Message({ role, content, toolsUsed = [], cards = null, itinerary = null }) {
  const isUser = role === 'user'
  return (
    <div className="message">
      <span className={`message__sender ${isUser ? 'message__sender--user' : ''}`}>
        {isUser ? 'Vous' : 'Écotravel'}
      </span>

      {/* Transport card renders above the text bubble */}
      {!isUser && cards?.type === 'transport' && (
        <TransportCard data={cards} narrative={content} />
      )}

      {!isUser && itinerary?.type === 'itinerary' && (
        <ItineraryCard data={itinerary} narrative={content} />
      )}

      {/* Only render bubble if no cards */}
      {(isUser || (!cards && !itinerary)) && (
        <div className={`message__bubble ${isUser ? 'message__bubble--user' : 'message__bubble--assistant'}`}>
          {isUser ? content : <ReactMarkdown>{content}</ReactMarkdown>}
        </div>
      )}

      {!isUser && <ToolBadges toolsUsed={toolsUsed} />}

      
    </div>
  )
}

function ItineraryCard({ data, narrative }) {
  return (
    <div className="itinerary-card">
      <div className="itinerary-card__header">
        <h2 className="itinerary-card__title">{data.title}</h2>
      </div>
      <TripMap stops={data.stops} />
      {narrative && (
        <div className="itinerary-card__narrative">
          <ReactMarkdown>{narrative}</ReactMarkdown>
        </div>
      )}
    </div>
  )
}

// ─── Session row ───────────────────────────────────────────────────────────────

function SessionRow({ session, isActive, onSelect, onDelete }) {
  return (
    <div className={`session-row ${isActive ? 'session-row--active' : ''}`}>
      <span className="session-row__icon">
        <CategoryIcon title={session.title} />
      </span>
      <button className="session-row__btn" onClick={() => onSelect(session.session_id)}>
        <div className="session-row__title">{session.title}</div>
        <div className="session-row__date">
          {new Date(session.started_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
        </div>
      </button>
      <button className="session-row__delete" onClick={() => onDelete(session.session_id)}>×</button>
    </div>
  )
}

// ─── Sidebar ───────────────────────────────────────────────────────────────────

function Sidebar({ sessions, activeId, onSelect, onNew, onDelete, collapsed, onToggle, usage, isOnline }) {
  return (
    <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}>
      <div className="sidebar__header">
        <div className="sidebar__title-row">
          <h1 className="sidebar__title">Écotravel<br/>buddy</h1>
          <button className="sidebar__toggle" onClick={onToggle} aria-label="Masquer">
            <IconToggle />
          </button>
        </div>
        <div className="sidebar__status">
          <span className={`sidebar__dot ${isOnline ? 'sidebar__dot--online' : ''}`} />
          <span className="sidebar__status-label">{isOnline ? 'En ligne' : 'Hors ligne'}</span>
        </div>
        <button className="sidebar__new-btn" onClick={onNew}>
          <span className="sidebar__new-btn-icon">+</span>
          Nouvelle conversation
        </button>
      </div>

      <div className="sidebar__section-label">Récents</div>

      <div className="sidebar__sessions">
        {sessions.length === 0
          ? <p className="sidebar__empty">Aucune conversation</p>
          : sessions.map(s => (
              <SessionRow
                key={s.session_id} session={s}
                isActive={s.session_id === activeId}
                onSelect={onSelect} onDelete={onDelete}
              />
            ))
        }
      </div>

      {usage && (
        <div className="sidebar__footer">
          <div className="sidebar__budget-label">API Budget</div>
          <div>
            <span className="sidebar__budget-amount">${usage.remaining.toFixed(3)}</span>
            <span className="sidebar__budget-suffix"> restant</span>
          </div>
          <div className="sidebar__budget-count">
            {usage.messages_count} message{usage.messages_count !== 1 ? 's' : ''}
          </div>
        </div>
      )}
    </aside>
  )
}

function CollapsedToggle({ onToggle }) {
  return (
    <button className="collapsed-toggle" onClick={onToggle} aria-label="Afficher la barre latérale">
      <IconToggle />
    </button>
  )
}

// ─── Main app ──────────────────────────────────────────────────────────────────

export default function App() {
  const [sessionId, setSessionId] = useState(() => uuidv4())
  const [messages, setMessages]   = useState([])
  const [sessions, setSessions]   = useState([])
  const [input, setInput]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [sidebarOpen, setSidebar] = useState(true)
  const [usage, setUsage]         = useState(null)
  const bottomRef                 = useRef(null)
  const textareaRef               = useRef(null)

  const fetchSessions = async () => {
    try { setSessions(await (await fetch(`${API_URL}/sessions`)).json()) } catch {}
  }
  const fetchUsage = async () => {
    try { setUsage(await (await fetch(`${API_URL}/usage`)).json()) } catch {}
  }

  useEffect(() => { fetchSessions(); fetchUsage() }, [])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])

  const newConversation = () => {
    setSessionId(uuidv4())
    setMessages([])
    textareaRef.current?.focus()
  }

  const loadSession = async (sid) => {
    const data = await (await fetch(`${API_URL}/sessions/${sid}`)).json()
    setSessionId(sid)
    setMessages([
      ...data
    ])
  }

  const deleteSession = async (sid) => {
    await fetch(`${API_URL}/sessions/${sid}`, { method: 'DELETE' })
    fetchSessions()
    if (sid === sessionId) newConversation()
  }

  const sendMessage = async () => {
    if (!input.trim() || loading) return
    const userMsg = { role: 'user', content: input }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    setLoading(true)

    try {
      const res = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          messages: [...messages, userMsg].map(({ role, content }) => ({ role, content }))
        })
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      const textBlocks = (data.content || []).filter(b => b.type === 'text')
      const reply = textBlocks[textBlocks.length - 1]?.text || 'Désolé, je n\'ai pas pu répondre.'
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: reply,
        toolsUsed: data.tools_used || [],
        cards: data.cards || null,
        itinerary: data.itinerary || null,
      }])
      fetchUsage(); fetchSessions()
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Une erreur s\'est produite — réessayez dans un moment.' }])
    } finally {
      setLoading(false)
      textareaRef.current?.focus()
    }
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const sendActive = !loading && input.trim().length > 0

  return (
    <div className="app">
      <Sidebar
        sessions={sessions} activeId={sessionId}
        onSelect={loadSession} onNew={newConversation} onDelete={deleteSession}
        collapsed={!sidebarOpen} onToggle={() => setSidebar(v => !v)}
        usage={usage} isOnline={!loading}
      />

      {!sidebarOpen && <CollapsedToggle onToggle={() => setSidebar(true)} />}

      <main className={`chat ${!sidebarOpen ? 'chat--offset' : ''}`}>
        <div className="chat__messages">
          {messages.map((msg, i) => (
            <Message key={i} role={msg.role} content={msg.content} toolsUsed={msg.toolsUsed} cards={msg.cards} itinerary={msg.itinerary} />
          ))}
          {loading && <ThinkingDots />}
          <div ref={bottomRef} />
        </div>

        <div className="chat__input-area">
          <div className="input-bar">
            <textarea
              ref={textareaRef}
              className="input-bar__textarea"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Posez une question, planifiez un voyage, trouvez une destination…"
              disabled={loading}
              rows={1}
              onInput={e => {
                e.target.style.height = 'auto'
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
              }}
            />
            <button
              className={`input-bar__send ${sendActive ? 'input-bar__send--active' : 'input-bar__send--disabled'}`}
              onClick={sendMessage}
              disabled={!sendActive}
              aria-label="Envoyer"
            >
              →
            </button>
          </div>
          <p className="input-bar__hint">Entrée pour envoyer · Shift+Entrée pour un saut de ligne</p>
        </div>
      </main>
    </div>
  )
}
