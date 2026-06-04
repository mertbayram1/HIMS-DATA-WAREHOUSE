-- Migration: Standardize language to Turkish
-- Updates constraint values and adds Turkish-only standardization

-- 1. Update insurance_type values to Turkish-only standard (SGK, Özel)
-- Existing values: 'Private' -> 'Özel', 'SelfPay' -> 'Özel', 'Other' -> 'Özel'
UPDATE dim_patient SET insurance_type = 'Özel' WHERE insurance_type IN ('Private', 'SelfPay', 'Other');

-- 2. Update title values to Turkish-only standard
-- Existing values: English titles -> 'Dr.'
UPDATE dim_doctor SET title = 'Dr.' WHERE title IN ('Specialist', 'General Practitioner', 'Assoc. Prof.');

-- 3. Update appointment_status to Turkish equivalents
-- 'SCHEDULED' -> 'PLANLI'
-- 'COMPLETED' -> 'TAMAMLANDI'
-- 'CANCELLED' -> 'İPTAL'
-- 'NO_SHOW' -> 'GELMEDİ'
UPDATE fact_appointment SET appointment_status = 'PLANLI' WHERE appointment_status = 'SCHEDULED';
UPDATE fact_appointment SET appointment_status = 'TAMAMLANDI' WHERE appointment_status = 'COMPLETED';
UPDATE fact_appointment SET appointment_status = 'İPTAL' WHERE appointment_status = 'CANCELLED';
UPDATE fact_appointment SET appointment_status = 'GELMEDİ' WHERE appointment_status = 'NO_SHOW';

-- 4. Update gender values to Turkish abbreviations
-- 'M' -> 'E' (Erkek), 'F' -> 'K' (Kadın), 'O' -> 'D' (Diğer)
UPDATE dim_patient SET gender = 'E' WHERE gender = 'M';
UPDATE dim_patient SET gender = 'K' WHERE gender = 'F';
UPDATE dim_patient SET gender = 'D' WHERE gender = 'O';

-- Note: Schema constraint updates should be done through schema recreation or schema migration tools
-- This migration only updates existing data to follow Turkish standards
-- For production, use proper schema versioning and migration tools

PRAGMA foreign_keys = ON;
