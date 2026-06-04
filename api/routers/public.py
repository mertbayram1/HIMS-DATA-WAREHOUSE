from fastapi import APIRouter, HTTPException, Query, Depends
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel
import logging
from ..db import get_db
from .auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter()


class PatientIn(BaseModel):
    patient_national_id: str
    patient_full_name: str
    gender: str
    birth_date: str
    insurance_type: str
    city: str
    blood_type: Optional[str] = None
    phone: Optional[str] = None


class AppointmentIn(BaseModel):
    patient_key: int
    doctor_key: int
    appointment_datetime: str
    wait_minutes: Optional[int] = None
    appointment_status: str = "PLANLI"


@router.get("/patients")
def list_patients(skip: int = 0, limit: int = 100, user: dict = Depends(get_current_user)):
    with get_db() as conn:
        cur = conn.execute(
            "SELECT patient_key, patient_national_id, patient_full_name, gender, birth_date, city, phone, insurance_type, blood_type, created_at FROM dim_patient ORDER BY created_at DESC LIMIT ? OFFSET ?",
            (limit, skip),
        )
        rows = cur.fetchall()
    return {"count": len(rows), "results": rows}


@router.get("/patients/search")
def search_patients(q: str = Query(..., min_length=2), limit: int = 50, user: dict = Depends(get_current_user)):
    """Search patients by name, TC ID, city, or phone."""
    if not q or len(q.strip()) < 2:
        return {"count": 0, "results": []}
    
    search_term = f"%{q.strip()}%"
    with get_db() as conn:
        cur = conn.execute(
            """SELECT patient_key, patient_national_id, patient_full_name, gender, 
                      birth_date, city, phone, insurance_type, blood_type, created_at 
               FROM dim_patient 
               WHERE patient_full_name LIKE ? 
                  OR patient_national_id LIKE ? 
                  OR city LIKE ? 
                  OR phone LIKE ?
               ORDER BY patient_full_name ASC LIMIT ?""",
            (search_term, search_term, search_term, search_term, limit),
        )
        rows = cur.fetchall()
    return {"count": len(rows), "results": rows}


