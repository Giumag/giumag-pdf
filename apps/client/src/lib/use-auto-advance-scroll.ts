import {
  useEffect,
} from 'react';

/*
 * Per i nuovi strumenti:
 *
 * data-auto-advance-action="true"
 * sul pulsante che avvia l'operazione.
 *
 * data-auto-advance-target="true"
 * sul blocco che deve essere raggiunto.
 */

const TARGET_SELECTOR =
  [
    '[data-auto-advance-target="true"]',

    // Workspace esistenti.
    '.merge-success',
    '.split-output-section',
    '.split-success',
    '.compress-result-section',
    '.compress-success',
    '.images-pdf-result',
    '.pdf-images-result',
  ].join(',');

const ACTION_PATTERN =
  /\b(unisci|dividi|comprimi|crea pdf|esporta|genera|converti|applica)\b/i;

const ACTION_TIMEOUT_MS =
  10 * 60 * 1000;

function getButtonLabel(
  button: HTMLButtonElement,
): string {
  return [
    button.getAttribute(
      'aria-label',
    ),
    button.textContent,
  ]
    .filter(Boolean)
    .join(' ')
    .replace(
      /\s+/g,
      ' ',
    )
    .trim();
}

function findTargets(
  node: Node,
  root: HTMLElement,
): HTMLElement[] {
  const element =
    node instanceof Element
      ? node
      : node.parentElement;

  if (!element) {
    return [];
  }

  const targets =
    new Set<HTMLElement>();

  if (
    element.matches(
      TARGET_SELECTOR,
    )
  ) {
    targets.add(
      element as HTMLElement,
    );
  }

  const closest =
    element.closest(
      TARGET_SELECTOR,
    );

  if (
    closest instanceof HTMLElement &&
    root.contains(closest)
  ) {
    targets.add(
      closest,
    );
  }

  element
    .querySelectorAll<HTMLElement>(
      TARGET_SELECTOR,
    )
    .forEach(
      (target) => {
        targets.add(
          target,
        );
      },
    );

  return [
    ...targets,
  ];
}

export function useAutoAdvanceScroll() {
  useEffect(() => {
    const root =
      document.getElementById(
        'root',
      );

    if (!root) {
      return;
    }

    const reducedMotion =
      window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches;

    let armedUntil = 0;

    let generation = 0;

    let scheduledFrame:
      number | null = null;

    const handled =
      new WeakMap<
        HTMLElement,
        number
      >();

    function arm(
      event: Event,
    ) {
      const source =
        event.target;

      if (
        !(source instanceof Element)
      ) {
        return;
      }

      const button =
        source.closest(
          'button',
        );

      if (
        !(
          button instanceof
          HTMLButtonElement
        )
      ) {
        return;
      }

      /*
       * Mai dalla home:
       * solo azioni interne agli strumenti.
       */
      if (
        !button.closest(
          '.workspace-shell',
        )
      ) {
        return;
      }

      const explicit =
        button.dataset
          .autoAdvanceAction ===
        'true';

      const recognized =
        ACTION_PATTERN.test(
          getButtonLabel(
            button,
          ),
        );

      if (
        !explicit &&
        !recognized
      ) {
        return;
      }

      generation += 1;

      armedUntil =
        performance.now() +
        ACTION_TIMEOUT_MS;
    }

    function goToTarget(
      target: HTMLElement,
    ) {
      if (
        performance.now() >
        armedUntil
      ) {
        return;
      }

      if (
        handled.get(
          target,
        ) === generation
      ) {
        return;
      }

      handled.set(
        target,
        generation,
      );

      /*
       * Una sola destinazione per
       * ogni azione dell'utente.
       */
      armedUntil = 0;

      if (
        scheduledFrame !== null
      ) {
        cancelAnimationFrame(
          scheduledFrame,
        );
      }

      scheduledFrame =
        requestAnimationFrame(
          () => {
            scheduledFrame =
              requestAnimationFrame(
                () => {
                  scheduledFrame =
                    null;

                  if (
                    !target.isConnected
                  ) {
                    return;
                  }

                  const rect =
                    target
                      .getBoundingClientRect();

                  const fullyVisible =
                    rect.top >= 0 &&
                    rect.bottom <=
                      window.innerHeight;

                  if (
                    fullyVisible
                  ) {
                    return;
                  }

                  target.scrollIntoView({
                    behavior:
                      reducedMotion
                        ? 'auto'
                        : 'smooth',

                    /*
                     * Mostriamo l'inizio del
                     * blocco risultato, quindi
                     * titolo e CTA di download.
                     */
                    block:
                      'start',

                    inline:
                      'nearest',
                  });
                },
              );
          },
        );
    }

    const observer =
      new MutationObserver(
        (mutations) => {
          if (
            performance.now() >
            armedUntil
          ) {
            return;
          }

          for (
            const mutation
            of mutations
          ) {
            if (
              mutation.type ===
              'childList'
            ) {
              for (
                const node
                of mutation.addedNodes
              ) {
                const targets =
                  findTargets(
                    node,
                    root,
                  );

                if (
                  targets.length > 0
                ) {
                  goToTarget(
                    targets[0],
                  );

                  if (
                    armedUntil === 0
                  ) {
                    return;
                  }
                }
              }

              continue;
            }

            const targets =
              findTargets(
                mutation.target,
                root,
              );

            if (
              targets.length > 0
            ) {
              goToTarget(
                targets[0],
              );

              if (
                armedUntil === 0
              ) {
                return;
              }
            }
          }
        },
      );

    root.addEventListener(
      'click',
      arm,
      true,
    );

    observer.observe(
      root,
      {
        childList: true,
        subtree: true,

        /*
         * disabled è importante per
         * sezioni output già presenti
         * che diventano scaricabili.
         */
        attributes: true,

        attributeFilter: [
          'class',
          'disabled',
          'data-auto-advance-target',
        ],
      },
    );

    return () => {
      root.removeEventListener(
        'click',
        arm,
        true,
      );

      observer.disconnect();

      if (
        scheduledFrame !== null
      ) {
        cancelAnimationFrame(
          scheduledFrame,
        );
      }
    };
  }, []);
}
