# 🔄 Automatic CRICOS Data Update System

Pełny system automatycznych aktualizacji z logowaniem, notyfikacjami i śledzeniem historii.

## 📋 Co System Robi?

1. **Monitoruje plik Excel** - sprawdza czy się zmienił
2. **Konwertuje dane** - uruchamia `convert_excel_to_json.py`
3. **Generuje raporty** - uruchamia `generate_change_report_html.py`
4. **Loguje wszystko** - zapisuje szczegóły w `data_reports/logs/`
5. **Powiadamia** - zapisuje status w JSON (dostępny dla frontendu)

## 🚀 Szybka Konfiguracja (macOS/Linux)

### Krok 1: Sprawdź czy Python jest zainstalowany
```bash
python3 --version
```

### Krok 2: Uczynić skrypt wykonalnym
```bash
chmod +x auto_update_data.py
```

### Krok 3: Przetestuj ręcznie
```bash
python3 auto_update_data.py
```

Powinieneś zobaczyć:
```
✓ Sprawdzanie zmian...
✓ Konwersja danych...
✓ Generowanie raportów...
✅ UPDATE COMPLETED SUCCESSFULLY!
```

### Krok 4: Ustaw Automatyczne Uruchamianie (Cron)

#### Opcja A: Codziennie o 2:00 AM
```bash
crontab -e
```

Dodaj linię:
```
0 2 * * * cd /Users/rudybobek/edvise-course-finder && python3 auto_update_data.py >> data_reports/cron.log 2>&1
```

#### Opcja B: Co tydzień (poniedziałek 2:00 AM)
```
0 2 * * 1 cd /Users/rudybobek/edvise-course-finder && python3 auto_update_data.py >> data_reports/cron.log 2>&1
```

#### Opcja C: Co miesiąc (1. dnia o 2:00 AM)
```
0 2 1 * * cd /Users/rudybobek/edvise-course-finder && python3 auto_update_data.py >> data_reports/cron.log 2>&1
```

#### Opcja D: Każde 6 godzin
```
0 */6 * * * cd /Users/rudybobek/edvise-course-finder && python3 auto_update_data.py >> data_reports/cron.log 2>&1
```

**Po wklejeniu - zapisz: `CTRL+X`, `Y`, `ENTER`**

## 📊 Monitorowanie Statusu

### 1. Plik Statusu (JSON)
```
data_reports/update_status.json
```

Zawiera:
- ✅ Timestamp ostatniej aktualizacji
- 📊 Liczba wykonanych aktualizacji
- 📝 Historia ostatnich 50 aktualizacji
- 🔗 Linki do logów

### 2. Logi
```
data_reports/logs/update_YYYYMMDD_HHMMSS.log
```

Każda aktualizacja tworzy osobny plik logu.

### 3. Ostatnia Notyfikacja
```
data_reports/latest_notification.json
```

Zawiera info o ostatniej aktualizacji (sukces/błąd).

## 🌐 API Status (Opcjonalnie)

Możesz dodać endpoint w App.jsx aby wyświetlać status:

```javascript
const [updateStatus, setUpdateStatus] = useState(null);

useEffect(() => {
  fetch('/data_reports/update_status.json')
    .then(r => r.json())
    .then(data => setUpdateStatus(data))
    .catch(e => console.log('Status not available'));
}, []);

// Wyświetlaj: Last update: {updateStatus?.last_update}
```

## 📧 Email Notyfikacje (Zaawansowane)

Chcesz mail'a z powiadomieniem? Powiedz a dodam:
- SMTP server config
- Email template
- Wysyłanie maila przy sukcessie/błędzie

## 🔧 Troubleshooting

### Cron nie uruchamia się?
```bash
# Sprawdź czy cron jest włączony
crontab -l

# Sprawdź logi systemowe
log stream --predicate 'process == "cron"'
```

### Skrypt się zawiesza?
- Sprawdź czy Excel plik jest dostępny
- Sprawdź permissions: `chmod +x auto_update_data.py`
- Czytaj logi: `cat data_reports/logs/update_*.log`

### Python error?
```bash
# Sprawdź czy dependencies są zainstalowane
python3 -c "import openpyxl, pandas"

# Jeśli brakuje - zainstaluj
pip install openpyxl pandas
```

## 📈 Harmonogram Rekomendowany

- **Dev/Testing**: Co 6 godzin
- **Production**: Co tydzień (w nocy)
- **Critical**: Co dzień (2 AM)

## ✅ Checklist Setup

- [ ] Uruchomiono `auto_update_data.py` ręcznie (test)
- [ ] Dodano linię do `crontab`
- [ ] Sprawdzono czy `data_reports/logs/` istnieje
- [ ] Zweryfikowano `data_reports/update_status.json`
- [ ] Testowano czy cron się uruchamia

## 📞 Support

Jeśli coś nie działa:
1. Sprawdź logi: `data_reports/logs/`
2. Uruchom ręcznie: `python3 auto_update_data.py`
3. Przeczytaj error message

---

**Gotowe!** System będzie teraz automatycznie aktualizować dane! 🎉
