# Wall Segmentation API

This repo exposes a small HTTP API (FastAPI) that segments **walls** in an input image and returns:
- `wall_mask.png` (binary mask)
- `wall_overlay.jpg` (original image with mask overlay)
- `meta.json` (request metadata + wall coverage ratio)

## Setup

### 1) Create + activate a venv (Windows PowerShell)

```powershell
cd C:\Users\moham\school\chbor
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

### 2) Install dependencies

```powershell
pip install -r requirements.txt
```

Notes:
- First run may download models from Hugging Face (needs internet, can take a while).
- `torch` on Windows can be slow to install; CPU is fine.

## Run the API

From the repo root (with venv activated):

```powershell
python -m uvicorn api:app --reload --host 127.0.0.1 --port 8000
```

Open:
- Swagger UI: http://127.0.0.1:8000/docs
- OpenAPI JSON: http://127.0.0.1:8000/openapi.json

## Endpoints

### `GET /health`

Quick health check.

Example:

```bash
curl http://127.0.0.1:8000/health
```

Response:

```json
{ "ok": true }
```

### `POST /segment/wall`

Upload an image and get a zip file back.

- **Content-Type:** `multipart/form-data`
- **Returns:** `application/zip` containing `wall_mask.png`, `wall_overlay.jpg`, `meta.json`

#### Using Postman (important)

This endpoint returns **binary ZIP data**. ZIP files start with the bytes `PK` (so seeing `PK...` in the response body means it’s working).

In Postman:
- Set **Body** → **form-data**
- Add key `file` and change its type to **File**, then pick an image
- (Optional) add text keys like `backend`, `cpu`, `subtract_objects`
- Click the small arrow next to **Send** and choose **Send and Download** (or use **Save Response to file**) and save as `wall_segmentation.zip`

Then unzip it to see the outputs.

#### Form fields

- `file` (required): image file
- `backend` (optional, default: `semantic`): `semantic` or `panoptic`
- `model_id` (optional): override the model id used by the selected backend
- `cpu` (optional, default: `false`): set to `true` to force CPU
- `subtract_objects` (optional, default: `true`): subtract instance-seg objects from wall mask
- `instance_model_id` (optional, default: `facebook/mask2former-swin-small-coco-instance`)
- `instance_threshold` (optional, default: `0.4`)
- `instance_mask_threshold` (optional, default: `0.5`)

#### Example (curl)

```bash
curl -X POST "http://127.0.0.1:8000/segment/wall" \
  -F "file=@room.jpg" \
  -F "backend=semantic" \
  -F "cpu=true" \
  --output wall_segmentation.zip
```

Unzip:

```powershell
Expand-Archive .\wall_segmentation.zip -DestinationPath .\outputs\api_unzipped -Force
```

You should see:
- `outputs/api_unzipped/wall_mask.png`
- `outputs/api_unzipped/wall_overlay.jpg`
- `outputs/api_unzipped/meta.json`

#### Example (Python)

```python
import zipfile
from io import BytesIO

import requests

url = "http://127.0.0.1:8000/segment/wall"
with open("room.jpg", "rb") as f:
    resp = requests.post(
        url,
        files={"file": ("room.jpg", f, "image/jpeg")},
        data={"backend": "semantic", "cpu": "true"},
        timeout=600,
    )
resp.raise_for_status()

z = zipfile.ZipFile(BytesIO(resp.content))
z.extractall("outputs/api_unzipped")
print(z.namelist())
```

## Troubleshooting

- **`No module named uvicorn`**: make sure you’re using the project venv (`.venv`) and have run `pip install -r requirements.txt`.
- **Very slow first request**: models download and load on first use.
- **Out of memory / slow GPU issues**: try `cpu=true`.

## Dev notes

The API implementation is in `api.py` and calls `segment_wall.segment_wall(...)`.
