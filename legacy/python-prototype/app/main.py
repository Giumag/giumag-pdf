from __future__ import annotations

import json
import shutil
import tempfile
from pathlib import Path
from urllib.parse import quote

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from starlette.background import BackgroundTask

from app.core.pdf_tools import TOOL_HANDLERS, ToolError, dependency_status

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"

app = FastAPI(
    title="Giumag PDF Studio",
    version="0.1.0",
    description="Suite PDF locale: i file restano sul computer dell'utente.",
    docs_url=None,
    redoc_url=None,
)


@app.get("/api/health")
def health():
    return {
        "ok": True,
        "name": "Giumag PDF Studio",
        "version": "0.1.0",
        "privacy": "local-only",
        "tools": len(TOOL_HANDLERS),
    }


@app.get("/api/dependencies")
def dependencies():
    return dependency_status()


@app.post("/api/process/{tool_id}")
async def process_tool(
    tool_id: str,
    files: list[UploadFile] = File(...),
    options: str = Form("{}"),
):
    if tool_id not in TOOL_HANDLERS:
        raise HTTPException(status_code=404, detail="Strumento non trovato")
    if not files:
        raise HTTPException(status_code=400, detail="Nessun file selezionato")
    try:
        parsed_options = json.loads(options or "{}")
        if not isinstance(parsed_options, dict):
            raise ValueError
    except ValueError:
        raise HTTPException(status_code=400, detail="Opzioni non valide")

    workdir = Path(tempfile.mkdtemp(prefix="giumag_pdf_"))
    input_dir = workdir / "input"; output_dir = workdir / "output"
    input_dir.mkdir(); output_dir.mkdir()
    saved: list[Path] = []
    try:
        for idx, upload in enumerate(files):
            original = Path(upload.filename or f"file_{idx}")
            safe_name = "".join(c if c.isalnum() or c in "._- ()[]" else "_" for c in original.name)
            target = input_dir / safe_name
            if target.exists():
                target = input_dir / f"{idx:02d}_{safe_name}"
            with target.open("wb") as fp:
                while chunk := await upload.read(1024 * 1024):
                    fp.write(chunk)
            await upload.close()
            saved.append(target)

        result = TOOL_HANDLERS[tool_id](saved, parsed_options, output_dir)
        if not result.path.exists():
            raise ToolError("Il motore non ha prodotto un file di output.")

        headers = {
            "X-Giumag-Message": quote(result.message, safe=""),
            "X-Giumag-Local": "true",
            "Cache-Control": "no-store",
        }
        return FileResponse(
            path=result.path,
            filename=result.filename,
            media_type=result.media_type,
            headers=headers,
            background=BackgroundTask(shutil.rmtree, workdir, True),
        )
    except ToolError as exc:
        shutil.rmtree(workdir, ignore_errors=True)
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        shutil.rmtree(workdir, ignore_errors=True)
        raise HTTPException(status_code=500, detail=f"Errore locale durante l'elaborazione: {exc}")


app.mount("/", StaticFiles(directory=str(STATIC_DIR), html=True), name="static")
