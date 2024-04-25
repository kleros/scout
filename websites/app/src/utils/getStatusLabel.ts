export const getStatusLabel = (status: string): string => {
  switch (status) {
    case 'RegistrationRequested':
      return 'Submitted'
    case 'ClearingRequested':
      return 'Removing'
    case 'Registered':
      return 'Registered'
    case 'Absent':
      return 'Removed'
    default:
      return 'Submitted'
  }
}
