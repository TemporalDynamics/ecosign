// ============================================
// useEcoxLogger Hook
// ============================================
// Hook to log forensic events to ECOX audit trail
// Automatically captures IP, timezone, and user agent
// ============================================

import { useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'

type EcoxEventType =
  | 'access_link_opened'
  | 'nda_accepted'
  | 'mfa_challenged'
  | 'mfa_success'
  | 'mfa_failed'
  | 'document_decrypted'
  | 'document_viewed'
  | 'signature_started'
  | 'signature_applied'
  | 'signature_completed'
  | 'eco_downloaded'
  | 'sequential_order_violated'

interface LogEventParams {
  workflowId: string
  signerId: string
  eventType: EcoxEventType
  details?: Record<string, any>
  documentHashSnapshot?: string
}

interface EcoxLogger {
  logEvent: (params: LogEventParams) => Promise<boolean>
  isLoading: boolean
}

/**
 * Hook to log events to ECOX audit trail
 *
 * Usage:
 * ```tsx
 * const { logEvent } = useEcoxLogger()
 *
 * await logEvent({
 *   workflowId: 'xxx',
 *   signerId: 'yyy',
 *   eventType: 'nda_accepted'
 * })
 * ```
 */
export function useEcoxLogger(): EcoxLogger {
  const logEvent = useCallback(async ({
    workflowId,
    signerId,
    eventType,
    details = {},
    documentHashSnapshot
  }: LogEventParams): Promise<boolean> => {
    try {
      // GUARD: Check if user has an active session
      // This prevents CORS errors in public flows where user is not logged in
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        console.warn(`⚠️ ECOX event ${eventType} not logged: no active session (public flow)`)
        // Return true to avoid breaking the flow, but don't log
        return true
      }

      // Get browser timezone
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone

      // Get user agent
      const userAgent = navigator.userAgent

      // Get approximate location from browser (city/country only, if available)
      // Note: This requires user permission, so we'll just send timezone
      // The Edge Function will do IP-based geolocation

      // Call Edge Function to log the event
      const { data, error } = await supabase.functions.invoke('log-ecox-event', {
        body: {
          workflow_id: workflowId,
          signer_id: signerId,
          event_type: eventType,
          timezone,
          user_agent: userAgent,
          details,
          document_hash_snapshot: documentHashSnapshot
        }
      })

      if (error) {
        console.error('Error logging ECOX event:', error)
        return false
      }

      console.log(`✅ ECOX event logged: ${eventType}`, data)
      return true
    } catch (error) {
      console.error('Error logging ECOX event:', error)
      return false
    }
  }, [])

  return {
    logEvent,
    isLoading: false // Could add loading state if needed
  }
}

/**
 * Helper hook to automatically log an event when component mounts
 *
 * Usage:
 * ```tsx
 * useEcoxAutoLog({
 *   workflowId: 'xxx',
 *   signerId: 'yyy',
 *   eventType: 'document_viewed'
 * })
 * ```
 */
export function useEcoxAutoLog(params: LogEventParams | null) {
  const { logEvent } = useEcoxLogger()

  // Auto-log on mount
  if (params) {
    logEvent(params).catch(console.error)
  }
}

export default useEcoxLogger
