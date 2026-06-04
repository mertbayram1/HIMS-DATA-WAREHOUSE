PRAGMA foreign_keys = ON;

-- Add specialization dimension and user/auth table

CREATE TABLE IF NOT EXISTS dim_specialization (
    specialization_key INTEGER PRIMARY KEY AUTOINCREMENT,
    specialization_name TEXT NOT NULL UNIQUE,
    description TEXT,
    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- add column to dim_doctor to reference specialization (nullable to preserve existing rows)
ALTER TABLE dim_doctor ADD COLUMN specialization_key INTEGER;

-- populate specialization table from existing specialization text values
INSERT INTO dim_specialization (specialization_name)
SELECT DISTINCT TRIM(specialization) FROM dim_doctor
WHERE specialization IS NOT NULL AND TRIM(specialization) <> ''
  AND TRIM(specialization) NOT IN (SELECT specialization_name FROM dim_specialization);

-- update doctor rows to set specialization_key where possible
UPDATE dim_doctor
SET specialization_key = (
    SELECT specialization_key FROM dim_specialization WHERE specialization_name = TRIM(dim_doctor.specialization) LIMIT 1
)
WHERE specialization_key IS NULL;

CREATE INDEX IF NOT EXISTS IX_dim_specialization_name ON dim_specialization(specialization_name);

-- Authentication / user table
CREATE TABLE IF NOT EXISTS auth_user (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT UNIQUE,
    hashed_password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'patient' CHECK (role IN ('admin','clinician','billing','patient')),
    patient_key INTEGER,
    doctor_key INTEGER,
    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_key) REFERENCES dim_patient(patient_key),
    FOREIGN KEY (doctor_key) REFERENCES dim_doctor(doctor_key)
);

CREATE INDEX IF NOT EXISTS IX_auth_user_username ON auth_user(username);
