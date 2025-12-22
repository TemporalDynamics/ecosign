/**
 * E2E Status Indicator
 * 
 * Shows the current E2E encryption session status.
 * Useful for debugging and user feedback.
 */

import { isSessionInitialized, getSessionInfo } from '../lib/e2e';

interface E2EStatusProps {
  show?: boolean;
  compact?: boolean;
}

export function E2EStatus({ show = true, compact = false }: E2EStatusProps) {
  if (!show) return null;

  const initialized = isSessionInitialized();
  const sessionInfo = getSessionInfo();

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-xs">
        {initialized ? (
          <>
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            <span className="text-gray-600">E2E Ready</span>
          </>
        ) : (
          <>
            <span className="w-2 h-2 rounded-full bg-gray-300"></span>
            <span className="text-gray-400">E2E Inactive</span>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white border rounded-lg p-4 shadow-sm">
      <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
        {initialized ? (
          <>
            <span className="w-3 h-3 rounded-full bg-green-500"></span>
            E2E Encryption Active
          </>
        ) : (
          <>
            <span className="w-3 h-3 rounded-full bg-gray-300"></span>
            E2E Encryption Inactive
          </>
        )}
      </h3>
      
      {initialized && sessionInfo && (
        <div className="text-xs text-gray-600 space-y-1">
          <p>
            <span className="font-medium">User ID:</span>{' '}
            {sessionInfo.userId.substring(0, 8)}...
          </p>
          <p>
            <span className="font-medium">Initialized:</span>{' '}
            {sessionInfo.initializedAt.toLocaleTimeString()}
          </p>
        </div>
      )}
      
      <div className="mt-3 text-xs text-gray-500">
        {initialized ? (
          <>
            🔒 Documents can be encrypted and decrypted
          </>
        ) : (
          <>
            ⚠️ Please log in to use encrypted documents
          </>
        )}
      </div>
    </div>
  );
}
