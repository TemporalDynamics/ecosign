#!/usr/bin/env -S deno run --allow-env --allow-net
/**
 * Script de validación de flags en staging
 * 
 * Este script valida que:
 * 1. La sincronización de flags funciona correctamente
 * 2. Los endpoints de gestión de flags responden
 * 3. El estado de los flags es consistente entre sistemas
 */

import { assertEquals } from "https://deno.land/std@0.173.0/testing/asserts.ts";

interface FlagStatusResponse {
  timestamp: string;
  sync_status: 'OK' | 'MISMATCH';
  mismatches: string[];
  typescript_flags: Record<string, boolean>;
  sql_flags: Record<string, boolean>;
  message: string;
  note: string;
}

interface SetFlagResponse {
  success: boolean;
  flagName: string;
  enabled: boolean;
  message: string;
}

class FlagsValidator {
  private baseUrl: string;
  private serviceRoleKey: string;

  constructor(stagingUrl: string, serviceRoleKey: string) {
    this.baseUrl = stagingUrl;
    this.serviceRoleKey = serviceRoleKey;
  }

  async checkStatus(): Promise<FlagStatusResponse> {
    const response = await fetch(`${this.baseUrl}/functions/v1/feature-flags-status`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.serviceRoleKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Status check failed: ${response.status} ${await response.text()}`);
    }

    return await response.json();
  }

  async setFlag(flagName: string, enabled: boolean): Promise<SetFlagResponse> {
    const response = await fetch(`${this.baseUrl}/functions/v1/set-feature-flag`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.serviceRoleKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ flagName, enabled })
    });

    if (!response.ok) {
      throw new Error(`Set flag failed: ${response.status} ${await response.text()}`);
    }

    return await response.json();
  }

  async validateSync(): Promise<boolean> {
    console.log('🔍 Validando sincronización de flags...');
    
    const status = await this.checkStatus();
    console.log(`📊 Estado de sincronización: ${status.sync_status}`);
    console.log(`📋 Flags TypeScript:`, status.typescript_flags);
    console.log(`📋 Flags SQL:`, status.sql_flags);
    
    if (status.mismatches.length > 0) {
      console.log('❌ Discrepancias encontradas:');
      status.mismatches.forEach(mismatch => console.log(`   - ${mismatch}`));
      return false;
    }
    
    console.log('✅ Todos los flags están sincronizados');
    return true;
  }

  async testFlagActivation(): Promise<boolean> {
    console.log('\n🧪 Probando activación de flag D1...');
    
    // Guardar valor original
    const originalStatus = await this.checkStatus();
    const originalD1Value = originalStatus.typescript_flags['D1_RUN_TSA_ENABLED'];
    
    try {
      // Activar flag
      const setResult = await this.setFlag('D1_RUN_TSA_ENABLED', true);
      console.log(`✅ Flag D1 activado: ${setResult.message}`);
      
      // Esperar un momento para que se procese
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Verificar estado actualizado
      const updatedStatus = await this.checkStatus();
      const newD1Value = updatedStatus.typescript_flags['D1_RUN_TSA_ENABLED'];
      
      if (newD1Value !== true) {
        console.log('❌ El flag D1 no se actualizó correctamente en TypeScript');
        return false;
      }
      
      console.log('✅ Flag D1 se activó correctamente');
      return true;
    } finally {
      // Restaurar valor original
      await this.setFlag('D1_RUN_TSA_ENABLED', originalD1Value);
      console.log('🔄 Valor original restaurado');
    }
  }

  async runRegressionTest(): Promise<boolean> {
    console.log('\n🔄 Ejecutando test de regresión...');
    
    // Probar con todos los flags
    const flagsToTest = [
      'D1_RUN_TSA_ENABLED',
      'D3_BUILD_ARTIFACT_ENABLED', 
      'D4_ANCHORS_ENABLED',
      'D5_NOTIFICATIONS_ENABLED'
    ];
    
    for (const flagName of flagsToTest) {
      console.log(`   Probando ${flagName}...`);
      
      // Alternar entre true/false
      await this.setFlag(flagName, true);
      await new Promise(resolve => setTimeout(resolve, 1000));
      const status1 = await this.checkStatus();
      
      if (status1.typescript_flags[flagName] !== true) {
        console.log(`   ❌ ${flagName} no se activó correctamente`);
        return false;
      }
      
      await this.setFlag(flagName, false);
      await new Promise(resolve => setTimeout(resolve, 1000));
      const status2 = await this.checkStatus();
      
      if (status2.typescript_flags[flagName] !== false) {
        console.log(`   ❌ ${flagName} no se desactivó correctamente`);
        return false;
      }
      
      console.log(`   ✅ ${flagName} funciona correctamente`);
    }
    
    console.log('✅ Todos los flags responden correctamente');
    return true;
  }
}

// Configuración
const STAGING_URL = Deno.env.get('STAGING_URL') || 'https://your-staging-url.supabase.co';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!SERVICE_ROLE_KEY) {
  console.error('❌ Falta la variable de entorno SUPABASE_SERVICE_ROLE_KEY');
  Deno.exit(1);
}

console.log(`🚀 Iniciando validación en: ${STAGING_URL}`);

async function runValidation() {
  const validator = new FlagsValidator(STAGING_URL, SERVICE_ROLE_KEY);
  
  let allPassed = true;
  
  // Validar sincronización
  allPassed = (await validator.validateSync()) && allPassed;
  
  // Probar activación de flag
  allPassed = (await validator.testFlagActivation()) && allPassed;
  
  // Test de regresión
  allPassed = (await validator.runRegressionTest()) && allPassed;
  
  if (allPassed) {
    console.log('\n🎉 ¡Todas las pruebas pasaron exitosamente!');
    console.log('✅ El sistema de feature flags está funcionando correctamente');
    Deno.exit(0);
  } else {
    console.log('\n💥 Algunas pruebas fallaron');
    console.log('❌ El sistema necesita correcciones');
    Deno.exit(1);
  }
}

// Ejecutar validación
await runValidation();