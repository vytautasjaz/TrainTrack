/* eslint-disable react-hooks/refs */
'use client'

import { useEffect, useRef, useState, useTransition } from 'react'

export type PreferenceFormSaveApi = {
  save: () => Promise<boolean>
}

type UsePreferenceFormOptions = {
  errorFallback?: string
  onDirtyChange?: (dirty: boolean) => void
  registerSave?: (api: PreferenceFormSaveApi | null) => void
}

/** Manual save + dirty tracking for preference zone forms. */
export function usePreferenceForm(
  saveAction: (formData: FormData) => Promise<void>,
  {
    errorFallback = 'Could not save.',
    onDirtyChange,
    registerSave,
  }: UsePreferenceFormOptions = {},
) {
  const formRef = useRef<HTMLFormElement>(null)
  const saveActionRef = useRef(saveAction)
  saveActionRef.current = saveAction
  const onDirtyChangeRef = useRef(onDirtyChange)
  onDirtyChangeRef.current = onDirtyChange

  const [dirty, setDirty] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  function markDirty() {
    setSaved(false)
    setDirty(true)
    onDirtyChangeRef.current?.(true)
  }

  function clearDirty() {
    setDirty(false)
    onDirtyChangeRef.current?.(false)
  }

  async function save(): Promise<boolean> {
    const form = formRef.current
    if (!form) return false
    const formData = new FormData(form)
    setError(null)
    setSaved(false)

    return new Promise((resolve) => {
      startTransition(async () => {
        try {
          await saveActionRef.current(formData)
          clearDirty()
          setSaved(true)
          resolve(true)
        } catch (err) {
          setError(err instanceof Error ? err.message : errorFallback)
          resolve(false)
        }
      })
    })
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    void save()
  }

  useEffect(() => {
    registerSave?.({ save })
    return () => registerSave?.(null)
    // Register once per mount; save always reads latest via refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registerSave])

  return {
    formRef,
    dirty,
    error,
    saved,
    isPending,
    markDirty,
    handleSubmit,
    save,
  }
}
