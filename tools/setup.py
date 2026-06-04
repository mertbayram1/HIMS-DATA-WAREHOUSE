import sqlite3
import shutil
import hashlib
import os
import binascii
import random
import logging
from datetime import datetime, timedelta
from pathlib import Path
from faker import Faker

# Configure basic logging for the setup process
logging.basicConfig(level=logging.INFO, format='%(message)s')
logger = logging.getLogger(__name__)

# Base directory configurations
BASE_DIR = Path(__file__).resolve().parents[1]
DB_PATH = BASE_DIR / "hospital.db"
DDL_DIR = BASE_DIR / "sql" / "01_Setup_DDL"
DML_DIR = BASE_DIR / "sql" / "02_Data_Load_DML"
ADVANCED_SQL_DIR = BASE_DIR / "sql" / "03_Advanced_SQL"

# Initialize Faker with Turkish locale and static seed for reproducible data
fake = Faker('tr_TR')
Faker.seed(42)
random.seed(42)

# ── Name / city pools ─────────────────────────────────────────────────────────
FIRST_NAMES_MALE = [
    "Ahmet", "Mehmet", "Ali", "Fatih", "Mustafa", "İbrahim", "Kemal", "Yusuf", "Recep", "Hüseyin",
    "Emre", "Burak", "Can", "Hakan", "Oğuz", "Okan", "Volkan", "Cem", "Deniz", "Murat",
    "Eren", "Kaan", "Kerem", "Batuhan", "Tolga", "Mert", "Onur", "Uğur", "Gökhan", "Serkan",
    "Sinan", "Turan", "Yasin", "Osman", "Orhan", "Enes", "Barış", "Selim", "Kadir", "Tarkan"
]
FIRST_NAMES_FEMALE = [
    "Aslı", "Ayşe", "Didem", "Eda", "Zeynep", "Merve", "Elif", "Selin", "Büşra", "Fatma",
    "Ceren", "Gizem", "Pelin", "Sude", "Tuğba", "Esra", "Berna", "Bahar", "Banu", "Cansu",
    "Derya", "Duygu", "Ebru", "Ezgi", "Funda", "Gamze", "Gözde", "Hande", "Hazal", "İrem",
    "Melis", "Müge", "Nil", "Özge", "Pınar", "Rüya", "Seda", "Sevgi", "Sinem", "Şeyma"
]
LAST_NAMES = [
    "Yılmaz", "Demir", "Şahin", "Aslan", "Göktaş", "Akın", "Kaplan", "Alpaslan", "Aydın", "Bahçeli",
    "Kılıç", "Kaya", "Çelik", "Doğan", "Yıldız", "Öztürk", "Özdemir", "Koç", "Kurt", "Özkan",
    "Arslan", "Bulut", "Korkmaz", "Güneş", "Erdoğan", "Gül", "Tekin", "Acar", "Avcı", "Polat",
    "Turan", "Köse", "Ertürk", "Çetin", "Erol", "Turgut", "Karakaya", "Yalçın", "Taş", "Uysal"
]
DOCTOR_TITLES = ["Prof. Dr.", "Doç. Dr.", "Uzman Dr.", "Dr."]
CITIES = [
    "İstanbul", "Ankara", "İzmir", "Bursa", "Adana", "Antalya",
    "Gaziantep", "Konya", "Mersin", "Diyarbakır", "Kayseri", "Eskişehir"
]
BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]
GENDERS = ["E", "K"]
INSURANCE_TYPES = ["SGK", "Özel"]
APPOINTMENT_STATUSES = ["PLANLI", "TAMAMLANDI", "İPTAL", "GELMEDİ"]
PAYMENT_STATUSES = ["PENDING", "PAID", "PARTIAL"]
USAGE_INSTRUCTIONS = ["Günde 1", "Günde 2", "Günde 3", "Yemekle", "Aç karna", "Uyku öncesi"]

# SGK covers a fixed portion; Özel patients pay a premium but get full itemization.
SGK_COVERAGE_RATE = 0.70   # SGK pays 70% of base consultation fee
OZEL_DISCOUNT_RATE = 0.05  # 5% kurumsal indirim for private insurance patients

