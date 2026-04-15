import React from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './HelpCenter.css'
import './FormPages.css'

const toSectionId = (title) => title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

const firstMatchingSectionId = (sections, keywords) => {
  const lowered = keywords.map((k) => k.toLowerCase())
  const match = sections.find((section) => {
    const text = `${section.title} ${section.bullets.join(' ')}`.toLowerCase()
    return lowered.some((k) => text.includes(k))
  })
  return match ? toSectionId(match.title) : null
}

const MediaPreview = ({ item }) => {
  const [failed, setFailed] = React.useState(false)

  if (failed) {
    return (
      <div style={{
        border: '1px dashed #cbd5e1',
        borderRadius: '8px',
        padding: '0.85rem',
        color: '#64748b',
        fontSize: '0.9rem',
        lineHeight: 1.5,
        background: '#f8fafc'
      }}>
        Visual placeholder not found.
        <div>Place file at: <strong>{item.src}</strong></div>
      </div>
    )
  }

  return (
    <img
      src={item.src}
      alt={item.title}
      onError={() => setFailed(true)}
      style={{ width: '100%', maxHeight: '260px', objectFit: 'contain', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff' }}
    />
  )
}

const FACULTY_HELP = [
  {
    title: 'Getting Started',
    bullets: [
      'Complete Faculty Information first. Most sections depend on your profile mapping.',
      'Use Add Row/Add Entry to stage data, then use Save Draft or Save and Next to persist it.',
      'Save section-by-section. Do not rely only on navigation without save.',
      'Before final submit, revisit each section and verify evidence and values in Added lists/tables.'
    ]
  },
  {
    title: 'How Save Works',
    bullets: [
      'Save Draft: saves current section and keeps you on same page.',
      'Save and Next: saves current section and moves to the next unlocked section.',
      'If a row has mandatory core fields missing, it may be skipped. Fill at least the section key fields (for example title + organization).',
      'After save, return to section to verify data appears in Added list/table.'
    ]
  },
  {
    title: 'Evidence Upload Rules',
    bullets: [
      'Allowed formats: PDF, DOC, DOCX, JPG, JPEG, PNG.',
      'Recommended max size: 10MB per file (depends on server config).',
      'Preview icon (eye) opens uploaded file. If no eye appears, file was not attached to that row.',
      'When editing an existing row, if you do not choose a new file, existing file is retained for supported sections.'
    ]
  },
  {
    title: 'Section-Specific Tips',
    bullets: [
      'Research Grants / Proposals: submission date must be valid date; avoid free-text date.',
      'Conference Sessions / Keynotes / Conferences Outside: add date(s) and confirm venue fields are real values (not placeholders).',
      'Awards / Consultancy: ensure row is actually added/saved; check Added table shows the new entry.',
      'Paper Review: text is saved as entered; no auto bullet conversion is required.'
    ]
  },
  {
    title: 'Submission Lifecycle',
    bullets: [
      'Draft: all sections editable.',
      'Submitted / Under Review / Approved: sections locked for editing.',
      'Sent Back: only approved/unlocked sections are editable (if restrictions exist).',
      'Part B remains reachable for final re-submit flow when applicable.'
    ]
  },
  {
    title: 'Common Errors and Fixes',
    bullets: [
      'Data missing after return: hard refresh once, then check if section save returned success.',
      'Unknown column errors: backend schema mismatch; run provided migration script or contact admin.',
      'File shows No file: confirm file column exists for that section table and upload field key matches API.',
      'Validation/lock errors: check submission status and section unlock rules.'
    ]
  }
]

const REVIEWER_HELP = [
  {
    title: 'Reviewer/HOD Workflow',
    bullets: [
      'Open assigned submissions from dashboard queue.',
      'Review section data and evidence links before scoring/comments.',
      'Use clear comments with section references to reduce back-and-forth.',
      'Avoid approval without checking mandatory evidence-heavy sections.'
    ]
  },
  {
    title: 'Comment and Decision Guidance',
    bullets: [
      'Write actionable comments: mention field, expected correction, and example format.',
      'If insufficient evidence, ask for specific file/document type rather than generic note.',
      'Use consistent evaluation criteria across similar submissions.',
      'Escalate technical data issues (schema/file errors) to Dofa office/admin.'
    ]
  }
]

const Dofa_HELP = [
  {
    title: 'Dofa/Dofa Office Operations',
    bullets: [
      'Release forms only after rubrics/session configuration is complete.',
      'Validate rubric ranges and weightages before evaluation cycles.',
      'Use review pages for section-level decisions and send-back workflows.',
      'When sending back, unlock only required sections to control edit scope.'
    ]
  },
  {
    title: 'Form Management and Governance',
    bullets: [
      'Use Form Builder for active dynamic sections with clear labels and ordering.',
      'Avoid deleting fields mid-cycle; prefer deactivation to preserve historical responses.',
      'Coordinate schema migrations before enabling new file-dependent fields.',
      'Monitor failed saves/errors and publish short guidance to faculty when patterns emerge.'
    ]
  }
]

const ADMIN_HELP = [
  {
    title: 'Technical Admin Checklist',
    bullets: [
      'Keep backend migrations in sync with controller expectations (column names, nullable fields).',
      'Verify upload middleware field keys match frontend FormData keys per route.',
      'Monitor logs for SQL unknown-column, FK, and file upload parsing errors.',
      'Backup database before schema changes and keep rollback scripts ready.'
    ]
  },
  {
    title: 'Reliability and Support',
    bullets: [
      'Document frequent user-facing errors with one-step fixes in this Help Center.',
      'Ensure re-auth and token expiration behavior is explicit in UI messages.',
      'Validate role permissions after each release (faculty, hod, Dofa, Dofa_office).',
      'Run smoke tests for Save Draft / Save and Next on critical sections every deploy.'
    ]
  }
]

const HELP_BY_ROLE = {
  faculty: FACULTY_HELP,
  hod: REVIEWER_HELP,
  Dofa: Dofa_HELP,
  Dofa_office: Dofa_HELP,
  admin: ADMIN_HELP
}

const roleLabel = (role) => {
  if (role === 'Dofa_office') return 'Dofa Office'
  if (role === 'Dofa') return 'Dofa'
  if (role === 'hod') return 'Reviewer/HOD'
  if (role === 'faculty') return 'Faculty'
  if (role === 'admin') return 'Admin'
  return 'User'
}

const getDefaultRole = (pathname, userRole) => {
  if (userRole && HELP_BY_ROLE[userRole]) return userRole
  if (pathname.startsWith('/Dofa-office')) return 'Dofa_office'
  if (pathname.startsWith('/Dofa')) return 'Dofa'
  return 'faculty'
}

const ROLE_OPTIONS = [
  { key: 'faculty', label: 'Faculty' },
  { key: 'hod', label: 'Reviewer/HOD' },
  { key: 'Dofa', label: 'Dofa' },
  { key: 'Dofa_office', label: 'Dofa Office' },
  { key: 'admin', label: 'Admin/Technical' }
]

const HELP_MEDIA = [
  {
    title: 'Save and Next Flow',
    note: 'Shows how data is added, saved, and reloaded when returning to a section.',
    src: '/help-media/save-and-next.gif'
  },
  {
    title: 'Evidence Upload and Preview',
    note: 'Shows selecting evidence, save behavior, and preview icon usage.',
    src: '/help-media/evidence-upload.gif'
  },
  {
    title: 'Locked vs Editable Sections',
    note: 'Shows how section locking appears after submission and sent-back cycles.',
    src: '/help-media/section-locking.png'
  }
]

const ROLE_OVERVIEW = {
  faculty: {
    badge: 'Faculty guide',
    title: 'Start with the sections that unlock the rest of the form.',
    description: 'Use the suggestions below to save time, avoid missing evidence, and verify every row before submission.'
  },
  hod: {
    badge: 'Reviewer guide',
    title: 'Review with consistency and leave comments that are easy to act on.',
    description: 'Focus on evidence quality, section references, and clear next steps for resubmission or approval.'
  },
  Dofa: {
    badge: 'Dofa guide',
    title: 'Keep form cycles controlled with clear unlock and governance steps.',
    description: 'Use the guidance here to manage releases, locking, and form lifecycle decisions without guesswork.'
  },
  Dofa_office: {
    badge: 'Dofa Office guide',
    title: 'Coordinate releases, schema checks, and support notes from one place.',
    description: 'Use the quick actions below to find the right operating guidance before each cycle or correction.'
  },
  admin: {
    badge: 'Admin guide',
    title: 'Keep the system stable by checking errors, schema, and uploads early.',
    description: 'This section groups the most common support tasks into interactive shortcuts and concise action cards.'
  }
}

const ROLE_TOPICS = {
  faculty: [
    { label: 'Save and next', query: 'save' },
    { label: 'Upload evidence', query: 'upload' },
    { label: 'Common errors', query: 'error' },
    { label: 'Date validation', query: 'date' }
  ],
  hod: [
    { label: 'Comment guidance', query: 'comment' },
    { label: 'Evidence review', query: 'evidence' },
    { label: 'Decision workflow', query: 'workflow' },
    { label: 'Escalation help', query: 'technical' }
  ],
  Dofa: [
    { label: 'Form release', query: 'release' },
    { label: 'Locking rules', query: 'lock' },
    { label: 'Rubric checks', query: 'rubric' },
    { label: 'Schema sync', query: 'schema' }
  ],
  Dofa_office: [
    { label: 'Release steps', query: 'release' },
    { label: 'Migration notes', query: 'migration' },
    { label: 'Upload issues', query: 'upload' },
    { label: 'Troubleshooting', query: 'error' }
  ],
  admin: [
    { label: 'Backend checks', query: 'backend' },
    { label: 'Upload middleware', query: 'upload' },
    { label: 'Schema mismatch', query: 'unknown column' },
    { label: 'System backup', query: 'backup' }
  ]
}

const ROLE_ACTIONS = {
  faculty: [
    { title: 'Start with profile mapping', text: 'Complete Faculty Information first so dependent sections unlock correctly.' },
    { title: 'Save before moving on', text: 'Use Save Draft or Save and Next after each row to avoid losing entered data.' },
    { title: 'Confirm uploaded evidence', text: 'Check that the preview icon appears and the file is retained after save.' }
  ],
  hod: [
    { title: 'Check evidence first', text: 'Review supporting files and section data before leaving scores or comments.' },
    { title: 'Write actionable feedback', text: 'State the field, the correction needed, and a clear example of the expected format.' },
    { title: 'Escalate system issues', text: 'If the submission problem is technical, route it to the Dofa office or admin team.' }
  ],
  Dofa: [
    { title: 'Confirm release readiness', text: 'Check rubrics, session setup, and form availability before opening a cycle.' },
    { title: 'Control edit scope', text: 'Unlock only the sections that need action when sending items back for correction.' },
    { title: 'Monitor section health', text: 'Watch for recurring errors and update support guidance when a pattern appears.' }
  ],
  Dofa_office: [
    { title: 'Validate the setup', text: 'Cross-check schema, rubrics, and active form configuration before support begins.' },
    { title: 'Use jump links', text: 'Go directly to the save, upload, or error sections that match the current issue.' },
    { title: 'Capture repeated fixes', text: 'Keep a short note for recurring problems so the next user can self-serve faster.' }
  ],
  admin: [
    { title: 'Check backend alignment', text: 'Verify controller expectations, upload keys, and migration state before release.' },
    { title: 'Watch for schema drift', text: 'Unknown column and FK errors usually mean the database is behind the code.' },
    { title: 'Keep recovery ready', text: 'Maintain backups and rollback scripts before structural changes go live.' }
  ]
}

const HelpCenter = () => {
  const { user } = useAuth()
  const location = useLocation()
  const defaultRole = getDefaultRole(location.pathname, user?.role)
  const [selectedRole, setSelectedRole] = React.useState(defaultRole)
  const [searchTerm, setSearchTerm] = React.useState('')
  const [expandedSectionId, setExpandedSectionId] = React.useState(null)
  const canSwitchRoles = user?.role === 'admin'

  React.useEffect(() => {
    setSelectedRole(defaultRole)
    setSearchTerm('')
  }, [defaultRole])

  React.useEffect(() => {
    if (!canSwitchRoles) {
      setSelectedRole(defaultRole)
    }
  }, [canSwitchRoles, defaultRole])

  const sections = HELP_BY_ROLE[selectedRole] || FACULTY_HELP
  const roleOverview = ROLE_OVERVIEW[selectedRole] || ROLE_OVERVIEW.faculty
  const roleTopics = ROLE_TOPICS[selectedRole] || ROLE_TOPICS.faculty
  const roleActions = ROLE_ACTIONS[selectedRole] || ROLE_ACTIONS.faculty
  const normalizedQuery = searchTerm.trim().toLowerCase()

  const filteredSections = React.useMemo(() => {
    if (!normalizedQuery) return sections

    return sections.filter((section) => {
      const titleMatch = section.title.toLowerCase().includes(normalizedQuery)
      if (titleMatch) return true
      return section.bullets.some((point) => point.toLowerCase().includes(normalizedQuery))
    })
  }, [sections, normalizedQuery])

  React.useEffect(() => {
    const nextExpanded = filteredSections[0] ? toSectionId(filteredSections[0].title) : null
    if (!expandedSectionId || !filteredSections.some((section) => toSectionId(section.title) === expandedSectionId)) {
      setExpandedSectionId(nextExpanded)
    }
  }, [expandedSectionId, filteredSections])

  const uploadAnchor = firstMatchingSectionId(sections, ['upload', 'evidence'])
  const saveNextAnchor = firstMatchingSectionId(sections, ['save and next', 'save draft', 'save'])
  const errorsAnchor = firstMatchingSectionId(sections, ['common errors', 'error', 'fix'])
  const sectionTotal = sections.length
  const bulletTotal = sections.reduce((count, section) => count + section.bullets.length, 0)

  const focusTopic = (query) => {
    setSearchTerm(query)
  }

  return (
    <div className="form-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Help Center</h1>
          <p className="page-subtitle">Role-based usage guide, troubleshooting, and workflow notes</p>
        </div>
      </div>

      <div className="form-card help-center-shell" style={{ display: 'grid', gap: '1.25rem' }}>
        <div className="help-center-hero">
          <div className="help-center-hero-copy">
            <div className="help-center-hero-badge">{roleOverview.badge}</div>
            <h2 className="help-center-hero-title">{roleOverview.title}</h2>
            <p className="help-center-hero-lead">{roleOverview.description}</p>
          </div>
          <div className="help-center-metrics">
            <div className="help-metric">
              <span className="help-metric-label">Sections</span>
              <strong>{sectionTotal}</strong>
            </div>
            <div className="help-metric">
              <span className="help-metric-label">Checks</span>
              <strong>{bulletTotal}</strong>
            </div>
            <div className="help-metric">
              <span className="help-metric-label">Role</span>
              <strong>{roleLabel(selectedRole)}</strong>
            </div>
          </div>
        </div>

        <div className="help-center-panel">
          <div className="help-center-panel-title">{canSwitchRoles ? 'View help as a different role' : 'Role-specific help'}</div>
          {canSwitchRoles ? (
            <div className="help-chip-row">
              {ROLE_OPTIONS.map((role) => {
                const active = selectedRole === role.key
                return (
                  <button
                    key={role.key}
                    type="button"
                    onClick={() => setSelectedRole(role.key)}
                    className={`help-chip ${active ? 'help-chip-active' : ''}`}
                  >
                    {role.label}
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="help-role-pill">
              {roleLabel(selectedRole)}
            </div>
          )}
          <div style={{ color: '#64748b', fontSize: '0.92rem' }}>
            Signed in as: <strong>{roleLabel(user?.role)}</strong>
          </div>
        </div>

        <div className="help-center-panel">
          <div className="help-center-panel-title">Quick suggestions</div>
          <div className="help-chip-row">
            {roleTopics.map((topic) => (
              <button
                key={topic.label}
                type="button"
                className="help-chip help-chip-suggestion"
                onClick={() => focusTopic(topic.query)}
              >
                {topic.label}
              </button>
            ))}
          </div>
        </div>

        <div className="help-center-panel">
          <div className="help-center-panel-title">What to do next</div>
          <div className="help-action-grid">
            {roleActions.map((action, index) => (
              <div key={action.title} className="help-action-card">
                <div className="help-action-step">0{index + 1}</div>
                <div className="help-action-title">{action.title}</div>
                <div className="help-action-text">{action.text}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="help-center-panel">
          <label htmlFor="help-search" className="help-center-panel-title">Search help</label>
          <input
            id="help-search"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search keywords like upload, save and next, lock, evidence, date..."
            className="help-search-input"
          />
          <div style={{ color: '#64748b', fontSize: '0.88rem' }}>
            Showing <strong>{filteredSections.length}</strong> section(s) for role: <strong>{roleLabel(selectedRole)}</strong>
          </div>
        </div>

        <div className="help-center-panel">
          <div className="help-center-panel-title">Quick jump</div>
          <div className="help-chip-row">
            {uploadAnchor && (
              <a href={`#${uploadAnchor}`} className="help-chip help-chip-link">
                Uploads
              </a>
            )}
            {saveNextAnchor && (
              <a href={`#${saveNextAnchor}`} className="help-chip help-chip-link">
                Save & Next
              </a>
            )}
            {errorsAnchor && (
              <a href={`#${errorsAnchor}`} className="help-chip help-chip-link">
                Common Errors
              </a>
            )}
          </div>
        </div>

        <div className="help-center-list">
          {filteredSections.map((section) => (
            <article id={toSectionId(section.title)} key={section.title} className="help-section-card">
              <button
                type="button"
                className="help-section-toggle"
                aria-expanded={expandedSectionId === toSectionId(section.title)}
                onClick={() => setExpandedSectionId((current) => (current === toSectionId(section.title) ? null : toSectionId(section.title)))}
              >
                <span>
                  <span className="help-section-title">{section.title}</span>
                  <span className="help-section-summary">Tap to expand or collapse this guidance.</span>
                </span>
                <span className="help-section-status">{expandedSectionId === toSectionId(section.title) ? 'Hide' : 'Show'}</span>
              </button>
              {expandedSectionId === toSectionId(section.title) && (
                <ul className="help-section-bullets">
                  {section.bullets.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              )}
            </article>
          ))}

          {filteredSections.length === 0 && (
            <div className="help-empty-state">
              No help section matched your search. Try broader keywords like <strong>save</strong>, <strong>upload</strong>, <strong>error</strong>, or <strong>date</strong>.
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gap: '0.8rem' }}>
          <h2 style={{ margin: 0, color: '#1e3a5f', fontSize: '1.2rem' }}>Visual walkthroughs and examples</h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.92rem' }}>
            Add visual files under <strong>public/help-media</strong>. The Help Center will auto-show them here.
          </p>
          <div className="help-media-grid">
            {HELP_MEDIA.map((item) => (
              <div key={item.title} className="help-media-card">
                <div style={{ fontWeight: 600, color: '#1e3a5f' }}>{item.title}</div>
                <div style={{ color: '#64748b', fontSize: '0.9rem' }}>{item.note}</div>
                <MediaPreview item={item} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default HelpCenter

