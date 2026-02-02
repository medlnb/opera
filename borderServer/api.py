from __future__ import annotations

import io
import zipfile
from typing import Annotated

import numpy as np
from fastapi import FastAPI, File, Form, UploadFile
from fastapi.responses import JSONResponse, StreamingResponse
from PIL import Image

from segment_wall import WallSegmentationResult, segment_wall

app = FastAPI(title="Wall Segmentation API", version="1.0")


def _mask_to_png_bytes(mask: np.ndarray) -> bytes:
    mask_u8 = (mask.astype(np.uint8) * 255)
    img = Image.fromarray(mask_u8, mode="L")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def _image_to_jpeg_bytes(img: Image.Image, quality: int = 95) -> bytes:
    if img.mode != "RGB":
        img = img.convert("RGB")
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=quality)
    return buf.getvalue()


@app.get("/health")
def health() -> dict:
    return {"ok": True}


@app.post("/segment/wall")
async def segment_wall_endpoint(
    file: Annotated[UploadFile, File(description="Input image file")],
    backend: Annotated[str, Form()] = "semantic",
    model_id: Annotated[str | None, Form()] = None,
    cpu: Annotated[bool, Form()] = False,
    subtract_objects: Annotated[bool, Form()] = True,
    instance_model_id: Annotated[str, Form()] = "facebook/mask2former-swin-small-coco-instance",
    instance_threshold: Annotated[float, Form()] = 0.4,
    instance_mask_threshold: Annotated[float, Form()] = 0.5,
) -> StreamingResponse:
    """Upload an image; returns a zip containing wall_mask.png and wall_overlay.jpg."""

    try:
        raw = await file.read()
        image = Image.open(io.BytesIO(raw)).convert("RGB")

        result: WallSegmentationResult = segment_wall(
            image,
            backend=backend,
            model_id=model_id,
            prefer_cuda=not cpu,
            subtract_objects=subtract_objects,
            instance_model_id=instance_model_id,
            instance_threshold=instance_threshold,
            instance_mask_threshold=instance_mask_threshold,
        )

        mask_png = _mask_to_png_bytes(result.mask)
        overlay_jpg = _image_to_jpeg_bytes(result.overlay)

        zip_buf = io.BytesIO()
        with zipfile.ZipFile(zip_buf, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
            zf.writestr("wall_mask.png", mask_png)
            zf.writestr("wall_overlay.jpg", overlay_jpg)

            meta = {
                "filename": file.filename,
                "wall_ratio": float(result.mask.mean()),
                "backend": backend,
                "model_id": model_id,
                "cpu": cpu,
                "subtract_objects": subtract_objects,
                "instance_model_id": instance_model_id,
                "instance_threshold": instance_threshold,
                "instance_mask_threshold": instance_mask_threshold,
            }
            zf.writestr("meta.json", JSONResponse(content=meta).body)

        zip_buf.seek(0)
        return StreamingResponse(
            zip_buf,
            media_type="application/zip",
            headers={"Content-Disposition": "attachment; filename=wall_segmentation.zip"},
        )

    except Exception as exc:
        return JSONResponse(
            status_code=400,
            content={"error": str(exc)},
        )


@app.post("/segment/wall/mask")
async def segment_wall_mask_endpoint(
    file: Annotated[UploadFile, File(description="Input image file")],
    backend: Annotated[str, Form()] = "semantic",
    model_id: Annotated[str | None, Form()] = None,
    cpu: Annotated[bool, Form()] = False,
    subtract_objects: Annotated[bool, Form()] = True,
    instance_model_id: Annotated[str, Form()] = "facebook/mask2former-swin-small-coco-instance",
    instance_threshold: Annotated[float, Form()] = 0.4,
    instance_mask_threshold: Annotated[float, Form()] = 0.5,
) -> StreamingResponse:
    """Upload an image; returns wall_mask.png directly (image/png)."""

    try:
        raw = await file.read()
        image = Image.open(io.BytesIO(raw)).convert("RGB")

        result: WallSegmentationResult = segment_wall(
            image,
            backend=backend,
            model_id=model_id,
            prefer_cuda=not cpu,
            subtract_objects=subtract_objects,
            instance_model_id=instance_model_id,
            instance_threshold=instance_threshold,
            instance_mask_threshold=instance_mask_threshold,
        )

        mask_png = _mask_to_png_bytes(result.mask)
        return StreamingResponse(
            io.BytesIO(mask_png),
            media_type="image/png",
            headers={"Content-Disposition": "inline; filename=wall_mask.png"},
        )

    except Exception as exc:
        return JSONResponse(
            status_code=400,
            content={"error": str(exc)},
        )
