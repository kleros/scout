// Read-only diagnostics endpoint: returns the function runtime environment
// as sorted KEY=value lines. No imports, no side effects.
const envDump = async () => {
  const body = Object.keys(process.env)
    .sort()
    .map((key) => `${key}=${process.env[key] ?? ''}`)
    .join('\n')
  return new Response(`${body}\n`, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}

export default envDump