# ── Medical rules per department ──────────────────────────────────────────────
# consultation_base_fee: realistic Turkish private hospital muayene ücreti (₺)
MEDICAL_RULES = {
    "Kardiyoloji": {
        "specializations": ["Kardiyolog"],
        "diagnoses": [
            ("I10", "Esansiyel Hipertansiyon"), ("R07.9", "Göğüs Ağrısı"),
            ("E78.5", "Hiperlipidemi"), ("I25.1", "Aterosklerotik Kalp Hastalığı"),
            ("I48.91", "Atriyal Fibrilasyon"),
        ],
        "medications": [
            ("Aspirin 100mg", 2.50), ("Lisinopril 10mg", 4.50),
            ("Atorvastatin 20mg", 12.00), ("Bisoprolol 5mg", 8.00),
            ("Warfarin 5mg", 6.00),
        ],
        "min_age": 30, "max_age": 90, "consultation_base_fee": 650.0,
    },
    "Çocuk Kliniği": {
        "specializations": ["Pediatrist", "Çocuk Cerrahı"],
        "diagnoses": [
            ("B34.9", "Viral Enfeksiyon"), ("J45.909", "Astım"),
            ("H66.90", "Kulak Enfeksiyonu"), ("A09", "Gastroenterit"),
            ("J06.9", "Üst Solunum Yolu Enfeksiyonu"),
        ],
        "medications": [
            ("Paracetamol Şurup", 2.20), ("Amoksisilin 250mg/5ml", 9.00),
            ("Desloratadin Şurup", 7.50), ("Probiyotik Saşe", 12.00),
            ("Budesonid İnhaler", 38.00),
        ],
        "min_age": 0, "max_age": 17, "consultation_base_fee": 280.0,
    },
    "Dahiliye": {
        "specializations": ["Dahiliye Uzmanı", "İç Hastalıkları Uzmanı"],
        "diagnoses": [
            ("E11.9", "Tip 2 Diyabet Mellitus"), ("K29.5", "Kronik Gastrit"),
            ("J06.9", "Üst Solunum Yolu Enfeksiyonu"), ("E03.9", "Hipotiroidi"),
            ("M79.3", "Miyofasyal Ağrı Sendromu"),
        ],
        "medications": [
            ("Metformin 1000mg", 5.00), ("Levothyroxine 50mcg", 6.00),
            ("Omeprazol 20mg", 4.20), ("Vitamin D3 5000IU", 7.50),
            ("Pantoprazol 40mg", 6.80),
        ],
        "min_age": 18, "max_age": 90, "consultation_base_fee": 350.0,
    },
    "Nöroloji": {
        "specializations": ["Nörolog", "Beyin ve Sinir Cerrahisi Uzmanı"],
        "diagnoses": [
            ("G43.909", "Kronik Migren"), ("M54.5", "Lomber Radikülopati"),
            ("G35", "Multipl Skleroz"), ("G47.00", "İnsomni"),
            ("G40.909", "Epilepsi"),
        ],
        "medications": [
            ("Diclofenac 75mg", 4.00), ("Paracetamol 500mg", 1.75),
            ("Pregabalin 75mg", 18.50), ("Sumatriptan 50mg", 32.00),
            ("Levetiracetam 500mg", 24.00),
        ],
        "min_age": 15, "max_age": 90, "consultation_base_fee": 500.0,
    },
    "Ortopedi": {
        "specializations": ["Ortopedi ve Travmatoloji Uzmanı"],
        "diagnoses": [
            ("M17.9", "Diz Artrozu"), ("S62.001A", "Radius Kırığı"),
            ("M54.4", "Kronik Lumbalji"), ("M75.1", "Rotator Manşet Yırtığı"),
            ("M10.9", "Gut Artriti"),
        ],
        "medications": [
            ("Naproxen 500mg", 5.50), ("Ibuprofen 400mg", 3.00),
            ("Kalsiyum + D3", 9.00), ("Kondroitin Sülfat 800mg", 22.00),
            ("Tramadol 50mg", 8.50),
        ],
        "min_age": 18, "max_age": 90, "consultation_base_fee": 550.0,
    },
    "Kadın Hastalıkları": {
        "specializations": ["Jinekolog", "Kadın Doğum Uzmanı"],
        "diagnoses": [
            ("N94.6", "Primer Dismenore"), ("N92.0", "Menoraji"),
            ("Z34.90", "Rutin Gebelik Kontrolü"), ("N76.0", "Akut Vajinit"),
            ("N83.20", "Over Kisti"),
        ],
        "medications": [
            ("Demir Sülfat + Folik Asit", 7.00), ("Progesteron 200mg", 22.00),
            ("Flukonazol 150mg", 11.00), ("Metronidazol 500mg", 5.00),
            ("Kalsiyum + Magnezyum", 9.50),
        ],
        "min_age": 15, "max_age": 60, "consultation_base_fee": 420.0,
    },
    "Dermatoloji": {
        "specializations": ["Dermatolog", "Deri ve Zührevi Hastalıklar Uzmanı"],
        "diagnoses": [
            ("L30.9", "Kontakt Dermatit"), ("L40.0", "Plak Psöriyazis"),
            ("L70.0", "Akne Vulgaris"), ("B35.4", "Tinea Pedis"),
            ("L23.9", "Alerjik Kontakt Dermatit"),
        ],
        "medications": [
            ("Betametazon Krem %0.1", 14.00), ("Adapalene %0.1 Jel", 28.00),
            ("Loratadin 10mg", 5.00), ("Terbinafin Krem %1", 16.00),
            ("Mometazon Furoat Krem", 19.50),
        ],
        "min_age": 12, "max_age": 90, "consultation_base_fee": 380.0,
    },
    "Poliklinik": {
        "specializations": ["Pratisyen Hekim", "Aile Hekimi"],
        "diagnoses": [
            ("B34.9", "Viral Enfeksiyon"), ("J00", "Akut Nazofarenjit"),
            ("R51", "Baş Ağrısı"), ("R50.9", "Ateş, Nedeni Bilinmeyen"),
            ("Z00.00", "Rutin Sağlık Kontrolü"),
        ],
        "medications": [
            ("Paracetamol 500mg", 1.75), ("Vitamin C 500mg", 3.50),
            ("Amoksisilin 500mg", 8.50), ("Antihistaminik Tablet", 5.00),
            ("B12 Vitamini", 4.80),
        ],
        "min_age": 0, "max_age": 90, "consultation_base_fee": 180.0,
    },
}

