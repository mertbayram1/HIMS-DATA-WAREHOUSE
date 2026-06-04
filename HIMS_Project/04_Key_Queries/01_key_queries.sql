-- =============================================================================
-- HIMS — 04_Key_Queries / 01_key_queries.sql
-- Amaç: Sistem üzerindeki en kritik iş analizlerini yürüten anahtar sorgular.
--       Her sorgu, doğrudan bir iş kararına veya operasyonel eyleme temel oluşturur.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Departman Doluluk ve Tamamlanma Oranı
--    Hangi departmanın en yoğun olduğunu ve randevuların ne kadarının
--    başarıyla tamamlandığını gösterir. Kaynak yönetimi kararlarına temel oluşturur.
-- -----------------------------------------------------------------------------
SELECT
    department_name,
    total_appointments_90d,
    completed_appointments_90d,
    cancelled_appointments_90d,
    no_show_appointments_90d,
    completion_rate_pct,
    loss_rate_pct
FROM vw_department_occupancy
ORDER BY completion_rate_pct DESC;


-- -----------------------------------------------------------------------------
-- 2. Aylık Fatura ve Gelir Özeti
--    Aylık bazda brüt/net gelir, tahsilat ve bekleyen tutarları listeler.
--    Finans yönetimi ve nakit akış planlaması için kullanılır.
-- -----------------------------------------------------------------------------
SELECT
    invoice_year,
    invoice_month,
    invoice_count,
    gross_total,
    discount_total,
    net_total,
    paid_total,
    outstanding_total,
    paid_ratio_pct
FROM vw_invoice_summary
ORDER BY invoice_year DESC, invoice_month DESC;


-- -----------------------------------------------------------------------------
-- 3. Kritik Stok Seviyesine Ulaşan İlaçlar
--    Mevcut stoğu kritik seviyenin altına düşen ilaçları listeler.
--    Stok yenileme kararları için acil aksiyon listesi niteliği taşır.
-- -----------------------------------------------------------------------------
SELECT
    medication_name,
    medication_code,
    current_stock,
    critical_stock_level,
    stock_gap,
    suggested_reorder_qty
FROM vw_medication_critical_stock
ORDER BY stock_gap DESC;


-- -----------------------------------------------------------------------------
-- 4. Hasta Demografisi (Yaş Grubu × Sigorta × Cinsiyet)
--    Hastanın sigorta tipine, yaş grubuna ve cinsiyetine göre dağılımını gösterir.
--    Stratejik planlama ve hedef kitle analizi için kullanılır.
-- -----------------------------------------------------------------------------
SELECT
    age_band,
    insurance_type,
    gender,
    patient_count,
    population_pct
FROM vw_patient_demographics
ORDER BY patient_count DESC;


-- -----------------------------------------------------------------------------
-- 5. Saatlik Randevu Yoğunluğu (Departman × Gün × Saat)
--    Günün hangi saatinde, hangi departmanda randevu yoğunluğunun
--    zirveye ulaştığını analiz eder. Personel planlaması için kritiktir.
-- -----------------------------------------------------------------------------
SELECT
    appointment_date,
    department_name,
    hour_of_day,
    total_appointments,
    completion_rate_pct
FROM vw_appointment_time_density
ORDER BY appointment_date DESC, hour_of_day ASC;


-- -----------------------------------------------------------------------------
-- 6. Hasta Tekrar Ziyaret Analizi (Window Function: LEAD)
--    7 ve 30 gün içinde aynı hastanın tekrar randevu aldığı vakalar.
--    Kronik hasta yönetimi ve hasta sadakati analizi için kullanılır.
-- -----------------------------------------------------------------------------
SELECT
    patient_count,
    revisit_7d_patient_count,
    revisit_30d_patient_count,
    revisit_7d_rate_pct,
    revisit_30d_rate_pct
FROM vw_patient_revisit_summary;


-- -----------------------------------------------------------------------------
-- 7. Aylık İlaç Kullanım Trendi
--    Aylık bazda en çok reçete edilen ilaçları ve kullanım miktarlarını gösterir.
--    Satın alma planlaması ve ilaç tüketim tahmini için kullanılır.
-- -----------------------------------------------------------------------------
SELECT
    year_month,
    medication_name,
    prescription_line_count,
    total_quantity,
    total_amount,
    avg_quantity_per_line
FROM vw_medication_usage_trend
ORDER BY year_month DESC, total_quantity DESC;
