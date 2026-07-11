import os
import shutil
from uuid import uuid4

from fastapi import APIRouter, File, UploadFile

router = APIRouter(
    prefix="/upload",
    tags=["Upload"]
)


@router.post("/image")
def upload_image(file: UploadFile = File(...)):

    # Generate unique filename
    extension = file.filename.split(".")[-1]
    filename = f"{uuid4()}.{extension}"

    upload_path = os.path.join("uploads", "lands", filename)

    with open(upload_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return {
        "message": "Image Uploaded Successfully",
        "image_url": f"/uploads/lands/{filename}"
    }