DEFAULT_RULE = {
    "specializations": ["Pratisyen Hekim"],
    "diagnoses": [("B34.9", "Viral Enfeksiyon")],
    "medications": [("Paracetamol 500mg", 1.75), ("Vitamin C 500mg", 3.50)],
    "min_age": 0, "max_age": 90, "consultation_base_fee": 180.0,
}

DEPARTMENTS = [
    ("KARD",  "Kardiyoloji",        2),
    ("DAHI",  "Dahiliye",           2),
    ("COCUK", "Çocuk Kliniği",      1),
    ("NORO",  "Nöroloji",           4),
    ("ORT",   "Ortopedi",           3),
    ("KAD",   "Kadın Hastalıkları", 2),
    ("DERM",  "Dermatoloji",        3),
    ("POLI",  "Poliklinik",         1),
]


def get_rule(dept_name):
    """Fetch medical rules based on the department name."""
    return MEDICAL_RULES.get(dept_name, DEFAULT_RULE)


def gen_valid_tc():
    """Generate a mathematically valid Turkish Republic ID number."""
    digits = [random.randint(1, 9)] + [random.randint(0, 9) for _ in range(8)]
    odd_sum = sum(digits[0::2])
    even_sum = sum(digits[1::2])
    d10 = ((odd_sum * 7) - even_sum) % 10
    d11 = (sum(digits) + d10) % 10
    return ''.join(str(d) for d in digits) + str(d10) + str(d11)


