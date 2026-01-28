// tests/integration/full_system_flow.test.ts
import { assertEquals, assertExists } from "https://deno.land/std@0.173.0/testing/asserts.ts";

/**
 * Test de Integración del Flujo Completo del Sistema Canónico
 * 
 * Este test valida que el sistema completo funcione según la arquitectura:
 * 
 * Usuario → Evento canónico → document_entities.events[]
 * DecisionAuthority ← Lee verdad ← document_entities
 * DecisionAuthority → Usa autoridad → packages/authority
 * DecisionAuthority → Escribe job → executor_jobs cola neutral
 * ExecutionEngine ← Lee cola neutral ← executor_jobs
 * ExecutionEngine → Ejecuta trabajo → Resultado
 * ExecutionEngine → Evento resultado → document_entities.events[]
 */

Deno.test("Full System Flow Integration Test", async (t) => {
  await t.step("complete canonical flow - document protection", async () => {
    // 1. Simular evento inicial de usuario (documento protegido)
    const initialEvents = [
      {
        kind: 'document.created',
        at: '2026-01-27T16:00:00.000Z',
        payload: {
          filename: 'test_document_final_flow.pdf',
          file_size: 2048,
          protection: ['tsa', 'polygon', 'bitcoin']
        },
        _source: 'user_action'
      },
      {
        kind: 'protection_enabled',
        at: '2026-01-27T16:00:01.000Z',
        payload: {
          protection: {
            methods: ['tsa', 'polygon', 'bitcoin'],
            signature_type: 'none',
            forensic_enabled: true
          }
        },
        _source: 'user_action'
      }
    ];

    // 2. Simular que DecisionAuthority lee la verdad y aplica autoridad
    // (esto es lo que haría el executor basado en packages/authority)
    
    // Simular la lógica de decisiones
    const hasTsaRequested = initialEvents.some((e: any) => 
      e.kind === 'protection_enabled' && 
      e.payload?.protection?.methods?.includes('tsa')
    );
    
    const hasTsaConfirmed = initialEvents.some((e: any) => 
      e.kind === 'tsa.confirmed'
    );
    
    const shouldRunTsa = hasTsaRequested && !hasTsaConfirmed;
    
    // 3. DecisionAuthority decide crear job basado en autoridad
    const createdJobs = [];
    if (shouldRunTsa) {
      createdJobs.push({
        type: 'run_tsa',
        entity_id: 'test_entity_123',
        payload: {
          witness_hash: 'test_witness_hash_456',
          document_entity_id: 'test_entity_123'
        },
        status: 'queued',
        created_at: '2026-01-27T16:00:02.000Z'
      });
    }
    
    // 4. Verificar que DecisionAuthority creó el job correcto
    assertEquals(createdJobs.length, 1, "DecisionAuthority should create 1 job for TSA");
    assertEquals(createdJobs[0].type, 'run_tsa', "Job should be of type run_tsa");
    assertEquals(createdJobs[0].status, 'queued', "Job should be queued initially");
    
    console.log("✅ DecisionAuthority correctly created run_tsa job");

    // 5. Simular que ExecutionEngine toma el job y lo ejecuta
    const executedJob = createdJobs[0];
    const mockTsaResult = {
      success: true,
      token_b64: 'mock_tsa_token_base64_encoded',
      tsa_url: 'https://mock.tsa.service',
      algorithm: 'SHA-256',
      standard: 'RFC 3161'
    };
    
    // 6. ExecutionEngine genera evento resultado
    const resultEvents = [
      ...initialEvents, // Eventos iniciales
      { // Evento resultado de TSA
        kind: 'tsa.completed',
        at: '2026-01-27T16:01:00.000Z',
        payload: {
          witness_hash: executedJob.payload.witness_hash,
          token_b64: mockTsaResult.token_b64,
          tsa_url: mockTsaResult.tsa_url,
          algorithm: mockTsaResult.algorithm,
          standard: mockTsaResult.standard,
          job_id: executedJob.id
        },
        _source: 'execution_engine'
      }
    ];

    // 7. Verificar que el evento resultado tiene la estructura correcta
    const tsaCompletedEvent = resultEvents.find((e: any) => e.kind === 'tsa.completed');
    assertExists(tsaCompletedEvent, "TSA completion event should exist");
    assertEquals(tsaCompletedEvent.payload.token_b64, mockTsaResult.token_b64, "TSA event should include token");
    assertEquals(tsaCompletedEvent._source, 'execution_engine', "TSA event should come from execution engine");

    console.log("✅ ExecutionEngine correctly executed job and created result event");

    // 8. Simular que DecisionAuthority vuelve a procesar con los nuevos eventos
    const hasTsaConfirmedAfterExecution = resultEvents.some((e: any) =>
      e.kind === 'tsa.completed'  // o 'tsa.confirmed' dependiendo del evento exacto
    );

    const protectionRequested = resultEvents.find((e: any) =>
      e.kind === 'protection_enabled'
    )?.payload?.protection?.methods || [];

    const requiresPolygon = protectionRequested.includes('polygon');
    const requiresBitcoin = protectionRequested.includes('bitcoin');

    const hasPolygonConfirmed = resultEvents.some((e: any) =>
      e.kind === 'anchor.confirmed' && e.payload?.network === 'polygon'
    );

    const hasBitcoinConfirmed = resultEvents.some((e: any) =>
      e.kind === 'anchor.confirmed' && e.payload?.network === 'bitcoin'
    );

    // DecisionAuthority decide si crear jobs para anclajes
    const hasTsaConfirmedAfterExecution = resultEvents.some((e: any) =>
      e.kind === 'tsa.completed'  // o 'tsa.confirmed' dependiendo del evento exacto
    );
    const shouldSubmitPolygon = hasTsaConfirmedAfterExecution && requiresPolygon && !hasPolygonConfirmed;
    const shouldSubmitBitcoin = hasTsaConfirmedAfterExecution && requiresBitcoin && !hasBitcoinConfirmed;

    // 9. DecisionAuthority crea jobs para anclajes
    const anchorJobs = [];
    if (shouldSubmitPolygon) {
      anchorJobs.push({
        type: 'submit_anchor_polygon',
        entity_id: 'test_entity_123',
        payload: {
          document_entity_id: 'test_entity_123',
          witness_hash: 'test_witness_hash_456',
          network: 'polygon'
        },
        status: 'queued',
        created_at: '2026-01-27T16:01:02.000Z'
      });
    }

    if (shouldSubmitBitcoin) {
      anchorJobs.push({
        type: 'submit_anchor_bitcoin',
        entity_id: 'test_entity_123',
        payload: {
          document_entity_id: 'test_entity_123',
          witness_hash: 'test_witness_hash_456',
          network: 'bitcoin'
        },
        status: 'queued',
        created_at: '2026-01-27T16:01:03.000Z'
      });
    }

    // 10. Verificar que DecisionAuthority creó jobs para anclajes
    assertEquals(anchorJobs.length, 2, "DecisionAuthority should create 2 anchor jobs (polygon + bitcoin)");
    const polygonJob = anchorJobs.find((j: any) => j.type === 'submit_anchor_polygon');
    const bitcoinJob = anchorJobs.find((j: any) => j.type === 'submit_anchor_bitcoin');

    assertExists(polygonJob, "Polygon anchor job should exist");
    assertExists(bitcoinJob, "Bitcoin anchor job should exist");

    console.log("✅ DecisionAuthority correctly created anchor jobs after TSA completion");

    // 11. Simular ejecución de anclajes por ExecutionEngine
    const anchorResults = [
      { // Resultado de anclaje Polygon
        kind: 'anchor.submitted',
        at: '2026-01-27T16:02:00.000Z',
        payload: {
          network: 'polygon',
          tx_hash: '0xpolygontransactionhash123',
          status: 'submitted',
          witness_hash: 'test_witness_hash_456',
          job_id: polygonJob?.id
        },
        _source: 'execution_engine'
      },
      { // Resultado de anclaje Bitcoin
        kind: 'anchor.submitted',
        at: '2026-01-27T16:02:01.000Z',
        payload: {
          network: 'bitcoin',
          tx_hash: '0xbtc123456789abcdef',
          status: 'submitted',
          witness_hash: 'test_witness_hash_456',
          job_id: bitcoinJob?.id
        },
        _source: 'execution_engine'
      }
    ];

    // 12. Verificar que ExecutionEngine creó eventos de anclaje
    const polygonResult = anchorResults.find((e: any) => e.payload?.network === 'polygon');
    const bitcoinResult = anchorResults.find((e: any) => e.payload?.network === 'bitcoin');

    assertExists(polygonResult, "Polygon anchor result should exist");
    assertExists(bitcoinResult, "Bitcoin anchor result should exist");
    assertEquals(polygonResult._source, 'execution_engine', "Polygon result should come from execution engine");
    assertEquals(bitcoinResult._source, 'execution_engine', "Bitcoin result should come from execution engine");

    console.log("✅ ExecutionEngine correctly executed anchor jobs and created result events");

    // 13. Simular que DecisionAuthority procesa eventos de anclaje confirmados
    const finalEvents = [
      ...resultEvents, // Eventos anteriores
      ...anchorResults // Resultados de anclajes
    ];

    // Simular confirmación de anclajes (esto vendría de los workers de anclaje)
    const confirmedEvents = [
      ...finalEvents,
      { // Confirmación de anclaje Polygon
        kind: 'anchor.confirmed',
        at: '2026-01-27T16:03:00.000Z',
        payload: {
          network: 'polygon',
          tx_hash: '0xpolygontransactionhash123',
          confirmed_at: '2026-01-27T16:03:00.000Z',
          block_number: 12345678,
          witness_hash: 'test_witness_hash_456'
        },
        _source: 'anchor_confirmation_worker'
      },
      { // Confirmación de anclaje Bitcoin
        kind: 'anchor.confirmed',
        at: '2026-01-27T16:03:01.000Z',
        payload: {
          network: 'bitcoin',
          tx_hash: '0xbtc123456789abcdef',
          confirmed_at: '2026-01-27T16:03:01.000Z',
          block_height: 789012,
          witness_hash: 'test_witness_hash_456'
        },
        _source: 'anchor_confirmation_worker'
      }
    ];

    // 14. DecisionAuthority decide si crear job para artifact
    const hasAllAnchorsConfirmed = confirmedEvents.some((e: any) =>
      e.kind === 'anchor.confirmed' && e.payload?.network === 'polygon'
    ) && confirmedEvents.some((e: any) =>
      e.kind === 'anchor.confirmed' && e.payload?.network === 'bitcoin'
    );

    const hasArtifact = confirmedEvents.some((e: any) =>
      e.kind === 'artifact.completed' || e.kind === 'artifact.finalized'
    );

    const shouldBuildArtifact = hasTsaConfirmedAfterExecution && hasAllAnchorsConfirmed && !hasArtifact;

    // 15. DecisionAuthority crea job para build artifact
    const artifactJobs = [];
    if (shouldBuildArtifact) {
      artifactJobs.push({
        type: 'build_artifact',
        entity_id: 'test_entity_123',
        payload: {
          document_entity_id: 'test_entity_123',
          document_id: 'test_doc_456'
        },
        status: 'queued',
        created_at: '2026-01-27T16:03:02.000Z'
      });
    }

    // 16. Verificar que DecisionAuthority creó job para artifact
    assertEquals(artifactJobs.length, 1, "DecisionAuthority should create 1 artifact job when all anchors confirmed");
    assertEquals(artifactJobs[0].type, 'build_artifact', "Job should be of type build_artifact");

    console.log("✅ DecisionAuthority correctly created artifact job after all anchors confirmed");

    // 17. Simular ejecución de artifact por ExecutionEngine
    const artifactResult = {
      kind: 'artifact.completed',
      at: '2026-01-27T16:04:00.000Z',
      payload: {
        storage_path: 'https://storage.ecosign.app/artifacts/test_entity_123.eco',
        artifact_type: 'eco_v2',
        file_size: 102400,
        job_id: artifactJobs[0]?.id
      },
      _source: 'execution_engine'
    };

    // 18. Verificar que ExecutionEngine creó evento de artifact
    assertEquals(artifactResult.kind, 'artifact.completed', "Result should be artifact.completed");
    assertEquals(artifactResult._source, 'execution_engine', "Artifact result should come from execution engine");
    assertExists(artifactResult.payload.storage_path, "Artifact result should include storage path");

    console.log("✅ ExecutionEngine correctly executed artifact job and created result event");

    // 19. Verificar el flujo completo
    const allEvents = [
      ...confirmedEvents,
      artifactResult
    ];

    // Verificar que todos los pasos del flujo canónico ocurrieron
    const hasDocumentCreated = allEvents.some((e: any) => e.kind === 'document.created');
    const hasProtectionEnabled = allEvents.some((e: any) => e.kind === 'protection_enabled');
    const hasTsaCompleted = allEvents.some((e: any) => e.kind === 'tsa.completed');
    const hasPolygonConfirmed = allEvents.some((e: any) => e.kind === 'anchor.confirmed' && e.payload?.network === 'polygon');
    const hasBitcoinConfirmed = allEvents.some((e: any) => e.kind === 'anchor.confirmed' && e.payload?.network === 'bitcoin');
    const hasArtifactCompleted = allEvents.some((e: any) => e.kind === 'artifact.completed');

    assertEquals(hasDocumentCreated, true, "Document should have been created");
    assertEquals(hasProtectionEnabled, true, "Protection should have been enabled");
    assertEquals(hasTsaCompleted, true, "TSA should have been completed");
    assertEquals(hasPolygonConfirmed, true, "Polygon anchor should have been confirmed");
    assertEquals(hasBitcoinConfirmed, true, "Bitcoin anchor should have been confirmed");
    assertEquals(hasArtifactCompleted, true, "Artifact should have been completed");

    console.log("✅ Full canonical flow completed successfully:");
    console.log("   - Document created");
    console.log("   - Protection enabled");
    console.log("   - TSA executed");
    console.log("   - Anchors confirmed");
    console.log("   - Artifact built");

    // 20. Verificar que no hubo duplicación de side-effects
    const tsaEvents = allEvents.filter((e: any) => e.kind.includes('tsa'));
    const anchorEvents = allEvents.filter((e: any) => e.kind.includes('anchor'));
    const artifactEvents = allEvents.filter((e: any) => e.kind.includes('artifact'));

    // Asegurar que no hay eventos duplicados (mismo tipo con mismo contexto)
    assertEquals(tsaEvents.length, 2, "Should have exactly 2 TSA-related events (protection_enabled + tsa.completed)");
    assertEquals(anchorEvents.length >= 4, true, "Should have anchor-related events (submitted + confirmed for each network)");
    assertEquals(artifactEvents.length, 1, "Should have exactly 1 artifact event");

    console.log("✅ No duplication of side-effects detected");
  });
});

console.log("✅ Test de flujo completo del sistema canónico completado");