export function formatTimestamp(unixTimestamp: number, withTime = false): string {
  const date = new Date(unixTimestamp * 1000);
  const options: Intl.DateTimeFormatOptions = withTime
    ? {
        month: "short",
        day: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "UTC",
        timeZoneName: "short",
      }
    : { month: "short", day: "2-digit", year: "numeric", timeZone: "UTC" };
  return date.toLocaleDateString("en-US", options);
}