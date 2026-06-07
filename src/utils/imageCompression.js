const MAX_IMAGE_DIMENSION = 1200; 
const MAX_ALLOWED_SIZE_BYTES = 800 * 1024; // Target maksimal 800KB

/**
 * Mengompres file gambar dan mengembalikan string Base64
 */
export const compressImage = async (file) => {
  const readFile = (f) => new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = () => res(reader.result);
    reader.onerror = rej;
    reader.readAsDataURL(f);
  });

  const loadImage = (url) => new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = url;
  });

  const getBase64Size = (base64) => {
    const string = base64.split(",")[1];
    return Math.floor((string.length * 3) / 4);
  };

  try {
    const dataUrl = await readFile(file);
    const img = await loadImage(dataUrl);

    let width = img.width;
    let height = img.height;

    if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
      const ratio = Math.min(MAX_IMAGE_DIMENSION / width, MAX_IMAGE_DIMENSION / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    let quality = 0.8;
    let finalBase64 = canvas.toDataURL("image/jpeg", quality);

    while (getBase64Size(finalBase64) > MAX_ALLOWED_SIZE_BYTES && quality > 0.3) {
      quality -= 0.1;
      finalBase64 = canvas.toDataURL("image/jpeg", quality);
    }

    return finalBase64;
  } catch (error) {
    throw new Error("Gagal memproses gambar.");
  }
};