import {
  useEffect,
  useRef,
  useState,
} from 'react';

import type {
  PdfProtectionInfo,
  ProtectPdfPermissions,
} from '@giumag/pdf-engine';

import type {
  LoadedPdf,
} from '../lib/pdf';

import {
  formatBytes,
  loadPdfFile,
} from '../lib/pdf';

import {
  inspectPdfProtection,
  protectPdfInWorker,
  terminateProtectPdfWorker,
} from '../lib/protect-pdf-worker';

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

interface ProtectPdfWorkspaceProps {
  onClose: () => void;
}

interface ProtectResult {
  bytes: Uint8Array;
  info: PdfProtectionInfo;
}

const DEFAULT_PERMISSIONS:
  Required<ProtectPdfPermissions> = {
    print: true,
    modify: true,
    extract: true,
  };

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
  anchor.download =
    name;

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

function passwordLevel(
  password: string,
) {
  if (
    password.length < 8
  ) {
    return {
      text:
        'Minimo 8 caratteri',
      level: 0,
    };
  }

  const lower =
    password.toLowerCase();

  const hasLower =
    /[a-z]/.test(
      password,
    );

  const hasUpper =
    /[A-Z]/.test(
      password,
    );

  const hasDigit =
    /\d/.test(
      password,
    );

  const hasSymbol =
    /[^A-Za-z0-9]/.test(
      password,
    );

  const categoryCount =
    [
      hasLower,
      hasUpper,
      hasDigit,
      hasSymbol,
    ].filter(Boolean).length;

  const uniqueCount =
    new Set(
      password,
    ).size;

  const uniqueRatio =
    uniqueCount /
    password.length;

  const hasRepeatedCharacters =
    /(.)\1{2,}/.test(
      password,
    );

  const hasRepeatedBlock =
    /^(.{2,})\1+$/.test(
      password,
    );

  const weakPatterns = [
    'password',
    'qwerty',
    'asdf',
    'admin',
    'letmein',
    'welcome',
    '123456',
    '12345678',
    'abcdef',
    'abc123',
  ];

  const hasWeakPattern =
    weakPatterns.some(
      (pattern) =>
        lower.includes(
          pattern,
        ),
    );

  const hasSequence =
    /(?:0123|1234|2345|3456|4567|5678|6789|abcd|bcde|cdef|defg|qwerty|asdf)/i
      .test(
        password,
      );

  let score = 0;

  if (
    password.length >= 8
  ) {
    score += 1;
  }

  if (
    password.length >= 12
  ) {
    score += 1;
  }

  if (
    password.length >= 16
  ) {
    score += 1;
  }

  if (hasLower) {
    score += 1;
  }

  if (hasUpper) {
    score += 1;
  }

  if (hasDigit) {
    score += 1;
  }

  if (hasSymbol) {
    score += 1;
  }

  if (
    uniqueCount >= 8 &&
    uniqueRatio >= 0.6
  ) {
    score += 1;
  }

  if (
    categoryCount <= 1
  ) {
    score -= 2;
  }

  if (
    hasRepeatedCharacters
  ) {
    score -= 2;
  }

  if (
    hasRepeatedBlock
  ) {
    score -= 2;
  }

  if (
    hasSequence
  ) {
    score -= 2;
  }

  if (
    hasWeakPattern
  ) {
    score -= 3;
  }

  if (
    score <= 3
  ) {
    return {
      text: 'Debole',
      level: 1,
    };
  }

  if (
    score <= 6
  ) {
    return {
      text: 'Buona',
      level: 2,
    };
  }

  return {
    text: 'Molto buona',
    level: 3,
  };
}

