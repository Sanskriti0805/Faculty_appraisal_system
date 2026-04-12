let dialogBridge = null

export const setDialogBridge = (bridge) => {
  dialogBridge = bridge
}

export const showConfirm = async (input) => {
  const options = typeof input === 'string' ? { message: input } : { ...(input || {}) }

  if (!dialogBridge) {
    return false
  }

  const result = await dialogBridge({
    type: 'confirm',
    title: options.title || 'Please Confirm',
    message: options.message || '',
    confirmText: options.confirmText || 'Confirm',
    cancelText: options.cancelText || 'Cancel',
    danger: Boolean(options.danger)
  })

  return Boolean(result)
}

export const showPrompt = async (input) => {
  const options = typeof input === 'string'
    ? { message: input, defaultValue: '' }
    : { ...(input || {}) }

  if (!dialogBridge) {
    return null
  }

  const result = await dialogBridge({
    type: 'prompt',
    title: options.title || 'Input Required',
    message: options.message || '',
    confirmText: options.confirmText || 'OK',
    cancelText: options.cancelText || 'Cancel',
    defaultValue: options.defaultValue || '',
    placeholder: options.placeholder || ''
  })

  return typeof result === 'string' ? result : null
}
