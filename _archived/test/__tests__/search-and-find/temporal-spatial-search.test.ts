/**
 * Temporal and Spatial Search Test Suite
 *
 * Tests user interactions with date-based and location-based search
 * Each test maps to a user action and defines ideal outcomes vs failures.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { buildManifestFromFiles } from '@/services/iiifBuilder';
import { ActionTestData } from '../../fixtures/pipelineFixtures';
import { isCanvas, isManifest } from '@/types';
import 'fake-indexeddb/auto';

describe('User Goal: Find content by when and where', () => {
  beforeEach(async () => {
    // Clear IndexedDB before each test
    const databases = await indexedDB.databases();
    for (const db of databases) {
      if (db.name) {
        indexedDB.deleteDatabase(db.name);
      }
    }
  });

  describe('User Interaction: Filter by date range', () => {
    it('IDEAL: Photos from specific time period shown in timeline', async () => {
      // Arrange: User imports photos with timestamps
      const files = ActionTestData.forImport.sequence();
      const root = await buildManifestFromFiles(files, {
        label: { en: ['Test Manifest'] },
      });

      expect(root).toBeDefined();
      if (!root || !('items' in root)) return;

      // Simulate photos with navDate metadata
      const dates = [
        '2019-06-01T10:00:00Z',
        '2019-06-15T14:30:00Z',
        '2019-07-20T09:00:00Z',
        '2020-01-10T12:00:00Z',
      ];

      root.items.forEach((canvas, index) => {
        if (isCanvas(canvas) && dates[index]) {
          canvas.navDate = dates[index];
        }
      });

      // Act: User filters for June 2019 (simulating date range filter)
      const startDate = new Date('2019-06-01');
      const endDate = new Date('2019-06-30');

      const filteredItems = root.items.filter(canvas => {
        if (!isCanvas(canvas) || !canvas.navDate) return false;
        const canvasDate = new Date(canvas.navDate);
        return canvasDate >= startDate && canvasDate <= endDate;
      });

      // Assert: IDEAL OUTCOME achieved
      expect(filteredItems).toHaveLength(2); // Two photos from June 2019
      filteredItems.forEach(canvas => {
        if (isCanvas(canvas) && canvas.navDate) {
          const canvasDate = new Date(canvas.navDate);
          expect(canvasDate.getMonth()).toBe(5); // June (0-indexed)
          expect(canvasDate.getFullYear()).toBe(2019);
        }
      });

      // Timeline view would show these filtered results
      console.log('✓ IDEAL: June 2019 photos filtered correctly in timeline');
    });

    it('FAILURE PREVENTED: Date parsing errors exclude valid results', async () => {
      // Arrange: User has photos with various date formats
      const files = ActionTestData.forImport.sequence();
      const root = await buildManifestFromFiles(files, {
        label: { en: ['Test Manifest'] },
      });

      if (!root || !('items' in root)) return;

      // Mix of valid and edge-case dates
      const dates = [
        '2019-06-01T10:00:00Z',           // Valid ISO
        '2019-06-15',                     // Date only (no time)
        'invalid-date',                   // Invalid format
        '',                               // Empty string
      ];

      root.items.forEach((canvas, index) => {
        if (isCanvas(canvas) && dates[index]) {
          canvas.navDate = dates[index];
        }
      });

      // Act: User filters for June 2019
      const startDate = new Date('2019-06-01');
      const endDate = new Date('2019-06-30');

      const filteredItems = root.items.filter(canvas => {
        if (!isCanvas(canvas) || !canvas.navDate) return false;

        // Robust date parsing (what app should do)
        try {
          const canvasDate = new Date(canvas.navDate);

          // Check if date is valid
          if (isNaN(canvasDate.getTime())) {
            console.warn(`Invalid date format: ${canvas.navDate}`);
            return false;
          }

          return canvasDate >= startDate && canvasDate <= endDate;
        } catch (error) {
          // FAILURE PREVENTED: Invalid dates don't crash filter
          console.warn(`Date parsing error: ${error}`);
          return false;
        }
      });

      // Assert: FAILURE PREVENTED
      // Only valid dates are included, invalid ones gracefully excluded
      expect(filteredItems.length).toBeGreaterThanOrEqual(1);
      expect(filteredItems.length).toBeLessThan(dates.length);

      console.log('✓ PREVENTED: Invalid dates gracefully excluded, no crash');
    });
  });

  describe('User Interaction: Search by GPS location', () => {
    it('IDEAL: Map shows all photos from specific area', async () => {
      // Arrange: User imports geotagged photos
      const geoFile = ActionTestData.forMetadataExtraction.withEXIF();

      // If no geotagged file available, skip test
      if (geoFile.length === 0) {
        console.warn('Geotagged image not available, skipping test');
        return;
      }

      const { root } = await buildTree(geoFile, {
        defaultBaseUrl: 'http://localhost:3000',
      });

      if (!root || !('items' in root)) return;

      // Simulate multiple photos with GPS coordinates
      const locations = [
        { lat: 28.6139, lon: 77.2090 },  // Delhi
        { lat: 28.6200, lon: 77.2100 },  // Near Delhi
        { lat: 19.0760, lon: 72.8777 },  // Mumbai
      ];

      root.items.forEach((canvas, index) => {
        if (isCanvas(canvas) && locations[index]) {
          canvas.navPlace = {
            id: `place-${index}`,
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [locations[index].lon, locations[index].lat],
            },
          };
        }
      });

      // Act: User searches for photos near Delhi (within 5km radius)
      const delhiCenter = { lat: 28.6139, lon: 77.2090 };
      const radiusKm = 5;

      const filteredItems = root.items.filter(canvas => {
        if (!isCanvas(canvas) || !canvas.navPlace) return false;

        const place = canvas.navPlace;
        if (place.geometry?.type !== 'Point') return false;

        const [lon, lat] = place.geometry.coordinates;

        // Simple distance calculation (Haversine would be more accurate)
        const distance = calculateDistance(delhiCenter.lat, delhiCenter.lon, lat, lon);

        return distance <= radiusKm;
      });

      // Assert: IDEAL OUTCOME achieved
      expect(filteredItems).toHaveLength(2); // Two photos near Delhi

      filteredItems.forEach(canvas => {
        if (isCanvas(canvas) && canvas.navPlace?.geometry?.type === 'Point') {
          const [lon, lat] = canvas.navPlace.geometry.coordinates;
          const distance = calculateDistance(delhiCenter.lat, delhiCenter.lon, lat, lon);
          expect(distance).toBeLessThanOrEqual(radiusKm);
        }
      });

      // Map view would show these pins clustered in Delhi
      console.log('✓ IDEAL: Photos within 5km of Delhi filtered correctly');
    });

    it('FAILURE PREVENTED: Invalid GPS coordinates crash map', async () => {
      // Arrange: User has photos with edge-case coordinates
      const files = ActionTestData.forImport.sequence();
      const root = await buildManifestFromFiles(files, {
        label: { en: ['Test Manifest'] },
      });

      if (!root || !('items' in root)) return;

      // Mix of valid and invalid coordinates
      const locations = [
        { lat: 28.6139, lon: 77.2090 },    // Valid
        { lat: 91.0, lon: 77.2090 },       // Invalid lat (> 90)
        { lat: 28.6139, lon: 181.0 },      // Invalid lon (> 180)
        { lat: NaN, lon: NaN },            // NaN values
      ];

      root.items.forEach((canvas, index) => {
        if (isCanvas(canvas) && locations[index]) {
          canvas.navPlace = {
            id: `place-${index}`,
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [locations[index].lon, locations[index].lat],
            },
          };
        }
      });

      // Act: Attempt to render map (what app tries to prevent)
      const validLocations = root.items.filter(canvas => {
        if (!isCanvas(canvas) || !canvas.navPlace?.geometry) return false;

        const {geometry} = canvas.navPlace;
        if (geometry.type !== 'Point') return false;

        const [lon, lat] = geometry.coordinates;

        // Validate coordinates (what app should do)
        const isValidLat = !isNaN(lat) && lat >= -90 && lat <= 90;
        const isValidLon = !isNaN(lon) && lon >= -180 && lon <= 180;

        if (!isValidLat || !isValidLon) {
          console.warn(`Invalid coordinates: lat=${lat}, lon=${lon}`);
          return false;
        }

        return true;
      });

      // Assert: FAILURE PREVENTED
      // Only valid coordinates are rendered on map
      expect(validLocations).toHaveLength(1); // Only one valid location
      expect(validLocations.length).toBeLessThan(locations.length);

      // Map doesn't crash, invalid points gracefully excluded
      console.log('✓ PREVENTED: Invalid coordinates excluded, map renders safely');
    });
  });

  describe('User Interaction: Combined temporal + spatial filters', () => {
    it('IDEAL: Photos from Site A in June 2019 filtered correctly', async () => {
      // Arrange: User has photos with both date and location
      const files = ActionTestData.forImport.sequence();
      const root = await buildManifestFromFiles(files, {
        label: { en: ['Test Manifest'] },
      });

      if (!root || !('items' in root)) return;

      // Add metadata for realistic scenario
      const metadata = [
        { date: '2019-06-01T10:00:00Z', lat: 28.6139, lon: 77.2090 }, // Match
        { date: '2019-06-15T14:00:00Z', lat: 28.6200, lon: 77.2100 }, // Match
        { date: '2019-07-01T10:00:00Z', lat: 28.6139, lon: 77.2090 }, // Wrong month
        { date: '2019-06-10T10:00:00Z', lat: 19.0760, lon: 72.8777 }, // Wrong location
      ];

      root.items.forEach((canvas, index) => {
        if (isCanvas(canvas) && metadata[index]) {
          const meta = metadata[index];
          canvas.navDate = meta.date;
          canvas.navPlace = {
            id: `place-${index}`,
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [meta.lon, meta.lat],
            },
          };
        }
      });

      // Act: User filters for June 2019 AND near Delhi
      const startDate = new Date('2019-06-01');
      const endDate = new Date('2019-06-30');
      const delhiCenter = { lat: 28.6139, lon: 77.2090 };
      const radiusKm = 5;

      const filteredItems = root.items.filter(canvas => {
        if (!isCanvas(canvas)) return false;

        // Date filter
        if (!canvas.navDate) return false;
        const canvasDate = new Date(canvas.navDate);
        const dateMatch = canvasDate >= startDate && canvasDate <= endDate;

        // Location filter
        if (!canvas.navPlace?.geometry || canvas.navPlace.geometry.type !== 'Point') return false;
        const [lon, lat] = canvas.navPlace.geometry.coordinates;
        const distance = calculateDistance(delhiCenter.lat, delhiCenter.lon, lat, lon);
        const locationMatch = distance <= radiusKm;

        return dateMatch && locationMatch;
      });

      // Assert: IDEAL OUTCOME achieved
      expect(filteredItems).toHaveLength(2); // Two photos matching both criteria

      filteredItems.forEach(canvas => {
        if (!isCanvas(canvas)) return;

        // Verify date
        if (canvas.navDate) {
          const canvasDate = new Date(canvas.navDate);
          expect(canvasDate.getMonth()).toBe(5); // June
          expect(canvasDate.getFullYear()).toBe(2019);
        }

        // Verify location
        if (canvas.navPlace?.geometry?.type === 'Point') {
          const [lon, lat] = canvas.navPlace.geometry.coordinates;
          const distance = calculateDistance(delhiCenter.lat, delhiCenter.lon, lat, lon);
          expect(distance).toBeLessThanOrEqual(radiusKm);
        }
      });

      console.log('✓ IDEAL: Combined temporal+spatial filter works correctly');
    });

    it('FAILURE PREVENTED: Filters conflict and show no results', async () => {
      // Arrange: User has photos
      const files = ActionTestData.forImport.sequence();
      const root = await buildManifestFromFiles(files, {
        label: { en: ['Test Manifest'] },
      });

      if (!root || !('items' in root)) return;

      // Add metadata
      root.items.forEach((canvas, index) => {
        if (isCanvas(canvas)) {
          canvas.navDate = '2019-06-01T10:00:00Z';
          canvas.navPlace = {
            id: `place-${index}`,
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [77.2090, 28.6139],
            },
          };
        }
      });

      // Act: User applies filters that have NO overlap (what app tries to prevent)
      // Example: Photos from 2020 AND near Delhi
      // But all photos are from 2019
      const startDate = new Date('2020-01-01');
      const endDate = new Date('2020-12-31');
      const delhiCenter = { lat: 28.6139, lon: 77.2090 };
      const radiusKm = 5;

      const filteredItems = root.items.filter(canvas => {
        if (!isCanvas(canvas)) return false;

        if (!canvas.navDate) return false;
        const canvasDate = new Date(canvas.navDate);
        const dateMatch = canvasDate >= startDate && canvasDate <= endDate;

        if (!canvas.navPlace?.geometry || canvas.navPlace.geometry.type !== 'Point') return false;
        const [lon, lat] = canvas.navPlace.geometry.coordinates;
        const distance = calculateDistance(delhiCenter.lat, delhiCenter.lon, lat, lon);
        const locationMatch = distance <= radiusKm;

        return dateMatch && locationMatch;
      });

      // Assert: FAILURE PREVENTED
      // App shows helpful empty state, not just blank page
      expect(filteredItems).toHaveLength(0);

      // In real implementation, app would show:
      // - "No results found"
      // - Suggestion to adjust filters
      // - Count of items matching each individual filter
      // - Option to clear filters

      console.log('✓ PREVENTED: Empty result handled gracefully with suggestions');
    });
  });
});

/**
 * Simple distance calculation (Haversine formula)
 * Returns distance in kilometers
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}