@router.post("/patients")
def create_patient(patient: PatientIn, user: dict = Depends(get_current_user)):
    with get_db() as conn:
        try:
            cur = conn.execute(
                """INSERT INTO dim_patient 
                (patient_national_id, patient_full_name, gender, birth_date, insurance_type, city, blood_type, phone)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                (patient.patient_national_id, patient.patient_full_name, patient.gender, patient.birth_date,
                 patient.insurance_type, patient.city, patient.blood_type, patient.phone),
            )
            conn.commit()
            pid = cur.lastrowid
            cur = conn.execute("SELECT * FROM dim_patient WHERE patient_key = ?", (pid,))
            patient = cur.fetchone()
            return {"patient": patient, "created": True}
        except Exception as e:
            logger.error(f"Error creating patient: {str(e)}")
            raise HTTPException(status_code=400, detail="Hasta oluşturulurken bir hata oluştu. Bilgilerinizi kontrol ediniz.")


@router.get("/patients/{patient_key}")
def get_patient(patient_key: int, user: dict = Depends(get_current_user)):
    with get_db() as conn:
        cur = conn.execute("SELECT * FROM dim_patient WHERE patient_key = ?", (patient_key,))
        patient = cur.fetchone()
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
        
        # Get appointments
        cur = conn.execute(
            """SELECT a.appointment_key, a.appointment_no, a.appointment_datetime, a.appointment_status,
                      a.wait_minutes,
                      d.doctor_key, d.doctor_full_name, d.title, d.specialization,
                      dep.department_name
               FROM fact_appointment a
               JOIN dim_doctor d ON a.doctor_key = d.doctor_key
               JOIN dim_department dep ON a.department_key = dep.department_key
               WHERE a.patient_key = ? ORDER BY a.appointment_datetime DESC""",
            (patient_key,),
        )
        appointments = cur.fetchall()
        
        # Get consultations
        cur = conn.execute(
            """SELECT c.consultation_key, c.appointment_key, c.consultation_datetime, 
                      c.diagnosis_code, c.diagnosis_text, c.consultation_minutes,
                      c.follow_up_required,
                      d.doctor_full_name, d.title, d.specialization,
                      dep.department_name
               FROM fact_consultation c
               JOIN dim_doctor d ON c.doctor_key = d.doctor_key
               JOIN dim_department dep ON c.department_key = dep.department_key
               WHERE c.patient_key = ? ORDER BY c.consultation_datetime DESC""",
            (patient_key,),
        )
        consultations = cur.fetchall()
        
        # Get invoices
        cur = conn.execute(
            """SELECT invoice_key, invoice_no, invoice_date, gross_amount, discount_amount, net_amount, paid_amount, payment_status
               FROM fact_invoice WHERE patient_key = ? ORDER BY invoice_date DESC""",
            (patient_key,),
        )
        invoices = cur.fetchall()

        # Get prescriptions via consultations
        consultation_keys = [c["consultation_key"] for c in consultations]
        prescriptions = []
        if consultation_keys:
            placeholders = ",".join("?" * len(consultation_keys))
            cur = conn.execute(
                f"""SELECT pd.prescription_detail_key, pd.consultation_key, pd.quantity, pd.unit_price, 
                           pd.total_amount, pd.usage_instructions,
                           m.medication_name, m.medication_code
                    FROM fact_prescription_detail pd
                    JOIN dim_medication m ON pd.medication_key = m.medication_key
                    WHERE pd.consultation_key IN ({placeholders})
                    ORDER BY pd.prescribed_at DESC""",
                consultation_keys,
            )
            prescriptions = cur.fetchall()
    
    return {
        "patient": patient,
        "appointments": appointments,
        "consultations": consultations,
        "invoices": invoices,
        "prescriptions": prescriptions
    }


@router.get("/appointments")
def list_appointments(skip: int = 0, limit: int = 100, user: dict = Depends(get_current_user)):
    with get_db() as conn:
        cur = conn.execute(
            """
            SELECT a.appointment_key, a.appointment_no, a.appointment_datetime, a.appointment_status,
                   a.wait_minutes,
                   p.patient_key, p.patient_full_name,
                   d.doctor_key, d.doctor_full_name, d.specialization,
                   dep.department_name
            FROM fact_appointment a
            JOIN dim_patient p ON a.patient_key = p.patient_key
            JOIN dim_doctor d ON a.doctor_key = d.doctor_key
            JOIN dim_department dep ON a.department_key = dep.department_key
            ORDER BY a.appointment_datetime DESC LIMIT ? OFFSET ?
            """,
            (limit, skip),
        )
        rows = cur.fetchall()
    return {"count": len(rows), "results": rows}


@router.post("/appointments")
def create_appointment(appt: AppointmentIn, user: dict = Depends(get_current_user)):
    import random
    appt_no = f"APT-{random.randint(100000, 999999)}"
    with get_db() as conn:
        cur = conn.execute("SELECT department_key FROM dim_doctor WHERE doctor_key = ?", (appt.doctor_key,))
        doc = cur.fetchone()
        if not doc:
            raise HTTPException(status_code=400, detail="Seçilen doktor bulunamadı.")
        dept_key = doc["department_key"]
        try:
            cur = conn.execute(
                """INSERT INTO fact_appointment 
                (appointment_no, appointment_datetime, patient_key, doctor_key, department_key, appointment_status, wait_minutes)
                VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (appt_no, appt.appointment_datetime, appt.patient_key, appt.doctor_key, dept_key,
                 appt.appointment_status, appt.wait_minutes),
            )
            conn.commit()
            aid = cur.lastrowid
            cur = conn.execute(
                """
                SELECT a.appointment_key, a.appointment_no, a.appointment_datetime, a.appointment_status,
                       a.wait_minutes,
                       p.patient_key, p.patient_full_name,
                       d.doctor_key, d.doctor_full_name, d.specialization,
                       dep.department_name
                FROM fact_appointment a
                JOIN dim_patient p ON a.patient_key = p.patient_key
                JOIN dim_doctor d ON a.doctor_key = d.doctor_key
                JOIN dim_department dep ON a.department_key = dep.department_key
                WHERE a.appointment_key = ?
                """,
                (aid,),
            )
            new_appt = cur.fetchone()
            return {"appointment": new_appt, "created": True}
        except Exception as e:
            logger.error(f"Error creating appointment: {str(e)}")
            raise HTTPException(status_code=400, detail="Randevu oluşturulurken bir hata oluştu. Bilgilerinizi kontrol ediniz.")


