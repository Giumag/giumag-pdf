export type Platform =
  | 'web'
  | 'windows'
  | 'macos'
  | 'linux'
  | 'ios'
  | 'android';

export type ToolStatus =
  | 'available'
  | 'planned';

export interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  platforms: Platform[];
  status: ToolStatus;
}

const allPlatforms: Platform[] = [
  'web',
  'windows',
  'macos',
  'linux',
  'ios',
  'android',
];

export const UNIVERSAL_TOOLS: ToolDefinition[] = [
  {
    id: 'merge',
    name: 'Unisci PDF',
    description:
      'Metti più PDF in un solo file, nell’ordine che scegli.',
    platforms: allPlatforms,
    status: 'available',
  },
  {
    id: 'split',
    name: 'Dividi PDF',
    description:
      'Separa un PDF in gruppi di pagine o in file singoli.',
    platforms: allPlatforms,
    status: 'available',
  },
  {
    id: 'organize',
    name: 'Organizza pagine',
    description:
      'Riordina, ruota, estrai o rimuovi pagine con anteprima.',
    platforms: allPlatforms,
    status: 'available',
  },
  {
    id: 'crop',
    name: 'Ritaglia PDF',
    description:
      'Tieni visibile solo la parte della pagina che ti serve.',
    platforms: allPlatforms,
    status: 'available',
  },
  {
    id: 'compress',
    name: 'Comprimi PDF',
    description:
      'Riduci il peso scegliendo il giusto equilibrio con la qualità.',
    platforms: allPlatforms,
    status: 'available',
  },
  {
    id: 'images-to-pdf',
    name: 'Immagini in PDF',
    description:
      'Trasforma JPG, PNG e WebP in un unico documento PDF.',
    platforms: allPlatforms,
    status: 'available',
  },
  {
    id: 'pdf-to-images',
    name: 'PDF in immagini',
    description:
      'Salva le pagine del PDF come immagini PNG o JPEG.',
    platforms: allPlatforms,
    status: 'available',
  },

  {
    id: 'watermark',
    name: 'Filigrana',
    description:
      'Aggiungi una filigrana testuale alle pagine del PDF.',
    platforms: allPlatforms,
    status: 'available',
  },
  {
    id: 'page-numbers',
    name: 'Numeri di pagina',
    description:
      'Aggiungi una numerazione chiara alle pagine del PDF.',
    platforms: allPlatforms,
    status: 'available',
  },
  {
    id: 'forms',
    name: 'Moduli PDF',
    description:
      'Compila i campi di un PDF e crea la copia finale.',
    platforms: allPlatforms,
    status: 'planned',
  },
  {
    id: 'protect',
    name: 'Proteggi PDF',
    description:
      'Proteggi un PDF con password e autorizzazioni.',
    platforms: allPlatforms,
    status: 'planned',
  },
  {
    id: 'unlock',
    name: 'Sblocca PDF',
    description:
      'Rimuovi una protezione quando conosci la password.',
    platforms: allPlatforms,
    status: 'planned',
  },
  {
    id: 'ocr',
    name: 'OCR PDF',
    description:
      'Rendi ricercabile il testo presente nelle scansioni.',
    platforms: allPlatforms,
    status: 'planned',
  },
  {
    id: 'redact',
    name: 'Oscura PDF',
    description:
      'Rimuovi definitivamente informazioni sensibili dal documento.',
    platforms: allPlatforms,
    status: 'planned',
  },
  {
    id: 'metadata',
    name: 'Rimuovi metadati',
    description:
      'Rimuovi proprietà, XMP e identificatori nascosti dal PDF.',
    platforms: allPlatforms,
    status: 'available',
  },
  {
    id: 'compare',
    name: 'Confronta PDF',
    description:
      'Individua le differenze tra due documenti PDF.',
    platforms: allPlatforms,
    status: 'planned',
  },
  {
    id: 'sign-visual',
    name: 'Firma visiva',
    description:
      'Inserisci una firma disegnata o importata nel documento.',
    platforms: allPlatforms,
    status: 'planned',
  },
];