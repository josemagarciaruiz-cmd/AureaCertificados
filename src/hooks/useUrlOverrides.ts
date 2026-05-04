import { useEffect, useState } from 'react'

export function useUrlOverrides(settingsKey: string) {
  const [overrides, setOverrides] = useState<Record<string, string>>({})

  useEffect(() => {
    window.api.settings.get(settingsKey).then((val) => {
      if (val) setOverrides(JSON.parse(val as string) as Record<string, string>)
    })
  }, [settingsKey])

  const save = (id: string, url: string) => {
    setOverrides((prev) => {
      const next = { ...prev, [id]: url }
      window.api.settings.set(settingsKey, JSON.stringify(next))
      return next
    })
  }

  const reset = (id: string) => {
    setOverrides((prev) => {
      const next = { ...prev }
      delete next[id]
      window.api.settings.set(settingsKey, JSON.stringify(next))
      return next
    })
  }

  const get = (id: string, defaultUrl: string) => overrides[id] ?? defaultUrl
  const isOverridden = (id: string) => !!overrides[id]

  return { get, isOverridden, save, reset }
}
