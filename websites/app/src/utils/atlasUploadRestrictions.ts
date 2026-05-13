import { Roles } from '@kleros/kleros-app'

type Restriction = {
  maxSize: number
  allowedMimeTypes: string[]
}

type Role = {
  name: string
  restriction: Restriction
}

// Atlas returns role names as enum keys (e.g. "Evidence"), while `Roles`
// values are lowercase (e.g. "evidence"). Mirror the SDK's own indirection
// in uploadFile (Roles[name] === role) so this stays in sync.
export const getRoleRestriction = (
  role: Roles,
  roleRestrictions: Role[] | undefined,
): Restriction | undefined =>
  roleRestrictions?.find(
    (r) => Roles[r.name as keyof typeof Roles] === role,
  )?.restriction

const matchesMime = (fileType: string, allowed: string[]): boolean =>
  allowed.some((pattern) => {
    if (pattern === fileType) return true
    if (pattern.endsWith('/*'))
      return fileType.startsWith(pattern.slice(0, -1))
    return false
  })

const formatMb = (bytes: number): string =>
  (bytes / 1024 / 1024).toFixed(2).replace(/\.?0+$/, '')

export const validateFileAgainstRestriction = (
  file: File,
  restriction: Restriction | undefined,
): string | null => {
  if (!restriction) return null
  if (file.size > restriction.maxSize)
    return `File size should not exceed ${formatMb(restriction.maxSize)}MB.`
  if (!matchesMime(file.type, restriction.allowedMimeTypes))
    return 'Unsupported file type.'
  return null
}
