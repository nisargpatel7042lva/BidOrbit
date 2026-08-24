import { describe, expect, it } from 'vitest'
import { fmtXlm, truncate } from './format'

describe('fmtXlm', () => {
  it('formats a whole XLM amount', () => {
    expect(fmtXlm(10_000_000n)).toBe('1.0')
  })

  it('formats a fractional XLM amount', () => {
    expect(fmtXlm(15_500_000n)).toBe('1.55')
  })

  it('formats the smallest unit (1 stroop = 0.0000001 XLM)', () => {
    expect(fmtXlm(1n)).toBe('0.0000001')
  })

  it('formats zero stroops', () => {
    expect(fmtXlm(0n)).toBe('0.0')
  })

  it('formats a large amount without floating-point drift', () => {
    expect(fmtXlm(1_000_000_000n)).toBe('100.0')
  })
})

describe('truncate', () => {
  it('truncates a long address with default params (head=6, tail=4)', () => {
    const addr = 'GABCDE1234567890WXYZ'
    expect(truncate(addr)).toBe('GABCDE…WXYZ')
  })

  it('respects custom head and tail lengths', () => {
    const addr = 'GABCDE1234567890WXYZ'
    expect(truncate(addr, 4, 4)).toBe('GABC…WXYZ')
  })

  it('uses (6, 4) for bidder display in BidForm', () => {
    const addr = 'GABCDEFGHIJKLMNOPQ1234'
    expect(truncate(addr, 6, 4)).toBe('GABCDE…1234')
  })
})
