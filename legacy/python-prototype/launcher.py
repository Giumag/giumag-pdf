from __future__ import annotations

import socket
import threading
import webbrowser

import uvicorn


def free_port(start: int = 8765, attempts: int = 20) -> int:
    for port in range(start, start + attempts):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            try:
                sock.bind(("127.0.0.1", port))
                return port
            except OSError:
                continue
    raise RuntimeError("Nessuna porta locale disponibile tra 8765 e 8784.")


def main() -> None:
    port = free_port()
    url = f"http://127.0.0.1:{port}"
    print("\n" + "=" * 62)
    print("  GIUMAG PDF STUDIO")
    print("  Privacy-first local PDF toolkit")
    print("=" * 62)
    print(f"\n  Apertura: {url}")
    print("  I file vengono elaborati soltanto su questo computer.")
    print("  Per chiudere l'app premi CTRL+C in questa finestra.\n")
    threading.Timer(1.0, lambda: webbrowser.open(url)).start()
    uvicorn.run("app.main:app", host="127.0.0.1", port=port, log_level="warning")


if __name__ == "__main__":
    main()
