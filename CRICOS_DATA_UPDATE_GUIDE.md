# 📊 CRICOS Data Update - Complete Guide

## Overview
Masz teraz **bezpieczny system** do aktualizacji danych CRICOS:
- ✅ Porównywanie zmian (stare vs nowe)
- ✅ Raport szczegółowy
- ✅ Automatyczny backup
- ✅ Rollback na wypadek problemów

---

## Jak Aktualizować Dane

### 1️⃣ **Ręczna aktualizacja** (najprościej)
```bash
# Pobierz nowy Excel z:
# https://data.gov.au/data/dataset/cricos/resource/73786eec-101c-484e-a23f-9b06f4382a0f

# Umieść w Downloads/ (lub zmień ścieżkę w update_cricos_data.py)

# Uruchom aktualizację:
python3 update_cricos_data.py

# Wynik: nowe JSON + backup + raport
```

### 2️⃣ **Co się aktualizuje:**
- `public/courses_data.json` - nowe dane
- `data_backups/` - kopie bezpieczeństwa (timestamped)
- `data_reports/` - raporty zmian (JSON)
- `cricos_data_current.xlsx` - ref do aktualnego Excela

### 3️⃣ **Raport zmian zawiera:**
```json
{
  "timestamp": "2026-02-25T11:00:16.123456",
  "summary": {
    "old_institutions": 1536,
    "new_institutions": 1536,
    "old_total_courses": 25157,
    "new_total_courses": 25928
  },
  "changes": {
    "added_institutions": [...],
    "removed_institutions": [...],
    "added_courses": [...],
    "removed_courses": [...],
    "modified_courses": [...],
    "modified_institutions": [...]
  }
}
```

---

## 🔄 Automacja (Opcjonalnie)

### Option A: Cron Job (Mac/Linux)
```bash
# Edit crontab
crontab -e

# Dodaj linię - uruchamia 1-go dnia każdego miesiąca o 3:00 AM:
0 3 1 * * cd /Users/rudybobek/edvise-course-finder && python3 update_cricos_data.py >> cricos_update.log 2>&1
```

### Option B: GitHub Actions (Jeśli masz repo)
Utwórz `.github/workflows/cricos-update.yml`:
```yaml
name: Update CRICOS Data Monthly

on:
  schedule:
    - cron: '0 3 1 * *'  # 1st day of month at 3 AM UTC

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-python@v2
      - run: python3 update_cricos_data.py
      - run: npm run build
      - run: git config user.name "CRICOS Bot" && git commit -am "Update CRICOS data" || true
      - run: git push
```

### Option C: Cloud Scheduler (AWS Lambda / GCP)
```python
# Lambda handler do pobierania i aktualizacji
# Można hostować na AWS dla automatic monthly runs
```

---

## 🔒 Bezpieczeństwo & Rollback

### Jeśli coś pójdzie źle:
```bash
# 1. Sprawdź backup
ls -la data_backups/

# 2. Restore stary plik
cp data_backups/courses_data_20260225_110016.json public/courses_data.json

# 3. Rebuild
npm run build
```

### Walidacja danych:
```bash
# Sprawdź czy JSON jest valid
python3 -m json.tool public/courses_data.json | head -20

# Sprawdź liczbę instytucji
python3 -c "import json; print('Instytucje:', len(json.load(open('public/courses_data.json'))))"
```

---

## 📅 Ostatnia Aktualizacja

| Data | Instytucje | Kursy | Zmiany |
|------|-----------|-------|--------|
| 2026-02-25 | 1536 | 25,928 | +771 kursów, 11 zmian |
| 2026-01-XX | 1536 | 25,157 | Initial data |

---

## 🚀 Następne Kroki (FAZA 7)

Jeśli chcesz pełną automatyzację:
1. Setup GitHub Actions (jeśli masz repo)
2. Webhook do automatycznego rebuildu
3. Email notification przy zmianach
4. Database logging all updates

---

## Pytania?
Skrypt `update_cricos_data.py` obsługuje:
- ✅ Porównanie danych
- ✅ Zmiana struktury (nowe pola, etc.)
- ✅ Logo mapping preservation
- ✅ Descriptions preservation
- ✅ Backup & rollback