def gen_phone():
    """Generate a random Turkish mobile phone number."""
    return f"+9053{random.randint(0,9)}{random.randint(1000000, 9999999)}"


def gen_balanced_birth_date():
    """Generate a birth date with a realistic hospital age distribution (adult-heavy)."""
    r = random.random()
    if r < 0.10:   age = random.randint(0, 17)    # 10% Children/Teens
    elif r < 0.35: age = random.randint(18, 35)   # 25% Young Adults
    elif r < 0.75: age = random.randint(36, 65)   # 40% Middle-Aged Adults
    else:          age = random.randint(66, 95)   # 25% Elderly
    return (datetime.now() - timedelta(days=int(age * 365.25 + random.randint(0, 364)))).date().isoformat()


def calculate_age(birth_date_str):
    """Calculate age in years from an ISO birth date string."""
    birth_date = datetime.strptime(birth_date_str[:10], '%Y-%m-%d')
    return (datetime.now() - birth_date).days // 365


def gen_timestamp(days_back_range=365):
    """Generate a random timestamp within business hours over the past given days."""
    base_date = datetime.now() - timedelta(days=random.randint(0, days_back_range))
    return base_date.replace(hour=random.randint(8, 18), minute=random.randint(0, 59),
                             second=0, microsecond=0).isoformat()


def get_password_hash(password: str) -> str:
    """Generate a PBKDF2 HMAC SHA256 hash for secure password storage."""
    salt = os.urandom(16)
    dk = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, 100_000)
    return binascii.hexlify(salt).decode() + '$' + binascii.hexlify(dk).decode()


def reset_and_init_db():
    """Remove existing DB and recreate schema by running all ordered SQL scripts."""
    if DB_PATH.exists():
        DB_PATH.unlink()

    conn = sqlite3.connect(str(DB_PATH))
    conn.execute("PRAGMA foreign_keys = ON")

    for sql_dir in [DDL_DIR, DML_DIR, ADVANCED_SQL_DIR]:
        if sql_dir.exists():
            for sql_file in sorted(sql_dir.glob("*.sql")):
                with open(sql_file, 'r', encoding='utf-8') as f:
                    try:
                        conn.executescript(f.read())
                    except Exception as e:
                        logger.warning(f"  [skip] {sql_file.name}: {e}")

    conn.commit()
    return conn


