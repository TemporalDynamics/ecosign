// ============================================
// Geolocalización Segura para ECOX
// ============================================
// Obtiene ubicación aproximada (ciudad/país) desde IP
// NO guarda coordenadas exactas - solo región
// Legal bajo GDPR y leyes argentinas
// ============================================

export interface GeoLocation {
  country: string
  country_code: string
  region?: string
  city?: string
}

export interface LocationValidation {
  is_consistent: boolean
  confidence_level: 'high' | 'medium' | 'low'
  flags: string[]
}

/**
 * Obtiene la ubicación aproximada (ciudad/país) desde una IP
 * usando ip-api.com (45 req/min gratis, no requiere API key)
 *
 * IMPORTANTE: NO guarda coordenadas exactas - solo región
 *
 * @param ip - Dirección IP del usuario
 * @returns GeoLocation con país, código de país, región y ciudad
 */
export async function getLocationFromIP(ip: string): Promise<GeoLocation> {
  // IPs locales, privadas o inválidas
  if (!ip || ip === 'unknown' || ip.startsWith('127.') || ip.startsWith('192.168.') || ip.startsWith('10.')) {
    return {
      country: 'Local/Private Network',
      country_code: 'XX',
      city: 'Unknown'
    }
  }

  try {
    // ip-api.com - Gratis, sin API key, 45 req/min
    // Solo pedimos los campos necesarios (no lat/lon)
    const response = await fetch(
      `http://ip-api.com/json/${ip}?fields=status,country,countryCode,regionName,city`,
      {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      }
    )

    if (!response.ok) {
      console.warn(`Geolocation API returned ${response.status}`)
      throw new Error('Geolocation API failed')
    }

    const data = await response.json()

    if (data.status === 'fail') {
      console.warn('Geolocation lookup failed:', data.message)
      return {
        country: 'Unknown',
        country_code: 'XX',
        city: 'Unknown'
      }
    }

    return {
      country: data.country || 'Unknown',
      country_code: data.countryCode || 'XX',
      region: data.regionName,
      city: data.city || 'Unknown'
    }
  } catch (error) {
    console.error('Error getting geolocation from IP:', error)
    return {
      country: 'Unknown',
      country_code: 'XX',
      city: 'Unknown'
    }
  }
}

/**
 * Valida que la IP y la timezone sean consistentes
 * Útil para detectar uso de VPN, proxies o inconsistencias
 *
 * @param geoLocation - Ubicación obtenida de la IP
 * @param timezone - Timezone del navegador (ej: "America/Argentina/Buenos_Aires")
 * @returns Objeto con resultado de validación y flags
 */
export function validateLocationConsistency(
  geoLocation: GeoLocation,
  timezone?: string
): LocationValidation {
  const flags: string[] = []

  // Si no hay timezone, no podemos validar
  if (!timezone) {
    return {
      is_consistent: true,
      confidence_level: 'low',
      flags: ['no_timezone_provided']
    }
  }

  // Mapeo de timezones a códigos de país esperados
  const timezoneToCountryCodes: Record<string, string[]> = {
    // América del Sur
    'America/Argentina': ['AR'],
    'America/Buenos_Aires': ['AR'],
    'America/Sao_Paulo': ['BR'],
    'America/Santiago': ['CL'],
    'America/Lima': ['PE'],
    'America/Bogota': ['CO'],
    'America/Caracas': ['VE'],

    // América del Norte
    'America/New_York': ['US'],
    'America/Chicago': ['US'],
    'America/Los_Angeles': ['US'],
    'America/Denver': ['US'],
    'America/Mexico_City': ['MX'],
    'America/Toronto': ['CA'],

    // Europa
    'Europe/Madrid': ['ES'],
    'Europe/London': ['GB'],
    'Europe/Paris': ['FR'],
    'Europe/Berlin': ['DE'],
    'Europe/Rome': ['IT'],
    'Europe/Amsterdam': ['NL'],
    'Europe/Brussels': ['BE'],
    'Europe/Lisbon': ['PT'],

    // Asia
    'Asia/Tokyo': ['JP'],
    'Asia/Shanghai': ['CN'],
    'Asia/Seoul': ['KR'],
    'Asia/Singapore': ['SG'],
    'Asia/Dubai': ['AE'],

    // Oceanía
    'Pacific/Auckland': ['NZ'],
    'Australia/Sydney': ['AU'],
    'Australia/Melbourne': ['AU'],
  }

  // Buscar si el timezone coincide con algún país esperado
  let expectedCountryCodes: string[] = []

  for (const [tzPrefix, countryCodes] of Object.entries(timezoneToCountryCodes)) {
    if (timezone.startsWith(tzPrefix)) {
      expectedCountryCodes = countryCodes
      break
    }
  }

  // Si no encontramos el timezone en nuestro mapa
  if (expectedCountryCodes.length === 0) {
    flags.push('unknown_timezone')
    return {
      is_consistent: true,
      confidence_level: 'low',
      flags
    }
  }

  // Validar consistencia
  const isConsistent = expectedCountryCodes.includes(geoLocation.country_code)

  if (!isConsistent) {
    flags.push('timezone_ip_mismatch')
    flags.push(`expected_country_${expectedCountryCodes.join('_or_')}`)
    flags.push(`actual_country_${geoLocation.country_code}`)
  }

  // Casos especiales que pueden ser legítimos
  if (!isConsistent) {
    // Verificar si es un país vecino (puede ser legítimo)
    const neighboringCountries: Record<string, string[]> = {
      'AR': ['UY', 'CL', 'BR', 'PY', 'BO'],
      'US': ['CA', 'MX'],
      'ES': ['PT', 'FR', 'AD'],
      // ... etc
    }

    const expectedNeighbors = expectedCountryCodes.flatMap(code => neighboringCountries[code] || [])
    if (expectedNeighbors.includes(geoLocation.country_code)) {
      flags.push('neighboring_country')
      return {
        is_consistent: false,
        confidence_level: 'medium',
        flags
      }
    }

    // Si la inconsistencia es grande, marcar como sospechoso
    return {
      is_consistent: false,
      confidence_level: 'low',
      flags
    }
  }

  // Todo consistente
  return {
    is_consistent: true,
    confidence_level: 'high',
    flags: ['verified_consistent']
  }
}

/**
 * Formatea la ubicación para mostrar en la UI
 * Ej: "Buenos Aires, Argentina" o "Unknown Location"
 */
export function formatLocation(geoLocation: GeoLocation): string {
  if (geoLocation.country === 'Unknown') {
    return 'Unknown Location'
  }

  const parts: string[] = []

  if (geoLocation.city && geoLocation.city !== 'Unknown') {
    parts.push(geoLocation.city)
  }

  if (geoLocation.region && geoLocation.region !== geoLocation.city) {
    parts.push(geoLocation.region)
  }

  parts.push(geoLocation.country)

  return parts.join(', ')
}

/**
 * Detecta si el usuario probablemente está usando VPN/Proxy
 * basándose en inconsistencias de ubicación
 */
export function detectVPNUsage(validation: LocationValidation): boolean {
  return (
    !validation.is_consistent &&
    validation.confidence_level === 'low' &&
    validation.flags.includes('timezone_ip_mismatch') &&
    !validation.flags.includes('neighboring_country')
  )
}
