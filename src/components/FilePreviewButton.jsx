import React from 'react'
import { Eye } from 'lucide-react'

const getDefaultUploadsBaseUrl = () => {
  if (typeof window === 'undefined') {
    return ''
  }

  return `http://${window.location.hostname}:5000/uploads/`
}

const FilePreviewButton = ({
  file,
  title = 'Preview uploaded document',
  iconSize = 16,
  baseUrl,
  style = {},
  className = ''
}) => {
  const handlePreview = (event) => {
    event.preventDefault()
    event.stopPropagation()

    if (!file || typeof window === 'undefined') {
      return
    }

    let previewUrl = null
    const uploadsBaseUrl = baseUrl || getDefaultUploadsBaseUrl()

    if (typeof file === 'string') {
      previewUrl = file.startsWith('http://') || file.startsWith('https://') || file.startsWith('blob:')
        ? file
        : `${uploadsBaseUrl}${file}`
    } else if (typeof File !== 'undefined' && file instanceof File) {
      previewUrl = window.URL.createObjectURL(file)
      window.setTimeout(() => {
        window.URL.revokeObjectURL(previewUrl)
      }, 5 * 60 * 1000)
    }

    if (!previewUrl) {
      return
    }

    const previewWindow = window.open(previewUrl, '_blank', 'noopener,noreferrer')
    if (previewWindow) {
      previewWindow.opener = null
    }
  }

  if (!file) {
    return null
  }

  return (
    <button
      type="button"
      className={className}
      onClick={handlePreview}
      title={title}
      aria-label={title}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '36px',
        height: '36px',
        borderRadius: '6px',
        border: '1px solid #d1d8e0',
        backgroundColor: '#fff',
        color: '#1e3a5f',
        cursor: 'pointer',
        flexShrink: 0,
        transition: 'all 0.2s ease',
        ...style
      }}
    >
      <Eye size={iconSize} />
    </button>
  )
}

export default FilePreviewButton