"""
s3_storage.py
─────────────
S3 helpers for uploading and deleting farmer selfie images.

On EC2 with an IAM role attached, boto3 picks up credentials automatically —
no AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY needed in the environment.

Required environment variables:
    S3_BUCKET_NAME   – name of the S3 bucket (e.g. geoportal-uploads-abc123)
    S3_BASE_URL      – public base URL (e.g. https://geoportal-uploads-abc123.s3.ap-south-1.amazonaws.com)
    AWS_REGION       – AWS region (default: ap-south-1)
"""

import os
import boto3
from botocore.exceptions import ClientError, BotoCoreError
from fastapi import UploadFile

# ── Config (loaded from environment / .env) ───────────────────────────────────
S3_BUCKET_NAME = os.getenv("S3_BUCKET_NAME")
S3_BASE_URL    = os.getenv("S3_BASE_URL", "").rstrip("/")
AWS_REGION     = os.getenv("AWS_REGION", "ap-south-1")
S3_PREFIX      = "selfies"   # folder inside the bucket

if not S3_BUCKET_NAME:
    raise RuntimeError("S3_BUCKET_NAME environment variable is not set!")
if not S3_BASE_URL:
    raise RuntimeError("S3_BASE_URL environment variable is not set!")

# ── boto3 client — uses EC2 IAM role automatically (no hardcoded keys) ────────
_s3 = boto3.client("s3", region_name=AWS_REGION)

# MIME type map for accurate Content-Type header
_EXT_MIME: dict[str, str] = {
    ".jpg":  "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png":  "image/png",
}


def _key(filename: str) -> str:
    """Returns the full S3 object key, e.g. 'selfies/FARMER-A1B2C3.jpg'."""
    return f"{S3_PREFIX}/{filename}"


def _url(filename: str) -> str:
    """Returns the public HTTPS URL for a selfie."""
    return f"{S3_BASE_URL}/{_key(filename)}"


# ── Public API ────────────────────────────────────────────────────────────────

async def upload_selfie(selfie: UploadFile, filename: str) -> str:
    """
    Upload a selfie image to S3 and return its public HTTPS URL.

    Parameters
    ----------
    selfie   : FastAPI UploadFile (file pointer is at position 0 — main.py
               rewinds after the size check with selfie.file.seek(0)).
    filename : Target filename, e.g. "FARMER-A1B2C3.jpg".

    Returns
    -------
    str  Full public URL, e.g. https://bucket.s3.region.amazonaws.com/selfies/FARMER-A1B2C3.jpg

    Raises
    ------
    RuntimeError  if the S3 upload fails (caller converts this to HTTP 500).
    """
    ext = os.path.splitext(filename)[1].lower()
    content_type = _EXT_MIME.get(ext, "application/octet-stream")
    content = await selfie.read()

    try:
        _s3.put_object(
            Bucket=S3_BUCKET_NAME,
            Key=_key(filename),
            Body=content,
            ContentType=content_type,
        )
    except (ClientError, BotoCoreError) as exc:
        raise RuntimeError(f"S3 upload failed: {exc}") from exc

    return _url(filename)


def delete_selfie(filename: str) -> None:
    """
    Delete a selfie from S3.
    Silently ignores missing objects so re-registration never crashes.

    Parameters
    ----------
    filename : Just the filename part, e.g. "FARMER-A1B2C3.jpg".
               The S3 prefix (selfies/) is added automatically.
    """
    try:
        _s3.delete_object(Bucket=S3_BUCKET_NAME, Key=_key(filename))
    except ClientError as exc:
        code = exc.response.get("Error", {}).get("Code", "")
        if code == "NoSuchKey":
            return   # already gone — that is fine
        print(f"Warning: S3 delete failed for '{filename}': {exc}")
    except BotoCoreError as exc:
        print(f"Warning: S3 connection error during delete of '{filename}': {exc}")
