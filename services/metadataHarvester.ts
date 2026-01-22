
import ExifReader from 'exifreader';
import { IIIFItem } from '../types';

export const extractMetadata = async (file: File): Promise<Partial<IIIFItem>> => {
    // Only process images for now
    if (!file.type.startsWith('image/')) return {};

    try {
        const tags = await ExifReader.load(file);
        const metadata: Array<{ label: Record<string, string[]>; value: Record<string, string[]> }> = [];
        let navDate: string | undefined;

        // 1. Date (DateTimeOriginal) -> navDate & Metadata
        // Exif format is typically "YYYY:MM:DD HH:MM:SS"
        const dateStr = tags['DateTimeOriginal']?.description;
        if (dateStr) {
            // Convert to ISO 8601 for navDate
            const isoDate = dateStr.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3').replace(' ', 'T') + 'Z';
            
            // Validate date object
            if (!isNaN(Date.parse(isoDate))) {
                navDate = isoDate;
                metadata.push({
                    label: { en: ["Date Created"] },
                    value: { en: [dateStr] }
                });
            }
        }

        // 2. Camera Info
        const make = tags['Make']?.description;
        const model = tags['Model']?.description;
        if (make || model) {
            metadata.push({
                label: { en: ["Camera"] },
                value: { en: [[make, model].filter(Boolean).join(' ')] }
            });
        }

        // 3. GPS -> Metadata (and potentially navPlace in future)
        const lat = tags['GPSLatitude']?.description;
        const lon = tags['GPSLongitude']?.description;
        if (lat && lon) {
             // Basic decimal conversion might be needed depending on ExifReader output
             // ExifReader usually provides a description string.
             metadata.push({
                 label: { en: ["Location"] },
                 value: { en: [`${lat}, ${lon}`] }
             });
        }

        // 4. Tech Metadata
        const exposure = tags['ExposureTime']?.description;
        const iso = tags['ISOSpeedRatings']?.description;
        const aperture = tags['FNumber']?.description;
        
        const techDetails = [];
        if (exposure) techDetails.push(`Exp: ${exposure}`);
        if (aperture) techDetails.push(`f/${aperture}`);
        if (iso) techDetails.push(`ISO ${iso}`);
        
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
        console.warn(`Failed to extract EXIF for ${file.name}`, e);
        return {};
    }
};