@router.get("/invoices")
def list_invoices(skip: int = 0, limit: int = 100, user: dict = Depends(get_current_user)):
    with get_db() as conn:
        cur = conn.execute(
            """
            SELECT i.invoice_key, i.invoice_no, i.invoice_date, i.gross_amount, i.discount_amount, 
                   i.net_amount, i.paid_amount, i.payment_status,
                   p.patient_key, p.patient_full_name
            FROM fact_invoice i
            JOIN dim_patient p ON i.patient_key = p.patient_key
            ORDER BY i.invoice_date DESC LIMIT ? OFFSET ?
            """,
            (limit, skip),
        )
        rows = cur.fetchall()
    return {"count": len(rows), "results": rows}


@router.get("/stats/summary")
def get_system_summary(user: dict = Depends(get_current_user)):
    with get_db() as conn:
        cur = conn.execute("SELECT COUNT(*) as count FROM dim_patient")
        patient_count = cur.fetchone()["count"]
        
        cur = conn.execute("SELECT COUNT(*) as count FROM fact_appointment")
        appointment_count = cur.fetchone()["count"]
        
        cur = conn.execute("SELECT COUNT(*) as count FROM fact_consultation")
        consultation_count = cur.fetchone()["count"]
        
        cur = conn.execute("SELECT COUNT(*) as count FROM dim_doctor")
        doctor_count = cur.fetchone()["count"]

        cur = conn.execute("SELECT COUNT(*) as count FROM dim_department")
        department_count = cur.fetchone()["count"]

        cur = conn.execute("SELECT COUNT(*) as count FROM dim_medication")
        medication_count = cur.fetchone()["count"]
        
        cur = conn.execute("SELECT COALESCE(SUM(net_amount),0) as total FROM fact_invoice")
        invoice_total = cur.fetchone()["total"] or 0

        cur = conn.execute("SELECT COALESCE(SUM(paid_amount),0) as total FROM fact_invoice")
        paid_total = cur.fetchone()["total"] or 0
        
        cur = conn.execute(
            "SELECT COUNT(*) as count FROM fact_appointment WHERE appointment_status = 'PLANLI'"
        )
        scheduled_count = cur.fetchone()["count"]

        cur = conn.execute(
            "SELECT COUNT(*) as count FROM fact_appointment WHERE appointment_status = 'TAMAMLANDI'"
        )
        completed_count = cur.fetchone()["count"]

        cur = conn.execute(
            "SELECT COUNT(*) as count FROM fact_appointment WHERE appointment_status = 'İPTAL'"
        )
        cancelled_count = cur.fetchone()["count"]

        cur = conn.execute(
            "SELECT COUNT(*) as count FROM fact_appointment WHERE appointment_status = 'GELMEDİ'"
        )
        no_show_count = cur.fetchone()["count"]

        cur = conn.execute("SELECT COUNT(*) as count FROM fact_prescription_detail")
        prescription_count = cur.fetchone()["count"]
    
    return {
        "patients": patient_count,
        "appointments": appointment_count,
        "consultations": consultation_count,
        "doctors": doctor_count,
        "departments": department_count,
        "medications": medication_count,
        "invoice_total": round(invoice_total, 2),
        "paid_total": round(paid_total, 2),
        "scheduled_appointments": scheduled_count,
        "completed_appointments": completed_count,
        "cancelled_appointments": cancelled_count,
        "no_show_appointments": no_show_count,
        "prescriptions": prescription_count
    }


# ── Reporting Views Endpoints ──────────────────────────────────────

@router.get("/reports/department-occupancy")
def department_occupancy(user: dict = Depends(get_current_user)):
    """Department occupancy from inline query."""
    with get_db() as conn:
        cur = conn.execute("""
            SELECT d.department_key, d.department_code, d.department_name,
                    COUNT(a.appointment_key) AS total_appointments_90d,
                    SUM(CASE WHEN a.appointment_status = 'TAMAMLANDI' THEN 1 ELSE 0 END) AS completed_appointments_90d,
                    SUM(CASE WHEN a.appointment_status = 'İPTAL' THEN 1 ELSE 0 END) AS cancelled_appointments_90d,
                    SUM(CASE WHEN a.appointment_status = 'GELMEDİ' THEN 1 ELSE 0 END) AS no_show_appointments_90d,
                    ROUND(100.0 * SUM(CASE WHEN a.appointment_status = 'TAMAMLANDI' THEN 1 ELSE 0 END)
                        / NULLIF(COUNT(a.appointment_key), 0), 2) AS completion_rate_pct
                FROM dim_department d
                LEFT JOIN fact_appointment a ON a.department_key = d.department_key
                GROUP BY d.department_key, d.department_code, d.department_name
            ORDER BY total_appointments_90d DESC
        """)
        rows = cur.fetchall()
    return {"results": rows}


