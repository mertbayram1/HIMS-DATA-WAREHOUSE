SELECT *
FROM vw_department_occupancy
ORDER BY completion_rate_pct DESC;

SELECT *
FROM vw_invoice_summary
ORDER BY invoice_year DESC, invoice_month DESC;

SELECT *
FROM vw_medication_critical_stock
ORDER BY stock_gap DESC;

SELECT *
FROM vw_patient_demographics
ORDER BY patient_count DESC;

SELECT *
FROM vw_appointment_time_density
ORDER BY appointment_date DESC, hour_of_day DESC;

SELECT *
FROM vw_patient_revisit_summary;

SELECT *
FROM vw_medication_usage_trend
ORDER BY year_month DESC, total_quantity DESC;
