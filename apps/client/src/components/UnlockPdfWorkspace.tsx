import {
  useEffect,
  useRef,
  useState,
} from 'react';

import type {
  PdfProtectionInfo,
} from '@giumag/pdf-engine';

import {
  formatBytes,
} from '../lib/pdf';

import {
  inspectUnlockPdfProtection,
  terminateUnlockPdfWorker,
  unlockPdfInWorker,
} from '../lib/unlock-pdf-worker';

import {
  DocumentIcon,
  DownloadIcon,
  ReplaceIcon,
  ShieldIcon,
  ToolIcon,
} from './Icons';

import {
  WorkspaceHeader,
  WorkspaceIntro,
} from './ui/WorkspaceChrome';

interface UnlockPdfWorkspaceProps {
  onClose: () => void;
}

interface UnlockSource {
  file: File;
  bytes: Uint8Array;
  info: PdfProtectionInfo;
}

interface UnlockResult {
  bytes: Uint8Array;
}

function acceptsPdf(
  file: File,
) {
  return (
    file.type ===
      'application/pdf' ||
    file.name
      .toLowerCase()
      .endsWith('.pdf')
  );
}

function baseFileName(
  name: string,
) {
  const base =
    name
      .replace(/\.pdf$/i, '')
      .trim();

  return base ||
    'documento';
}

function downloadPdf(
  bytes: Uint8Array,
  name: string,
) {
  const copy =
    new Uint8Array(
      bytes.byteLength,
    );

  copy.set(bytes);

  const blob =
    new Blob(
      [
        copy.buffer,
      ],
      {
        type:
          'application/pdf',
      },
    );

  const url =
    URL.createObjectURL(
      blob,
    );

  const anchor =
    document.createElement(
      'a',
    );

  anchor.href = url;
  anchor.download = name;

  document.body
    .appendChild(anchor);

  anchor.click();
  anchor.remove();

  window.setTimeout(
    () =>
      URL.revokeObjectURL(
        url,
      ),
    1500,
  );
}

