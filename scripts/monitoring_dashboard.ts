/**
 * Script de Monitoreo del Sistema Canónico
 * 
 * Este script proporciona una vista completa del estado del sistema canónico
 * mostrando métricas clave y alertas en tiempo real.
 */

import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface SystemMetrics {
  document_entities: number;
  total_events: number;
  events_today: number;
  events_last_hour: number;
  active_flags: number;
  pending_jobs: number;
  running_jobs: number;
  failed_jobs: number;
  job_success_rate: number;
  recent_job_runs: number;
  avg_execution_time: number;
  last_execution: string | null;
}

async function getSystemMetrics(): Promise<SystemMetrics> {
  // Contar document entities
  const { count: docEntitiesCount } = await supabase
    .from('document_entities')
    .select('*', { count: 'exact', head: true });

  // Contar eventos totales
  const { count: totalEventsCount } = await supabase
    .from('events')
    .select('*', { count: 'exact', head: true });

  // Contar eventos de hoy
  const today = new Date().toISOString().split('T')[0];
  const { count: eventsTodayCount } = await supabase
    .from('events')
    .select('*', { count: 'exact', head: true })
    .gte('at', `${today}T00:00:00.000Z`);

  // Contar eventos de la última hora
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count: eventsLastHourCount } = await supabase
    .from('events')
    .select('*', { count: 'exact', head: true })
    .gte('at', oneHourAgo);

  // Contar flags activos
  const { count: activeFlagsCount } = await supabase
    .from('feature_flags')
    .select('*', { count: 'exact', head: true })
    .eq('enabled', true);

  // Contar jobs por estado
  const { count: pendingJobsCount } = await supabase
    .from('executor_jobs')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'queued');

  const { count: runningJobsCount } = await supabase
    .from('executor_jobs')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'running');

  const { count: failedJobsCount } = await supabase
    .from('executor_jobs')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'failed');

  // Calcular tasa de éxito de jobs
  const { count: totalJobsCount } = await supabase
    .from('executor_jobs')
    .select('*', { count: 'exact', head: true });

  const { count: successfulJobsCount } = await supabase
    .from('executor_jobs')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'succeeded');

  const jobSuccessRate = totalJobsCount && totalJobsCount > 0
    ? (successfulJobsCount || 0) / totalJobsCount * 100
    : 0;

  // Contar ejecuciones recientes
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count: recentRunsCount } = await supabase
    .from('executor_job_runs')
    .select('*', { count: 'exact', head: true })
    .gte('started_at', oneHourAgo);

  // Calcular tiempo promedio de ejecución
  let avgExecutionTime = 0;
  let lastExecutionTime: string | null = null;

  try {
    const { data: recentRuns } = await supabase
      .from('executor_job_runs')
      .select('started_at, finished_at')
      .gte('started_at', oneHourAgo)
      .not('finished_at', 'is', null);

    if (recentRuns && recentRuns.length > 0) {
      const durations = recentRuns
        .filter((run: any) => run.finished_at)
        .map((run: any) => {
          const start = new Date(run.started_at).getTime();
          const finish = new Date(run.finished_at).getTime();
          return finish - start;
        });

      if (durations.length > 0) {
        avgExecutionTime = durations.reduce((a: number, b: number) => a + b, 0) / durations.length;
      }

      // Obtener la última ejecución
      const lastRun = recentRuns.sort((a: any, b: any) =>
        new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
      )[0];

      if (lastRun) {
        lastExecutionTime = lastRun.started_at;
      }
    }
  } catch (error) {
    console.warn('Error calculando métricas de ejecución:', error.message);
  }

  return {
    document_entities: docEntitiesCount || 0,
    total_events: totalEventsCount || 0,
    events_today: eventsTodayCount || 0,
    events_last_hour: eventsLastHourCount || 0,
    active_flags: activeFlagsCount || 0,
    pending_jobs: pendingJobsCount || 0,
    running_jobs: runningJobsCount || 0,
    failed_jobs: failedJobsCount || 0,
    job_success_rate: jobSuccessRate,
    recent_job_runs: recentRunsCount || 0,
    avg_execution_time: avgExecutionTime,
    last_execution: lastExecutionTime
  };
}

