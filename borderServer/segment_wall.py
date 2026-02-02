from __future__ import annotations

import argparse
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

import numpy as np
from PIL import Image


@dataclass(frozen=True)
class WallSegmentationResult:
    mask: np.ndarray  # (H, W) bool
    overlay: Image.Image


def _resolve_device(prefer_cuda: bool) -> str:
    # Import torch lazily so the script can show a friendly message
    # if dependencies are missing.
    import torch

    if prefer_cuda and torch.cuda.is_available():
        return "cuda"
    return "cpu"


@lru_cache(maxsize=8)
def _load_segformer(model_id: str, device: str):
    from transformers import AutoImageProcessor, SegformerForSemanticSegmentation

    processor = AutoImageProcessor.from_pretrained(model_id)
    model = SegformerForSemanticSegmentation.from_pretrained(model_id)
    model.to(device)
    model.eval()
    return processor, model


@lru_cache(maxsize=8)
def _load_mask2former_universal(model_id: str, device: str):
    from transformers import AutoImageProcessor, Mask2FormerForUniversalSegmentation

    processor = AutoImageProcessor.from_pretrained(model_id)
    model = Mask2FormerForUniversalSegmentation.from_pretrained(model_id)
    model.to(device)
    model.eval()
    return processor, model


def _wall_label_ids(id2label: dict[int, str], wall_label_names: tuple[str, ...]) -> list[int]:
    return [idx for idx, name in id2label.items() if name in wall_label_names]


def _segment_wall_semantic(
    image: Image.Image,
    *,
    model_id: str,
    device: str,
    wall_label_names: tuple[str, ...],
) -> np.ndarray:
    import torch

    processor, model = _load_segformer(model_id, device)

    inputs = processor(images=image, return_tensors="pt")
    inputs = {k: v.to(device) for k, v in inputs.items()}

    with torch.inference_mode():
        outputs = model(**inputs)

    logits = outputs.logits  # (B, C, h, w)
    upsampled_logits = torch.nn.functional.interpolate(
        logits,
        size=image.size[::-1],  # (H, W)
        mode="bilinear",
        align_corners=False,
    )

    pred = upsampled_logits.argmax(dim=1)[0].detach().cpu().numpy().astype(np.int32)

    wall_ids = _wall_label_ids(model.config.id2label, wall_label_names)
    if not wall_ids:
        raise RuntimeError(
            f"Could not find wall labels {wall_label_names} in model id2label. "
            f"Available example labels: {list(model.config.id2label.values())[:10]}..."
        )

    return np.isin(pred, np.array(wall_ids, dtype=np.int32))


def _segment_wall_panoptic(
    image: Image.Image,
    *,
    model_id: str,
    device: str,
    wall_label_names: tuple[str, ...],
) -> np.ndarray:
    """Panoptic segmentation: keep only wall *stuff* segments.

    This tends to exclude objects ("things") mounted on walls.
    """

    import torch

    processor, model = _load_mask2former_universal(model_id, device)

    inputs = processor(images=image, return_tensors="pt")
    inputs = {k: v.to(device) for k, v in inputs.items()}

    with torch.inference_mode():
        outputs = model(**inputs)

    # Returns list[dict] with keys: "segmentation" (H,W), "segments_info" (list[dict])
    post = processor.post_process_panoptic_segmentation(
        outputs,
        target_sizes=[image.size[::-1]],  # (H, W)
    )[0]

    segmentation = post["segmentation"].detach().cpu().numpy().astype(np.int32)
    segments_info = post["segments_info"]

    wall_label_ids = set(_wall_label_ids(model.config.id2label, wall_label_names))
    if not wall_label_ids:
        raise RuntimeError(
            f"Could not find wall labels {wall_label_names} in model id2label. "
            f"Available example labels: {list(model.config.id2label.values())[:10]}..."
        )

    mask = np.zeros(segmentation.shape, dtype=bool)
    for seg in segments_info:
        label_id = int(seg.get("label_id"))
        is_thing = bool(seg.get("isthing", False))
        if (label_id in wall_label_ids) and (not is_thing):
            seg_id = int(seg.get("id"))
            mask |= segmentation == seg_id

    return mask


def _segment_objects_instance(
    image: Image.Image,
    *,
    model_id: str,
    device: str,
    threshold: float = 0.4,
    mask_threshold: float = 0.5,
) -> np.ndarray:
    """Instance segmentation: returns mask of any detected object pixels.

    Used to subtract objects ("things") from the wall mask.
    """

    import torch

    processor, model = _load_mask2former_universal(model_id, device)

    inputs = processor(images=image, return_tensors="pt")
    inputs = {k: v.to(device) for k, v in inputs.items()}

    with torch.inference_mode():
        outputs = model(**inputs)

    post = processor.post_process_instance_segmentation(
        outputs,
        threshold=threshold,
        mask_threshold=mask_threshold,
        target_sizes=[image.size[::-1]],  # (H, W)
    )[0]

    segmentation = post.get("segmentation")
    if segmentation is None:
        return np.zeros((image.height, image.width), dtype=bool)

    segmentation = segmentation.detach().cpu().numpy().astype(np.int32)
    # Instance segment IDs are >0 for instances, 0 for background.
    return segmentation > 0