export function UnlockPdfWorkspace({
  onClose,
}: UnlockPdfWorkspaceProps) {
  const [
    source,
    setSource,
  ] =
    useState<
      UnlockSource | null
    >(null);

  const [
    password,
    setPassword,
  ] =
    useState('');

  const [
    showPassword,
    setShowPassword,
  ] =
    useState(false);

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const [
    busy,
    setBusy,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(null);

  const [
    result,
    setResult,
  ] =
    useState<
      UnlockResult | null
    >(null);

  const [
    dragging,
    setDragging,
  ] =
    useState(false);

  const inputRef =
    useRef<HTMLInputElement>(
      null,
    );

  const mountedRef =
    useRef(true);

  useEffect(
    () => {
      mountedRef.current =
        true;

      return () => {
        mountedRef.current =
          false;

        terminateUnlockPdfWorker();
      };
    },
    [],
  );

  async function openFile(
    file: File,
  ) {
    if (!acceptsPdf(file)) {
      setError(
        'Seleziona un file PDF valido.',
      );
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setPassword('');
    setShowPassword(false);

    try {
      const bytes =
        new Uint8Array(
          await file.arrayBuffer(),
        );

      const info =
        await inspectUnlockPdfProtection(
          bytes,
        );

      if (!mountedRef.current) {
        return;
      }

      setSource({
        file,
        bytes,
        info,
      });
    }
    catch (caught) {
      if (!mountedRef.current) {
        return;
      }

      setSource(null);

      setError(
        caught instanceof Error
          ? caught.message
          : 'Impossibile controllare il PDF.',
      );
    }
    finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }

  async function handleUnlock() {
    const current =
      source;

    if (
      !current ||
      !current.info.encrypted
    ) {
      return;
    }

    if (
      current.info.requiresPassword &&
      password.length === 0
    ) {
      setError(
        'Inserisci la password del PDF.',
      );
      return;
    }

    setBusy(true);
    setError(null);
    setResult(null);

    try {
      const bytes =
        await unlockPdfInWorker(
          current.bytes,
          password,
        );

      const verification =
        await inspectUnlockPdfProtection(
          bytes,
        );

      if (verification.encrypted) {
        throw new Error(
          'La verifica finale del PDF sbloccato non è riuscita.',
        );
      }

      if (!mountedRef.current) {
        return;
      }

      setResult({
        bytes,
      });

      setPassword('');
      setShowPassword(false);
    }
    catch (caught) {
      if (!mountedRef.current) {
        return;
      }

      setError(
        caught instanceof Error
          ? caught.message
          : 'Impossibile sbloccare il PDF.',
      );
    }
    finally {
      if (mountedRef.current) {
        setBusy(false);
      }
    }
  }

  function downloadResult() {
    if (
      !source ||
      !result
    ) {
      return;
    }

    downloadPdf(
      result.bytes,
      `${baseFileName(
        source.file.name,
      )}-sbloccato.pdf`,
    );
  }

  const disabled =
    loading || busy;

  const needsPassword =
    source?.info
      .requiresPassword ??
    false;

  const canUnlock =
    Boolean(
      source?.info.encrypted,
    ) &&
    (
      !needsPassword ||
      password.length > 0
    );

  return (
    <main className="workspace-shell protect-shell unlock-shell">
            <WorkspaceHeader empty={!source}>
        <button
          className="brand-button"
          type="button"
          onClick={onClose}
          aria-label="Torna alla home di Giumag PDF"
        >
          <span className="brand-mark">
            G
          </span>

          <span>
            Giumag PDF
          </span>
        </button>

        {source ? (
          <div className="document-title">
            <strong>
              Sblocca PDF
            </strong>

            <span>
              <ShieldIcon />
              {formatBytes(source.file.size)} · locale
            </span>
          </div>
        ) : null}

        <div className="topbar-actions">
          <input
            ref={inputRef}
            className="visually-hidden"
            type="file"
            accept="application/pdf,.pdf"
            onChange={(event) => {
              const file =
                event.currentTarget
                  .files?.[0];

              if (file) {
                void openFile(file);
              }

              event.currentTarget.value =
                '';
            }}
          />

          {!source ? (
            <button
              className="secondary-button coherence-close-button"
              type="button"
              onClick={onClose}
            >
              Chiudi
            </button>
          ) : (
            <>
              <button
                className="secondary-button compact-button"
                type="button"
                disabled={disabled}
                onClick={() =>
                  inputRef.current?.click()
                }
              >
                <ReplaceIcon />
                <span>Sostituisci PDF</span>
              </button>

              <button
                className="primary-button compact-button"
                type="button"
                disabled={
                  disabled ||
                  !canUnlock
                }
                onClick={() =>
                  void handleUnlock()
                }
              >
                <ToolIcon id="unlock" />
                <span>
                  {busy
                    ? 'Sblocco in corso…'
                    : 'Sblocca PDF'}
                </span>
              </button>
            </>
          )}
        </div>
      </WorkspaceHeader>

      <div
        className={`protect-workspace ${
          dragging
            ? 'is-dragging'
            : ''
        }`}
        onDragEnter={(event) => {
          event.preventDefault();

          if (!disabled) {
            setDragging(true);
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
        }}
        onDragLeave={(event) => {
          if (
            event.currentTarget ===
            event.target
          ) {
            setDragging(false);
          }
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);

          if (disabled) {
            return;
          }

          const file =
            event.dataTransfer
              .files?.[0];

          if (file) {
            void openFile(file);
          }
        }}
      >
        <div className="protect-content">
                    <WorkspaceIntro
            eyebrow="Sblocca PDF"
            title="Sblocca il tuo PDF"
            description="Rimuovi la protezione quando conosci la password. Tutto avviene direttamente sul dispositivo."
          />

          {!source ? (
            <button
              className={`protect-dropzone unlock-dropzone ${
                dragging
                  ? 'is-dragging'
                  : ''
              }`}
              type="button"
              disabled={disabled}
              onClick={() =>
                inputRef.current
                  ?.click()
              }
            >
              <span className="protect-empty-icon unlock-empty-icon">
                <ToolIcon id="unlock" />
              </span>

              <span className="protect-empty-copy">
                <strong>
                  {loading
                    ? 'Controllo del PDF…'
                    : 'Scegli un PDF protetto'}
                </strong>

                <span>
                  Trascinalo qui oppure selezionalo dal dispositivo.
                </span>
              </span>

              <span className="unlock-dropzone-action">
                Scegli PDF
              </span>
            </button>
          ) : (
            <>
              <section className="protect-document-card unlock-document-card">
                <span className="protect-empty-icon unlock-document-icon">
                  <DocumentIcon />
                </span>

                <div className="protect-empty-copy">
                  <strong>
                    {source.file.name}
                  </strong>

                  <span>
                    {formatBytes(
                      source.file.size,
                    )}
                    {' · '}
                    {source.info.encrypted
                      ? source.info.requiresPassword
                        ? 'Password richiesta'
                        : 'PDF cifrato'
                      : 'PDF non protetto'}
                  </span>
                </div>
              </section>

              {!source.info.encrypted ? (
                <section className="protect-action-panel unlock-action-panel">
                  <div>
                    <p className="protect-kicker">
                      Nessuna protezione
                    </p>

                    <h2>
                      Questo PDF è già sbloccato
                    </h2>

                    <span>
                      Non c'è alcuna cifratura da rimuovere.
                    </span>
                  </div>
                </section>
              ) : (
                <>
                  {needsPassword ? (
                    <section className="protect-password-card unlock-password-card">
                      <div>
                        <p className="protect-kicker">
                          Password
                        </p>

                        <h2>
                          Inserisci la password del PDF
                        </h2>
                      </div>

                      <label className="unlock-password-field">
                        <span>
                          Password
                        </span>

                        <div className="protect-password-control unlock-password-control">
                          <input
                            type={
                              showPassword
                                ? 'text'
                                : 'password'
                            }
                            value={password}
                            disabled={disabled}
                            autoComplete="current-password"
                            spellCheck={false}
                            placeholder="Password del PDF"
                            onChange={(event) => {
                              setPassword(
                                event.target.value,
                              );
                              setError(null);
                              setResult(null);
                            }}
                            onKeyDown={(event) => {
                              if (
                                event.key ===
                                  'Enter' &&
                                canUnlock &&
                                !disabled
                              ) {
                                void handleUnlock();
                              }
                            }}
                          />

                          <button
                              className="unlock-password-toggle"
                              type="button"
                              disabled={disabled}
                              aria-label={
                                showPassword
                                  ? 'Nascondi password'
                                  : 'Mostra password'
                              }
                              title={
                                showPassword
                                  ? 'Nascondi password'
                                  : 'Mostra password'
                              }
                              onClick={() =>
                                setShowPassword(
                                  (current) =>
                                    !current,
                                )
                              }
                            >
                              {showPassword ? (
                                <svg
                                  viewBox="0 0 24 24"
                                  aria-hidden="true"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="1.8"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M3 3l18 18" />
                                  <path d="M10.6 10.7a2 2 0 002.7 2.7" />
                                  <path d="M9.9 4.3A10.8 10.8 0 0112 4c5.5 0 9 5 9 5a16.8 16.8 0 01-2.1 2.6" />
                                  <path d="M6.5 6.5C4.3 7.8 3 9.5 3 9.5s3.5 5 9 5a10 10 0 004-.8" />
                                </svg>
                              ) : (
                                <svg
                                  viewBox="0 0 24 24"
                                  aria-hidden="true"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="1.8"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M3 12s3.5-5 9-5 9 5 9 5-3.5 5-9 5-9-5-9-5z" />
                                  <circle cx="12" cy="12" r="2.5" />
                                </svg>
                              )}
                            </button>
                        </div>
                      </label>
                    </section>
                  ) : null}

                  <section className="protect-action-panel unlock-action-panel">
                    <div>
                      <p className="protect-kicker">
                        Sblocco
                      </p>

                      <h2>
                        Crea una copia senza cifratura
                      </h2>

                      <span>
                        Il documento originale non viene modificato.
                      </span>
                    </div>

                    <button
                      className="primary-button"
                      type="button"
                      disabled={
                        disabled ||
                        !canUnlock
                      }
                      data-auto-advance-action="true"
                      onClick={() =>
                        void handleUnlock()
                      }
                    >
                      <ToolIcon id="unlock" />

                      <span>
                        {busy
                          ? 'Sblocco in corso…'
                          : 'Sblocca PDF'}
                      </span>
                    </button>
                  </section>
                </>
              )}

              {error ? (
                <div
                  className="protect-error"
                  role="alert"
                >
                  {error}
                </div>
              ) : null}

              {result ? (
                <section
                  className="protect-result-card unlock-result-card"
                  data-auto-advance-target="true"
                >
                  <div>
                    <p className="protect-kicker">
                      Verificato
                    </p>

                    <h2>
                      PDF sbloccato
                    </h2>

                    <span>
                      Cifratura rimossa
                      {' · '}
                      {formatBytes(
                        result.bytes.byteLength,
                      )}
                    </span>
                  </div>

                  <button
                    className="primary-button"
                    type="button"
                    onClick={downloadResult}
                  >
                    <DownloadIcon />

                    <span>
                      Scarica PDF
                    </span>
                  </button>
                </section>
              ) : null}
            </>
          )}

          <div className="protect-privacy unlock-privacy">
            <ShieldIcon />

            <span>
              Elaborazione sul dispositivo. Il PDF e la password
              non vengono caricati né salvati.
            </span>
          </div>
        </div>
      </div>
    </main>
  );
}