function formatDashboard(metrics: SystemMetrics): string {
  const criticalAlerts = [];
  const warningAlerts = [];

  // Alertas críticas
  if (metrics.pending_jobs > 100) {
    criticalAlerts.push(`ALERTA: ${metrics.pending_jobs} jobs pendientes (alto número)`);
  }

  if (metrics.job_success_rate < 90) {
    criticalAlerts.push(`ALERTA: Tasa de éxito baja: ${metrics.job_success_rate.toFixed(2)}%`);
  }

  if (metrics.events_last_hour === 0) {
    warningAlerts.push('ADVERTENCIA: No hay eventos recientes (sistema inactivo?)');
  }

  // Alertas de advertencia
  if (metrics.pending_jobs > 50) {
    warningAlerts.push(`ADVERTENCIA: ${metrics.pending_jobs} jobs pendientes (monitorear)`);
  }

  if (metrics.job_success_rate < 95) {
    warningAlerts.push(`ADVERTENCIA: Tasa de éxito moderadamente baja: ${metrics.job_success_rate.toFixed(2)}%`);
  }

  if (metrics.avg_execution_time > 30000) { // > 30 segundos
    warningAlerts.push(`ADVERTENCIA: Tiempo promedio de ejecución alto: ${(metrics.avg_execution_time / 1000).toFixed(1)}s`);
  }

  const criticalStatus = criticalAlerts.length === 0 ? '✅' : '🔴';
  const warningStatus = warningAlerts.length === 0 ? '✅' : '🟡';

  return `
${criticalStatus}${warningStatus} DASHBOARD DE MONITOREO DEL SISTEMA CANÓNICO
=======================================================

📊 MÉTRICAS GENERALES:
   Document Entities: ${metrics.document_entities.toLocaleString()}
   Eventos Totales: ${metrics.total_events.toLocaleString()}
   Eventos Hoy: ${metrics.events_today.toLocaleString()}
   Eventos Ú Hora: ${metrics.events_last_hour.toLocaleString()}

🔐 AUTORIDAD CANÓNICA:
   Flags Activos: ${metrics.active_flags}
   Flags Disponibles: ${4 - metrics.active_flags} (de 4 totales)

⚙️ EJECUCIÓN:
   Jobs Pendientes: ${metrics.pending_jobs}
   Jobs Procesando: ${metrics.running_jobs}
   Jobs Fallidos: ${metrics.failed_jobs}
   Tasa de Éxito: ${metrics.job_success_rate.toFixed(2)}%
   Ejecuciones Ú Hora: ${metrics.recent_job_runs}
   Tiempo Promedio: ${(metrics.avg_execution_time / 1000).toFixed(2)}s
   Ú Ejecución: ${metrics.last_execution || 'ninguna'}

🚨 ALERTAS:
   Críticas: ${criticalAlerts.length}
   ${criticalAlerts.map(alert => `      🔴 ${alert}`).join('\n   ') || '      ✅ Ninguna'}
   
   Advertencias: ${warningAlerts.length}
   ${warningAlerts.map(alert => `      🟡 ${alert}`).join('\n   ') || '      ✅ Ninguna'}

🎯 ESTADO DEL SISTEMA:
   - DecisionAuthority: ${metrics.active_flags > 0 ? 'ACTIVO' : 'LEGACY'} (${metrics.active_flags}/4 flags)
   - ExecutionEngine: ${metrics.recent_job_runs > 0 ? 'FUNCIONAL' : 'INACTIVO'} (${metrics.recent_job_runs} ejecuciones/hora)
   - Verdad Canónica: ${metrics.total_events > 0 ? 'COMPLETA' : 'VACÍA'} (${metrics.total_events} eventos)
   - Separación: ${metrics.active_flags > 0 ? 'MANTENIDA' : 'PENDIENTE'}

${criticalAlerts.length > 0 ? '❌ SISTEMA CON ALERTAS CRÍTICAS - REQUIERE ATENCIÓN INMEDIATA' : 
  warningAlerts.length > 0 ? '⚠️ SISTEMA CON ADVERTENCIAS - MONITOREAR' : 
  '✅ SISTEMA OPERANDO NORMALMENTE'}
=======================================================
`;
}

async function runMonitoringDashboard() {
  console.log('🔍 INICIANDO DASHBOARD DE MONITOREO DEL SISTEMA CANÓNICO...\n');

  try {
    const metrics = await getSystemMetrics();
    const dashboard = formatDashboard(metrics);
    
    console.log(dashboard);
    
    return true;
  } catch (error) {
    console.error('❌ Error obteniendo métricas del sistema:', error);
    return false;
  }
}

// Ejecutar dashboard
if (import.meta.main) {
  runMonitoringDashboard()
    .then(success => {
      if (success) {
        console.log('\n✅ MONITOREO COMPLETADO - SISTEMA ESTABLE');
        Deno.exit(0);
      } else {
        console.log('\n💥 ERROR EN MONITOREO - SISTEMA INESTABLE');
        Deno.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ Error en dashboard:', error);
      Deno.exit(1);
    });
}

export { runMonitoringDashboard, getSystemMetrics, formatDashboard };