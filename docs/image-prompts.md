# Image prompts for ChatGPT

One prompt per image slot in `frontend/src/lib/images.ts`. Save each approved image as
`frontend/public/images/<key>.webp` and add `<key>: "<key>.webp"` to `localPhotos` in that file.

Every image is a wide landscape (ChatGPT's 1536×1024 size). Add this line to the end of every prompt:

> Photorealistic travel photograph, natural light, landscape 3:2, no text, no watermark, no logos.

## Holiday and travel images (safe to generate)

| Key | Used on | Prompt |
| --- | --- | --- |
| `flight` | Terms and privacy page banners | View from an airplane window at golden hour, wing over soft clouds, warm sky |
| `petra` | Jordan category and package cards | The Treasury (Al-Khazneh) at Petra seen from the end of the narrow Siq canyon, rose-red sandstone, morning light |
| `petraDay` | 404 page banner, Jordan gallery | Wide view of the Petra Monastery (Ad Deir) in bright daylight, desert hills, a few small distant visitors |
| `istanbul` | Turkey cards, contact page banner | Istanbul skyline at sunset from the Bosphorus, mosque domes and minarets in silhouette, a ferry on the water |
| `cappadocia` | Turkey package card | Cappadocia valley at sunrise, fairy chimney rock formations, soft pink sky |
| `cappadociaBalloons` | Turkey gallery | Dozens of hot-air balloons rising over Cappadocia's valleys at dawn |
| `dubai` | Dubai package card | Dubai skyline with Burj Khalifa on a clear blue day, seen across the water |
| `dubaiNight` | Dubai gallery | Dubai Marina at night, lit towers reflected in the water |
| `thailand` | Thailand package card | Limestone cliffs and turquoise water in Krabi, Thailand, longtail boat on the beach |
| `thailandBoats` | Thailand gallery | Colourful longtail boats moored in a calm Thai bay, tropical islands behind |
| `singapore` | Asia category, Singapore card | Singapore Gardens by the Bay Supertrees at dusk, city skyline behind |
| `marinaBay` | Singapore gallery | Marina Bay Sands and the Singapore skyline at blue hour, reflections in the bay |
| `kashmir` | India category, Kashmir card | Snow-capped Himalayan peaks above green meadows in Gulmarg, Kashmir, pine forest |
| `kashmirLake` | Kashmir gallery | Shikara boats and wooden houseboats on Dal Lake, Srinagar, mountains in morning mist |
| `bali` | Bali package card | Tegallalang rice terraces in Bali, lush green, palm trees, morning light |
| `kerala` | Kerala package card | Kerala backwaters with a traditional houseboat, coconut palms lining the water |
| `goa` | Goa package card | Quiet Goa beach at sunset, palm trees, gentle waves, golden sand |
| `tajMahal` | Taj Mahal package card | The Taj Mahal at sunrise seen across the long reflecting pool, soft haze |

## Holy sites (decide first)

These pages are for pilgrims, who know these places closely; AI images often get the architecture wrong.
The recommendation is to keep the real photos. Only generate these if you choose to.

| Key | Used on | Prompt |
| --- | --- | --- |
| `kaaba` | Umrah category, packages page banner, About page | The Kaaba in Masjid al-Haram, Makkah, surrounded by pilgrims in white performing tawaf, evening light |
| `kaabaAerial` | Homepage hero, Hajj and Umrah cards | High aerial view over Masjid al-Haram, Makkah, at dusk, the Kaaba at the centre, crowds of pilgrims, illuminated minarets |
| `madinah` | Homepage section, Umrah card | Masjid an-Nabawi in Madinah at sunset, the Green Dome and minarets, open courtyard umbrellas |
| `madinahDome` | About page banner, Umrah card | Close view of the Green Dome of Masjid an-Nabawi, Madinah, against a clear blue sky |
| `madinahInterior` | Umrah gallery | Interior of Masjid an-Nabawi, rows of ornate columns and arches, soft warm light, carpeted prayer hall |
| `najaf` | Iraq category and card, About page | The Imam Ali Shrine in Najaf, Iraq, golden dome and minarets, pilgrims in the courtyard, evening light |
| `najafTower` | Iraq gallery | Golden minaret of the Imam Ali Shrine, Najaf, against a deep blue evening sky |
| `domeOfTheRock` | Palestine category and card | The Dome of the Rock, Jerusalem, golden dome and blue tile facade, clear morning sky |
| `aqsa` | Palestine gallery | Al-Aqsa Mosque in Jerusalem with its silver-grey dome, surrounding courtyard and olive trees |