def segment_wall(
    image: Image.Image,
    *,
    backend: str = "semantic",
    model_id: str | None = None,
    prefer_cuda: bool = True,
    wall_label_names: tuple[str, ...] = ("wall",),
    subtract_objects: bool = True,
    instance_model_id: str = "facebook/mask2former-swin-small-coco-instance",
    instance_threshold: float = 0.4,
    instance_mask_threshold: float = 0.5,
    overlay_color_rgb: tuple[int, int, int] = (0, 255, 0),
    overlay_alpha: float = 0.45,
) -> WallSegmentationResult:
    """Segment walls using pretrained segmentation models.

    Default path is semantic ADE20K wall segmentation, optionally subtracting object
    instance masks to avoid wall-mounted objects being included.
    """

    if image.mode != "RGB":
        image = image.convert("RGB")

    device = _resolve_device(prefer_cuda)

    backend = backend.lower().strip()
    if backend not in {"semantic", "panoptic"}:
        raise ValueError("backend must be 'semantic' or 'panoptic'")

    if model_id is None:
        model_id = "nvidia/segformer-b5-finetuned-ade-640-640" if backend == "semantic" else None

    if backend == "panoptic" and model_id is None:
        raise ValueError(
            "Panoptic backend requires an explicit --model-id (an ADE20K panoptic model). "
            "If you don't have one, use --backend semantic (default) with object subtraction."
        )

    if backend == "panoptic":
        mask = _segment_wall_panoptic(
            image,
            model_id=model_id,
            device=device,
            wall_label_names=wall_label_names,
        )
    else:
        mask = _segment_wall_semantic(
            image,
            model_id=model_id,
            device=device,
            wall_label_names=wall_label_names,
        )

        if subtract_objects:
            objects_mask = _segment_objects_instance(
                image,
                model_id=instance_model_id,
                device=device,
                threshold=instance_threshold,
                mask_threshold=instance_mask_threshold,
            )
            mask = mask & (~objects_mask)

    # Create overlay
    base = np.array(image).astype(np.float32)
    color = np.array(overlay_color_rgb, dtype=np.float32)

    overlay_arr = base.copy()
    overlay_arr[mask] = (1.0 - overlay_alpha) * overlay_arr[mask] + overlay_alpha * color
    overlay_arr = np.clip(overlay_arr, 0, 255).astype(np.uint8)
    overlay_img = Image.fromarray(overlay_arr, mode="RGB")

    return WallSegmentationResult(mask=mask, overlay=overlay_img)


def _save_mask_png(mask: np.ndarray, out_path: Path) -> None:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    mask_u8 = (mask.astype(np.uint8) * 255)
    Image.fromarray(mask_u8, mode="L").save(out_path)


def main() -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Wall segmentation on an image. Default: ADE20K semantic wall mask, with COCO instance "
            "masks subtracted to avoid wall-mounted objects."
        )
    )
    parser.add_argument(
        "image",
        type=str,
        nargs="?",
        default=None,
        help="Path to input image (defaults to ./room.jpg if omitted)",
    )
    parser.add_argument("--out-dir", type=str, default="outputs", help="Output directory")
    parser.add_argument(
        "--model-id",
        type=str,
        default=None,
        help=(
            "Wall segmentation model id. If omitted (semantic backend): uses nvidia/segformer-b5-finetuned-ade-640-640. "
            "For panoptic backend you must provide an ADE20K panoptic model id."
        ),
    )
    parser.add_argument(
        "--backend",
        type=str,
        default="semantic",
        choices=["panoptic", "semantic"],
        help="Segmentation backend. Semantic is recommended here; panoptic requires a specific model id.",
    )
    parser.add_argument(
        "--subtract-objects",
        dest="subtract_objects",
        action="store_true",
        help="Subtract detected object instance masks (recommended).",
    )
    parser.add_argument(
        "--no-subtract-objects",
        dest="subtract_objects",
        action="store_false",
        help="Do not subtract object masks.",
    )
    parser.set_defaults(subtract_objects=True)
    parser.add_argument(
        "--instance-model-id",
        type=str,
        default="facebook/mask2former-swin-small-coco-instance",
        help="Instance segmentation model used to subtract objects.",
    )
    parser.add_argument(
        "--instance-threshold",
        type=float,
        default=0.4,
        help="Score threshold for instance masks (lower catches more small objects).",
    )
    parser.add_argument(
        "--instance-mask-threshold",
        type=float,
        default=0.5,
        help="Mask threshold for instance masks.",
    )
    parser.add_argument("--cpu", action="store_true", help="Force CPU (ignore CUDA)")
    args = parser.parse_args()

    in_path = Path(args.image) if args.image else Path("room.jpg")
    if not in_path.exists():
        parser.error(
            f"Input image not found: {in_path}. "
            f"Example: python segment_wall.py room.jpg --out-dir outputs"
        )

    image = Image.open(in_path)

    result = segment_wall(
        image,
        backend=args.backend,
        model_id=args.model_id,
        prefer_cuda=not args.cpu,
        subtract_objects=args.subtract_objects,
        instance_model_id=args.instance_model_id,
        instance_threshold=args.instance_threshold,
        instance_mask_threshold=args.instance_mask_threshold,
    )

    out_dir = Path(args.out_dir)
    stem = in_path.stem

    mask_path = out_dir / f"{stem}_wall_mask.png"
    overlay_path = out_dir / f"{stem}_wall_overlay.jpg"

    _save_mask_png(result.mask, mask_path)
    out_dir.mkdir(parents=True, exist_ok=True)
    result.overlay.save(overlay_path, quality=95)

    wall_ratio = float(result.mask.mean())
    print(f"Saved: {mask_path}")
    print(f"Saved: {overlay_path}")
    print(f"Wall pixels ratio: {wall_ratio:.3f}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
