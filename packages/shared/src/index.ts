export type Platform = 'web' | 'windows' | 'macos' | 'linux' | 'ios' | 'android';

export interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  platforms: Platform[];
}

const allPlatforms: Platform[] = ['web', 'windows', 'macos', 'linux', 'ios', 'android'];

export const UNIVERSAL_TOOLS: ToolDefinition[] = [
  { id: 'merge', name: 'Merge PDF', description: 'Combine multiple documents in a chosen order.', platforms: allPlatforms },
  { id: 'split', name: 'Split PDF', description: 'Create separate PDFs by range or selected pages.', platforms: allPlatforms },
  { id: 'organize', name: 'Organize pages', description: 'Reorder, extract, remove and rotate pages visually.', platforms: allPlatforms },
  { id: 'crop', name: 'Crop PDF', description: 'Adjust page boxes with a visual crop workspace.', platforms: allPlatforms },
  { id: 'compress', name: 'Compress PDF', description: 'Optimize structure and optionally recompress images locally.', platforms: allPlatforms },
  { id: 'images-to-pdf', name: 'Images to PDF', description: 'Create a PDF from images without an upload step.', platforms: allPlatforms },
  { id: 'pdf-to-images', name: 'PDF to images', description: 'Render selected pages to PNG or JPEG.', platforms: allPlatforms },
  { id: 'watermark', name: 'Watermark', description: 'Apply text or image marks to selected pages.', platforms: allPlatforms },
  { id: 'page-numbers', name: 'Page numbers', description: 'Add configurable headers, footers and page numbering.', platforms: allPlatforms },
  { id: 'forms', name: 'PDF forms', description: 'Fill supported form fields and flatten final output.', platforms: allPlatforms },
  { id: 'protect', name: 'Protect PDF', description: 'Encrypt a PDF and apply document permissions.', platforms: allPlatforms },
  { id: 'unlock', name: 'Unlock PDF', description: 'Decrypt a document when the correct password is known.', platforms: allPlatforms },
  { id: 'ocr', name: 'OCR PDF', description: 'Recognize text locally using downloadable language assets.', platforms: allPlatforms },
  { id: 'redact', name: 'Redact PDF', description: 'Permanently remove selected sensitive content.', platforms: allPlatforms },
  { id: 'metadata', name: 'Remove metadata', description: 'Inspect and remove document metadata.', platforms: allPlatforms },
  { id: 'compare', name: 'Compare PDFs', description: 'Compare text and rendered pages on-device.', platforms: allPlatforms },
  { id: 'sign-visual', name: 'Visual signature', description: 'Place a drawn or imported signature mark.', platforms: allPlatforms }
];