export function ProtectPdfWorkspace({
  onClose,
}: ProtectPdfWorkspaceProps) {
  const [pdf, setPdf] =
    useState<LoadedPdf | null>(
      null,
    );

  const [password, setPassword] =
    useState('');

  const [
    confirmation,
    setConfirmation,
  ] = useState('');

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    permissions,
    setPermissions,
  ] =
    useState<
      Required<ProtectPdfPermissions>
    >(
      DEFAULT_PERMISSIONS,
    );

  const [result, setResult] =
    useState<ProtectResult | null>(
      null,
    );

  const [loading, setLoading] =
    useState(false);

  const [busy, setBusy] =
    useState(false);

  const [dragging, setDragging] =
    useState(false);

  const [error, setError] =
    useState<string | null>(
      null,
    );

  const inputRef =
    useRef<HTMLInputElement>(
      null,
    );

  const pdfRef =
    useRef<LoadedPdf | null>(
      null,
    );

  const mountedRef =
    useRef(true);

  useEffect(() => {
    mountedRef.current =
      true;

    return () => {
      mountedRef.current =
        false;

      terminateProtectPdfWorker();

      const current =
        pdfRef.current;

      if (current) {
        void current
          .document
          .loadingTask
          .destroy();
      }
    };
  }, []);

  function resetForm() {
    setPassword('');
    setConfirmation('');
    setShowPassword(false);

    setPermissions(
      DEFAULT_PERMISSIONS,
    );

    setResult(null);
    setError(null);
  }

  async function openFile(
    file: File,
  ) {
    if (!acceptsPdf(file)) {
      setError(
        'Seleziona un documento PDF.',
      );

      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const bytes =
        new Uint8Array(
          await file.arrayBuffer(),
        );

      const protection =
        await inspectPdfProtection(
          bytes,
        );

      if (
        protection.encrypted
      ) {
        throw new Error(
          'Questo PDF è già protetto da cifratura. Rimuovi prima la protezione.',
        );
      }

      const loaded =
        await loadPdfFile(
          file,
        );

      if (!mountedRef.current) {
        await loaded
          .document
          .loadingTask
          .destroy();

        return;
      }

      const previous =
        pdfRef.current;

      pdfRef.current =
        loaded;

      setPdf(loaded);
      resetForm();

      if (previous) {
        await previous
          .document
          .loadingTask
          .destroy();
      }
    }
    catch (caught) {
      if (!mountedRef.current) {
        return;
      }

      setError(
        caught instanceof Error
          ? caught.message
          : 'Impossibile aprire questo PDF.',
      );
    }
    finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }

  function updatePermission(
    key:
      keyof ProtectPdfPermissions,
    value: boolean,
  ) {
    setPermissions(
      (current) => ({
        ...current,
        [key]: value,
      }),
    );

    setResult(null);
    setError(null);
  }

  async function protectPdf() {
    const current =
      pdfRef.current;

    if (!current) {
      setError(
        'Apri un PDF prima di proteggerlo.',
      );

      return;
    }

    if (
      password.trim().length === 0 ||
      password.length < 8
    ) {
      setError(
        'La password deve contenere almeno 8 caratteri.',
      );

      return;
    }

    if (
      password !== confirmation
    ) {
      setError(
        'Le due password non coincidono.',
      );

      return;
    }

    setBusy(true);
    setError(null);
    setResult(null);

    try {
      const bytes =
        await protectPdfInWorker(
          current.bytes,
          {
            password,
            permissions,
          },
        );

      const info =
        await inspectPdfProtection(
          bytes,
          password,
        );

      if (
        !info.encrypted ||
        !info.requiresPassword ||
        info.bits !== 256 ||
        !info.method
          ?.toUpperCase()
          .includes('AES')
      ) {
        throw new Error(
          'La verifica finale della protezione non è riuscita.',
        );
      }

      if (!mountedRef.current) {
        return;
      }

      setResult({
        bytes,
        info,
      });
    }
    catch (caught) {
      if (!mountedRef.current) {
        return;
      }

      setError(
        caught instanceof Error
          ? caught.message
          : 'Impossibile proteggere il PDF.',
      );
    }
    finally {
      if (mountedRef.current) {
        setBusy(false);
      }
    }
  }

  function downloadResult() {
    if (!pdf || !result) {
      return;
    }

    downloadPdf(
      result.bytes,
      `${baseFileName(
        pdf.name,
      )}-protetto.pdf`,
    );
  }

  const pageCount =
    pdf?.document.numPages ??
    0;

  const passwordStatus =
    passwordLevel(
      password,
    );

  const matches =
    confirmation.length >
      0 &&
    password ===
      confirmation;

  const disabled =
    loading || busy;

  return (
    <main className="workspace-shell protect-shell">
            <WorkspaceHeader empty={!pdf}>
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

        {pdf ? (
          <div className="document-title">
            <strong>
              Proteggi PDF
            </strong>

            <span>
              <ShieldIcon />
              {pageCount}{' '}
              {pageCount === 1
                ? 'pagina'
                : 'pagine'}
              {' · locale'}
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
                event
                  .currentTarget
                  .files?.[0];

              if (file) {
                void openFile(file);
              }

              event.currentTarget.value =
                '';
            }}
          />

          {!pdf ? (
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
                  password.length < 8 ||
                  password !== confirmation
                }
                onClick={() =>
                  void protectPdf()
                }
              >
                <ToolIcon id="protect" />
                <span>
                  {busy
                    ? 'Cifratura...'
                    : 'Proteggi PDF'}
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
        onDragOver={(event) => {
          if (
            Array
              .from(
                event.dataTransfer.types,
              )
              .includes('Files')
          ) {
            event.preventDefault();

            event.dataTransfer.dropEffect =
              'copy';

            setDragging(true);
          }
        }}
        onDragLeave={(event) => {
          if (
            event.target ===
            event.currentTarget
          ) {
            setDragging(false);
          }
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);

          const file =
            Array
              .from(
                event.dataTransfer.files,
              )
              .find(
                acceptsPdf,
              );

          if (!file) {
            setError(
              'Trascina un documento PDF valido.',
            );

            return;
          }

          void openFile(file);
        }}
      >
        <div className="protect-content">
                    <WorkspaceIntro
            eyebrow="Proteggi PDF"
            title="Proteggi il tuo PDF"
            description="Crea una copia cifrata AES-256 che richiede la password scelta per essere aperta."
          />

          {!pdf ? (
            <section
              className={`protect-dropzone ${
                dragging
                  ? 'is-dragging'
                  : ''
              }`}
            >
              <div className="protect-empty-icon">
                <DocumentIcon />

                <span className="protect-empty-badge">
                  <ToolIcon id="protect" />
                </span>
              </div>

              <div className="protect-empty-copy">
                <strong>
                  Apri il PDF da proteggere
                </strong>

                <span>
                  Il file viene cifrato direttamente sul dispositivo.
                </span>
              </div>

              <button
                className="primary-button"
                type="button"
                disabled={loading}
                onClick={() =>
                  inputRef.current?.click()
                }
              >
                {loading
                  ? 'Controllo...'
                  : 'Scegli PDF'}
              </button>
            </section>
          ) : (
            <>
              <section className="protect-document-card">
                <div className="protect-document-icon">
                  <DocumentIcon />
                </div>

                <div className="protect-document-copy">
                  <strong>
                    {pdf.name}
                  </strong>

                  <span>
                    {pageCount}{' '}
                    {pageCount === 1
                      ? 'pagina'
                      : 'pagine'}
                    {' · '}
                    {formatBytes(
                      pdf.size,
                    )}
                  </span>

                  <small>
                    PDF pronto per la protezione.
                  </small>
                </div>

                <span className="ux-badge">
                  AES-256
                </span>
              </section>

              <section className="protect-password-card">
                <div className="protect-section-heading">
                  <div>
                    <p className="protect-kicker">
                      Password
                    </p>

                    <h2>
                      Scegli la chiave di apertura
                    </h2>
                  </div>

                  <span>
                    Consigliati almeno 12 caratteri.
                  </span>
                </div>

                <div className="protect-password-grid">
                  <label className="protect-field">
                    <span>
                      Password
                    </span>

                    <div className="protect-password-input">
                      <input
                        type={
                          showPassword
                            ? 'text'
                            : 'password'
                        }
                        value={password}
                        disabled={disabled}
                        autoComplete="new-password"
                        onChange={(event) => {
                          setPassword(
                            event.target.value,
                          );

                          setResult(null);
                          setError(null);
                        }}
                      />

                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() =>
                          setShowPassword(
                            (current) =>
                              !current,
                          )
                        }
                      >
                        {showPassword
                          ? 'Nascondi'
                          : 'Mostra'}
                      </button>
                    </div>

                    <div className="protect-password-status">
                      <span
                        data-strength={
                          passwordStatus.level
                        }
                      />

                      <small>
                        {passwordStatus.text}
                        {' · '}
                        lunghezza, varietà e prevedibilità
                      </small>
                    </div>
                  </label>

                  <label className="protect-field">
                    <span>
                      Conferma password
                    </span>

                    <input
                      type={
                        showPassword
                          ? 'text'
                          : 'password'
                      }
                      value={confirmation}
                      disabled={disabled}
                      autoComplete="new-password"
                      onChange={(event) => {
                        setConfirmation(
                          event.target.value,
                        );

                        setResult(null);
                        setError(null);
                      }}
                    />

                    {confirmation ? (
                      <small
                        className={
                          matches
                            ? 'is-valid'
                            : 'is-invalid'
                        }
                      >
                        {matches
                          ? 'Le password coincidono.'
                          : 'Le password non coincidono.'}
                      </small>
                    ) : (
                      <small>
                        Ripeti esattamente la password.
                      </small>
                    )}
                  </label>
                </div>

                <div className="protect-security-note">
                  <ShieldIcon />

                  <span>
                    La password non viene inviata né salvata.
                    Conservala: senza password il documento
                    potrebbe non essere recuperabile.
                  </span>
                </div>

                <details className="ux-advanced protect-advanced">
                  <summary>
                    <span>
                      <strong>
                        Impostazioni avanzate
                      </strong>

                      <small>
                        Permessi del documento
                      </small>
                    </span>

                    <span
                      className="ux-advanced-chevron"
                      aria-hidden="true"
                    />
                  </summary>

                  <div className="ux-advanced-body">
                    <div className="protect-permissions">
                      <label>
                        <input
                          type="checkbox"
                          checked={permissions.print}
                          disabled={disabled}
                          onChange={(event) =>
                            updatePermission(
                              'print',
                              event.target.checked,
                            )
                          }
                        />

                        <span>
                          <strong>
                            Consenti stampa
                          </strong>

                          <small>
                            Permette di stampare il documento.
                          </small>
                        </span>
                      </label>

                      <label>
                        <input
                          type="checkbox"
                          checked={permissions.modify}
                          disabled={disabled}
                          onChange={(event) =>
                            updatePermission(
                              'modify',
                              event.target.checked,
                            )
                          }
                        />

                        <span>
                          <strong>
                            Consenti modifiche
                          </strong>

                          <small>
                            Permette modifiche tramite visualizzatori compatibili.
                          </small>
                        </span>
                      </label>

                      <label>
                        <input
                          type="checkbox"
                          checked={permissions.extract}
                          disabled={disabled}
                          onChange={(event) =>
                            updatePermission(
                              'extract',
                              event.target.checked,
                            )
                          }
                        />

                        <span>
                          <strong>
                            Consenti copia
                          </strong>

                          <small>
                            Permette l'estrazione di testo e immagini.
                          </small>
                        </span>
                      </label>
                    </div>

                    <div className="protect-permission-note">
                      I permessi PDF dipendono dal visualizzatore:
                      alcuni software possono ignorarli. La password
                      AES-256 resta la protezione principale.
                    </div>
                  </div>
                </details>
              </section>

              <section className="protect-action-panel">
                <div>
                  <p className="protect-kicker">
                    Pronto
                  </p>

                  <h2>
                    Crea la copia protetta
                  </h2>

                  <p>
                    L'originale resta invariato e la nuova copia
                    richiederà la password per essere aperta.
                  </p>
                </div>

                <button
                  className="primary-button protect-main-action"
                  type="button"
                  disabled={
                    disabled ||
                    password.length < 8 ||
                    password !== confirmation
                  }
                  data-auto-advance-action="true"
                  onClick={() =>
                    void protectPdf()
                  }
                >
                  <ToolIcon id="protect" />

                  <span>
                    {busy
                      ? 'Cifratura...'
                      : 'Proteggi PDF'}
                  </span>
                </button>
              </section>

              {error ? (
                <div className="protect-message protect-error">
                  {error}
                </div>
              ) : null}

              {result ? (
                <section
                  className="protect-result"
                  data-auto-advance-target="true"
                >
                  <div>
                    <p className="protect-kicker">
                      Verificato
                    </p>

                    <h2>
                      PDF protetto
                    </h2>

                    <span>
                      AES-{result.info.bits}
                      {' · '}
                      Password richiesta
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

              <div className="protect-privacy">
                <ShieldIcon />

                <span>
                  Cifratura sul dispositivo. Nessun upload
                  del PDF o della password.
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}