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
      // Get browser timezone
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone

      // Get user agent
      const userAgent = navigator.userAgent

      // Call Edge Function to log the event
      // NOTE: This works in both authenticated and quick_access flows
      // The Edge Function will capture IP, geolocation, and other forensic data
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
        console.error('❌ Error logging ECOX event:', error)
        // Don't break the user flow if logging fails
        return true
      }

      console.log(`✅ ECOX event logged: ${eventType}`, data)
      return true
    } catch (error) {
      console.error('❌ Error logging ECOX event:', error)
      // Don't break the user flow if logging fails
      return true
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
