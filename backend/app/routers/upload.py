from fastapi import APIRouter, UploadFile, File, HTTPException
import cloudinary.uploader
from app import cloudinary_config

router = APIRouter(
    prefix="/upload",
    tags=["Upload"]
)

@router.post("/")
async def upload_image(file: UploadFile = File(...)):
    try:
        result = cloudinary.uploader.upload(file.file)

        return {
            "filename": file.filename,
            "url": result["secure_url"]
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 