function formatTimestamp(): string {
  const d = new Date()
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  const s = String(d.getSeconds()).padStart(2, '0')
  const ms = String(d.getMilliseconds()).padStart(3, '0')
  return `${h}:${m}:${s}.${ms}`
}

export function createLogger(tag: string) {
  const fmt = (msg: string) => `[${formatTimestamp()}][${tag}] ${msg}`
  return {
    debug: (msg: string, ...args: unknown[]) => console.debug(fmt(msg), ...args),
    info: (msg: string, ...args: unknown[]) => console.log(fmt(msg), ...args),
    warn: (msg: string, ...args: unknown[]) => console.warn(fmt(msg), ...args),
    error: (msg: string, ...args: unknown[]) => console.error(fmt(msg), ...args),
  }
}