@router.get("/reports/invoice-summary")
def invoice_summary(user: dict = Depends(get_current_user)):
    """Monthly invoice summary."""
    with get_db() as conn:
        try:
            cur = conn.execute("SELECT * FROM vw_invoice_summary ORDER BY invoice_year DESC, invoice_month DESC")
            rows = cur.fetchall()
        except Exception:
            cur = conn.execute("""
                SELECT CAST(strftime('%Y', invoice_date) AS INTEGER) AS invoice_year,
                       CAST(strftime('%m', invoice_date) AS INTEGER) AS invoice_month,
                       COUNT(*) AS invoice_count,
                       ROUND(SUM(gross_amount), 2) AS gross_total,
                       ROUND(SUM(discount_amount), 2) AS discount_total,
                       ROUND(SUM(net_amount), 2) AS net_total,
                       ROUND(SUM(paid_amount), 2) AS paid_total,
                       SUM(CASE WHEN payment_status = 'PAID' THEN 1 ELSE 0 END) AS paid_count,
                       SUM(CASE WHEN payment_status = 'PENDING' THEN 1 ELSE 0 END) AS pending_count
                FROM fact_invoice
                GROUP BY CAST(strftime('%Y', invoice_date) AS INTEGER), CAST(strftime('%m', invoice_date) AS INTEGER)
                ORDER BY invoice_year DESC, invoice_month DESC
            """)
            rows = cur.fetchall()
    return {"results": rows}


@router.get("/reports/patient-demographics")
def patient_demographics(user: dict = Depends(get_current_user)):
    """Patient demographics breakdown."""
    with get_db() as conn:
        # Gender distribution
        cur = conn.execute("""
            SELECT gender, COUNT(*) as count FROM dim_patient GROUP BY gender
        """)
        gender = cur.fetchall()

        # Insurance distribution
        cur = conn.execute("""
            SELECT insurance_type, COUNT(*) as count FROM dim_patient GROUP BY insurance_type ORDER BY count DESC
        """)
        insurance = cur.fetchall()

        # City distribution (top 15)
        cur = conn.execute("""
            SELECT city, COUNT(*) as count FROM dim_patient GROUP BY city ORDER BY count DESC LIMIT 15
        """)
        cities = cur.fetchall()

        # Blood type distribution
        cur = conn.execute("""
            SELECT blood_type, COUNT(*) as count FROM dim_patient WHERE blood_type IS NOT NULL GROUP BY blood_type ORDER BY count DESC
        """)
        blood = cur.fetchall()

        # Age distribution
        cur = conn.execute("""
            SELECT 
                CASE
                    WHEN CAST((julianday('now') - julianday(birth_date)) / 365.25 AS INTEGER) < 18 THEN '0-17'
                    WHEN CAST((julianday('now') - julianday(birth_date)) / 365.25 AS INTEGER) BETWEEN 18 AND 30 THEN '18-30'
                    WHEN CAST((julianday('now') - julianday(birth_date)) / 365.25 AS INTEGER) BETWEEN 31 AND 45 THEN '31-45'
                    WHEN CAST((julianday('now') - julianday(birth_date)) / 365.25 AS INTEGER) BETWEEN 46 AND 60 THEN '46-60'
                    ELSE '60+'
                END AS age_group,
                COUNT(*) as count
            FROM dim_patient GROUP BY age_group ORDER BY age_group
        """)
        age_groups = cur.fetchall()

    return {
        "gender": gender,
        "insurance": insurance,
        "cities": cities,
        "blood_types": blood,
        "age_groups": age_groups
    }


