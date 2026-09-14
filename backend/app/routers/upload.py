from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
import cloudinary.uploader
from PIL import Image, UnidentifiedImageError
import io
import os
from app import cloudinary_config
from app.auth import get_current_user


router = APIRouter(
    prefix="/upload",
    tags=["Upload"]
)


# Allowed image formats for this generic upload endpoint.
ALLOWED_CONTENT_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
}

# Maximum upload size: 5 MB.
MAX_FILE_SIZE = 5 * 1024 * 1024

# Maximum filename length accepted from the client.
MAX_FILENAME_LENGTH = 255


def validate_upload_filename(filename: str | None) -> str:
    """Validate and normalize a client-provided upload filename."""
    if not filename:
        raise HTTPException(
            status_code=400,
            detail="A filename is required.",
        )

    if "\x00" in filename or any(ord(char) < 32 for char in filename):
        raise HTTPException(
            status_code=400,
            detail="The filename contains invalid characters.",
        )

    # Reject path components rather than silently stripping them.
    safe_filename = os.path.basename(filename.replace("\\", "/"))

    if safe_filename != filename:
        raise HTTPException(
            status_code=400,
            detail="Invalid filename.",
        )

    if len(safe_filename) > MAX_FILENAME_LENGTH:
        raise HTTPException(
            status_code=400,
            detail="Filename must be 255 characters or less.",
        )

    if safe_filename in {".", ".."}:
        raise HTTPException(
            status_code=400,
            detail="Invalid filename.",
        )

    return safe_filename


@router.post("/")
async def upload_image(
    file: UploadFile = File(...),
    current_user: int = Depends(get_current_user),
):
    try:
        safe_filename = validate_upload_filename(file.filename)

        # Validate the client-provided MIME type.
        if file.content_type not in ALLOWED_CONTENT_TYPES:
            raise HTTPException(
                status_code=400,
                detail="Only JPEG, PNG, and WebP images are allowed.",
            )

        # Read at most one byte beyond the allowed limit.
        # This prevents unnecessarily loading arbitrarily large uploads
        # into application memory.
        contents = await file.read(MAX_FILE_SIZE + 1)

        if not contents:
            raise HTTPException(
                status_code=400,
                detail="Uploaded file is empty.",
            )

        if len(contents) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=413,
                detail="Image file must be 5 MB or smaller.",
            )

        # Validate that the uploaded bytes are actually an image.
        try:
            with Image.open(io.BytesIO(contents)) as image:
                detected_format = image.format

                if detected_format not in {"JPEG", "PNG", "WEBP"}:
                    raise HTTPException(
                        status_code=400,
                        detail="Only JPEG, PNG, and WebP images are allowed.",
                    )

                # Verify the image structure.
                image.verify()

        except HTTPException:
            raise

        except (UnidentifiedImageError, OSError, SyntaxError):
            raise HTTPException(
                status_code=400,
                detail="The uploaded file is not a valid image.",
            )

        # Upload only after all validation succeeds.
        result = cloudinary.uploader.upload(
            contents,
            resource_type="image",
        )

        return {
            "filename": safe_filename,
            "url": result["secure_url"],
        }

    except HTTPException:
        raise

    except Exception:
        # Do not expose internal Cloudinary/server errors to the client.
        raise HTTPException(
            status_code=500,
            detail="Unable to upload image.",
        )