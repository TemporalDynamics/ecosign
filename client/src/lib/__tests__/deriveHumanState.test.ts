import { describe, it, expect } from 'vitest'
import { deriveHumanState } from '../deriveHumanState'

describe('deriveHumanState', () => {
  it('returns draft for null workflow', () => {
    const s = deriveHumanState(null, [])
    expect(s.key).toBe('draft')
    expect(s.label).toContain('Borrador')
  })

  it('returns waiting_for_signer when a signer is pending', () => {
    const wf = { status: 'active' }
    const signers = [{ id: '1', name: 'Juan', email: 'juan@example.com', status: 'invited', signing_order: 1 }]
    const s = deriveHumanState(wf as any, signers as any)
    expect(s.key).toBe('waiting_for_signer')
    expect(s.label).toContain('Esperando firma')
  })

  it('returns completed when workflow is completed', () => {
    const wf = { status: 'completed' }
    const s = deriveHumanState(wf as any, [])
    expect(s.key).toBe('completed')
    expect(s.severity).toBe('success')
  })

  it('returns cancelled when workflow is cancelled', () => {
    const wf = { status: 'cancelled' }
    const s = deriveHumanState(wf as any, [])
    expect(s.key).toBe('cancelled')
    expect(s.label).toMatch(/cancelad/i)
  })
})
