// Free photos from Unsplash (Unsplash License: free for commercial use, no attribution required).
// Swap any entry for Dilruba's own group photos when available - real photos build more trust.
//
// Values are either a short Unsplash photo id (from unsplash.com/photos/<id>)
// or a full CDN id beginning with "photo-".

const photos = {
  kaaba: "KbtfseYfgaE",
  kaabaAerial: "66Tu10CxYY0",
  madinah: "OOfDylEcDs8",
  madinahDome: "RJjHsurofj8",
  madinahInterior: "iEAe4sbrlec",
  najaf: "JOJG_K-M-iQ",
  najafTower: "pfFiqCkilXQ",
  petra: "5_Bu25SV6X8",
  petraDay: "k8-5bWDAklo",
  domeOfTheRock: "7Yuq-xAnSxk",
  aqsa: "m1A-loL3jg8",
  istanbul: "oMjSuVvQ8YQ",
  cappadocia: "SagXn7H6HFg",
  cappadociaBalloons: "UeX_qw9lnzc",
  dubai: "Bu435tjPsvk",
  dubaiNight: "lRCWtOEPwiY",
  thailand: "AcZKzxHzVe4",
  thailandBoats: "Xv1HdJ3S940",
  singapore: "7wQ2dCc4dQ4",
  marinaBay: "w3Y2cbwhl6w",
  kashmir: "hcRK-x_H21g",
  kashmirLake: "XHG0uFAlEGM",
  bali: "photo-1537996194471-e657df975ab4",
  kerala: "photo-1602216056096-3b40cc0c9944",
  tajMahal: "photo-1564507592333-c60657eea523",
  goa: "photo-1512343879784-a960bf40e7f2",
  flight: "photo-1436491865332-7a61a109cc05",
} as const;

export type PhotoKey = keyof typeof photos;

// Our own images in public/images/, used instead of the Unsplash photo for that key.
// Add an entry here when an image is approved; keys left out keep their Unsplash photo.
const localPhotos: Partial<Record<PhotoKey, string>> = {
  flight: "flight.webp",
  petra: "petra.webp",
  petraDay: "petraDay.webp",
  istanbul: "istanbul.webp",
  cappadocia: "cappadocia.webp",
  cappadociaBalloons: "cappadociaBalloons.webp",
  dubai: "dubai.webp",
  dubaiNight: "dubaiNight.webp",
  thailand: "thailand.webp",
  thailandBoats: "thailandBoats.webp",
  singapore: "singapore.webp",
  marinaBay: "marinaBay.webp",
  kashmir: "kashmir.webp",
  kashmirLake: "kashmirLake.webp",
  bali: "bali.webp",
  kerala: "kerala.webp",
  goa: "goa.webp",
  tajMahal: "tajMahal.webp",
  kaaba: "kaaba.webp",
  kaabaAerial: "kaabaAerial.webp",
  madinah: "madinah.webp",
  madinahDome: "madinahDome.webp",
  madinahInterior: "madinahInterior.webp",
  najaf: "najaf.webp",
  najafTower: "najafTower.webp",
  domeOfTheRock: "domeOfTheRock.webp",
  aqsa: "aqsa.webp",
};

export function photo(key: PhotoKey, width = 1600) {
  const local = localPhotos[key];
  // next/image resizes local files itself, so the requested width only matters for Unsplash.
  if (local) return `/images/${local}`;

  const id = photos[key];
  if (id.startsWith("photo-")) {
    return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=80`;
  }
  return `https://unsplash.com/photos/${id}/download?w=${width}`;
}
