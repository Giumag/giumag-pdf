import { ComparePdfWorkspace } from './components/ComparePdfWorkspace';
import { CompressPdfWorkspace } from './components/CompressPdfWorkspace';
import { CropPdfWorkspace } from './components/CropPdfWorkspace';
import { FormsPdfWorkspace } from './components/FormsPdfWorkspace';
import { ImagesToPdfWorkspace } from './components/ImagesToPdfWorkspace';
import { MergePdfWorkspace } from './components/MergePdfWorkspace';
import { MetadataWorkspace } from './components/MetadataWorkspace';
import { OcrPdfWorkspace } from './components/OcrPdfWorkspace';
import { PageNumbersWorkspace } from './components/PageNumbersWorkspace';
import { PdfToImagesWorkspace } from './components/PdfToImagesWorkspace';
import { ProtectPdfWorkspace } from './components/ProtectPdfWorkspace';
import { RedactPdfWorkspace } from './components/RedactPdfWorkspace';
import { RepairPdfWorkspace } from './components/RepairPdfWorkspace';
import { SplitPdfWorkspace } from './components/SplitPdfWorkspace';
import { UnlockPdfWorkspace } from './components/UnlockPdfWorkspace';
import { VisualSignatureWorkspace } from './components/VisualSignatureWorkspace';
import { WatermarkWorkspace } from './components/WatermarkWorkspace';

type WorkspaceCloseHandler = () => void;

const TOOL_WORKSPACE_RENDERERS = {
  merge: (onClose: WorkspaceCloseHandler) => (
    <MergePdfWorkspace onClose={onClose} />
  ),
  split: (onClose: WorkspaceCloseHandler) => (
    <SplitPdfWorkspace onClose={onClose} />
  ),
  crop: (onClose: WorkspaceCloseHandler) => (
    <CropPdfWorkspace onClose={onClose} />
  ),
  compress: (onClose: WorkspaceCloseHandler) => (
    <CompressPdfWorkspace onClose={onClose} />
  ),
  'images-to-pdf': (onClose: WorkspaceCloseHandler) => (
    <ImagesToPdfWorkspace onClose={onClose} />
  ),
  protect: (onClose: WorkspaceCloseHandler) => (
    <ProtectPdfWorkspace onClose={onClose} />
  ),
  unlock: (onClose: WorkspaceCloseHandler) => (
    <UnlockPdfWorkspace onClose={onClose} />
  ),
  ocr: (onClose: WorkspaceCloseHandler) => (
    <OcrPdfWorkspace onClose={onClose} />
  ),
  forms: (onClose: WorkspaceCloseHandler) => (
    <FormsPdfWorkspace onClose={onClose} />
  ),
  redact: (onClose: WorkspaceCloseHandler) => (
    <RedactPdfWorkspace onClose={onClose} />
  ),
  'sign-visual': (onClose: WorkspaceCloseHandler) => (
    <VisualSignatureWorkspace onClose={onClose} />
  ),
  repair: (onClose: WorkspaceCloseHandler) => (
    <RepairPdfWorkspace onClose={onClose} />
  ),
  compare: (onClose: WorkspaceCloseHandler) => (
    <ComparePdfWorkspace onClose={onClose} />
  ),
  metadata: (onClose: WorkspaceCloseHandler) => (
    <MetadataWorkspace onClose={onClose} />
  ),
  watermark: (onClose: WorkspaceCloseHandler) => (
    <WatermarkWorkspace onClose={onClose} />
  ),
  'page-numbers': (onClose: WorkspaceCloseHandler) => (
    <PageNumbersWorkspace onClose={onClose} />
  ),
  'pdf-to-images': (onClose: WorkspaceCloseHandler) => (
    <PdfToImagesWorkspace onClose={onClose} />
  ),
} as const;

export type WorkspaceToolId =
  keyof typeof TOOL_WORKSPACE_RENDERERS;

export function isWorkspaceToolId(
  toolId: string,
): toolId is WorkspaceToolId {
  return Object.prototype.hasOwnProperty.call(
    TOOL_WORKSPACE_RENDERERS,
    toolId,
  );
}

interface ToolWorkspaceProps {
  toolId: WorkspaceToolId;
  onClose: WorkspaceCloseHandler;
}

export function ToolWorkspace({
  toolId,
  onClose,
}: ToolWorkspaceProps) {
  return TOOL_WORKSPACE_RENDERERS[toolId](onClose);
}