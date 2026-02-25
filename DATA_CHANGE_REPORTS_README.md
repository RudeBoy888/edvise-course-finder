# 📊 CRICOS Data Change Reports System

## Overview

Masz teraz **kompletny system raportowania zmian danych** CRICOS:
- ✅ Automatyczne porównywanie zmian
- ✅ Piękne HTML raporty
- ✅ Historia wszystkich aktualizacji
- ✅ Szczegółowe przeanalizowanie każdej zmiany

---

## 📁 Struktura Raportów

```
data_reports/
├── json/                          (JSON raporty techniczne)
│   ├── update_report_20260225_110016.json
│   └── update_report_20260124_090000.json
│
├── html/                          (HTML raporty do przeglądania)
│   ├── index.html                 (Historia wszystkich zmian)
│   ├── update_report_20260225_110016.html
│   └── update_report_20260124_090000.html
│
└── ... (wszystkie historyczne raporty)
```

---

## 🔍 Co zawiera Raport

### Summary (Podsumowanie)
```
Instytucje:        1536 → 1536  (zmiana: +0)
Kursy:            25,157 → 25,928  (zmiana: +771)
```

### Szczegółowe Zmiany
- ✅ **Dodane instytucje** - lista nowych
- ❌ **Usunięte instytucje** - lista usuniętych
- 🆕 **Nowe kursy** - wszystkie dodane (z limitem 50)
- ❌ **Usunięte kursy** - wszystkie usunięte
- ✏️ **Zmienione kursy** - ceny, nazwy, opis (tabela szczegółowa)

---

## 🚀 Jak Używać

### 1️⃣ Automatycznie (Rekomendowane)

Przy każdej aktualizacji danych raport generuje się **automatycznie**:

```bash
python3 update_cricos_data.py
# ... aktualizacja danych ...
# [7/7] Generating HTML report...
# ✓ HTML report generated successfully
```

### 2️⃣ Ręcznie - Przeglądanie Raportów

```bash
# Otwórz w przeglądarce:
open data_reports/html/index.html

# Lub ostatni raport:
open data_reports/html/update_report_20260225_110016.html
```

### 3️⃣ Z Linii Komend

```bash
# Tylko generator raportów
python3 generate_change_report_html.py

# Z walidacją
python3 -c "import json; print(json.load(open('data_reports/json/update_report_20260225_110016.json')))"
```

---

## 📈 Informacje w Raporcie

### Statystyki
- Total instytucji (old → new)
- Total kursów (old → new)
- Liczbę dodanych/usuniętych/zmienionych

### Dodane Kursy
```
• Bachelor of Science - University of Sydney
  Price: $25,000 AUD
• Master of Engineering - UNSW
  Price: $30,000 AUD
... (dodatkowe kursy)
```

### Zmienione Kursy
```
Kurs: Bachelor of Science
Instytucja: University of Sydney
Zmiany:
  - tuitionFee: $25,000 → $26,000
  - durationWeeks: 104 → 106
  - courseName: Bachelor of Science → Bachelor of Science (Honors)
```

---

## 🔐 Bezpieczeństwo & Archiwum

Wszystkie raporty są archiwizowane **automatycznie**:

```bash
# Wyświetl historię
ls -la data_reports/html/

# 20 ostatnich raportów
ls data_reports/html/ | sort -r | head -20
```

### Backup Danych
```bash
# Poprzednie wersje JSON
ls data_backups/
# courses_data_20260225_110016.json
# courses_data_20260124_090000.json
```

---

## 📧 Wysyłanie Raportów (Opcjonalnie)

Możesz wysłać raport do zespołu:

```bash
# Skopiuj HTML raport
cp data_reports/html/update_report_20260225_110016.html report.html

# Wyślij mailem lub Slack-iem
# Raport jest w pełni standalone - nie potrzebuje internetu
```

---

## 🎨 Design Raportu

- **Gradient header** - ładny wygląd
- **Responsive design** - działa na mobile
- **Print-friendly** - można wydrukować (Ctrl+P)
- **Emoji indicators** - 🆕 (dodane), ❌ (usunięte), ✏️ (zmienione)
- **Color coding** - zielony (+), czerwony (-), żółty (zmiana)

---

## 📋 Historia Zmian - Przeglądanie

Otwórz `data_reports/html/index.html`:

```
📊 CRICOS Update Reports History

[Update Report #1]
Generated: 25 Feb 2026, 11:00:16
Institutions: 1536
Courses: 25,928
Changes: 782
[View Report →]

[Update Report #2]
Generated: 24 Jan 2026, 09:00:00
Institutions: 1536
Courses: 25,157
Changes: 45
[View Report →]
```

---

## 🔄 Automacja z Cron/Actions

Jeśli ustawisz automatyczne pobieranie danych:

```bash
# Każdy 1-szego miesiąca o 3 AM
0 3 1 * * cd /Users/rudybobek/edvise-course-finder && python3 update_cricos_data.py >> cricos_update.log 2>&1
```

**Raporty będą generować się automatycznie!** 📊

---

## 📞 Troubleshooting

### Raport się nie wygenerował?

```bash
# Sprawdź czy JSON jest valid
python3 generate_change_report_html.py -v

# Sprawdź najnowszy raport
ls -la data_reports/json/ | tail -5
```

### Brakuje danych w raporcie?

```bash
# Sprawdź JSON report
cat data_reports/json/update_report_20260225_110016.json | python3 -m json.tool
```

---

## 🚀 Next Steps

1. ✅ Raporty generują się automatycznie
2. ⏳ Możesz je przeglądać w przeglądarce
3. 📧 Wysyłać e-mailem do zespołu (opcjonalnie)
4. 📊 Archiwizować zmany na czas nieokreślony

**Wszystko jest bezpieczne, zautomatyzowane i niezawodne!** 🎯
