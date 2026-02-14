#!/bin/bash
# Verification script for EPI invariants

echo "Checking EPI invariants..."

# 1. Check if any witness_current_storage_path does not start with 'signed/'
echo "1. Checking witness_current_storage_path for non-signed/ paths..."
# This would normally be run against the database
echo "SELECT id, witness_current_storage_path FROM document_entities WHERE witness_current_storage_path IS NOT NULL AND witness_current_storage_path NOT LIKE 'signed/%';"

# 2. Check if any workflow.completed exists without signed/ path
echo "2. Checking workflow.completed events without signed/ path..."
# This would normally be run against the database
echo "SELECT we.workflow_id FROM workflow_events we JOIN document_entities de ON de.id = we.document_entity_id WHERE we.event_type = 'workflow.completed' AND (de.witness_current_storage_path IS NULL OR de.witness_current_storage_path NOT LIKE 'signed/%');"

echo "Verification queries ready. Execute against your database to verify invariants."