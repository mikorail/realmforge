import type { HeightImage } from '#lib/gen/types';

/** Decode a PNG/JPG into a small grayscale grid (max 512 px wide) for the 'image' heightmap template. Main thread only (needs canvas). */
export async function decodeHeightImage(file: Blob, maxW = 512): Promise<HeightImage> {
	const bmp = await createImageBitmap(file);
	try {
		const scale = Math.min(1, maxW / bmp.width);
		const w = Math.max(2, Math.round(bmp.width * scale));
		const h = Math.max(2, Math.round(bmp.height * scale));
		const cv = document.createElement('canvas');
		cv.width = w;
		cv.height = h;
		const ctx = cv.getContext('2d', { willReadFrequently: true });
		if (!ctx) throw new Error('canvas unavailable');
		ctx.imageSmoothingQuality = 'high';
		// transparent pixels read as sea: paint black underneath
		ctx.fillStyle = '#000';
		ctx.fillRect(0, 0, w, h);
		ctx.drawImage(bmp, 0, 0, w, h);
		const px = ctx.getImageData(0, 0, w, h).data;
		const data = new Uint8Array(w * h);
		for (let i = 0; i < w * h; i++) data[i] = Math.round(px[i * 4] * 0.2126 + px[i * 4 + 1] * 0.7152 + px[i * 4 + 2] * 0.0722);
		return { w, h, data };
	} finally {
		bmp.close();
	}
}
