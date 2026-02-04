export function formatTimestamp(unixTimestamp: number, withTime = false): string {
  const date = new Date(unixTimestamp * 1000);
  const options: Intl.DateTimeFormatOptions = withTime
    ? {
        month: "short",
        day: "2-digit",
        year: "numeric",
        hour: "numeric",
        minute: "numeric",
        timeZone: "UTC",
        timeZoneName: "short",
      }
    : { month: "short", day: "2-digit", year: "numeric", timeZone: "UTC" };
  return date.toLocaleDateString("en-US", options);
}