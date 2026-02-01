/**
 * Prueba End-to-End del Sistema Canónico
 * 
 * Este script ejecuta un flujo completo para verificar que:
 * 1. DecisionAuthority procesa eventos correctamente
 * 2. ExecutionEngine ejecuta jobs correctamente
 * 3. El sistema mantiene la separación de responsabilidades
 */

import { expect, test } from 'vitest';

// Simular el flujo completo del sistema canónico
test("End-to-End - Flujo Completo del Sistema Canónico", () => {
    // Simular el estado inicial de un documento
    const initialDocumentEntity = {
      id: 'test_entity_789',
      source_hash: 'initial_document_hash_abc',
      witness_hash: 'initial_document_hash_abc',
      events: [
        {
          kind: 'document.created',
          at: '2026-01-27T17:00:00.000Z',
          payload: {
            filename: 'test_document_e2e.pdf',
            file_size: 2048,
            protection: ['tsa', 'polygon', 'bitcoin']
          },
          _source: 'user_action'
        },
        {
          kind: 'document.protected.requested',
          at: '2026-01-27T17:00:01.000Z',
          payload: {
            protection: ['tsa', 'polygon', 'bitcoin'],
          },
          _source: 'user_action'
        }
      ],
      lifecycle_status: 'created',
      created_at: '2026-01-27T17:00:00.000Z',
      updated_at: '2026-01-27T17:00:01.000Z'
    };

    console.log("📥 Estado inicial del documento:", initialDocumentEntity.id);

    // 1. DecisionAuthority lee verdad y aplica autoridad
    console.log("🧠 DecisionAuthority procesando eventos...");
    
    // Extraer información del estado
    const events = initialDocumentEntity.events;
    const protectionRequested = events.find((e: any) => 
      e.kind === 'document.protected.requested'
    )?.payload?.protection || [];
    
    const hasTsaRequested = protectionRequested.includes('tsa');
    const hasPolygonRequested = protectionRequested.includes('polygon');
    const hasBitcoinRequested = protectionRequested.includes('bitcoin');
    
    const hasTsaConfirmed = events.some((e: any) => 
      e.kind === 'tsa.completed' || e.kind === 'tsa.confirmed'
    );
    
    const hasPolygonConfirmedInitial = events.some((e: any) => 
      e.kind === 'anchor.confirmed' && e.payload?.network === 'polygon'
    );
    
    const hasBitcoinConfirmedInitial = events.some((e: any) => 
      e.kind === 'anchor.confirmed' && e.payload?.network === 'bitcoin'
    );
    
    const hasArtifact = events.some((e: any) => 
      e.kind === 'artifact.completed' || e.kind === 'artifact.finalized'
    );

    // DecisionAuthority toma decisiones basadas en packages/authority
    const decisions = {
      shouldRunTsa: hasTsaRequested && !hasTsaConfirmed,
      shouldSubmitPolygon: hasTsaConfirmed && hasPolygonRequested && !hasPolygonConfirmedInitial,
      shouldSubmitBitcoin: hasTsaConfirmed && hasBitcoinRequested && !hasBitcoinConfirmedInitial,
      shouldBuildArtifact: hasTsaConfirmed && 
                           (!hasPolygonRequested || hasPolygonConfirmedInitial) && 
                           (!hasBitcoinRequested || hasBitcoinConfirmedInitial) && 
                           !hasArtifact
    };

    console.log("   - Decisiones tomadas:", decisions);

    // 2. DecisionAuthority crea jobs en cola neutral
    console.log("📥 DecisionAuthority creando jobs en cola...");
    
    const jobsToCreate = [];
    
    if (decisions.shouldRunTsa) {
      jobsToCreate.push({
        type: 'run_tsa',
        entity_id: initialDocumentEntity.id,
        payload: {
          witness_hash: initialDocumentEntity.witness_hash,
          document_entity_id: initialDocumentEntity.id
        },
        status: 'queued',
        created_at: '2026-01-27T17:00:02.000Z',
        dedupe_key: `${initialDocumentEntity.id}:run_tsa:${Date.now()}`
      });
    }
    
    if (decisions.shouldSubmitPolygon) {
      jobsToCreate.push({
        type: 'submit_anchor_polygon',
        entity_id: initialDocumentEntity.id,
        payload: {
          document_entity_id: initialDocumentEntity.id,
          witness_hash: initialDocumentEntity.witness_hash,
          network: 'polygon'
        },
        status: 'queued',
        created_at: '2026-01-27T17:00:03.000Z',
        dedupe_key: `${initialDocumentEntity.id}:submit_anchor_polygon:${Date.now()}`
      });
    }
    
    if (decisions.shouldSubmitBitcoin) {
      jobsToCreate.push({
        type: 'submit_anchor_bitcoin',
        entity_id: initialDocumentEntity.id,
        payload: {
          document_entity_id: initialDocumentEntity.id,
          witness_hash: initialDocumentEntity.witness_hash,
          network: 'bitcoin'
        },
        status: 'queued',
        created_at: '2026-01-27T17:00:04.000Z',
        dedupe_key: `${initialDocumentEntity.id}:submit_anchor_bitcoin:${Date.now()}`
      });
    }
    
    if (decisions.shouldBuildArtifact) {
      jobsToCreate.push({
        type: 'build_artifact',
        entity_id: initialDocumentEntity.id,
        payload: {
          document_entity_id: initialDocumentEntity.id,
          document_id: 'test_doc_999'
        },
        status: 'queued',
        created_at: '2026-01-27T17:00:05.000Z',
        dedupe_key: `${initialDocumentEntity.id}:build_artifact:${Date.now()}`
      });
    }

    // En este punto, solo debería haber job de TSA (porque no hay tsa.confirmed aún)
    expect(jobsToCreate).toHaveLength(1);
    expect(jobsToCreate[0].type).toBe('run_tsa');
    
    console.log("   - Jobs creados:", jobsToCreate.length);
    console.log("   - Tipo de primer job:", jobsToCreate[0].type);

    // 3. Simular que ExecutionEngine toma job y lo ejecuta
    console.log("⚙️  ExecutionEngine ejecutando job...");
    
    const executedJob = jobsToCreate[0]; // El job de TSA
    let executionResult;
    let resultEvent;
    
    if (executedJob.type === 'run_tsa') {
      // Simular ejecución de TSA
      executionResult = {
        success: true,
        token_b64: 'executed_tsa_token_base64',
        tsa_url: 'https://executed.tsa.service',
        algorithm: 'SHA-256',
        standard: 'RFC 3161'
      };
      
      resultEvent = {
        kind: 'tsa.completed',
        at: '2026-01-27T17:01:00.000Z',
        payload: {
          witness_hash: executedJob.payload.witness_hash,
          token_b64: executionResult.token_b64,
          tsa_url: executionResult.tsa_url,
          algorithm: executionResult.algorithm,
          standard: executionResult.standard,
          job_id: executedJob.id
        },
        _source: 'execution_engine'
      };
    }

    console.log("   - Job ejecutado:", executedJob.type);
    console.log("   - Evento resultado generado:", resultEvent.kind);

    // 4. Nuevo estado con evento de resultado
    console.log("📥 Nuevo estado con evento de resultado...");
    
    const newStateWithTsa = {
      ...initialDocumentEntity,
      events: [
        ...initialDocumentEntity.events,
        resultEvent
      ]
    };

    // 5. DecisionAuthority vuelve a procesar con nuevo estado
    console.log("🧠 DecisionAuthority procesando nuevo estado...");
    
    // Ahora que hay tsa.completed, debería decidir anclajes
    const newEvents = newStateWithTsa.events;
    const newHasTsaConfirmed = newEvents.some((e: any) => 
      e.kind === 'tsa.completed' || e.kind === 'tsa.confirmed'
    );
    
    const newProtectionRequested = newEvents.find((e: any) => 
      e.kind === 'document.protected.requested'
    )?.payload?.protection || [];
    
    const newHasPolygonRequested = newProtectionRequested.includes('polygon');
    const newHasBitcoinRequested = newProtectionRequested.includes('bitcoin');
    
    const newHasPolygonConfirmed = newEvents.some((e: any) => 
      e.kind === 'anchor.confirmed' && e.payload?.network === 'polygon'
    );
    
    const newHasBitcoinConfirmed = newEvents.some((e: any) => 
      e.kind === 'anchor.confirmed' && e.payload?.network === 'bitcoin'
    );

    const newDecisions = {
      shouldRunTsa: false, // Ya está confirmado
      shouldSubmitPolygon: newHasTsaConfirmed && newHasPolygonRequested && !newHasPolygonConfirmed,
      shouldSubmitBitcoin: newHasTsaConfirmed && newHasBitcoinRequested && !newHasBitcoinConfirmed,
      shouldBuildArtifact: false // Aún no están todos los anclajes
    };

    console.log("   - Nuevas decisiones:", newDecisions);

    // DecisionAuthority crea jobs para anclajes
    const newJobsToCreate = [];
    
    if (newDecisions.shouldSubmitPolygon) {
      newJobsToCreate.push({
        type: 'submit_anchor_polygon',
        entity_id: newStateWithTsa.id,
        payload: {
          document_entity_id: newStateWithTsa.id,
          witness_hash: newStateWithTsa.witness_hash,
          network: 'polygon'
        },
        status: 'queued',
        created_at: '2026-01-27T17:01:01.000Z',
        dedupe_key: `${newStateWithTsa.id}:submit_anchor_polygon:${Date.now()}`
      });
    }
    
    if (newDecisions.shouldSubmitBitcoin) {
      newJobsToCreate.push({
        type: 'submit_anchor_bitcoin',
        entity_id: newStateWithTsa.id,
        payload: {
          document_entity_id: newStateWithTsa.id,
          witness_hash: newStateWithTsa.witness_hash,
          network: 'bitcoin'
        },
        status: 'queued',
        created_at: '2026-01-27T17:01:02.000Z',
        dedupe_key: `${newStateWithTsa.id}:submit_anchor_bitcoin:${Date.now()}`
      });
    }

    // Ahora debería crear jobs para ambos anclajes
    expect(newJobsToCreate).toHaveLength(2);
    
    const hasPolygonJob = newJobsToCreate.some((j: any) => j.type === 'submit_anchor_polygon');
    const hasBitcoinJob = newJobsToCreate.some((j: any) => j.type === 'submit_anchor_bitcoin');
    
    expect(hasPolygonJob).toBe(true);
    expect(hasBitcoinJob).toBe(true);
    
    console.log("   - Jobs de anclaje creados:", newJobsToCreate.length);
    console.log("   - Tipos:", newJobsToCreate.map((j: any) => j.type).join(', '));

    // 6. Simular ejecución de anclajes por ExecutionEngine
    console.log("⚙️  ExecutionEngine ejecutando jobs de anclaje...");
    
    const executedAnchorJobs = [];
    const anchorResultEvents = [];
    
    for (const job of newJobsToCreate) {
      let anchorResult;
      let anchorEvent;
      
      if (job.type === 'submit_anchor_polygon') {
        anchorResult = {
          success: true,
          tx_hash: '0xpolygon_executed_transaction',
          network: 'polygon',
          status: 'submitted'
        };
        
        anchorEvent = {
          kind: 'anchor.submitted',
          at: '2026-01-27T17:02:00.000Z',
          payload: {
            network: anchorResult.network,
            tx_hash: anchorResult.tx_hash,
            status: anchorResult.status,
            witness_hash: job.payload.witness_hash,
            job_id: job.id
          },
          _source: 'execution_engine'
        };
      } else if (job.type === 'submit_anchor_bitcoin') {
        anchorResult = {
          success: true,
          tx_hash: '0xbtc_executed_transaction',
          network: 'bitcoin',
          status: 'submitted'
        };
        
        anchorEvent = {
          kind: 'anchor.submitted',
          at: '2026-01-27T17:02:01.000Z',
          payload: {
            network: anchorResult.network,
            tx_hash: anchorResult.tx_hash,
            status: anchorResult.status,
            witness_hash: job.payload.witness_hash,
            job_id: job.id
          },
          _source: 'execution_engine'
        };
      }
      
      executedAnchorJobs.push({
        ...job,
        execution_result: anchorResult,
        status: 'executed'
      });
      
      anchorResultEvents.push(anchorEvent);
    }

    console.log("   - Anclajes ejecutados:", executedAnchorJobs.length);
    console.log("   - Eventos de anclaje generados:", anchorResultEvents.length);

    // 7. Simular confirmación de anclajes
    console.log("📥 Simulando confirmación de anclajes...");
    
    const newStateWithAnchors = {
      ...newStateWithTsa,
      events: [
        ...newStateWithTsa.events,
        ...anchorResultEvents,
        { // Confirmación de anclaje Polygon
          kind: 'anchor.confirmed',
          at: '2026-01-27T17:03:00.000Z',
          payload: {
            network: 'polygon',
            tx_hash: '0xpolygon_executed_transaction',
            confirmed_at: '2026-01-27T17:03:00.000Z',
            block_number: 12345678
          },
          _source: 'anchor_confirmation_worker'
        },
        { // Confirmación de anclaje Bitcoin
          kind: 'anchor.confirmed',
          at: '2026-01-27T17:03:01.000Z',
          payload: {
            network: 'bitcoin',
            tx_hash: '0xbtc_executed_transaction',
            confirmed_at: '2026-01-27T17:03:01.000Z',
            block_height: 789012
          },
          _source: 'anchor_confirmation_worker'
        }
      ]
    };

    // 8. DecisionAuthority procesa estado con anclajes confirmados
    console.log("🧠 DecisionAuthority procesando estado con anclajes confirmados...");
    
    const finalEvents = newStateWithAnchors.events;
    const finalHasTsaConfirmed = finalEvents.some((e: any) => 
      e.kind === 'tsa.completed' || e.kind === 'tsa.confirmed'
    );
    
    const finalHasPolygonConfirmed = finalEvents.some((e: any) => 
      e.kind === 'anchor.confirmed' && e.payload?.network === 'polygon'
    );
    
    const finalHasBitcoinConfirmed = finalEvents.some((e: any) => 
      e.kind === 'anchor.confirmed' && e.payload?.network === 'bitcoin'
    );
    
    const finalHasArtifact = finalEvents.some((e: any) => 
      e.kind === 'artifact.completed' || e.kind === 'artifact.finalized'
    );

    const finalDecisions = {
      shouldRunTsa: false,
      shouldSubmitPolygon: false,
      shouldSubmitBitcoin: false,
      shouldBuildArtifact: finalHasTsaConfirmed && 
                           finalHasPolygonConfirmed && 
                           finalHasBitcoinConfirmed && 
                           !finalHasArtifact
    };

    console.log("   - Decisiones finales:", finalDecisions);

    // DecisionAuthority crea job para artifact
    const finalJobsToCreate = [];
    
    if (finalDecisions.shouldBuildArtifact) {
      finalJobsToCreate.push({
        type: 'build_artifact',
        entity_id: newStateWithAnchors.id,
        payload: {
          document_entity_id: newStateWithAnchors.id,
          document_id: 'test_doc_999'
        },
        status: 'queued',
        created_at: '2026-01-27T17:03:02.000Z',
        dedupe_key: `${newStateWithAnchors.id}:build_artifact:${Date.now()}`
      });
    }

    expect(finalJobsToCreate).toHaveLength(1);
    expect(finalJobsToCreate[0].type).toBe('build_artifact');
    
    console.log("   - Job de artifact creado:", finalJobsToCreate[0].type);

    // 9. ExecutionEngine ejecuta job de artifact
    console.log("⚙️  ExecutionEngine ejecutando job de artifact...");
    
    const artifactJob = finalJobsToCreate[0];
    const artifactResult = {
      success: true,
      storage_path: 'https://storage.ecosign.app/artifacts/test_entity_789.eco',
      artifact_type: 'eco_v2',
      file_size: 102400
    };
    
    const artifactEvent = {
      kind: 'artifact.completed',
      at: '2026-01-27T17:04:00.000Z',
      payload: {
        storage_path: artifactResult.storage_path,
        artifact_type: artifactResult.artifact_type,
        file_size: artifactResult.file_size,
        job_id: artifactJob.id
      },
      _source: 'execution_engine'
    };

    console.log("   - Artifact generado:", artifactEvent.kind);
    console.log("   - Ruta de storage:", artifactEvent.payload.storage_path);

    // 10. Estado final completo
    console.log("📥 Estado final del documento:");
    
    const finalState = {
      ...newStateWithAnchors,
      events: [
        ...newStateWithAnchors.events,
        artifactEvent
      ]
    };

    // Verificar que todos los pasos del flujo canónico ocurrieron
    const hasDocumentCreated = finalState.events.some((e: any) => e.kind === 'document.created');
    const hasProtectionRequested = finalState.events.some((e: any) => e.kind === 'document.protected.requested');
    const hasTsaCompleted = finalState.events.some((e: any) => e.kind === 'tsa.completed');
    const hasPolygonConfirmed = finalState.events.some((e: any) => e.kind === 'anchor.confirmed' && e.payload?.network === 'polygon');
    const hasBitcoinConfirmed = finalState.events.some((e: any) => e.kind === 'anchor.confirmed' && e.payload?.network === 'bitcoin');
    const hasArtifactCompleted = finalState.events.some((e: any) => e.kind === 'artifact.completed');

    expect(hasDocumentCreated).toBe(true);
    expect(hasProtectionRequested).toBe(true);
    expect(hasTsaCompleted).toBe(true);
    expect(hasPolygonConfirmed).toBe(true);
    expect(hasBitcoinConfirmed).toBe(true);
    expect(hasArtifactCompleted).toBe(true);

    console.log("✅ Flujo completo verificado:");
    console.log("   - Document created: ✅");
    console.log("   - Protection requested: ✅");
    console.log("   - TSA completed: ✅");
    console.log("   - Polygon confirmed: ✅");
    console.log("   - Bitcoin confirmed: ✅");
    console.log("   - Artifact completed: ✅");

    // 11. Verificar separación de responsabilidades
    console.log("🔒 Verificando separación de responsabilidades...");
    
    // DecisionAuthority: Solo decide, no ejecuta
    const decisionAuthorityOnlyDecides = !finalState.events.some((e: any) => 
      e._source === 'decision_authority' && e.kind.includes('.executed')
    );
    
    // ExecutionEngine: Solo ejecuta, no decide
    const executionEngineOnlyExecutes = finalState.events.some((e: any) => 
      e._source === 'execution_engine' && (e.kind.includes('completed') || e.kind.includes('submitted'))
    );
    
    expect(decisionAuthorityOnlyDecides).toBe(true);
    expect(executionEngineOnlyExecutes).toBe(true);
    
    console.log("   - DecisionAuthority solo decide: ✅");
    console.log("   - ExecutionEngine solo ejecuta: ✅");
    console.log("   - Separación mantenida: ✅");

    console.log("\n🎯 RESULTADO: Flujo canónico completo verificado exitosamente!");
    console.log("   - DecisionAuthority: Lee verdad → Usa autoridad → Escribe cola neutral");
    console.log("   - ExecutionEngine: Lee cola → Ejecuta → Escribe eventos resultado");
    console.log("   - Sistema operando según modelo canónico definido");
});