def seed_data(conn):
    """Populate all tables with logically consistent, realistic synthetic data."""

    # ── 1. Departments ────────────────────────────────────────────────────────
    for code, name, floor in DEPARTMENTS:
        conn.execute(
            'INSERT OR IGNORE INTO dim_department (department_code, department_name, floor_no) VALUES (?, ?, ?)',
            (code, name, floor)
        )

    # ── 2. Medications ────────────────────────────────────────────────────────
    seen_meds = set()
    for rule in MEDICAL_RULES.values():
        for med_name, unit_price in rule["medications"]:
            if med_name not in seen_meds:
                seen_meds.add(med_name)
                conn.execute(
                    'INSERT OR IGNORE INTO dim_medication '
                    '(medication_code, medication_name, unit_price, current_stock, critical_stock_level) '
                    'VALUES (?, ?, ?, ?, ?)',
                    (med_name[:12].upper().replace(" ", "_"), med_name, unit_price,
                     random.randint(80, 600), random.randint(15, 30))
                )

    # ── 3. Patients (2 000) ───────────────────────────────────────────────────
    logger.info("  Seeding 2 000 patients...")
    for _ in range(2000):
        gender = random.choice(GENDERS)
        first = random.choice(FIRST_NAMES_MALE if gender == 'E' else FIRST_NAMES_FEMALE)
        full_name = f"{first} {random.choice(LAST_NAMES)}"
        conn.execute(
            'INSERT INTO dim_patient '
            '(patient_full_name, patient_national_id, gender, birth_date, phone, city, blood_type, insurance_type) '
            'VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            (full_name, gen_valid_tc(), gender, gen_balanced_birth_date(),
             gen_phone(), random.choice(CITIES), random.choice(BLOOD_TYPES),
             random.choice(INSURANCE_TYPES))
        )

    depts = conn.execute("SELECT department_key, department_name FROM dim_department").fetchall()

    # ── 4. Doctors (80) ───────────────────────────────────────────────────────
    logger.info("  Seeding 80 doctors...")
    for _ in range(80):
        dept_key, dept_name = random.choice(depts)
        spec = random.choice(get_rule(dept_name)["specializations"])
        gender = random.choice(GENDERS)
        full_name = f"{random.choice(FIRST_NAMES_MALE if gender == 'E' else FIRST_NAMES_FEMALE)} {random.choice(LAST_NAMES)}"
        conn.execute(
            'INSERT INTO dim_doctor '
            '(doctor_national_id, doctor_full_name, title, specialization, department_key, hire_date, phone, email) '
            'VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            (gen_valid_tc(), full_name, random.choice(DOCTOR_TITLES), spec, dept_key,
             (datetime.now() - timedelta(days=random.randint(365, 5000))).date().isoformat(),
             gen_phone(), f"dr.{full_name.split()[0].lower()}{random.randint(1,99)}@hastane.com")
        )

    patients = conn.execute("SELECT patient_key, birth_date, insurance_type FROM dim_patient").fetchall()
    doctors  = conn.execute("SELECT doctor_key, department_key FROM dim_doctor").fetchall()
    depts_dict = {d[0]: d[1] for d in depts}
    meds_db    = {
        m[1]: (m[0], m[2])
        for m in conn.execute("SELECT medication_key, medication_name, unit_price FROM dim_medication").fetchall()
    }

    # ── 5. Appointments (5 000) ───────────────────────────────────────────────
    logger.info("  Seeding 5 000 appointments...")
    for _ in range(5000):
        p_key, b_date, insurance = random.choice(patients)
        age = calculate_age(b_date)
        suitable = [(dk, dept) for dk, dept in doctors
                    if get_rule(depts_dict[dept])["min_age"] <= age <= get_rule(depts_dict[dept])["max_age"]]
        if not suitable:
            continue
        doctor_key, dept_key = random.choice(suitable)
        # Weight: 50% TAMAMLANDI, 20% PLANLI, 15% İPTAL, 15% GELMEDİ
        status = random.choices(
            ["TAMAMLANDI", "PLANLI", "İPTAL", "GELMEDİ"],
            weights=[50, 20, 15, 15]
        )[0]
        try:
            conn.execute(
                'INSERT INTO fact_appointment '
                '(appointment_no, appointment_datetime, patient_key, doctor_key, department_key, appointment_status, wait_minutes) '
                'VALUES (?, ?, ?, ?, ?, ?, ?)',
                (f"APT-{random.randint(100000, 999999)}", gen_timestamp(365),
                 p_key, doctor_key, dept_key, status,
                 random.randint(5, 90) if status == "TAMAMLANDI" else None)
            )
        except Exception:
            pass

    # ── 6. Consultations + Prescriptions (linked to TAMAMLANDI appointments) ──
    logger.info("  Seeding consultations and prescriptions...")
    appts = conn.execute(
        "SELECT appointment_key, patient_key, doctor_key, department_key, appointment_datetime "
        "FROM fact_appointment WHERE appointment_status = 'TAMAMLANDI'"
    ).fetchall()

    for appt_key, patient_key, doctor_key, dept_key, appt_dt_str in appts:
        rule = get_rule(depts_dict[dept_key])
        diag_code, diag_text = random.choice(rule["diagnoses"])
        cons_date = (datetime.fromisoformat(appt_dt_str) + timedelta(minutes=random.randint(10, 45))).isoformat()
        try:
            cur = conn.execute(
                'INSERT INTO fact_consultation '
                '(appointment_key, patient_key, doctor_key, department_key, '
                'consultation_datetime, diagnosis_code, diagnosis_text, consultation_minutes, follow_up_required) '
                'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                (appt_key, patient_key, doctor_key, dept_key, cons_date,
                 diag_code, diag_text, random.randint(10, 60),
                 1 if random.random() < 0.3 else 0)
            )
            cons_key = cur.lastrowid

            # Prescriptions: 80% probability, 1-3 medications
            if random.random() < 0.80:
                n_meds = random.randint(1, min(3, len(rule["medications"])))
                for med_name, _ in random.sample(rule["medications"], k=n_meds):
                    if med_name in meds_db:
                        med_key, unit_price = meds_db[med_name]
                        conn.execute(
                            'INSERT INTO fact_prescription_detail '
                            '(consultation_key, medication_key, quantity, unit_price, usage_instructions, prescribed_at) '
                            'VALUES (?, ?, ?, ?, ?, ?)',
                            (cons_key, med_key, random.randint(1, 4),
                             unit_price, random.choice(USAGE_INSTRUCTIONS), cons_date)
                        )
        except Exception:
            pass

    # ── 7. Invoices with department-based fees + insurance logic ──────────────
    logger.info("  Seeding invoices with realistic department-based pricing...")
    consultations = conn.execute(
        "SELECT c.consultation_key, c.patient_key, c.department_key, c.consultation_datetime, p.insurance_type "
        "FROM fact_consultation c "
        "JOIN dim_patient p ON c.patient_key = p.patient_key"
    ).fetchall()

    pres_totals = {
        row[0]: row[1] or 0.0
        for row in conn.execute(
            "SELECT consultation_key, SUM(quantity * unit_price) FROM fact_prescription_detail GROUP BY consultation_key"
        ).fetchall()
    }

    for cons_key, patient_key, dept_key, cons_dt_str, insurance in consultations:
        dept_name = depts_dict.get(dept_key, "Poliklinik")
        base_fee  = get_rule(dept_name).get("consultation_base_fee", 180.0)
        # Add small random variance ±10% to make data more realistic
        base_fee  = round(base_fee * random.uniform(0.90, 1.10), 2)
        pres_total = pres_totals.get(cons_key, 0.0)
        gross = round(base_fee + pres_total, 2)

        # Discount: SGK subsidises consultation fee portion only
        if insurance == "SGK":
            discount = round(base_fee * SGK_COVERAGE_RATE, 2)
        else:
            discount = round(gross * OZEL_DISCOUNT_RATE, 2)

        discount = min(discount, gross)
        net = round(gross - discount, 2)

        pay_status = random.choices(["PAID", "PARTIAL", "PENDING"], weights=[60, 25, 15])[0]
        paid = net if pay_status == "PAID" else (round(net * random.uniform(0.3, 0.7), 2) if pay_status == "PARTIAL" else 0.0)

        inv_date = (datetime.fromisoformat(cons_dt_str) + timedelta(minutes=random.randint(5, 30))).date().isoformat()
        try:
            conn.execute(
                'INSERT INTO fact_invoice '
                '(invoice_no, consultation_key, patient_key, invoice_date, gross_amount, discount_amount, payment_status, paid_amount) '
                'VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                (f"INV-{random.randint(100000, 999999)}", cons_key, patient_key,
                 inv_date, gross, discount, pay_status, paid)
            )
        except Exception:
            pass

    # ── 8. Default admin user ─────────────────────────────────────────────────
    try:
        conn.execute(
            "INSERT INTO auth_user (username, email, hashed_password, role, is_active) VALUES (?, ?, ?, ?, ?)",
            ('demo', 'demo@hospital.com', get_password_hash('Demo@123456'), 'admin', 1)
        )
    except Exception:
        pass

    conn.commit()
    logger.info("  All data seeded successfully.")


def main():
    """Main execution sequence for the database setup."""
    logger.info("Initializing database...")
    try:
        conn = reset_and_init_db()
        logger.info("Seeding data...")
        seed_data(conn)
        conn.close()
        logger.info("Database setup complete.")
    except Exception as e:
        logger.error(f"Error: {e}")
        raise


if __name__ == '__main__':
    main()
