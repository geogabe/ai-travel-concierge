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

  if (/hôtel|hotel|gîte|gite|logement|chambre|airbnb|homexchange|camping|auberge|lodge|ryokan|hostel|appartement|apartment/.test(s)) return 'accommodation'

  if (/budget|€|euro|coût|cost|prix|price|cher|cheap|économi/.test(s)) return 'budget'

  if (/train|trajet|tgv|sncf|rail|bus|voiture|driving|road|transport|car|route|autoroute|ferry|flight|vol/.test(s)) return 'transport'

  if (/trip|itinéraire|itinerary|voyage|planif|semaine|jours|days|circuit|tour|séjour|week|nuits|nights|family|famille/.test(s)) return 'trip'

  if (/destination|où|partir|visiter|découvrir|explore|exploring|guide|weekend|escapade|getaway|côte|coast|mountain|montagne/.test(s)) return 'destination'

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
function IconTransport() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12h18M3 12l4-4M3 12l4 4M21 12l-4-4M21 12l-4 4"/>
    </svg>
  )
}

function IconBudget() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/>
      <path d="M12 7v1m0 8v1M9.5 9.5a2.5 2.5 0 0 1 5 0c0 1.5-1 2-2.5 2.5S9.5 13.5 9.5 15a2.5 2.5 0 0 0 5 0"/>
    </svg>
  )
}


