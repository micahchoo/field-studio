
import ExifReader from 'exifreader';
import { IIIFItem } from '@/src/shared/types';

export const extractMetadata = async (file: File): Promise<Partial<IIIFItem>> => {
    if (!file.type.startsWith('image/')) return {};

    try {
        const tags = await ExifReader.load(file);
        const metadata: Array<{ label: Record<string, string[]>; value: Record<string, string[]> }> = [];
        let navDate: string | undefined;

        // 1. Date Created (Archive DNA: Time)
        const dateStr = tags['DateTimeOriginal']?.description;
        if (dateStr) {
            const isoDate = `${dateStr.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3').replace(' ', 'T')}Z`;
            if (!isNaN(Date.parse(isoDate))) {
                navDate = isoDate;
                metadata.push({
                    label: { en: ["Date Created"] },
                    value: { en: [dateStr] }
                });
            }
        }

        // 2. Camera Info (Archive DNA: Device)
        const make = tags['Make']?.description;
        const model = tags['Model']?.description;
        if (make || model) {
            metadata.push({
                label: { en: ["Camera"] },
                value: { en: [[make, model].filter(Boolean).join(' ')] }
            });
        }

        // 3. GPS (Archive DNA: Location)
        const lat = tags['GPSLatitude']?.description;
        const lon = tags['GPSLongitude']?.description;
        if (lat && lon) {
             metadata.push({
                 label: { en: ["Location"] },
                 value: { en: [`${lat}, ${lon}`] }
             });
        }

        // 4. Archival Technical Details
        const techDetails = [];
        if (tags['ExposureTime']?.description) techDetails.push(`Exposure: ${tags['ExposureTime'].description}`);
        if (tags['FNumber']?.description) techDetails.push(`Aperture: f/${tags['FNumber'].description}`);
        if (tags['ISOSpeedRatings']?.description) techDetails.push(`ISO: ${tags['ISOSpeedRatings'].description}`);
        
        if (techDetails.length > 0) {
            metadata.push({
                label: { en: ["Technical"] },
                value: { en: [techDetails.join(', ')] }
            });
        }

        return {
            navDate,
            metadata: metadata.length > 0 ? metadata : undefined
        };

    } catch (e) {
        console.warn(`[Metadata] Harvester failed for ${file.name}`, e);
        return {};
    }
};
