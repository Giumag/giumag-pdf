# Giumag PDF Studio — Registro della chat

## Obiettivo richiesto
Creare un'applicazione/web app completa in stile iLovePDF, con grafica moderna, firmata **Giumag**, orientata alla privacy e pensata per evitare il caricamento dei file su servizi online. L'avvio deve essere il più semplice possibile e la struttura deve poter essere portata facilmente su GitHub.

## Decisioni progettuali
- Scelta una **web app locale**: frontend nel browser + backend FastAPI sul PC.
- Il server ascolta soltanto su `127.0.0.1`.
- Frontend completamente locale: nessun CDN, font remoto o script esterno.
- I file vengono copiati in una directory temporanea per la singola operazione e cancellati alla fine.
- PyMuPDF è il motore PDF principale.
- Dipendenze esterne avanzate rilevate automaticamente: LibreOffice, Tesseract, Ghostscript, Ollama.
- L'AI viene prevista soltanto in modalità locale tramite Ollama.

## Funzioni implementate
### Organizzazione
- Unione PDF
- Divisione per intervalli o singole pagine
- Estrazione pagine
- Rimozione pagine
- Riordino pagine
- Rotazione pagine
- Ritaglio margini
- Appiattimento annotazioni/moduli

### Ottimizzazione
- Compressione standard PyMuPDF
- Compressione forte/estrema tramite Ghostscript quando disponibile
- Riparazione/riscrittura PDF
- OCR locale Tesseract
- PDF/A tramite Ghostscript
- Rimozione metadati

### Conversioni
- Immagini → PDF
- PDF → PNG/JPG
- Word/Excel/PowerPoint → PDF con LibreOffice
- PDF → DOCX
- PDF → PPTX
- PDF → XLSX
- PDF → Markdown
- Estrazione contenuti (testo + immagini)

### Modifica
- Aggiunta testo a pagina
- Compilazione campi modulo
- Filigrana testuale
- Numeri di pagina
- Firma visiva tramite immagine PNG/JPG/WebP

### Sicurezza
- Protezione AES-256
- Sblocco con password nota
- Censura permanente di testo
- Confronto testuale + differenze visive

### AI locale
- Riassunto PDF tramite Ollama
- Traduzione PDF tramite Ollama

## Interfaccia
- Design moderno dark/light.
- Branding Giumag.
- Hero privacy-first.
- Ricerca strumenti.
- Filtri per categoria.
- Drag & drop file.
- Riordinamento drag & drop dei file nelle operazioni multiple.
- Modale unica con opzioni dinamiche per ogni strumento.
- Diagnostica delle dipendenze locali.
- Download automatico del risultato.

## Avvio
- `START_GIUMAG_PDF.bat` per Windows: crea `.venv`, installa le dipendenze alla prima esecuzione e apre l'app.
- `start_giumag_pdf.sh` per macOS/Linux.
- `launcher.py` sceglie una porta locale libera a partire da 8765 e apre automaticamente il browser.

## Test eseguiti
- Avvio FastAPI e risposta `/api/health` verificati.
- Rilevamento dipendenze verificato.
- Test reali completati con successo per: split, extract, remove, reorder, rotate, compress, repair, watermark, crop, protect, unlock, redact, images-to-pdf, pdf-to-images, office-to-pdf, pdf-to-word, pdf-to-pptx, pdf-to-excel, pdf-to-markdown, OCR, compare, sign-visual, remove-metadata, flatten, PDF/A, aggiunta testo, compilazione moduli ed estrazione contenuti.
- Verifica sintattica JavaScript eseguita con Node.

## Stato attuale
Versione iniziale funzionante **v0.1.0**, con **31 strumenti registrati**, pronta per consegna come sorgente e già organizzata per un futuro repository GitHub/build desktop.
