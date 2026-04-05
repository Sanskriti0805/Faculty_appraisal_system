import React from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
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
      'Escalate technical data issues (schema/file errors) to DOFA office/admin.'
    ]
  }
]

const DOFA_HELP = [
  {
    title: 'DOFA/DOFA Office Operations',
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
      'Validate role permissions after each release (faculty, hod, dofa, dofa_office).',
      'Run smoke tests for Save Draft / Save and Next on critical sections every deploy.'
    ]
  }
]

const HELP_BY_ROLE = {
  faculty: FACULTY_HELP,
  hod: REVIEWER_HELP,
  dofa: DOFA_HELP,
  dofa_office: DOFA_HELP,
  admin: ADMIN_HELP
}

const roleLabel = (role) => {
  if (role === 'dofa_office') return 'DOFA Office'
  if (role === 'dofa') return 'DOFA'
  if (role === 'hod') return 'Reviewer/HOD'
  if (role === 'faculty') return 'Faculty'
  if (role === 'admin') return 'Admin'
  return 'User'
}

const getDefaultRole = (pathname, userRole) => {
  if (userRole && HELP_BY_ROLE[userRole]) return userRole
  if (pathname.startsWith('/dofa-office')) return 'dofa_office'
  if (pathname.startsWith('/dofa')) return 'dofa'
  return 'faculty'
}

const ROLE_OPTIONS = [
  { key: 'faculty', label: 'Faculty' },
  { key: 'hod', label: 'Reviewer/HOD' },
  { key: 'dofa', label: 'DOFA' },
  { key: 'dofa_office', label: 'DOFA Office' },
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

const HelpCenter = () => {
  const { user } = useAuth()
  const location = useLocation()
  const defaultRole = getDefaultRole(location.pathname, user?.role)
  const [selectedRole, setSelectedRole] = React.useState(defaultRole)
  const [searchTerm, setSearchTerm] = React.useState('')
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
  const normalizedQuery = searchTerm.trim().toLowerCase()

  const filteredSections = React.useMemo(() => {
    if (!normalizedQuery) return sections

    return sections.filter((section) => {
      const titleMatch = section.title.toLowerCase().includes(normalizedQuery)
      if (titleMatch) return true
      return section.bullets.some((point) => point.toLowerCase().includes(normalizedQuery))
    })
  }, [sections, normalizedQuery])

  const uploadAnchor = firstMatchingSectionId(sections, ['upload', 'evidence'])
  const saveNextAnchor = firstMatchingSectionId(sections, ['save and next', 'save draft', 'save'])
  const errorsAnchor = firstMatchingSectionId(sections, ['common errors', 'error', 'fix'])

  return (
    <div className="form-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Help Center</h1>
          <p className="page-subtitle">Role-based usage guide, troubleshooting, and workflow notes</p>
        </div>
      </div>

      <div className="form-card" style={{ display: 'grid', gap: '1.25rem' }}>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          <div style={{ fontWeight: 600, color: '#1e3a5f' }}>{canSwitchRoles ? 'View Help As Role' : 'Role-Specific Help'}</div>
          {canSwitchRoles ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {ROLE_OPTIONS.map((role) => {
                const active = selectedRole === role.key
                return (
                  <button
                    key={role.key}
                    type="button"
                    onClick={() => setSelectedRole(role.key)}
                    style={{
                      border: active ? '1px solid #3b82f6' : '1px solid #d1d8e0',
                      background: active ? '#eff6ff' : '#fff',
                      color: '#1e3a5f',
                      borderRadius: '999px',
                      padding: '0.45rem 0.9rem',
                      cursor: 'pointer',
                      fontWeight: active ? 600 : 500
                    }}
                  >
                    {role.label}
                  </button>
                )
              })}
            </div>
          ) : (
            <div style={{ display: 'inline-flex', alignItems: 'center', width: 'fit-content', border: '1px solid #d1d8e0', borderRadius: '999px', padding: '0.45rem 0.9rem', background: '#f8fafc', color: '#1e3a5f', fontWeight: 600 }}>
              {roleLabel(selectedRole)}
            </div>
          )}
          <div style={{ color: '#64748b', fontSize: '0.92rem' }}>
            Signed in as: <strong>{roleLabel(user?.role)}</strong>
          </div>
        </div>

        <div style={{ display: 'grid', gap: '0.6rem' }}>
          <label htmlFor="help-search" style={{ fontWeight: 600, color: '#1e3a5f' }}>Search Help</label>
          <input
            id="help-search"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search keywords like upload, save and next, lock, evidence, date..."
            style={{
              width: '100%',
              maxWidth: '760px',
              border: '1px solid #d1d8e0',
              borderRadius: '8px',
              padding: '0.65rem 0.8rem',
              fontSize: '0.95rem'
            }}
          />
          <div style={{ color: '#64748b', fontSize: '0.88rem' }}>
            Showing <strong>{filteredSections.length}</strong> section(s) for role: <strong>{roleLabel(selectedRole)}</strong>
          </div>
        </div>

        <div style={{ display: 'grid', gap: '0.6rem' }}>
          <div style={{ fontWeight: 600, color: '#1e3a5f' }}>Quick Jump</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {uploadAnchor && (
              <a href={`#${uploadAnchor}`} style={{ textDecoration: 'none', border: '1px solid #d1d8e0', borderRadius: '999px', padding: '0.38rem 0.8rem', color: '#1e3a5f', background: '#fff' }}>
                Uploads
              </a>
            )}
            {saveNextAnchor && (
              <a href={`#${saveNextAnchor}`} style={{ textDecoration: 'none', border: '1px solid #d1d8e0', borderRadius: '999px', padding: '0.38rem 0.8rem', color: '#1e3a5f', background: '#fff' }}>
                Save & Next
              </a>
            )}
            {errorsAnchor && (
              <a href={`#${errorsAnchor}`} style={{ textDecoration: 'none', border: '1px solid #d1d8e0', borderRadius: '999px', padding: '0.38rem 0.8rem', color: '#1e3a5f', background: '#fff' }}>
                Common Errors
              </a>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gap: '1rem' }}>
          {filteredSections.map((section) => (
            <div id={toSectionId(section.title)} key={section.title} style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1rem 1.1rem', background: '#fff' }}>
              <h3 style={{ margin: '0 0 0.6rem 0', color: '#1e3a5f' }}>{section.title}</h3>
              <ul style={{ margin: 0, paddingLeft: '1.15rem', color: '#334155', lineHeight: 1.6 }}>
                {section.bullets.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </div>
          ))}

          {filteredSections.length === 0 && (
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1rem 1.1rem', background: '#fff', color: '#64748b' }}>
              No help section matched your search. Try broader keywords like <strong>save</strong>, <strong>upload</strong>, <strong>error</strong>, or <strong>date</strong>.
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gap: '0.8rem' }}>
          <h2 style={{ margin: 0, color: '#1e3a5f', fontSize: '1.2rem' }}>Visual Walkthroughs (Screenshots / GIFs)</h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.92rem' }}>
            Add visual files under <strong>public/help-media</strong>. The Help Center will auto-show them here.
          </p>
          <div style={{ display: 'grid', gap: '0.9rem' }}>
            {HELP_MEDIA.map((item) => (
              <div key={item.title} style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.9rem', background: '#fff', display: 'grid', gap: '0.55rem' }}>
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
