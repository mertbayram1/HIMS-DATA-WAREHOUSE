PRAGMA foreign_keys = ON;

SELECT COUNT(*) AS patient_count FROM dim_patient;
SELECT COUNT(*) AS doctor_count FROM dim_doctor;
SELECT COUNT(*) AS department_count FROM dim_department;
SELECT COUNT(*) AS medication_count FROM dim_medication;

INSERT INTO fact_appointment (
    appointment_no,
    appointment_datetime,
    patient_key,
    doctor_key,
    department_key,
    appointment_status,
    wait_minutes
)
SELECT 'APT-20260412-000001', '2026-04-12 09:30:00', 1, 1, 1, 'COMPLETED', 15
WHERE 1 = 0;

INSERT INTO fact_consultation (
    appointment_key,
    patient_key,
    doctor_key,
    department_key,
    consultation_datetime,
    diagnosis_code,
    diagnosis_text,
    consultation_minutes,
    follow_up_required
)
SELECT 1, 1, 1, 1, '2026-04-12 09:45:00', 'I10', 'Essential hypertension', 20, 0
WHERE 1 = 0;

INSERT INTO fact_prescription_detail (
    consultation_key,
    medication_key,
    quantity,
    unit_price,
    usage_instructions
)
SELECT 1, 1, 2, 18.50, 'After meal'
WHERE 1 = 0;

INSERT INTO fact_invoice (
    invoice_no,
    consultation_key,
    patient_key,
    invoice_date,
    gross_amount,
    discount_amount,
    payment_status,
    paid_amount
)
SELECT 'INV-20260412-000001', 1, 1, '2026-04-12', 1000.00, 100.00, 'PAID', 900.00
WHERE 1 = 0;

SELECT COUNT(*) AS appointment_count FROM fact_appointment;
SELECT COUNT(*) AS consultation_count FROM fact_consultation;
SELECT COUNT(*) AS prescription_detail_count FROM fact_prescription_detail;
SELECT COUNT(*) AS invoice_count FROM fact_invoice;
