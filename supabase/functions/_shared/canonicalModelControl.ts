/**
 * Sistema de Control de Modo Canónico
 * 
 * Este archivo implementa controles para asegurar que solo se escriba
 * en el modelo canónico (document_entities) y no en modelos legacy.
 */

import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * Verifica si el sistema está en modo "pure canonical"
 * En este modo, no se permite escritura en tablas legacy
 */
export function isPureCanonicalMode(): boolean {
  const mode = Deno.env.get('CANONICAL_ONLY_MODE');
  return mode === 'true' || mode === '1' || mode === 'on';
}

/**
 * Control de escritura legacy
 * Lanza error si se intenta escribir en tablas legacy en modo canónico puro
 */
export function checkLegacyWriteAttempt(tableName: string): void {
  if (isPureCanonicalMode()) {
    const legacyTables = ['user_documents', 'documents', 'legacy_documents'];
    if (legacyTables.includes(tableName)) {
      throw new Error(`Legacy write blocked in pure canonical mode: ${tableName}`);
    }
  }
}

/**
 * Wrapper para supabase.from() que bloquea escrituras legacy en modo canónico
 */
export function safeSupabaseFrom(tableName: string) {
  const tableRef = supabase.from(tableName);
  
  // Interceptamos operaciones de escritura
  const originalInsert = tableRef.insert.bind(tableRef);
  const originalUpdate = tableRef.update.bind(tableRef);
  const originalDelete = tableRef.delete.bind(tableRef);
  
  return {
    ...tableRef,
    insert: (data: any, options?: any) => {
      checkLegacyWriteAttempt(tableName);
      return originalInsert(data, options);
    },
    update: (data: any, options?: any) => {
      checkLegacyWriteAttempt(tableName);
      return originalUpdate(data, options);
    },
    delete: (options?: any) => {
      checkLegacyWriteAttempt(tableName);
      return originalDelete(options);
    }
  };
}

/**
 * Servicio de migración de documentos legacy a canónico
 * 
 * Este servicio convierte documentos legacy en entidades canónicas
 */
export class LegacyToCanonicalMigrationService {
  