@router.get("/reports/top-doctors")
def top_doctors(limit: int = 10, user: dict = Depends(get_current_user)):
    """Top doctors by appointment and consultation count."""
    with get_db() as conn:
        cur = conn.execute("""
            SELECT d.doctor_key, d.doctor_full_name, d.title, d.specialization,
                   dep.department_name,
                   COUNT(DISTINCT a.appointment_key) AS appointment_count,
                   COUNT(DISTINCT c.consultation_key) AS consultation_count
            FROM dim_doctor d
            LEFT JOIN fact_appointment a ON a.doctor_key = d.doctor_key
            LEFT JOIN fact_consultation c ON c.doctor_key = d.doctor_key
            JOIN dim_department dep ON d.department_key = dep.department_key
            GROUP BY d.doctor_key
            ORDER BY appointment_count DESC
            LIMIT ?
        """, (limit,))
        rows = cur.fetchall()
    return {"results": rows}


@router.get("/reports/medication-usage")
def medication_usage(limit: int = 20, user: dict = Depends(get_current_user)):
    """Medication stock status."""
    with get_db() as conn:
        cur = conn.execute("""
            SELECT m.medication_key, m.medication_code, m.medication_name,
                   m.current_stock, m.critical_stock_level, m.unit_price, m.is_active,
                   CASE WHEN m.current_stock <= m.critical_stock_level THEN 1 ELSE 0 END AS is_critical
            FROM dim_medication m
            WHERE m.is_active = 1
            ORDER BY m.current_stock ASC
            LIMIT ?
        """, (limit,))
        rows = cur.fetchall()
    return {"results": rows}


@router.get("/reports/data-quality")
def data_quality_report(user: dict = Depends(get_current_user)):
    """Data quality metrics - Prescription and Invoice reconciliation."""
    with get_db() as conn:
        # Reçete var ama fatura yok
        cur = conn.execute("""
            SELECT COUNT(DISTINCT c.consultation_key) as cnt
            FROM fact_consultation c
            WHERE EXISTS (SELECT 1 FROM fact_prescription_detail WHERE consultation_key = c.consultation_key)
              AND NOT EXISTS (SELECT 1 FROM fact_invoice WHERE consultation_key = c.consultation_key)
        """)
        prescription_without_invoice = cur.fetchone()['cnt']
        
        # Fatura var ama reçete yok
        cur = conn.execute("""
            SELECT COUNT(DISTINCT c.consultation_key) as cnt
            FROM fact_consultation c
            WHERE NOT EXISTS (SELECT 1 FROM fact_prescription_detail WHERE consultation_key = c.consultation_key)
              AND EXISTS (SELECT 1 FROM fact_invoice WHERE consultation_key = c.consultation_key)
        """)
        invoice_without_prescription = cur.fetchone()['cnt']
        
        # Her ikisi de var
        cur = conn.execute("""
            SELECT COUNT(DISTINCT c.consultation_key) as cnt
            FROM fact_consultation c
            WHERE EXISTS (SELECT 1 FROM fact_prescription_detail WHERE consultation_key = c.consultation_key)
              AND EXISTS (SELECT 1 FROM fact_invoice WHERE consultation_key = c.consultation_key)
        """)
        matched_prescription_invoice = cur.fetchone()['cnt']
        
        # Toplam danışma
        cur = conn.execute("""
            SELECT COUNT(*) as cnt FROM fact_consultation
        """)
        total_consultations = cur.fetchone()['cnt']
    
    return {
        "results": [{
            "prescription_without_invoice": prescription_without_invoice,
            "invoice_without_prescription": invoice_without_prescription,
            "matched_prescription_invoice": matched_prescription_invoice,
            "total_consultations": total_consultations
        }]
    }


@router.get("/appointments/{appointment_key}")
def get_appointment_detail(appointment_key: int, user: dict = Depends(get_current_user)):
    """Get detailed information about a specific appointment."""
    with get_db() as conn:
        cur = conn.execute(
            """
            SELECT a.appointment_key, a.appointment_no, a.appointment_datetime, a.appointment_status, 
                   a.wait_minutes, a.created_at,
                   p.patient_key, p.patient_full_name, p.patient_national_id,
                   d.doctor_key, d.doctor_full_name, d.specialization,
                   dep.department_name
            FROM fact_appointment a
            JOIN dim_patient p ON a.patient_key = p.patient_key
            JOIN dim_doctor d ON a.doctor_key = d.doctor_key
            JOIN dim_department dep ON a.department_key = dep.department_key
            WHERE a.appointment_key = ?
            """,
            (appointment_key,),
        )
        appointment = cur.fetchone()
        if not appointment:
            raise HTTPException(status_code=404, detail="Appointment not found")
        
        # Get related consultation if exists
        cur = conn.execute(
            "SELECT * FROM fact_consultation WHERE appointment_key = ?",
            (appointment_key,),
        )
        consultation = cur.fetchone()
    
    return {
        "appointment": appointment,
        "consultation": consultation
    }


