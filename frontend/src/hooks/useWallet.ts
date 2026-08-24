import { parseError } from '@creit.tech/stellar-wallets-kit'
import { useCallback, useEffect, useState } from 'react'
import { KitEventType, StellarWalletsKit } from '../lib/wallet'

export interface WalletState {
  address: string | null
  error: string | null
  connecting: boolean
  connect: () => Promise<void>
  disconnect: () => Promise<void>
  clearError: () => void
}

// Error codes returned by the kit when the user dismisses the modal without
// picking a wallet — treat these as silent cancellations, not real errors.
const SILENT_CANCEL_CODES = new Set([
  -1,   // generic user cancel
  4001, // EIP-1193 user rejection (some bridge wallets mirror this)
])

function toReadableError(raw: unknown): string | null {
  const err = parseError(raw)

  if (SILENT_CANCEL_CODES.has(err.code)) return null

  // Surface "not installed / not found" errors clearly
  const msg = err.message?.toLowerCase() ?? ''
  if (
    msg.includes('not installed') ||
    msg.includes('not found') ||
    msg.includes('extension') ||
    msg.includes('install')
  ) {
    return 'Wallet not installed. Please install the extension and try again — or pick a different wallet.'
  }

  return err.message || 'Failed to connect wallet. Please try again.'
}

export function useWallet(): WalletState {
  const [address, setAddress] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)

  // Keep React state in sync with the kit's internal state events.
  useEffect(() => {
    const unsubState = StellarWalletsKit.on(
      KitEventType.STATE_UPDATED,
      ({ payload }) => setAddress(payload.address ?? null),
    )
    const unsubDisconnect = StellarWalletsKit.on(
      KitEventType.DISCONNECT,
      () => setAddress(null),
    )
    return () => {
      unsubState()
      unsubDisconnect()
    }
  }, [])

  const connect = useCallback(async () => {
    setError(null)
    setConnecting(true)
    try {
      const { address } = await StellarWalletsKit.authModal()
      setAddress(address)
    } catch (raw) {
      const msg = toReadableError(raw)
      if (msg) setError(msg)
      // null → silent cancel (user closed modal) — no error shown
    } finally {
      setConnecting(false)
    }
  }, [])

  const disconnect = useCallback(async () => {
    await StellarWalletsKit.disconnect()
    setAddress(null)
    setError(null)
  }, [])

  const clearError = useCallback(() => setError(null), [])

  return { address, error, connecting, connect, disconnect, clearError }
}
