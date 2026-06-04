# Team Number:7
## Melisa Tamer-22058604 / Muharrem Mert Bayram-22058034

---

# HIMS — Hospital Information Management System

Hastane Bilgi Yönetim Sistemi — Star Schema tasarımlı, FastAPI tabanlı, React arayüzlü tam kapsamlı bir HBYS uygulaması.

## 🌟 Özellikler

- **Modern Dashboard**: Gerçek zamanlı hasta, randevu ve departman istatistikleri.
- **Hasta Yönetimi**: Kapsamlı hasta profilleri, tıbbi geçmiş ve kayıt sistemi.
- **Klinik Kayıtlar**: Randevu planlaması, muayene loglama ve reçete yönetimi.
- **Fatura & Finans**: Departmana özgü muayene ücretleri, SGK/Özel sigorta indirimleri.
- **İlaç & Stok**: Kritik stok alarmları, tetikleyici tabanlı otomatik stok takibi.
- **Raporlama & Analiz**: 7 gelişmiş SQL view ile departman doluluk, hasta demografisi ve gelir raporları.
- **Premium UI**: Dark-themed glassmorphism tasarım, Framer Motion animasyonları, Recharts grafikleri.

## 📂 Proje Yapısı

```text
HIMS_Project/
├── 📂 api/                    — Backend (FastAPI + Python)
│   ├── main.py                — Uygulama giriş noktası
│   ├── db.py                  — SQLite bağlantı yöneticisi
│   ├── security.py            — JWT token işlemleri
│   └── routers/               — API endpoint'leri (auth, public, reports)
├── 📂 frontend/               — Frontend (React + Vite + TailwindCSS)
│   ├── src/pages/             — 8 sayfa: Dashboard, Hastalar, Randevular...
│   └── tailwind.config.js     — Tasarım token'ları
├── 📂 sql/                    — Veritabanı betikleri (4'lü standart yapı)
│   ├── 01_Setup_DDL/          — Şema ve tablo tanımları
│   ├── 02_Data_Load_DML/      — Veri yükleme ve güncellemeler
│   ├── 03_Advanced_SQL/       — View'lar ve Tetikleyiciler
│   └── 04_Key_Queries/        — Temel analitik sorgular
├── 📂 data/csv/               — Dışa aktarılan CSV verileri
├── 📂 tools/                  — Veritabanı yönetim araçları
│   ├── setup.py               — Veritabanını sıfırla ve yeniden oluştur
│   ├── export_csvs.py         — Tüm tabloları CSV olarak dışa aktar
│   └── etl_import.py          — CSV'den veritabanına içe aktar
├── 📂 docs/                   — Dokümantasyon ve ER diyagramları
├── docker-compose.yml         — Docker ile tek komut deployment
└── hospital.db                — SQLite veritabanı
```

## 🚀 Başlangıç

### Gereksinimler

- Python 3.10+
- Node.js 18+ ve npm

### Kurulum

1. **Repoyu klonlayın:**
   ```bash
   git clone <repository-url>
   cd HIMS_Project
   ```

2. **Backend kurulumu:**
   ```bash
   python -m venv .venv_app
   .venv_app\Scripts\activate        # Windows
   # source .venv_app/bin/activate   # Linux/macOS
   pip install -r requirements.txt
   cp .env.example .env
   ```

3. **Veritabanını oluşturun ve veri yükleyin:**
   ```bash
   python tools/setup.py
   ```

4. **Frontend kurulumu:**
   ```bash
   cd frontend
   npm install
   ```

### Uygulamayı Başlatma

**Backend (API):**
```bash
python -m uvicorn api.main:app --host 127.0.0.1 --port 8005 --reload
```

**Frontend:**
```bash
cd frontend
npm run dev
```

Uygulama: `http://localhost:5173` — Giriş: `demo` / `Demo@123456`

### Docker ile Başlatma

```bash
docker-compose up -d --build
```

## 🗃️ Veritabanı Yönetim Araçları

| Komut | Açıklama |
|---|---|
| `python tools/setup.py` | Veritabanını sıfırlar, şemayı oluşturur ve 2.000 hasta verisi ile doldurur |
| `python tools/export_csvs.py` | Tüm tabloları `data/csv/` altına CSV olarak dışa aktarır |
| `python tools/etl_import.py` | CSV dosyalarından veritabanına veri içe aktarır |

## 🗂️ SQL Mimarisi

### Tablolar (Star Schema)

| Tür | Tablo | Açıklama |
|---|---|---|
| Dimension | `dim_patient` | Hasta demografisi ve sigorta bilgileri |
| Dimension | `dim_doctor` | Doktor profilleri ve uzmanlık bilgileri |
| Dimension | `dim_department` | Departman tanımları |
| Dimension | `dim_medication` | İlaç envanteri ve stok seviyeleri |
| Fact | `fact_appointment` | Randevu kayıtları |
| Fact | `fact_consultation` | Muayene kayıtları |
| Fact | `fact_invoice` | Fatura ve ödeme kayıtları |
| Fact | `fact_prescription_detail` | Reçete satırları |
| Operasyonel | `ops_stock_alert` | Otomatik stok uyarı kayıtları |

### Gelişmiş SQL Özellikleri

- **7 Raporlama View'ı**: Departman doluluk, fatura özeti, ilaç trendi, hasta demografisi, zaman yoğunluğu, tekrar ziyaret ve kritik stok
- **5 Tetikleyici**: Reçete yazılınca stok kontrolü ve otomatik düşme; stok yenilenince uyarı otomatik kapatma
- **Window Functions**: `LEAD()` ile hasta tekrar ziyaret analizi
- **CTE**: Karmaşık demografik sorguların modüler yazımı
- **Generated Columns**: `net_amount`, `total_amount` otomatik hesaplanıyor
- **CHECK Constraints**: Cinsiyet, sigorta tipi, randevu durumu kısıtlamaları

## 📄 Lisans

Bu proje MIT Lisansı kapsamındadır — ayrıntılar için [LICENSE](LICENSE) dosyasına bakın.
