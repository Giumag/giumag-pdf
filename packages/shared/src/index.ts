export type Platform = 'web' | 'windows' | 'macos' | 'linux' | 'ios' | 'android';

export interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  platforms: Platform[];
}

const allPlatforms: Platform[] = ['web', 'windows', 'macos', 'linux', 'ios', 'android'];

export const UNIVERSAL_TOOLS: ToolDefinition[] = [
  { id: 'merge', name: 'Unisci PDF', description: 'Combina più documenti nell’ordine che preferisci.', platforms: allPlatforms },
  { id: 'split', name: 'Dividi PDF', description: 'Crea PDF separati per intervallo oppure una pagina per file.', platforms: allPlatforms },
  { id: 'organize', name: 'Organizza pagine', description: 'Riordina, estrai, rimuovi e ruota le pagine visivamente.', platforms: allPlatforms },
  { id: 'crop', name: 'Ritaglia PDF', description: 'Regola l’area visibile delle pagine con un editor grafico.', platforms: allPlatforms },
  { id: 'compress', name: 'Comprimi PDF', description: 'Ottimizza il documento e riduci localmente il peso delle immagini.', platforms: allPlatforms },
  { id: 'images-to-pdf', name: 'Immagini in PDF', description: 'Crea un PDF da immagini senza caricare file online.', platforms: allPlatforms },
  { id: 'pdf-to-images', name: 'PDF in immagini', description: 'Esporta le pagine selezionate in PNG o JPEG.', platforms: allPlatforms },
  { id: 'watermark', name: 'Filigrana', description: 'Applica testo o immagini come filigrana alle pagine selezionate.', platforms: allPlatforms },
  { id: 'page-numbers', name: 'Numeri di pagina', description: 'Aggiungi intestazioni, piè di pagina e numerazione personalizzata.', platforms: allPlatforms },
  { id: 'forms', name: 'Moduli PDF', description: 'Compila i campi supportati e crea una copia finale non modificabile.', platforms: allPlatforms },
  { id: 'protect', name: 'Proteggi PDF', description: 'Cifra un PDF e configura le autorizzazioni del documento.', platforms: allPlatforms },
  { id: 'unlock', name: 'Sblocca PDF', description: 'Rimuovi la protezione quando conosci la password corretta.', platforms: allPlatforms },
  { id: 'ocr', name: 'OCR PDF', description: 'Riconosci il testo localmente usando pacchetti lingua scaricabili.', platforms: allPlatforms },
  { id: 'redact', name: 'Oscura PDF', description: 'Rimuovi definitivamente dal documento i contenuti sensibili selezionati.', platforms: allPlatforms },
  { id: 'metadata', name: 'Rimuovi metadati', description: 'Ispeziona e rimuovi i metadati del documento.', platforms: allPlatforms },
  { id: 'compare', name: 'Confronta PDF', description: 'Confronta testo e pagine renderizzate direttamente sul dispositivo.', platforms: allPlatforms },
  { id: 'sign-visual', name: 'Firma visiva', description: 'Inserisci una firma disegnata o importata nel documento.', platforms: allPlatforms }
];