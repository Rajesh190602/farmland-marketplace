from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
import cloudinary.uploader
from PIL import Image, UnidentifiedImageError
import io
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


@router.post("/")
async def upload_image(
    file: UploadFile = File(...),
    current_user: int = Depends(get_current_user),
):
    try:
        # Validate the client-provided MIME type.
        if file.content_type not in ALLOWED_CONTENT_TYPES:
            raise HTTPException(
                status_code=400,
                detail="Only JPEG, PNG, and WebP images are allowed.",
            )

        # Read the file so we can enforce the size limit
        # and validate the actual image contents.
        contents = await file.read()

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
            "filename": file.filename,
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