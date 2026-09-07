# Giumag PDF — Feature Matrix

Legend: **V1** = committed for first stable product; **V1-D** = desktop enhancement; **Later** = planned after core quality target; **Research** = do not advertise yet.

| Tool | Web/PWA | Desktop | iOS/Android | Notes |
|---|---:|---:|---:|---|
| Merge PDFs | V1 | V1 | V1 | Universal |
| Split PDF | V1 | V1 | V1 | Universal |
| Reorder pages | V1 | V1 | V1 | Thumbnail workspace |
| Extract pages | V1 | V1 | V1 | Universal |
| Remove pages | V1 | V1 | V1 | Universal |
| Rotate pages | V1 | V1 | V1 | Universal |
| Crop pages | V1 | V1 | V1 | Visual crop editor |
| Images → PDF | V1 | V1 | V1 | HEIC support may need native adapter |
| PDF → images | V1 | V1 | V1 | PDF.js rendering |
| Watermark/stamp | V1 | V1 | V1 | Text/image/PDF overlay |
| Page numbers | V1 | V1 | V1 | Header/footer engine |
| Fill forms | V1 | V1 | V1 | AcroForm subset first |
| Flatten forms | V1 | V1 | V1 | Corpus-tested |
| Metadata inspect/remove | V1 | V1 | V1 | Universal |
| Encrypt/password protect | V1 | V1 | V1 | AES support depends on structural engine |
| Decrypt with known password | V1 | V1 | V1 | Never password-cracking |
| Lossless optimization | V1 | V1 | V1 | Structural cleanup |
| Balanced compression | V1 | V1 | V1 | Device-memory-aware |
| OCR | V1 | V1 | V1 | Tesseract worker; language modules |
| Permanent redaction | V1 | V1 | V1 | Must remove underlying content, not draw black boxes |
| Compare PDFs | V1 | V1 | V1 | Text + visual mode |
| Visual signature | V1 | V1 | V1 | Drawn/imported mark only |
| Cryptographic PDF signature | Later | Later | Later | Certificates, validation and UX require dedicated work |
| Office → PDF | — | V1-D | — | Local installed LibreOffice initially |
| PDF/A conversion | Research | Research | Research | Do not claim archival conformance without validator tests |
| Repair damaged PDF | Limited | V1-D | Limited | Structural recovery engine-dependent |
| PDF → DOCX editable | Research | Research | Research | High-fidelity conversion is a separate product-quality problem |
| PDF → XLSX | Research | Research | Research | Table extraction quality gate required |
| PDF → PPTX | Research | Research | Research | Decide visual vs editable contract |
| Local AI summary/translate | Later | Later | Later | Must remain optional and local; not part of core v1 |
| Camera document scan | — | — | Later | Native mobile flow |
| Batch folders | — | Later | — | Desktop only |

## Release principle

The stable product should have fewer tools with trustworthy output rather than advertise 30+ tools with inconsistent behavior. The prototype remains useful to benchmark missing functions, but production status is earned by automated corpus tests per tool.
