export type SignFlowOriginType = 'my_signature'

export interface SignFlowContext {
  flowType: SignFlowOriginType
  originRoute: string
  createdAt: string
}

const SIGN_FLOW_CONTEXT_PREFIX = 'ecosign_sign_flow_context:'

const canUseSessionStorage = () =>
  typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined'

const normalizeOriginRoute = (value?: string | null): string => {
  const route = String(value || '').trim()
  if (!route.startsWith('/') || route.startsWith('//')) {
    return '/documentos'
  }
  return route
}

const isValidContext = (value: any): value is SignFlowContext => {
  return (
    value &&
    value.flowType === 'my_signature' &&
    typeof value.originRoute === 'string' &&
    value.originRoute.length > 0 &&
    typeof value.createdAt === 'string' &&
    value.createdAt.length > 0
  )
}

const getContextKey = (token: string) => `${SIGN_FLOW_CONTEXT_PREFIX}${token}`

export const storeSignFlowContext = (token: string, context: SignFlowContext) => {
  if (!token || !canUseSessionStorage()) return
  try {
    window.sessionStorage.setItem(
      getContextKey(token),
      JSON.stringify({
        ...context,
        originRoute: normalizeOriginRoute(context.originRoute)
      })
    )
  } catch (err) {
    console.warn('Could not persist sign flow context', err)
  }
}

export const readSignFlowContext = (token?: string | null): SignFlowContext | null => {
  if (!token || !canUseSessionStorage()) return null
  try {
    const raw = window.sessionStorage.getItem(getContextKey(token))
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!isValidContext(parsed)) return null
    return {
      ...parsed,
      originRoute: normalizeOriginRoute(parsed.originRoute)
    }
  } catch {
    return null
  }
}

export const clearSignFlowContext = (token?: string | null) => {
  if (!token || !canUseSessionStorage()) return
  try {
    window.sessionStorage.removeItem(getContextKey(token))
  } catch (err) {
    console.warn('Could not clear sign flow context', err)
  }
}
