const STROOPS = 10_000_000n

export function fmtXlm(stroops: bigint): string {
  const whole = stroops / STROOPS
  const frac = (stroops % STROOPS).toString().padStart(7, '0').replace(/0+$/, '') || '0'
  return `${whole}.${frac}`
}

export function truncate(addr: string, head = 6, tail = 4): string {
  return `${addr.slice(0, head)}…${addr.slice(-tail)}`
}
