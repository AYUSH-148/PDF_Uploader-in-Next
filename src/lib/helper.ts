
export const getRandomLightColor = () => {
    const r = Math.floor(Math.random() * 128 + 127);
    const g = Math.floor(Math.random() * 128 + 127);
    const b = Math.floor(Math.random() * 128 + 127);
    const opacity = 0.3;
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};


export const applyBlur = (imageData: ImageData): ImageData => {
    const pixels = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
  
    const blurRadius = 3;
  
    const getPixelIndex = (x: number, y: number) => (y * width + x) * 4;
  
    // Create a new Uint8ClampedArray for the output image data
    const blurredPixels = new Uint8ClampedArray(pixels.length);
  
    for (let y = blurRadius; y < height - blurRadius; y++) {
      for (let x = blurRadius; x < width - blurRadius; x++) {
        let r = 0,
          g = 0,
          b = 0,
          a = 0;
  
        for (let dy = -blurRadius; dy <= blurRadius; dy++) {
          for (let dx = -blurRadius; dx <= blurRadius; dx++) {
            const index = getPixelIndex(x + dx, y + dy);
            r += pixels[index];
            g += pixels[index + 1];
            b += pixels[index + 2];
            a += pixels[index + 3];
          }
        }
  
        const avgFactor = (blurRadius * 2 + 1) ** 2;
        const index = getPixelIndex(x, y);
        blurredPixels[index] = r / avgFactor;
        blurredPixels[index + 1] = g / avgFactor;
        blurredPixels[index + 2] = b / avgFactor;
        blurredPixels[index + 3] = a / avgFactor;
      }
    }
  
    return new ImageData(blurredPixels, width, height);
  };
  