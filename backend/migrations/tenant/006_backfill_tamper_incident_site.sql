-- recordTamperIncident() never set site_id / integrity_record_id on INSERT even
-- though it had the value at hand, so every existing incident shows no origin
-- site. Backfill by matching each incident to its most recent anchor for the
-- same entity (the same lookup Verify() itself uses).
UPDATE tamper_incidents ti
SET site_id = ir.site_id,
    integrity_record_id = COALESCE(ti.integrity_record_id, ir.id)
FROM (
    SELECT DISTINCT ON (entity_type, entity_id) entity_type, entity_id, id, site_id
    FROM integrity_records
    ORDER BY entity_type, entity_id, created_at DESC
) ir
WHERE ti.entity_type = ir.entity_type
  AND ti.entity_id = ir.entity_id
  AND ti.site_id IS NULL;
