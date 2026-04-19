PRAGMA foreign_keys = ON;

DROP VIEW IF EXISTS vw_department_occupancy;

CREATE VIEW vw_department_occupancy AS
SELECT
    d.department_key,
    d.department_code,
    d.department_name,
    COUNT(a.appointment_key) AS total_appointments_90d,
    SUM(CASE WHEN a.appointment_status = 'COMPLETED' THEN 1 ELSE 0 END) AS completed_appointments_90d,
    SUM(CASE WHEN a.appointment_status = 'CANCELLED' THEN 1 ELSE 0 END) AS cancelled_appointments_90d,
    SUM(CASE WHEN a.appointment_status = 'NO_SHOW' THEN 1 ELSE 0 END) AS no_show_appointments_90d,
    ROUND(
        100.0 * SUM(CASE WHEN a.appointment_status = 'COMPLETED' THEN 1 ELSE 0 END)
        / NULLIF(COUNT(a.appointment_key), 0),
        2
    ) AS completion_rate_pct,
    ROUND(
        100.0 * SUM(CASE WHEN a.appointment_status IN ('CANCELLED', 'NO_SHOW') THEN 1 ELSE 0 END)
        / NULLIF(COUNT(a.appointment_key), 0),
        2
    ) AS loss_rate_pct
FROM dim_department AS d
LEFT JOIN fact_appointment AS a
    ON a.department_key = d.department_key
   AND datetime(a.appointment_datetime) >= datetime('now', '-90 day')
GROUP BY
    d.department_key,
    d.department_code,
    d.department_name;

DROP VIEW IF EXISTS vw_invoice_summary;

