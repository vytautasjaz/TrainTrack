'use client'

import { useId, useMemo, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { getPasswordRequirements } from '@/lib/auth-form-validation'
import { cn } from '@/lib/utils'

type AuthFieldProps = {
  id: string
  label: string
  error?: string | null
  children: React.ReactNode
  hint?: React.ReactNode
}

export function AuthField({ id, label, error, children, hint }: AuthFieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-[13px] font-medium text-[var(--tt-ink,#111)]">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-[12px] text-destructive">
          {error}
        </p>
      ) : hint ? (
        <div className="text-[12px] text-[var(--tt-ink-faint,#9a9a9a)]">{hint}</div>
      ) : null}
    </div>
  )
}

type AuthPasswordFieldProps = {
  id: string
  label: string
  name: string
  value: string
  onChange: (value: string) => void
  error?: string | null
  autoComplete?: string
  showRequirements?: boolean
  placeholder?: string
  disabled?: boolean
}

export function AuthPasswordField({
  id,
  label,
  name,
  value,
  onChange,
  error,
  autoComplete,
  showRequirements = false,
  placeholder,
  disabled = false,
}: AuthPasswordFieldProps) {
  const [visible, setVisible] = useState(false)
  const requirements = useMemo(() => getPasswordRequirements(value), [value])

  return (
    <AuthField
      id={id}
      label={label}
      error={error}
      hint={
        showRequirements && value ? (
          <ul className="space-y-1 pt-0.5">
            {requirements.map((item) => (
              <li
                key={item.id}
                className={cn(
                  'flex items-center gap-1.5',
                  item.met ? 'text-[var(--tt-good,#1a9f5c)]' : 'text-[var(--tt-ink-faint,#9a9a9a)]',
                )}
              >
                <span
                  className={cn(
                    'inline-block h-1.5 w-1.5 rounded-full',
                    item.met ? 'bg-[var(--tt-good,#1a9f5c)]' : 'bg-[var(--tt-line,#ebebeb)]',
                  )}
                  aria-hidden
                />
                {item.label}
              </li>
            ))}
          </ul>
        ) : null
      }
    >
      <div className="relative">
        <Input
          id={id}
          name={name}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          placeholder={placeholder}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className={cn(
            'auth-input pr-10',
            error && 'border-destructive/50 focus:border-destructive focus:ring-destructive/20',
          )}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          disabled={disabled}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-[var(--tt-ink-faint,#9a9a9a)] transition hover:text-[var(--tt-ink,#111)] disabled:pointer-events-none disabled:opacity-50"
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </AuthField>
  )
}

export function AuthTextField({
  id,
  label,
  name,
  type = 'text',
  value,
  onChange,
  error,
  autoComplete,
  placeholder,
  disabled = false,
}: {
  id: string
  label: string
  name: string
  type?: string
  value: string
  onChange: (value: string) => void
  error?: string | null
  autoComplete?: string
  placeholder?: string
  disabled?: boolean
}) {
  return (
    <AuthField id={id} label={label} error={error}>
      <Input
        id={id}
        name={name}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn(
          'auth-input',
          error && 'border-destructive/50 focus:border-destructive focus:ring-destructive/20',
        )}
      />
    </AuthField>
  )
}

export function useAuthFieldIds(prefix: string) {
  const base = useId()
  return {
    name: `${prefix}-name-${base}`,
    email: `${prefix}-email-${base}`,
    password: `${prefix}-password-${base}`,
    confirmPassword: `${prefix}-confirm-${base}`,
  }
}
