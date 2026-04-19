PRAGMA foreign_keys = OFF;
DROP TABLE IF EXISTS fact_invoice;
DROP TABLE IF EXISTS fact_prescription_detail;
DROP TABLE IF EXISTS fact_consultation;
DROP TABLE IF EXISTS fact_appointment;
DROP TABLE IF EXISTS ops_stock_alert;
DROP TABLE IF EXISTS dim_medication;
DROP TABLE IF EXISTS dim_doctor;
DROP TABLE IF EXISTS dim_patient;
DROP TABLE IF EXISTS dim_department;

PRAGMA foreign_keys = ON;

CREATE TABLE dim_department (
    department_key INTEGER PRIMARY KEY AUTOINCREMENT,
    department_code TEXT NOT NULL UNIQUE,
    department_name TEXT NOT NULL,
    floor_no INTEGER NOT NULL CHECK (floor_no BETWEEN 0 AND 30),
    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE dim_patient (
    patient_key INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_national_id TEXT NOT NULL UNIQUE,
    patient_full_name TEXT NOT NULL,
    gender TEXT NOT NULL CHECK (gender IN ('M', 'F', 'O')),
    birth_date TEXT NOT NULL CHECK (date(birth_date) <= date('now')),
    insurance_type TEXT NOT NULL CHECK (insurance_type IN ('SGK', 'Private', 'SelfPay', 'Other')),
    city TEXT NOT NULL,
    blood_type TEXT CHECK (blood_type IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
    phone TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE dim_doctor (
    doctor_key INTEGER PRIMARY KEY AUTOINCREMENT,
    doctor_national_id TEXT NOT NULL UNIQUE,
    doctor_full_name TEXT NOT NULL,
    title TEXT NOT NULL CHECK (title IN ('Prof.', 'Assoc. Prof.', 'Specialist', 'General Practitioner')),
    specialization TEXT NOT NULL,
    department_key INTEGER NOT NULL,
    hire_date TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (department_key) REFERENCES dim_department(department_key)
);

CREATE TABLE dim_medication (
    medication_key INTEGER PRIMARY KEY AUTOINCREMENT,
    medication_code TEXT NOT NULL UNIQUE,
    medication_name TEXT NOT NULL,
    unit_price REAL NOT NULL CHECK (unit_price >= 0),
    current_stock INTEGER NOT NULL CHECK (current_stock >= 0),
    critical_stock_level INTEGER NOT NULL DEFAULT 20 CHECK (critical_stock_level >= 0),
    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE fact_appointment (
    appointment_key INTEGER PRIMARY KEY AUTOINCREMENT,
    appointment_no TEXT NOT NULL UNIQUE,
    appointment_datetime TEXT NOT NULL,
    patient_key INTEGER NOT NULL,
    doctor_key INTEGER NOT NULL,
    department_key INTEGER NOT NULL,
    appointment_status TEXT NOT NULL CHECK (appointment_status IN ('SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW')),
    wait_minutes INTEGER CHECK (wait_minutes IS NULL OR wait_minutes BETWEEN 0 AND 240),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_key) REFERENCES dim_patient(patient_key),
    FOREIGN KEY (doctor_key) REFERENCES dim_doctor(doctor_key),
    FOREIGN KEY (department_key) REFERENCES dim_department(department_key)
);

CREATE TABLE fact_consultation (
    consultation_key INTEGER PRIMARY KEY AUTOINCREMENT,
    appointment_key INTEGER NOT NULL UNIQUE,
    patient_key INTEGER NOT NULL,
    doctor_key INTEGER NOT NULL,
    department_key INTEGER NOT NULL,
    consultation_datetime TEXT NOT NULL,
    diagnosis_code TEXT,
    diagnosis_text TEXT,
    consultation_minutes INTEGER NOT NULL CHECK (consultation_minutes BETWEEN 1 AND 240),
    follow_up_required INTEGER NOT NULL DEFAULT 0 CHECK (follow_up_required IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (appointment_key) REFERENCES fact_appointment(appointment_key),
    FOREIGN KEY (patient_key) REFERENCES dim_patient(patient_key),
    FOREIGN KEY (doctor_key) REFERENCES dim_doctor(doctor_key),
    FOREIGN KEY (department_key) REFERENCES dim_department(department_key)
);

CREATE TABLE fact_prescription_detail (
    prescription_detail_key INTEGER PRIMARY KEY AUTOINCREMENT,
    consultation_key INTEGER NOT NULL,
    medication_key INTEGER NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price REAL NOT NULL CHECK (unit_price >= 0),
    total_amount REAL GENERATED ALWAYS AS (quantity * unit_price) STORED,
    prescribed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    usage_instructions TEXT,
    FOREIGN KEY (consultation_key) REFERENCES fact_consultation(consultation_key),
    FOREIGN KEY (medication_key) REFERENCES dim_medication(medication_key)
);

CREATE TABLE fact_invoice (
    invoice_key INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_no TEXT NOT NULL UNIQUE,
    consultation_key INTEGER NOT NULL UNIQUE,
    patient_key INTEGER NOT NULL,
    invoice_date TEXT NOT NULL,
    gross_amount REAL NOT NULL CHECK (gross_amount >= 0),
    discount_amount REAL NOT NULL DEFAULT 0 CHECK (discount_amount >= 0 AND discount_amount <= gross_amount),
    net_amount REAL GENERATED ALWAYS AS (gross_amount - discount_amount) STORED,
    payment_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (payment_status IN ('PENDING', 'PAID', 'PARTIAL', 'CANCELLED')),
    paid_amount REAL NOT NULL DEFAULT 0 CHECK (paid_amount >= 0 AND paid_amount <= gross_amount),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (consultation_key) REFERENCES fact_consultation(consultation_key),
    FOREIGN KEY (patient_key) REFERENCES dim_patient(patient_key)
);

CREATE TABLE ops_stock_alert (
    alert_key INTEGER PRIMARY KEY AUTOINCREMENT,
    medication_key INTEGER NOT NULL,
    stock_after_txn INTEGER NOT NULL,
    critical_stock_level INTEGER NOT NULL,
    alert_message TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_resolved INTEGER NOT NULL DEFAULT 0 CHECK (is_resolved IN (0, 1)),
    resolved_at TEXT,
    resolved_note TEXT,
    FOREIGN KEY (medication_key) REFERENCES dim_medication(medication_key)
);

CREATE INDEX IX_fact_appointment_department_datetime
ON fact_appointment (department_key, appointment_datetime);

CREATE INDEX IX_fact_appointment_status_datetime
ON fact_appointment (appointment_status, appointment_datetime);

CREATE INDEX IX_fact_appointment_patient_datetime
ON fact_appointment (patient_key, appointment_datetime);

CREATE INDEX IX_fact_consultation_datetime
ON fact_consultation (consultation_datetime);

CREATE INDEX IX_fact_prescription_detail_medication
ON fact_prescription_detail (medication_key, prescribed_at);

CREATE INDEX IX_fact_invoice_date_status
ON fact_invoice (invoice_date, payment_status);