CREATE VIEW vw_invoice_summary AS
SELECT
    CAST(strftime('%Y', invoice_date) AS INTEGER) AS invoice_year,
    CAST(strftime('%m', invoice_date) AS INTEGER) AS invoice_month,
    COUNT(*) AS invoice_count,
    ROUND(SUM(gross_amount), 2) AS gross_total,
    ROUND(SUM(discount_amount), 2) AS discount_total,
    ROUND(SUM(net_amount), 2) AS net_total,
    ROUND(SUM(paid_amount), 2) AS paid_total,
    ROUND(SUM(net_amount - paid_amount), 2) AS outstanding_total,
    SUM(CASE WHEN payment_status = 'PAID' THEN 1 ELSE 0 END) AS paid_count,
    SUM(CASE WHEN payment_status = 'PENDING' THEN 1 ELSE 0 END) AS pending_count,
    SUM(CASE WHEN payment_status = 'PARTIAL' THEN 1 ELSE 0 END) AS partial_count,
    SUM(CASE WHEN payment_status = 'CANCELLED' THEN 1 ELSE 0 END) AS cancelled_count,
    ROUND(100.0 * SUM(CASE WHEN payment_status = 'PAID' THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 2) AS paid_ratio_pct
FROM fact_invoice
GROUP BY
    CAST(strftime('%Y', invoice_date) AS INTEGER),
    CAST(strftime('%m', invoice_date) AS INTEGER);

DROP VIEW IF EXISTS vw_medication_critical_stock;

CREATE VIEW vw_medication_critical_stock AS
SELECT
    m.medication_key,
    m.medication_code,
    m.medication_name,
    m.current_stock,
    m.critical_stock_level,
    (m.critical_stock_level - m.current_stock) AS stock_gap,
    ROUND(m.unit_price, 2) AS unit_price,
    CAST((m.critical_stock_level * 2 - m.current_stock) AS INTEGER) AS suggested_reorder_qty
FROM dim_medication AS m
WHERE m.is_active = 1
  AND m.current_stock <= m.critical_stock_level;

DROP VIEW IF EXISTS vw_patient_demographics;

CREATE VIEW vw_patient_demographics AS
WITH base AS (
    SELECT
        p.patient_key,
        p.insurance_type,
        p.gender,
        CAST((julianday('now') - julianday(p.birth_date)) / 365.2425 AS INTEGER) AS age
    FROM dim_patient AS p
),
labeled AS (
    SELECT
        insurance_type,
        gender,
        CASE
            WHEN age < 18 THEN '00-17'
            WHEN age BETWEEN 18 AND 25 THEN '18-25'
            WHEN age BETWEEN 26 AND 35 THEN '26-35'
            WHEN age BETWEEN 36 AND 45 THEN '36-45'
            WHEN age BETWEEN 46 AND 55 THEN '46-55'
            WHEN age BETWEEN 56 AND 65 THEN '56-65'
            ELSE '66+'
        END AS age_band
    FROM base
),
agg AS (
    SELECT
        age_band,
        insurance_type,
        gender,
        COUNT(*) AS patient_count
    FROM labeled
    GROUP BY
        age_band,
        insurance_type,
        gender
)
SELECT
    age_band,
    insurance_type,
    gender,
    patient_count,
    ROUND(100.0 * patient_count / NULLIF((SELECT SUM(patient_count) FROM agg), 0), 2) AS population_pct
FROM agg;

DROP VIEW IF EXISTS vw_appointment_time_density;

CREATE VIEW vw_appointment_time_density AS
SELECT
    date(a.appointment_datetime) AS appointment_date,
    CAST(strftime('%w', a.appointment_datetime) AS INTEGER) AS weekday_no,
    CAST(strftime('%H', a.appointment_datetime) AS INTEGER) AS hour_of_day,
    d.department_key,
    d.department_code,
    d.department_name,
    COUNT(*) AS total_appointments,
    SUM(CASE WHEN a.appointment_status = 'COMPLETED' THEN 1 ELSE 0 END) AS completed_appointments,
    SUM(CASE WHEN a.appointment_status = 'CANCELLED' THEN 1 ELSE 0 END) AS cancelled_appointments,
    SUM(CASE WHEN a.appointment_status = 'NO_SHOW' THEN 1 ELSE 0 END) AS no_show_appointments,
    ROUND(100.0 * SUM(CASE WHEN a.appointment_status = 'COMPLETED' THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 2) AS completion_rate_pct
FROM fact_appointment AS a
INNER JOIN dim_department AS d
    ON d.department_key = a.department_key
GROUP BY
    date(a.appointment_datetime),
    CAST(strftime('%w', a.appointment_datetime) AS INTEGER),
    CAST(strftime('%H', a.appointment_datetime) AS INTEGER),
    d.department_key,
    d.department_code,
    d.department_name;

DROP VIEW IF EXISTS vw_patient_revisit_summary;

CREATE VIEW vw_patient_revisit_summary AS
WITH ordered AS (
    SELECT
        patient_key,
        datetime(appointment_datetime) AS appointment_dt,
        LEAD(datetime(appointment_datetime)) OVER (
            PARTITION BY patient_key
            ORDER BY datetime(appointment_datetime)
        ) AS next_appointment_dt
    FROM fact_appointment
    WHERE appointment_status IN ('COMPLETED', 'SCHEDULED')
),
patient_flags AS (
    SELECT
        patient_key,
        MAX(CASE
                WHEN next_appointment_dt IS NOT NULL
                 AND julianday(next_appointment_dt) - julianday(appointment_dt) <= 7
                THEN 1 ELSE 0
            END) AS has_revisit_7d,
        MAX(CASE
                WHEN next_appointment_dt IS NOT NULL
                 AND julianday(next_appointment_dt) - julianday(appointment_dt) <= 30
                THEN 1 ELSE 0
            END) AS has_revisit_30d
    FROM ordered
    GROUP BY patient_key
)
SELECT
    COUNT(*) AS patient_count,
    SUM(has_revisit_7d) AS revisit_7d_patient_count,
    SUM(has_revisit_30d) AS revisit_30d_patient_count,
    ROUND(100.0 * SUM(has_revisit_7d) / NULLIF(COUNT(*), 0), 2) AS revisit_7d_rate_pct,
    ROUND(100.0 * SUM(has_revisit_30d) / NULLIF(COUNT(*), 0), 2) AS revisit_30d_rate_pct
FROM patient_flags;

DROP VIEW IF EXISTS vw_medication_usage_trend;

CREATE VIEW vw_medication_usage_trend AS
SELECT
    strftime('%Y-%m', pd.prescribed_at) AS year_month,
    m.medication_key,
    m.medication_code,
    m.medication_name,
    COUNT(*) AS prescription_line_count,
    SUM(pd.quantity) AS total_quantity,
    ROUND(SUM(pd.total_amount), 2) AS total_amount,
    ROUND(AVG(pd.quantity), 2) AS avg_quantity_per_line
FROM fact_prescription_detail AS pd
INNER JOIN dim_medication AS m
    ON m.medication_key = pd.medication_key
GROUP BY
    strftime('%Y-%m', pd.prescribed_at),
    m.medication_key,
    m.medication_code,
    m.medication_name;
