PRAGMA foreign_keys = ON;
INSERT INTO dim_patient (
    patient_national_id,
    patient_full_name,
    gender,
    birth_date,
    insurance_type,
    city,
    blood_type,
    phone
)
  SELECT '12345678901', 'Patient Name Surname', 'F', '1990-05-14', 'SGK', 'Istanbul', 'A+', '5550000000'
  WHERE 1 = 0;

SELECT COUNT(*) AS patient_count FROM dim_patient;
