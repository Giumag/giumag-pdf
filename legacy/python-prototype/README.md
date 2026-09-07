# Giumag PDF Studio

**Suite PDF locale, privacy-first, firmata Giumag.**

Giumag PDF Studio offre un'interfaccia web moderna che gira esclusivamente sul computer dell'utente. Il browser comunica con un server FastAPI in ascolto su `127.0.0.1`; i documenti non vengono caricati su servizi cloud e i file temporanei vengono eliminati al termine di ogni operazione.

## Avvio rapido

### Windows
1. Installa **Python 3.11+** se non è già presente (durante l'installazione abilita `Add Python to PATH`).
2. Fai doppio clic su **`START_GIUMAG_PDF.bat`**.
3. Alla prima esecuzione vengono installate le dipendenze Python; poi si apre automaticamente il browser.
4. Le esecuzioni successive riutilizzano l'ambiente già pronto.

### macOS / Linux
```bash
./start_giumag_pdf.sh
```

Oppure manualmente:
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python launcher.py
```

## Strumenti inclusi

### Organizza
- Unisci PDF
- Dividi PDF
- Estrai pagine
- Rimuovi pagine
- Riordina pagine
- Ruota PDF
- Ritaglia PDF
- Appiattisci annotazioni e moduli

### Ottimizza
- Comprimi PDF
- Ripara PDF
- OCR PDF
- PDF → PDF/A
- Rimuovi metadati

### Converti
- Immagini → PDF
- PDF → immagini
- Word / Excel / PowerPoint → PDF
- PDF → Word
- PDF → PowerPoint
- PDF → Excel
- PDF → Markdown
- Estrazione contenuti (testo + immagini)

### Modifica
- Aggiunta testo / modifica rapida
- Compilazione moduli PDF
- Filigrana
- Numeri di pagina
- Firma visiva da immagine

### Sicurezza
- Proteggi PDF con AES-256
- Sblocca PDF conoscendo la password
- Censura permanente di testo
- Confronto testuale e visivo tra PDF

### AI locale
- Riassunto PDF con Ollama
- Traduzione PDF con Ollama

## Dipendenze opzionali di sistema

Il core funziona con le sole dipendenze Python. Alcuni strumenti diventano più potenti quando sul PC sono presenti:

- **LibreOffice** — conversione Word/Excel/PowerPoint → PDF.
- **Tesseract OCR** — OCR locale. Per `ita+eng` installare i language pack italiano e inglese.
- **Ghostscript** — compressione forte/estrema, recupero PDF e PDF/A.
- **Ollama** — riassunti e traduzioni con modelli AI locali.

L'app rileva automaticamente questi programmi e mostra il loro stato nel pannello **Diagnostica locale**.

## Privacy

- Binding esclusivo su `127.0.0.1`.
- Nessun CDN, font remoto o JavaScript esterno.
- Nessuna telemetria inclusa.
- Nessun account.
- Nessun caricamento cloud implementato.
- Directory temporanea distinta per ogni operazione e cancellata dopo la risposta.

> Nota: la funzione **Firma PDF** della versione attuale applica una firma visiva (immagine) e non una firma digitale crittografica con certificato qualificato.

## Qualità delle conversioni

Le conversioni da PDF verso formati modificabili sono necessariamente diverse da quelle di servizi commerciali con motori proprietari:

- PDF → Word privilegia il testo modificabile, ma layout molto complessi possono richiedere ritocchi.
- PDF → PowerPoint privilegia la fedeltà visiva: una pagina PDF diventa una slide grafica.
- PDF → Excel tenta di rilevare le tabelle; in assenza di tabelle inserisce il testo per pagina.

## Sviluppo

Avvio dev:
```bash
python -m uvicorn app.main:app --host 127.0.0.1 --port 8765 --reload
```

Endpoint principali:
- `GET /api/health`
- `GET /api/dependencies`
- `POST /api/process/{tool_id}`

La struttura è già adatta a un repository GitHub. Un passo successivo naturale è aggiungere build automatiche per produrre un `.exe` Windows e pacchetti macOS/Linux.

---

**Giumag PDF Studio — by Giumag**