class ConsultationIn(BaseModel):
    appointment_key: int
    diagnosis_code: str
    diagnosis_text: str
    consultation_minutes: int
    follow_up_required: bool = False


@router.post("/consultations")
def create_consultation(payload: ConsultationIn, user: dict = Depends(get_current_user)):
    """Create a new consultation record for an appointment."""
    with get_db() as conn:
        try:
            # Get appointment details
            cur = conn.execute(
                "SELECT patient_key, doctor_key, department_key FROM fact_appointment WHERE appointment_key = ?",
                (payload.appointment_key,),
            )
            appt = cur.fetchone()
            if not appt:
                raise HTTPException(status_code=404, detail="Appointment not found")
            
            patient_key = appt["patient_key"]
            doctor_key = appt["doctor_key"]
            department_key = appt["department_key"]
            consultation_datetime = datetime.now().isoformat()
            
            # Insert consultation
            cur = conn.execute(
                """
                INSERT INTO fact_consultation 
                (appointment_key, patient_key, doctor_key, department_key, consultation_datetime, 
                 diagnosis_code, diagnosis_text, consultation_minutes, follow_up_required)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (payload.appointment_key, patient_key, doctor_key, department_key, consultation_datetime,
                 payload.diagnosis_code, payload.diagnosis_text, payload.consultation_minutes,
                 1 if payload.follow_up_required else 0),
            )
            conn.commit()
            consultation_key = cur.lastrowid
            
            cur = conn.execute("SELECT * FROM fact_consultation WHERE consultation_key = ?", (consultation_key,))
            consultation = cur.fetchone()
            return {"consultation": consultation, "created": True}
        except Exception as e:
            logger.error(f"Error creating consultation: {str(e)}")
            raise HTTPException(status_code=400, detail="Muayene kaydı oluşturulurken bir hata oluştu.")


@router.get("/stock-alerts")
def list_stock_alerts(limit: int = 100, user: dict = Depends(get_current_user)):
    """List current stock alert records (low stock, restocked, etc.)."""
    with get_db() as conn:
        cur = conn.execute(
            """
            SELECT alert_key, medication_key, alert_message, stock_after_txn, critical_stock_level, 
                   created_at, is_resolved, resolved_at
            FROM ops_stock_alert
            ORDER BY created_at DESC LIMIT ?
            """,
            (limit,),
        )
        rows = cur.fetchall()
    return {"count": len(rows), "results": rows}


@router.get("/consultations")
def list_consultations(skip: int = 0, limit: int = 100, user: dict = Depends(get_current_user)):
    """List all consultations with patient and doctor details."""
    with get_db() as conn:
        cur = conn.execute(
            """
            SELECT c.consultation_key, c.consultation_datetime, c.diagnosis_code, c.diagnosis_text,
                   c.consultation_minutes, c.follow_up_required,
                   p.patient_key, p.patient_full_name,
                   d.doctor_key, d.doctor_full_name, d.specialization
            FROM fact_consultation c
            JOIN dim_patient p ON c.patient_key = p.patient_key
            JOIN dim_doctor d ON c.doctor_key = d.doctor_key
            ORDER BY c.consultation_datetime DESC LIMIT ? OFFSET ?
            """,
            (limit, skip),
        )
        rows = cur.fetchall()
    return {"count": len(rows), "results": rows}


@router.get("/doctors")
def list_doctors(skip: int = 0, limit: int = 100, user: dict = Depends(get_current_user)):
    """List all doctors."""
    with get_db() as conn:
        cur = conn.execute(
            """
            SELECT d.doctor_key, d.doctor_full_name, d.title, d.specialization, d.phone, d.email,
                   dep.department_name
            FROM dim_doctor d
            JOIN dim_department dep ON d.department_key = dep.department_key
            WHERE d.is_active = 1
            ORDER BY d.doctor_full_name ASC LIMIT ? OFFSET ?
            """,
            (limit, skip),
        )
        rows = cur.fetchall()
    return {"count": len(rows), "results": rows}
