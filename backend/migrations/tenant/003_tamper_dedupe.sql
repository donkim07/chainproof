-- Prevent duplicate open tamper incidents for the same entity
CREATE UNIQUE INDEX IF NOT EXISTS idx_tamper_open_entity
ON tamper_incidents (entity_type, entity_id)
WHERE investigation_status = 'open';
