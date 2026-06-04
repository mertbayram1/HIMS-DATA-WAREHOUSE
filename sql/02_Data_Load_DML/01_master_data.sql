PRAGMA foreign_keys = ON;
INSERT INTO dim_department (
    department_code,
    department_name,
    floor_no,
    is_active
)
SELECT 'DEPT_CODE', 'Department Name', 1, 1
WHERE 1 = 0;

INSERT INTO dim_medication (
    medication_code,
    medication_name,
    unit_price,
    current_stock,
    critical_stock_level,
    is_active
)
SELECT 'MED-001', 'Medication Name', 10.00, 100, 20, 1
WHERE 1 = 0;

INSERT INTO dim_doctor (
    doctor_national_id,
    doctor_full_name,
    title,
    specialization,
    department_key,
    hire_date,
    phone,
    email,
    is_active
)
SELECT '70000000001', 'Dr. Name Surname', 'Specialist', 'Cardiology', 1, '2020-01-01', '5550000000', 'doctor@hospital.local', 1
WHERE 1 = 0;

SELECT COUNT(*) AS department_count FROM dim_department;
SELECT COUNT(*) AS medication_count FROM dim_medication;
SELECT COUNT(*) AS doctor_count FROM dim_doctor;
