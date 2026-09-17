# Vehicle photos

One folder per vehicle, named with the car's slug (the last part of its public
URL). Drop image files straight in, then run:

```bash
npm run photos:sync
```

Files are sorted by name, so **the first file is the cover photo** on the fleet
grid. Name them `01.jpg`, `02.jpg`, `03.jpg`… to control the order.

| Vehicle | Folder |
|---|---|
| 2021 Lamborghini Urus | `2021-lamborghini-urus/` |
| 2023 Mercedes-Benz GLS 600 Maybach | `2023-mercedes-benz-gls-600-maybach/` |
| 2024 Mercedes-AMG C63 S E Performance | `2024-mercedes-amg-c63-s-e-performance/` |
| 2022 Cadillac Escalade | `2022-cadillac-escalade/` |
| 2019 BMW M5 | `2019-bmw-m5/` |
| 2019 BMW M550i | `2019-bmw-m550i/` |
| 2020 Dodge Charger Scat Pack | `2020-dodge-charger-scat-pack/` |
| 2023 BMW 330i | `2023-bmw-330i/` |
| 2017 Honda Accord | `2017-honda-accord/` |

## Getting the photos off Instagram

Instagram's post images aren't reachable programmatically without an
authenticated Graph API token, and the CDN URLs it hands out are signed and
expire — so they can't be linked to directly from the site. Save your own posts
from the Instagram app or web (they're your images), then drop the files here.

Shoot notes, if you're taking new ones: landscape, 3:2 or 16:9, front
three-quarter angle as the cover shot, plus interior, rear three-quarter and
wheels. Aim for at least 1600px wide.
