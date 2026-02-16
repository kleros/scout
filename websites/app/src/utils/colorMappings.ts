import { darkTheme } from 'styles/themes';

export const chainColorMap: Record<string, string> = darkTheme.chainColors;

export const statusColorMap: Record<string, string> = {
  Registered: darkTheme.statusIncluded,
  RegistrationRequested: darkTheme.statusRegistrationRequested,
  ClearingRequested: darkTheme.statusClearingRequested,
  Absent: darkTheme.statusAbsent,
};
