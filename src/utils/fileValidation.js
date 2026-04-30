export const UPLOAD_LIMIT_MB = 10

export const FILE_TYPES = {
  documents: ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'],
  pdfOnly: ['pdf'],
  documentsNoImages: ['pdf', 'doc', 'docx'],
  pdfAndImages: ['pdf', 'jpg', 'jpeg', 'png']
}

export const getAcceptAttribute = (allowedExtensions = FILE_TYPES.documents) =>
  allowedExtensions.map((ext) => `.${ext}`).join(',')

export const getAllowedFileText = (allowedExtensions = FILE_TYPES.documents) =>
  allowedExtensions.map((ext) => ext.toUpperCase()).join(', ')

export const getFileExtension = (file) => {
  const name = String(file?.name || '')
  const lastDot = name.lastIndexOf('.')
  return lastDot >= 0 ? name.slice(lastDot + 1).toLowerCase() : ''
}

export const validateUploadFile = (file, {
  allowedExtensions = FILE_TYPES.documents,
  label = 'file',
  maxSizeMb = UPLOAD_LIMIT_MB
} = {}) => {
  if (!file) return { valid: true }

  const extension = getFileExtension(file)
  if (!allowedExtensions.includes(extension)) {
    const typeLabel = extension ? extension.toUpperCase() : 'This file type'
    return {
      valid: false,
      message: `${typeLabel} is not allowed for ${label}. Upload ${getAllowedFileText(allowedExtensions)}.`
    }
  }

  if (file.size > maxSizeMb * 1024 * 1024) {
    return {
      valid: false,
      message: `${label} is too large. Upload a file up to ${maxSizeMb}MB.`
    }
  }

  return { valid: true }
}

export const handleValidatedFileInput = (event, onValidFile, options = {}) => {
  const file = event.target.files?.[0] || null
  const result = validateUploadFile(file, options)

  if (!result.valid) {
    window.appToast(result.message)
    event.target.value = ''
    return false
  }

  onValidFile(file)
  return true
}