  /**
   * Migrar un documento legacy a entidad canónica
   */
  static async migrateLegacyDocument(legacyDoc: any, tableName: string): Promise<string | null> {
    try {
      // Validar que estamos migrando desde una tabla legacy válida
      if (!['user_documents', 'documents'].includes(tableName)) {
        throw new Error(`Tabla no válida para migración: ${tableName}`);
      }

      // Extraer información del documento legacy
      const canonicalEntity = this.convertLegacyToCanonical(legacyDoc, tableName);
      
      // Crear entidad canónica
      const { data: newEntity, error } = await supabase
        .from('document_entities')
        .insert(canonicalEntity)
        .select('id')
        .single();

      if (error) {
        console.error(`[migration] Error creando entidad canónica para ${legacyDoc.id}:`, error.message);
        return null;
      }

      console.log(`[migration] Documento migrado: ${legacyDoc.id} → ${newEntity.id}`);
      return newEntity.id;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[migration] Error migrando documento legacy ${legacyDoc.id}:`, message);
      return null;
    }
  }

  /**
   * Convertir documento legacy a entidad canónica
   */
  private static convertLegacyToCanonical(legacyDoc: any, sourceTable: string): any {
    const events: any[] = [];
    
    // Mapear campos legacy a eventos canónicos
    if (sourceTable === 'user_documents') {
      // Evento de creación
      events.push({
        kind: 'document.created',
        at: legacyDoc.created_at || new Date().toISOString(),
        payload: {
          document_name: legacyDoc.document_name,
          document_size: legacyDoc.document_size,
          document_type: legacyDoc.document_type,
          source_hash: legacyDoc.document_hash
        },
        _source: 'migration_from_user_documents'
      });

      // Evento de protección
      if (legacyDoc.document_hash) {
        events.push({
          kind: 'protection_enabled',
          at: legacyDoc.created_at || new Date().toISOString(),
          payload: {
            protection: this.extractProtectionMethods(legacyDoc),
            document_hash: legacyDoc.document_hash
          },
          _source: 'migration_from_user_documents'
        });
      }

      // Evento de TSA si existe
      if (legacyDoc.tsa_token) {
        events.push({
          kind: 'tsa.confirmed',
          at: legacyDoc.tsa_confirmed_at || new Date().toISOString(),
          witness_hash: legacyDoc.eco_hash || legacyDoc.document_hash,
          tsa: {
            token_b64: legacyDoc.tsa_token,
            digest_algo: 'sha256'
          },
          _source: 'migration_from_user_documents'
        });
      }

      // Evento de anclaje Polygon si existe
      if (legacyDoc.polygon_tx_hash) {
        events.push({
          kind: 'anchor',
          at: legacyDoc.polygon_confirmed_at || new Date().toISOString(),
          anchor: {
            network: 'polygon',
            witness_hash: legacyDoc.eco_hash || legacyDoc.document_hash,
            txid: legacyDoc.polygon_tx_hash,
            confirmed_at: legacyDoc.polygon_confirmed_at || new Date().toISOString(),
          },
          _source: 'migration_from_user_documents'
        });
      }

      // Evento de anclaje Bitcoin si existe
      if (legacyDoc.bitcoin_tx_hash) {
        events.push({
          kind: 'anchor',
          at: legacyDoc.bitcoin_confirmed_at || new Date().toISOString(),
          anchor: {
            network: 'bitcoin',
            witness_hash: legacyDoc.eco_hash || legacyDoc.document_hash,
            txid: legacyDoc.bitcoin_tx_hash,
            confirmed_at: legacyDoc.bitcoin_confirmed_at || new Date().toISOString(),
          },
          _source: 'migration_from_user_documents'
        });
      }

      // Evento de artifact si existe
      if (legacyDoc.eco_storage_path) {
        events.push({
          kind: 'artifact.finalized',
          at: legacyDoc.updated_at || new Date().toISOString(),
          payload: {
            artifact_storage_path: legacyDoc.eco_storage_path,
            artifact_type: 'eco'
          },
          _source: 'migration_from_user_documents'
        });
      }
    } else if (sourceTable === 'documents') {
      // Similar para tabla 'documents'
      events.push({
        kind: 'document.created',
        at: legacyDoc.created_at || new Date().toISOString(),
        payload: {
          filename: legacyDoc.filename,
          file_size: legacyDoc.file_size,
          file_type: legacyDoc.file_type,
          source_hash: legacyDoc.document_hash
        },
        _source: 'migration_from_documents'
      });
    }

    // Derivar estado desde eventos
    const lifecycleStatus = this.deriveLifecycleStatus(events);

    return {
      id: legacyDoc.id, // Mantener el ID si es posible para consistencia
      owner_id: legacyDoc.user_id || legacyDoc.owner_id,
      source_hash: legacyDoc.document_hash || legacyDoc.source_hash,
      witness_hash: legacyDoc.eco_hash || legacyDoc.witness_hash || legacyDoc.document_hash,
      signed_hash: legacyDoc.signed_hash || null,
      composite_hash: legacyDoc.composite_hash || this.calculateCompositeHash(legacyDoc),
      events: events,
      lifecycle_status: lifecycleStatus,
      created_at: legacyDoc.created_at || new Date().toISOString(),
      updated_at: legacyDoc.updated_at || new Date().toISOString(),
      metadata: legacyDoc.metadata || {}
    };
  }

  /**
   * Extraer métodos de protección desde documento legacy
   */
  private static extractProtectionMethods(legacyDoc: any): string[] {
    const methods: string[] = [];
    
    if (legacyDoc.tsa_token) methods.push('tsa');
    if (legacyDoc.polygon_tx_hash) methods.push('polygon');
    if (legacyDoc.bitcoin_tx_hash) methods.push('bitcoin');
    if (legacyDoc.eco_storage_path) methods.push('artifact');
    
    return methods;
  }

  /**
   * Derivar estado de ciclo de vida desde eventos
   */
  private static deriveLifecycleStatus(events: any[]): string {
    if (!Array.isArray(events) || events.length === 0) {
      return 'created';
    }

    const hasTsa = events.some((e: any) => e.kind === 'tsa.confirmed');
    const hasPolygon = events.some((e: any) => e.kind === 'anchor' && e.anchor?.network === 'polygon');
    const hasBitcoin = events.some((e: any) => e.kind === 'anchor' && e.anchor?.network === 'bitcoin');
    const hasArtifact = events.some((e: any) => e.kind === 'artifact.finalized');

    if (hasTsa && hasPolygon && hasBitcoin && hasArtifact) {
      return 'completed';
    } else if (hasTsa && (hasPolygon || hasBitcoin)) {
      return 'anchored';
    } else if (hasTsa) {
      return 'protected';
    } else {
      return 'created';
    }
  }

  /**
   * Calcular hash compuesto desde datos legacy
   */
  private static calculateCompositeHash(legacyDoc: any): string {
    // En una implementación real, usaríamos una función de hashing real
    // Por ahora, simplemente devolvemos el document_hash como placeholder
    return legacyDoc.document_hash || legacyDoc.source_hash || '';
  }
}

/**
 * Servicio de verificación de integridad del modelo canónico
 */
export class CanonicalModelIntegrityService {
  
  /**
   * Verificar que no hay escrituras legacy en modo canónico puro
   */
  static async verifyNoLegacyWrites(): Promise<boolean> {
    if (!isPureCanonicalMode()) {
      // En modo mixto, permitimos escrituras legacy
      return true;
    }

    // Verificar que no hay escrituras recientes en tablas legacy
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    
    try {
      // Verificar user_documents
      const { count: userDocsRecent, error: userDocsError } = await supabase
        .from('user_documents')
        .select('*', { count: 'exact', head: true })
        .gte('updated_at', tenMinutesAgo);
      
      if (userDocsError) {
        console.warn('[integrity] Error verificando user_documents:', userDocsError.message);
      } else if (userDocsRecent && userDocsRecent > 0) {
        console.warn(`[integrity] ${userDocsRecent} escrituras recientes en user_documents`);
        return false;
      }

      // Verificar documents
      const { count: docsRecent, error: docsError } = await supabase
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .gte('updated_at', tenMinutesAgo);
      
      if (docsError) {
        console.warn('[integrity] Error verificando documents:', docsError.message);
      } else if (docsRecent && docsRecent > 0) {
        console.warn(`[integrity] ${docsRecent} escrituras recientes en documents`);
        return false;
      }

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('[integrity] Error verificando integridad:', message);
      return false;
    }
  }
}