function CategoryIcon({ title }) {
  const cat = detectCategory(title)
  if (cat === 'accommodation') return <IconAccommodation />
  if (cat === 'trip')          return <IconTrip />
  if (cat === 'destination')   return <IconDestination />
  if (cat === 'transport')     return <IconTransport />
  if (cat === 'budget')        return <IconBudget />
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

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '© CartoDB'
    }).addTo(map)

    stops.forEach((stop, index) => {
      const icon = L.divIcon({
        className: '',
        html: `<div style="
          width: 14px; height: 14px;
          background: #C47457;
          border: 2px solid #fff;
          border-radius: 50%;
          box-shadow: 0 2px 6px rgba(196,116,87,0.4);
        "></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      })
      L.marker([stop.lat, stop.lng], { icon })
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

// ─── Itinerary timeline ─────────────────────────────────────────────────────────────



function ItineraryTimeline({ stops }) {
  const categoryIcons = {
    museum:     <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18M3 10h18M12 3L3 10h18L12 3z"/><path d="M7 10v11M11 10v11M13 10v11M17 10v11"/></svg>,
    nature:     <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22V12"/><path d="M5 12C5 7 8 4 12 3c4 1 7 4 7 9-2 0-4-1-7-3-3 2-5 3-7 3z"/></svg>,
    hiking:     <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 20l4-8 3 4 3-6 4 10"/><path d="M3 20h18"/></svg>,
    shopping:   <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18M16 10a4 4 0 0 1-8 0"/></svg>,
    food:       <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><path d="M6 2v4M10 2v4M14 2v4"/></svg>,
    culture:    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5"/></svg>,
    park:       <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22v-7"/><path d="M9 9c0-3 1.5-6 3-7 1.5 1 3 4 3 7a3 3 0 0 1-6 0z"/><path d="M6 14c0-2 1-4 2-5 1 1 2 3 2 5a2 2 0 0 1-4 0z"/><path d="M14 14c0-2 1-4 2-5 1 1 2 3 2 5a2 2 0 0 1-4 0z"/></svg>,
    beach:      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 12a5 5 0 0 0-10 0"/><path d="M12 7V3"/><path d="M5 15H2M22 15h-3M5.6 9.4 3.5 7.3M20.5 7.3l-2.1 2.1M2 19c2 0 4-1 6-1s4 1 6 1 4-1 6-1"/></svg>,
    theme_park: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 3v9l6 3"/><path d="M12 12L6 9"/></svg>,
  }

  return (
    <div className="itinerary-timeline">
      {stops.map((stop, index) => (
       <div key={`${stop.city}-${index}`}>
          {stop.transport_from_previous && (
            <div className="itinerary-leg">
              <span className="itinerary-leg__icon">{stop.transport_from_previous.icon}</span>
              <div className="itinerary-leg__details">
                <div className="itinerary-leg__stat">
                  <span className="itinerary-leg__stat-value">{stop.transport_from_previous.duration}</span>
                  <span className="itinerary-leg__stat-label">Durée</span>
                </div>
                <div className="itinerary-leg__stat">
                  <span className="itinerary-leg__stat-value">{stop.transport_from_previous.cost} €</span>
                  <span className="itinerary-leg__stat-label">Coût</span>
                </div>
                <div className="itinerary-leg__stat">
                  <span className="itinerary-leg__stat-value">{stop.transport_from_previous.co2} kg</span>
                  <span className="itinerary-leg__stat-label">CO₂</span>
                </div>
              </div>
            </div>
          )}

          <div className="itinerary-stop">
            <div className="itinerary-stop__spine">
              <div className="itinerary-stop__dot" />
              {index < stops.length - 1 && <div className="itinerary-stop__line" />}
            </div>
            <div className="itinerary-stop__content">
              <div className="itinerary-stop__city">{stop.city}</div>
              <div className="itinerary-stop__dates">
                {stop.dates} · {stop.nights} nuit{stop.nights > 1 ? 's' : ''}
              </div>
              <div className="itinerary-stop__details">
                <div className="itinerary-stop__row">
                  <span className="itinerary-stop__row-label">Hébergement</span>
                  <span>
                    {stop.accommodation}
                    {stop.accommodation_cost && (
                      <span style={{ color: 'var(--color-copper)', fontWeight: 600, marginLeft: '8px' }}>
                        {stop.accommodation_cost} €
                      </span>
                    )}
                  </span>
                </div>
                {stop.highlights?.length > 0 && (
                  <div className="itinerary-stop__row">
                    <span className="itinerary-stop__row-label">À voir</span>
                    <div className="itinerary-stop__highlights">
                      {stop.highlights.map((h, i) => (
                          <span key={`${h.name}-${i}`} className="itinerary-stop__highlight">
                          <span className="itinerary-stop__highlight-icon">
                            {categoryIcons[h.category] || <IconDestination />}
                          </span>
                          {h.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {stop.stop_budget > 0 && (
                  <div className="itinerary-stop__row">
                    <span className="itinerary-stop__row-label">Budget stop</span>
                    <span style={{ color: 'var(--color-copper)', fontWeight: 600 }}>
                      {stop.stop_budget} €
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Message ───────────────────────────────────────────────────────────────────

function Message({ role, content, toolsUsed = [], cards = null, itinerary = null, onEdit }) {
  const isUser = role === 'user'
  return (
    <div className="message">
      <span className={`message__sender ${isUser ? 'message__sender--user' : ''}`}>
        {isUser ? 'Vous' : 'Écotravel'}
      </span>

      {!isUser && cards?.type === 'transport' && (
        <TransportCard data={cards} narrative={content} />
      )}

      {!isUser && itinerary?.type === 'itinerary' && (
        <ItineraryCard data={itinerary} narrative={content} />
      )}

      {(isUser || (!cards && !itinerary)) && (
        <div className={`message__bubble ${isUser ? 'message__bubble--user' : 'message__bubble--assistant'}`}>
          {isUser ? content : <ReactMarkdown>{content}</ReactMarkdown>}
        </div>
      )}

      {/* Icône édition — uniquement sous les messages utilisateur */}
      {isUser && onEdit && (
        <button className="message__edit-btn" onClick={() => onEdit(content)} aria-label="Éditer">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
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
      <div className="itinerary-card__map">
        <TripMap stops={data.stops} />
      </div>
      <ItineraryTimeline stops={data.stops} />
      {narrative && (
        <div className="itinerary-card__narrative">
          <ReactMarkdown>{narrative}</ReactMarkdown>
        </div>
      )}
    </div>
  )
}

// ─── Session row ───────────────────────────────────────────────────────────────

function SessionRow({ session, isActive, onSelect, onDelete, onRename }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(session.title)
  const inputRef = useRef(null)

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  const startEdit = (e) => {
    e.stopPropagation() // don't trigger onSelect
    setDraft(session.title)
    setEditing(true)
  }

  const commitEdit = () => {
    setEditing(false)
    const trimmed = draft.trim()
    if (trimmed && trimmed !== session.title) {
      onRename(session.session_id, trimmed)
    } else {
      setDraft(session.title) // revert if empty or unchanged
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') commitEdit()
    if (e.key === 'Escape') { setDraft(session.title); setEditing(false) }
  }

  return (
    <div className={`session-row ${isActive ? 'session-row--active' : ''}`}>
      <span className="session-row__icon">
        <CategoryIcon title={session.title} />
      </span>

      {editing ? (
        // Edit mode — full-width input replaces the button
        <input
          ref={inputRef}
          className="session-row__title-input"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={handleKeyDown}
        />
      ) : (
        <button className="session-row__btn" onClick={() => onSelect(session.session_id)}>
          <div className="session-row__title" onDoubleClick={startEdit}>{session.title}</div>
          <div className="session-row__date">
            {new Date(session.started_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
          </div>
        </button>
      )}

      <button className="session-row__delete" onClick={() => onDelete(session.session_id)}>×</button>
    </div>
  )
}

// ─── Sidebar ───────────────────────────────────────────────────────────────────

function Sidebar({ sessions, activeId, onSelect, onNew, onRename, onDelete, collapsed, onToggle, usage, isOnline }) {
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
                onSelect={onSelect} onDelete={onDelete} onRename={onRename}
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
  const abortControllerRef = useRef(null)

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
    setMessages([...data])
  }

  const deleteSession = async (sid) => {
    const confirmed = window.confirm('Are you sure you want to delete this conversation?')
    if (!confirmed) return
    await fetch(`${API_URL}/sessions/${sid}`, { method: 'DELETE' })
    fetchSessions()
    if (sid === sessionId) newConversation()
  }
  const stopMessage = () => {
    abortControllerRef.current?.abort()
    setLoading(false)
  }
  const editMessage = (content) => {
    stopMessage()           // stoppe l'agent si en cours
    setInput(content)       // remet le texte dans l'input
    textareaRef.current?.focus()
  }
    const renameSession = async (sessionId, newTitle) => {
    setSessions(prev => prev.map(s =>
      s.session_id === sessionId ? { ...s, title: newTitle } : s
    ))
    await fetch(`${API_URL}/sessions/${sessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle })
    })
  }

  const sendMessage = async () => {
    if (!input.trim() || loading) return
    const userMsg = { role: 'user', content: input }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    setLoading(true)

    try {
      abortControllerRef.current = new AbortController()

      const res = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          messages: [...messages, userMsg].map(({ role, content }) => ({ role, content }))
        }),
        signal: abortControllerRef.current.signal
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
      fetchUsage()
      fetchSessions()
      setTimeout(() => fetchSessions(), 6000)
    } catch (err) {
      if (err.name === 'AbortError') return // ← silent, user cancelled
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
      {sidebarOpen
        ? <Sidebar
            sessions={sessions}
            activeId={sessionId}
            onSelect={loadSession}
            onNew={newConversation}
            onDelete={deleteSession}
            onRename={renameSession}
            collapsed={false}
            onToggle={() => setSidebar(false)}
            usage={usage}
            isOnline={true}
          />
        : <CollapsedToggle onToggle={() => setSidebar(true)} />
      }

      <main className={`chat ${!sidebarOpen ? 'chat--offset' : ''}`}>
        <div className="chat__messages">
          {messages.map((msg, i) => (
            <Message
              key={i}
              role={msg.role}
              content={msg.content}
              toolsUsed={msg.toolsUsed}
              cards={msg.cards}
              itinerary={msg.itinerary}
              onEdit={editMessage}
            />
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
            {loading
              ? <button className="input-bar__send input-bar__send--active" onClick={stopMessage} aria-label="Arrêter">
                  ■
                </button>
              : <button
                  className={`input-bar__send ${sendActive ? 'input-bar__send--active' : 'input-bar__send--disabled'}`}
                  onClick={sendMessage}
                  disabled={!sendActive}
                  aria-label="Envoyer"
                >
                  →
                </button>
            }
          </div>
          <p className="input-bar__hint">Entrée pour envoyer · Shift+Entrée pour un saut de ligne</p>
        </div>
      </main>
    </div>
  )
}
