import os
import io
from config import USE_S3, S3_BUCKET, AWS_REGION, LOCAL_STORAGE_PATH

# ── Local Storage ────────────────────────────────────────
os.makedirs(LOCAL_STORAGE_PATH, exist_ok=True)


def save_evidence(image_bytes: bytes, filename: str) -> str:
    """
    Save evidence image to storage (S3 or local filesystem).
    Returns the storage path/key.
    """
    if USE_S3:
        return _save_to_s3(image_bytes, filename)
    else:
        return _save_to_local(image_bytes, filename)


def get_evidence_url(path: str) -> str:
    """
    Get URL for accessing an evidence image.
    """
    if USE_S3:
        return _get_s3_url(path)
    else:
        return f"/api/evidence/{path}"


def _save_to_local(image_bytes: bytes, filename: str) -> str:
    """Save image to local filesystem."""
    filepath = os.path.join(LOCAL_STORAGE_PATH, filename)
    with open(filepath, "wb") as f:
        f.write(image_bytes)
    return filename


def _save_to_s3(image_bytes: bytes, filename: str) -> str:
    """Save image to Amazon S3."""
    import boto3

    s3 = boto3.client("s3", region_name=AWS_REGION)
    key = f"evidences/{filename}"

    s3.put_object(
        Bucket=S3_BUCKET,
        Key=key,
        Body=image_bytes,
        ContentType="image/jpeg",
    )

    return key


def _get_s3_url(key: str) -> str:
    """Generate pre-signed URL for S3 object."""
    import boto3

    s3 = boto3.client("s3", region_name=AWS_REGION)
    url = s3.generate_presigned_url(
        "get_object",
        Params={"Bucket": S3_BUCKET, "Key": key},
        ExpiresIn=3600,
    )
    return url


def get_local_evidence(filename: str) -> bytes:
    """Read evidence image from local filesystem."""
    filepath = os.path.join(LOCAL_STORAGE_PATH, filename)
    if not os.path.exists(filepath):
        return None
    with open(filepath, "rb") as f:
        return f.read()
