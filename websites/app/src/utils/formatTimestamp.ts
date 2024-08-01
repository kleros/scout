export function formatTimestamp(unixTimestamp: number, withTime = false): string {
  const date = new Date(unixTimestamp * 1000);
  const options: Intl.DateTimeFormatOptions = withTime
    ? {
        month: "long",
        day: "2-digit",
        year: "numeric",
        hour: "numeric",
        minute: "numeric",
        timeZone: "GMT",
        timeZoneName: "short",
      }
    : { month: "long", day: "2-digit", year: "numeric" };
  return date.toLocaleDateString("en-US", options);
}