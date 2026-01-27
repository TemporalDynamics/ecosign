#!/usr/bin/env -S deno run --allow-env --allow-net
/**
 * Monitor del Sistema Canónico
 * 
 * Este script monitorea continuamente el estado del sistema canónico
 * y reporta cualquier anomalía o problema de funcionamiento.
 */

import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface SystemMetrics {
  timestamp: string;
  documentEntities: number;
  pendingJobs: number;
  recentEvents: number;
  jobSuccessRate: number;
  orchestratorHealth: string;
  alerts: string[];
}

async function collectMetrics(): Promise<SystemMetrics> {
  const timestamp = new Date().toISOString();
  const alerts: string[] = [];

  // Métricas de document entities
  const { count: docEntitiesCount } = await supabase
    .from('document_entities')
    .select('*', { count: 'exact', head: true });

  // Métricas de jobs pendientes
  const { count: pendingJobsCount } = await supabase
    .from('executor_jobs')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'queued');

  // Métricas de eventos recientes (últimos 10 minutos)
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { count: recentEventsCount } = await supabase
    .from('events')
    .select('*', { count: 'exact', head: true })
    .gte('at', tenMinutesAgo);

  // Tasa de éxito de jobs (últimos 30 minutos)
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const { count: totalJobs } = await supabase
    .from('executor_jobs')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', thirtyMinutesAgo);

  const { count: successfulJobs } = await supabase
    .from('executor_jobs')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'succeeded')
    .gte('created_at', thirtyMinutesAgo);

  const jobSuccessRate = totalJobs && totalJobs > 0 
    ? (successfulJobs || 0) / totalJobs * 100 
    : 0;

  // Verificar salud del orchestrator
  let orchestratorHealth = 'unknown';
  try {
    const { data: cronJobs } = await supabase
      .from('cron.job')
      .select('jobid, jobname, active')
      .ilike('jobname', '%orchestrator%');

    if (cronJobs && cronJobs.length > 0) {
      const activeJobs = cronJobs.filter(job => job.active);
      if (activeJobs.length > 0) {
        orchestratorHealth = 'healthy';
      } else {
        orchestratorHealth = 'inactive';
        alerts.push('Cron jobs del orchestrator están inactivos');
      }
    } else {
      orchestratorHealth = 'missing';
      alerts.push('No se encontraron cron jobs del orchestrator');
    }
  } catch (e) {
    orchestratorHealth = 'error';
    alerts.push(`Error verificando salud del orchestrator: ${e.message}`);
  }

  // Verificar condiciones de alerta
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
    orchestratorHealth,
    alerts
  };
}

function formatReport(metrics: SystemMetrics): string {
  const status = metrics.alerts.length === 0 ? '✅' : '⚠️';
  const statusText = metrics.alerts.length === 0 ? 'SALUDABLE' : 'CON ALERTAS';
  
  return `
${status} ESTADO DEL SISTEMA CANÓNICO - ${metrics.timestamp}
=================================================

📊 MÉTRICAS:
   Document Entities: ${metrics.documentEntities}
   Jobs Pendientes: ${metrics.pendingJobs}
   Eventos Recientes (10m): ${metrics.recentEvents}
   Tasa de Éxito de Jobs: ${metrics.jobSuccessRate.toFixed(2)}%
   Salud Orchestrator: ${metrics.orchestratorHealth}

${metrics.alerts.length > 0 ? 
  `🚨 ALERTAS:\n${metrics.alerts.map(alert => `   ⚠️ ${alert}`).join('\n')}\n` : 
  '✅ No hay alertas activas'}

🎯 ESTADO: ${statusText}
=================================================
`;
}

async function runMonitor() {
  console.log('🔍 Iniciando monitoreo del sistema canónico...\n');

  try {
    const metrics = await collectMetrics();
    const report = formatReport(metrics);
    
    console.log(report);

    // Si hay alertas críticas, salir con código de error
    if (metrics.alerts.some(alert => alert.includes('ALERTA'))) {
      Deno.exit(1);
    }

    // Salir con éxito
    Deno.exit(0);
  } catch (error) {
    console.error('❌ Error en monitoreo:', error);
    Deno.exit(1);
  }
}

// Ejecutar monitor
if (import.meta.main) {
  runMonitor();
}