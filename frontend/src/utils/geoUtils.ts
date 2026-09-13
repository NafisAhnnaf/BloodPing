/**
 * Utility functions for geographical calculations.
 */

/**
 * Calculates the great-circle distance between two coordinates in kilometers using the Haversine formula.
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (lat1 === lat2 && lon1 === lon2) return 0;
  
  const R = 6371; // Earth's radius in kilometers
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
      
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance * 10) / 10;
}

export const BANGLADESH_DISTRICT_COORDS: Record<string, { lat: number; lng: number }> = {
  bogura: { lat: 24.8465, lng: 89.3770 },
  bogra: { lat: 24.8465, lng: 89.3770 },
  dhaka: { lat: 23.8103, lng: 90.4125 },
  chittagong: { lat: 22.3569, lng: 91.7832 },
  chattogram: { lat: 22.3569, lng: 91.7832 },
  sylhet: { lat: 24.8949, lng: 91.8687 },
  rajshahi: { lat: 24.3745, lng: 88.6042 },
  khulna: { lat: 22.8456, lng: 89.5403 },
  barishal: { lat: 22.7010, lng: 90.3535 },
  barisal: { lat: 22.7010, lng: 90.3535 },
  rangpur: { lat: 25.7439, lng: 89.2752 },
  mymensingh: { lat: 24.7471, lng: 90.4203 },
  cumilla: { lat: 23.4607, lng: 91.1809 },
  comilla: { lat: 23.4607, lng: 91.1809 },
  gazipur: { lat: 23.9999, lng: 90.4203 },
  narayanganj: { lat: 23.6238, lng: 90.5000 },
  coxsbazar: { lat: 21.4272, lng: 92.0058 },
  "cox's bazar": { lat: 21.4272, lng: 92.0058 },
  jessore: { lat: 23.1664, lng: 89.2081 },
  jashore: { lat: 23.1664, lng: 89.2081 },
  dinajpur: { lat: 25.6217, lng: 88.6355 },
  tangail: { lat: 24.2513, lng: 89.9167 },
  pabna: { lat: 24.0064, lng: 89.2372 },
  kushtia: { lat: 23.9013, lng: 89.1205 },
  faridpur: { lat: 23.6071, lng: 89.8426 },
  noakhali: { lat: 22.8696, lng: 91.0994 },
  feni: { lat: 23.0187, lng: 91.3966 },
  brahmanbaria: { lat: 23.9571, lng: 91.1119 },
  sirajganj: { lat: 24.4534, lng: 89.7008 },
  naogaon: { lat: 24.7936, lng: 88.9318 },
  natore: { lat: 24.4206, lng: 88.9324 },
  chapainawabganj: { lat: 24.5965, lng: 88.2775 },
  nawabganj: { lat: 24.5965, lng: 88.2775 },
  gaibandha: { lat: 25.3288, lng: 89.5430 },
  kurigram: { lat: 25.8054, lng: 89.6362 },
  lalmonirhat: { lat: 25.9165, lng: 89.4532 },
  nilphamari: { lat: 25.9318, lng: 88.8560 },
  panchagarh: { lat: 26.3411, lng: 88.5542 },
  thakurgaon: { lat: 26.0337, lng: 88.4617 },
  habiganj: { lat: 24.3750, lng: 91.4155 },
  moulvibazar: { lat: 24.4829, lng: 91.7774 },
  sunamganj: { lat: 25.0658, lng: 91.3950 },
  bagerhat: { lat: 22.6516, lng: 89.7859 },
  satkhira: { lat: 22.7185, lng: 89.0705 },
  chuadanga: { lat: 23.6402, lng: 88.8418 },
  meherpur: { lat: 23.7622, lng: 88.6318 },
  jhenaidah: { lat: 23.5448, lng: 89.1539 },
  magura: { lat: 23.4873, lng: 89.4199 },
  narail: { lat: 23.1725, lng: 89.5120 },
  bhola: { lat: 22.6859, lng: 90.6481 },
  patuakhali: { lat: 22.3596, lng: 90.3299 },
  barguna: { lat: 22.0953, lng: 90.1121 },
  pirojpur: { lat: 22.5841, lng: 89.9720 },
  jhalokati: { lat: 22.6406, lng: 90.1987 },
  chandpur: { lat: 23.2333, lng: 90.6667 },
  lakshmipur: { lat: 22.9425, lng: 90.8412 },
  kishoreganj: { lat: 24.4449, lng: 90.7766 },
  manikganj: { lat: 23.8617, lng: 90.0003 },
  munshiganj: { lat: 23.5422, lng: 90.5305 },
  narsingdi: { lat: 23.9193, lng: 90.7202 },
  rajbari: { lat: 23.7574, lng: 89.6445 },
  shariatpur: { lat: 23.2423, lng: 90.4348 },
  gopalganj: { lat: 23.0051, lng: 89.8266 },
  madaripur: { lat: 23.1641, lng: 90.1897 },
  jamalpur: { lat: 24.9375, lng: 89.9378 },
  netrokona: { lat: 24.8709, lng: 90.7279 },
  sherpur: { lat: 25.0205, lng: 90.0153 },
  bandarban: { lat: 22.1953, lng: 92.2184 },
  khagrachhari: { lat: 23.1193, lng: 91.9847 },
  rangamati: { lat: 22.7324, lng: 92.2985 },
};

export function resolveBangladeshDistrictCoords(text: string): { lat: number; lng: number; districtName: string } | null {
  if (!text) return null;
  const normalized = text.toLowerCase();
  
  for (const [key, coords] of Object.entries(BANGLADESH_DISTRICT_COORDS)) {
    const regex = new RegExp(`\\b${key}\\b`, 'i');
    if (regex.test(normalized)) {
      return { ...coords, districtName: key.charAt(0).toUpperCase() + key.slice(1) };
    }
  }
  return null;
}
