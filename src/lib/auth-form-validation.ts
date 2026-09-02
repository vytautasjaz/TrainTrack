const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export type AuthFormField = 'name' | 'email' | 'password' | 'confirmPassword'

export function normalizeAuthEmail(raw: string): string {
  return raw.trim().toLowerCase()
}

export function validateAuthEmail(email: string): string | null {
  const normalized = normalizeAuthEmail(email)
  if (!normalized) return 'Email is required.'
  if (!EMAIL_PATTERN.test(normalized)) return 'Enter a valid email address.'
  return null
}

export function validateAuthName(name: string): string | null {
  const trimmed = name.trim()
  if (!trimmed) return 'Name is required.'
  if (trimmed.length < 2) return 'Name must be at least 2 characters.'
  return null
}

export type PasswordRequirement = {
  id: string
  label: string
  met: boolean
}

export function getPasswordRequirements(password: string): PasswordRequirement[] {
  return [
    { id: 'length', label: 'At least 8 characters', met: password.length >= 8 },
    { id: 'letter', label: 'Contains a letter', met: /[A-Za-z]/.test(password) },
    { id: 'number', label: 'Contains a number', met: /\d/.test(password) },
  ]
}

export function validateAuthPassword(password: string): string | null {
  const requirements = getPasswordRequirements(password)
  const unmet = requirements.find((item) => !item.met)
  if (!password) return 'Password is required.'
  if (unmet) return `Password must meet all requirements (${unmet.label.toLowerCase()}).`
  return null
}

export function validatePasswordConfirmation(
  password: string,
  confirmPassword: string,
): string | null {
  if (!confirmPassword) return 'Confirm your password.'
  if (password !== confirmPassword) return 'Passwords do not match.'
  return null
}

export function validateRegisterForm(input: {
  name: string
  email: string
  password: string
  confirmPassword: string
}): Partial<Record<AuthFormField, string>> {
  const fieldErrors: Partial<Record<AuthFormField, string>> = {}
  const nameError = validateAuthName(input.name)
  const emailError = validateAuthEmail(input.email)
  const passwordError = validateAuthPassword(input.password)
  const confirmError = validatePasswordConfirmation(input.password, input.confirmPassword)

  if (nameError) fieldErrors.name = nameError
  if (emailError) fieldErrors.email = emailError
  if (passwordError) fieldErrors.password = passwordError
  if (confirmError) fieldErrors.confirmPassword = confirmError

  return fieldErrors
}

export function validateSignInForm(input: {
  email: string
  password: string
}): Partial<Record<'email' | 'password', string>> {
  const fieldErrors: Partial<Record<'email' | 'password', string>> = {}
  const emailError = validateAuthEmail(input.email)
  if (emailError) fieldErrors.email = emailError
  if (!input.password) fieldErrors.password = 'Password is required.'
  return fieldErrors
}
