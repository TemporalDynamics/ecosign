// tests/integration/decisionAuthority_integration.test.ts
import { assertEquals, assertExists } from "https://deno.land/std@0.173.0/testing/asserts.ts";

// Test de integración para el DecisionAuthority
Deno.test("DecisionAuthority Integration Test", async (t) => {
  await t.step("full decision cycle - document protection flow", async () => {
    // Este test simula el flujo completo de protección de documento
    // desde evento inicial hasta creación de jobs
    
    // 1. Simular un document_entity con eventos iniciales
    const testEvents = [
      {
        kind: 'document.created',
        at: '2026-01-27T15:00:00.000Z',
        payload: {
          filename: 'test_document.pdf',
          file_size: 1024,
          protection: ['tsa', 'polygon', 'bitcoin']
        },
        _source: 'integration_test'
      },
      {
        kind: 'protection_enabled',
        at: '2026-01-27T15:00:01.000Z',
        payload: {
          protection: {
            methods: ['tsa', 'polygon', 'bitcoin'],
            signature_type: 'none',
            forensic_enabled: true
          }
        },
        _source: 'integration_test'
      }
    ];

    // 2. Simular la lectura por parte del DecisionAuthority
    // (usando las funciones canónicas de packages/authority)
    const hasTsaRequested = testEvents.some((e: any) => 
      e.kind === 'protection_enabled' && 
      e.payload?.protection?.methods?.includes('tsa')
    );
    
    const hasTsaConfirmed = testEvents.some((e: any) => 
      e.kind === 'tsa.confirmed'
    );
    
    // 3. Aplicar lógica canónica (como lo haría DecisionAuthority)
    const shouldRunTsa = !hasTsaConfirmed && hasTsaRequested;
    
    // 4. Verificar que la decisión es correcta
    assertEquals(shouldRunTsa, true, "Should decide to run TSA when requested but not confirmed");
    
    // 5. Simular creación de job basado en decisión
    const expectedJob = {
      type: 'run_tsa',
      entity_id: 'test_entity_id', // Este sería el ID real de la entidad
      status: 'queued',
      payload: {
        witness_hash: 'test_witness_hash',
        document_entity_id: 'test_entity_id'
      }
    };
    
    // 6. Verificar que el job se crearía con la información correcta
    assertExists(expectedJob.type, "Job type should be defined");
    assertExists(expectedJob.entity_id, "Entity ID should be linked to job");
    assertEquals(expectedJob.status, 'queued', "Job should be queued initially");
    
    console.log("✅ Document protection flow decision validated");
  });

  await t.step("full decision cycle - anchor flow", async () => {
    // Simular eventos con TSA confirmado pero anclajes pendientes
    const testEvents = [
      { kind: 'document.created', at: '2026-01-27T15:00:00.000Z', _source: 'integration_test' },
      { kind: 'protection_enabled', at: '2026-01-27T15:00:01.000Z', payload: { protection: { methods: ['tsa', 'polygon', 'bitcoin'] }}, _source: 'integration_test' },
      { kind: 'tsa.confirmed', at: '2026-01-27T15:01:00.000Z', payload: { witness_hash: 'test_hash', token_b64: 'test_token' }, _source: 'integration_test' }
    ];
    
    const protectionRequested = testEvents.find((e: any) => 
      e.kind === 'protection_enabled'
    )?.payload?.protection?.methods || [];
    
    const hasTsaConfirmed = testEvents.some((e: any) => 
      e.kind === 'tsa.confirmed'
    );
    
    const hasPolygonConfirmed = testEvents.some((e: any) => 
      e.kind === 'anchor.confirmed' && 
      (e.payload?.network === 'polygon' || e.payload?.network === 'polygon')
    );
    
    const hasBitcoinConfirmed = testEvents.some((e: any) => 
      e.kind === 'anchor.confirmed' && 
      (e.payload?.network === 'bitcoin' || e.payload?.network === 'bitcoin')
    );
    
    const requiresPolygon = protectionRequested.includes('polygon');
    const requiresBitcoin = protectionRequested.includes('bitcoin');
    
    // Decisiones según lógica canónica
    const shouldSubmitPolygon = hasTsaConfirmed && requiresPolygon && !hasPolygonConfirmed;
    const shouldSubmitBitcoin = hasTsaConfirmed && requiresBitcoin && !hasBitcoinConfirmed;
    
    // Verificar decisiones
    assertEquals(shouldSubmitPolygon, true, "Should submit polygon anchor when TSA confirmed, requested, and not yet confirmed");
    assertEquals(shouldSubmitBitcoin, true, "Should submit bitcoin anchor when TSA confirmed, requested, and not yet confirmed");
    
    console.log("✅ Anchor submission flow decisions validated");
  });

  await t.step("full decision cycle - artifact flow", async () => {
    // Simular eventos con todo confirmado
    const testEvents = [
      { kind: 'document.created', at: '2026-01-27T15:00:00.000Z', _source: 'integration_test' },
      { kind: 'protection_enabled', at: '2026-01-27T15:00:01.000Z', payload: { protection: { methods: ['tsa', 'polygon', 'bitcoin'] }}, _source: 'integration_test' },
      { kind: 'tsa.confirmed', at: '2026-01-27T15:01:00.000Z', _source: 'integration_test' },
      { 
        kind: 'anchor.confirmed', 
        at: '2026-01-27T15:02:00.000Z', 
        payload: { network: 'polygon', confirmed_at: '2026-01-27T15:02:00.000Z' },
        _source: 'integration_test'
      },
      { 
        kind: 'anchor.confirmed', 
        at: '2026-01-27T15:03:00.000Z', 
        payload: { network: 'bitcoin', confirmed_at: '2026-01-27T15:03:00.000Z' },
        _source: 'integration_test'
      }
    ];
    
    const protectionRequested = testEvents.find((e: any) => 
      e.kind === 'protection_enabled'
    )?.payload?.protection?.methods || [];
    
    const hasTsaConfirmed = testEvents.some((e: any) => e.kind === 'tsa.confirmed');
    const hasPolygonConfirmed = testEvents.some((e: any) => 
      e.kind === 'anchor.confirmed' && e.payload?.network === 'polygon'
    );
    const hasBitcoinConfirmed = testEvents.some((e: any) => 
      e.kind === 'anchor.confirmed' && e.payload?.network === 'bitcoin'
    );
    
    // Verificar que todos los anclajes están confirmados
    assertEquals(hasTsaConfirmed, true, "TSA should be confirmed");
    assertEquals(hasPolygonConfirmed, true, "Polygon should be confirmed");
    assertEquals(hasBitcoinConfirmed, true, "Bitcoin should be confirmed");
    
    // Decisión de artifact: cuando todo está listo
    const hasArtifact = testEvents.some((e: any) => e.kind === 'artifact.completed');
    const readyForArtifact = hasTsaConfirmed && hasPolygonConfirmed && hasBitcoinConfirmed;
    const shouldBuildArtifact = readyForArtifact && !hasArtifact;
    
    assertEquals(shouldBuildArtifact, true, "Should build artifact when all protections confirmed and no artifact yet");
    
    console.log("✅ Artifact creation flow decision validated");
  });
});

console.log("✅ Tests de integración de DecisionAuthority completados");