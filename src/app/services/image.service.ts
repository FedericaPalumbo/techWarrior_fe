import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ImageService {
    // Lato massimo in pixel: oltre non serve per una segnalazione e pesa solo di più
    private readonly MAX_SIDE = 1280;
    private readonly JPEG_QUALITY = 0.8;

    /**
     * Prende il file scelto dall'utente (PNG, JPG, WEBP...) e restituisce
     * una stringa "data:image/jpeg;base64,...." pronta da mandare al back
     * (colonna "url" di segnalazione_immagini, che è TEXT) e da usare
     * direttamente come src per l'anteprima.
     *
     * Il PNG viene convertito in JPEG e ridimensionato: un PNG in base64 pesa
     * molto e rischia di superare il limite del body della richiesta.
     */
    async toJpegDataUrl(file: File): Promise<string> {
        const bitmap = await createImageBitmap(file);

        const scale = Math.min(1, this.MAX_SIDE / Math.max(bitmap.width, bitmap.height));
        const width = Math.round(bitmap.width * scale);
        const height = Math.round(bitmap.height * scale);

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
            bitmap.close();
            throw new Error('Canvas non disponibile');
        }

        // Il JPEG non ha trasparenza: senza sfondo bianco i PNG trasparenti diventano neri
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(bitmap, 0, 0, width, height);
        bitmap.close();

        return canvas.toDataURL('image/jpeg', this.JPEG_QUALITY);
    }
}