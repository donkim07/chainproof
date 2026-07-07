-- Deduplicate open tamper incidents before adding unique index (keep newest per entity)
DELETE FROM tamper_incidents t1
USING tamper_incidents t2
WHERE t1.investigation_status = 'open'
  AND t2.investigation_status = 'open'
  AND t1.entity_type = t2.entity_type
  AND t1.entity_id = t2.entity_id
  AND t1.id < t2.id;

-- Prevent duplicate open tamper incidents for the same entity
CREATE UNIQUE INDEX IF NOT EXISTS idx_tamper_open_entity
ON tamper_incidents (entity_type, entity_id)
WHERE investigation_status = 'open';
