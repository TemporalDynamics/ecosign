/**
 * Script de monitoreo: Verificar estado del sistema canónico
 * 
 * Este script monitorea continuamente que:
 * 1. El executor esté procesando eventos
 * 2. El orchestrator esté ejecutando jobs
 * 3. No haya acumulación de trabajos
 * 4. Los eventos se estén registrando correctamente
 */

import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface SystemHealth {
  timestamp: string;
  documentEntities: number;
  pendingJobs: number;
  recentEvents: number;
  jobSuccessRate: number;
  alerts: string[];
}

async function checkSystemHealth(): Promise<SystemHealth> {
  const timestamp = new Date().toISOString();
  const alerts: string[] = [];

  // 1. Contar document_entities
  const { count: docEntitiesCount, error: docEntitiesError } = await supabase
    .from('document_entities')
    .select('*', { count: 'exact', head: true });

  if (docEntitiesError) {
    alerts.push(`Error contando document_entities: ${docEntitiesError.message}`);
  }

  // 2. Contar jobs pendientes
  const { count: pendingJobsCount, error: pendingJobsError } = await supabase
    .from('executor_jobs')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'queued');

  if (pendingJobsError) {
    alerts.push(`Error contando jobs pendientes: ${pendingJobsError.message}`);
  }

  // 3. Contar eventos recientes (últimos 10 minutos)
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { count: recentEventsCount, error: recentEventsError } = await supabase
    .from('events')
    .select('*', { count: 'exact', head: true })
    .gte('at', tenMinutesAgo);

  if (recentEventsError) {
    // Probar con document_entities.events[]
    const { data: entities, error: entitiesError } = await supabase
      .from('document_entities')
      .select('events');
    
    if (entitiesError) {
      alerts.push(`Error contando eventos recientes: ${recentEventsError.message}`);
    } else {
      let recentCount = 0;
      for (const entity of entities) {
        if (Array.isArray(entity.events)) {
          for (const event of entity.events) {
            if (typeof event === 'object' && event.at) {
              const eventTime = new Date(event.at as string);
              if (eventTime >= new Date(tenMinutesAgo)) {
                recentCount++;
              }
            }
          }
        }
      }
      recentEventsCount = recentCount;
    }
  }

  // 4. Calcular tasa de éxito de jobs
  const { count: totalJobs, error: totalJobsError } = await supabase
    .from('executor_jobs')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', tenMinutesAgo);

  const { count: successfulJobs, error: successError } = await supabase
    .from('executor_jobs')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'succeeded')
    .gte('created_at', tenMinutesAgo);

  let jobSuccessRate = 0;
  if (!totalJobsError && totalJobs && totalJobs > 0) {
    jobSuccessRate = successfulJobs ? (successfulJobs / totalJobs) * 100 : 0;
  }

  // 5. Verificar condiciones de alerta
  if (pendingJobsCount && pendingJobsCount > 100) {
    alerts.push(`ALERTA: ${pendingJobsCount} jobs pendientes (alto número)`);
  }

  if (jobSuccessRate < 80) {
    alerts.push(`ALERTA: Tasa de éxito de jobs baja: ${jobSuccessRate.toFixed(2)}%`);
  }

  if (!recentEventsCount || recentEventsCount === 0) {
    alerts.push('ALERTA: No hay eventos recientes (sistema inactivo?)');
  }

  return {
    timestamp,
    documentEntities: docEntitiesCount || 0,
    pendingJobs: pendingJobsCount || 0,
    recentEvents: recentEventsCount || 0,
    jobSuccessRate,
    alerts
  };
}

async function runMonitoring() {
  console.log('🔍 Iniciando monitoreo del sistema canónico...\n');

  try {
    const health = await checkSystemHealth();

    console.log(`📅 Timestamp: ${health.timestamp}`);
    console.log(`📦 Document Entities: ${health.documentEntities}`);
    console.log(`⏳ Jobs Pendientes: ${health.pendingJobs}`);
    console.log(`📈 Eventos Recientes: ${health.recentEvents} (últimos 10 min)`);
    console.log(`✅ Tasa de Éxito de Jobs: ${health.jobSuccessRate.toFixed(2)}%`);
    console.log('');

    if (health.alerts.length > 0) {
      console.log('🚨 ALERTAS:');
      health.alerts.forEach(alert => {
        console.log(`   ⚠️  ${alert}`);
      });
      console.log('');
    } else {
      console.log('✅ Sistema en buen estado - No hay alertas');
    }

    // Devolver estado para posible integración con sistemas de alerta
    const isHealthy = health.alerts.length === 0 && health.jobSuccessRate >= 90;
    
    console.log(`\n🎯 Estado del sistema: ${isHealthy ? '✅ SALUDABLE' : '⚠️  CON CUIDADO'}`);
    
    return { isHealthy, health };
  } catch (error) {
    console.error('❌ Error en monitoreo:', error);
    throw error;
  }
}

// Ejecutar monitoreo
if (import.meta.main) {
  runMonitoring()
    .then(({ isHealthy }) => {
      console.log('\n🏁 Monitoreo completado');
      // Salir con código 1 si el sistema no está saludable (para integración con monitoreo automático)
      Deno.exit(isHealthy ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Error fatal en monitoreo:', error);
      Deno.exit(1);
    });
}

export { checkSystemHealth, runMonitoring };