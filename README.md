# Pixieset EXIF

Malé rozšírenie pre Arc a Chrome, ktoré pri fotkách v Pixieset galériách zobrazuje ohnisko, clonu, čas, ISO, telo a údaj o blesku.

## Inštalácia v Arcu

1. Rozbaľ release ZIP. Vyberáš priečinok obsahujúci `manifest.json`.
2. V Arcu otvor `arc://extensions` (prípadne `chrome://extensions`).
3. Zapni **Developer mode** a klikni na **Load unpacked**.
4. Vyber priečinok s rozšírením (`dist` pri lokálnom builde).
5. Otvor ikonu **Pixieset EXIF** a zapni **Zobrazovať EXIF v Pixiesete**.
6. Obnov už otvorenú galériu. Údaje sa dopĺňajú pri scrollovaní.

Vypínač platí pre všetky podporované galérie. Predvolene je rozšírenie vypnuté. Po aktualizácii súborov klikni v správe rozšírení na Reload a obnov galériu.

## Verzia 0.1.0

- Kompaktné pásiky v mriežke a v podporovaných detailoch fotografie.
- Ohnisko, clona, čas, ISO, telo, blesk áno/nie a dostupný základný režim.
- Postupné načítavanie, dve súbežné požiadavky na kartu a cache do 500 výsledkov v background workeri.
- Rozlišuje chýbajúci EXIF a chybu načítania.
- Číta JPEG z `images.pixieset.com` bez účtu, servera či externého API.

EXIF je záznam fotoaparátu. Blesk bez komunikácie s telom nemusí byť zaznamenaný. „Automatický režim“ nie je potvrdenie TTL. Výkon blesku a MakerNotes táto verzia nečíta. EXIF môže chýbať aj v niektorých rozmerových verziách fotografie; adresy originálov nehádame. Vlastné domény fotografov a iné formáty než JPEG zatiaľ nie sú podporované.

## Vývoj

Node.js 24 LTS, npm.

```sh
npm ci
npm run check
```

Výstup je `dist/`. Stack: TypeScript, esbuild, exifr, Manifest V3, Vitest a jsdom. Používame esbuild namiesto plánovaného Vite: pre tri malé skripty postačuje a znižuje množstvo konfigurácie.

## Súkromie a oprávnenia

Rozšírenie nemá telemetriu a neposiela fotografie žiadnej ďalšej službe. Po zapnutí číta časti fotografií priamo z Pixieset CDN. Neukladá obrazové súbory. Lokálne si pamätá vypínač; pamäťová cache obsahuje len vybrané metadáta a môže sa vymazať pri uspatí service workera. GPS sa neparsuje ani nezobrazuje.

Oprávnenia: skript na `https://*.pixieset.com/*`, čítanie JPEG z `https://images.pixieset.com/*`, lokálne nastavenie cez `storage`. Žiadny prístup ku všetkým webom.

## Overenie

Automatické testy kontrolujú interpretáciu blesku, formátovanie, povolené URL, čiastočné načítanie JPEG, skutočný EXIF parser na syntetickej vzorke, aktiváciu, zmenu zdroja fotografie a vypnutie. Reálne náhľady aj veľká verzia z testovacej galérie boli overené parserom. Súkromné fotografie nie sú súčasťou repozitára.

Pred širším publikovaním treba manuálne potvrdiť inštaláciu a správanie v Arcu; automatické testy nie sú testom nainštalovaného rozšírenia.

## Ďalšia verzia

Ponuka po overení vzorky, výber polí, prístupnejší detail a viac rozložení Pixiesetu. Výkon blesku až po nájdení vzoriek s podporovanými údajmi výrobcu.
