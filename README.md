# Pixieset EXIF

Malé rozšírenie pre Arc a Chrome, ktoré pri fotkách v Pixieset galériách zobrazuje ohnisko, clonu, čas, ISO, telo a údaj o blesku.

## Inštalácia v Arcu

1. Rozbaľ release ZIP. Vyberáš priečinok obsahujúci `manifest.json`.
2. V Arcu otvor `arc://extensions` (prípadne `chrome://extensions`).
3. Zapni **Developer mode** a klikni na **Load unpacked**.
4. Vyber priečinok s rozšírením (`dist` pri lokálnom builde).
5. Otvor ikonu **Pixieset EXIF** a zapni **Zobrazovať údaje**.
6. Obnov už otvorenú galériu. Údaje sa dopĺňajú pri scrollovaní.

Vypínač platí pre všetky podporované galérie. Predvolene je rozšírenie vypnuté. Po aktualizácii súborov klikni v správe rozšírení na Reload a obnov galériu.

## Verzia 0.2.0

- Pásik: ohnisko, použitá clona, čas, ISO a farebný blesk ⚡️ iba pri zaznamenanom odpálení. Pri neznámom údaji je `Blesk: ?`; pri nepoužitom blesku sa nič nezobrazuje.
- Fotoaparát vľavo a dostupný objektív vpravo v druhom riadku.
- Výber zobrazených polí, písmo 10–16 px, krytie pozadia 35–95 % a režim stále / pri prejdení myšou. Nastavenia sa ukladajú lokálne a účinkujú bez obnovenia stránky.
- V okne rozšírenia je prehľad už skontrolovaných fotiek: telá, objektívy, použité clony, rozsah ISO a podiel zaznamenaného blesku.
- Prehľad rozlišuje EXIF, chýbajúce údaje a chyby. Blesk sa počíta iba z fotiek so známym údajom; chyby sa do percenta nepočítajú.
- Náhľad a detail tej istej fotky sa započítajú raz. Prehľad sa obnovuje počas otvoreného okna, ostáva po vypnutí a resetuje sa pri obnovení stránky alebo zmene sekcie.
- Prehľad pokrýva iba už skontrolované fotky v aktuálnej karte, nie automaticky celú galériu. Počet rozpoznaných fotiek je počet unikátnych fotiek práve dostupných v DOM, nie celkový počet galérie.
- Dve súbežné požiadavky na kartu a cache do 500 výsledkov v background workeri. Zmena vzhľadu nespúšťa nové čítanie metadát.
- Číta JPEG z `images.pixieset.com` bez účtu, servera či externého API.
- Po Reload rozšírenia treba obnoviť aj galériu; starý zneplatnený skript sa bezpečne zastaví.

EXIF je záznam fotoaparátu. Blesk bez komunikácie s telom nemusí byť zaznamenaný. „Automatický režim“ nie je potvrdenie TTL. Výkon blesku a MakerNotes táto verzia nečíta. EXIF môže chýbať aj v niektorých rozmerových verziách fotografie; adresy originálov nehádame. Vlastné domény fotografov a iné formáty než JPEG zatiaľ nie sú podporované.

## Vývoj

Node.js 24 LTS, npm.

```sh
npm ci
npm run check
```

Výstup je `dist/`. Stack: TypeScript, esbuild, exifr, Manifest V3, Vitest a jsdom. Používame esbuild namiesto plánovaného Vite: pre tri malé skripty postačuje a znižuje množstvo konfigurácie.

## Súkromie a oprávnenia

Rozšírenie nemá telemetriu a neposiela fotografie žiadnej ďalšej službe. Po zapnutí číta časti fotografií priamo z Pixieset CDN. Neukladá obrazové súbory. Lokálne si pamätá vypínač a vzhľad pásika; pamäťová cache obsahuje len vybrané metadáta a môže sa vymazať pri uspatí service workera. GPS sa neparsuje ani nezobrazuje.

Oprávnenia: skript na `https://*.pixieset.com/*`, čítanie JPEG z `https://images.pixieset.com/*`, lokálne nastavenie cez `storage`. Žiadny prístup ku všetkým webom.

## Overenie

Automatické testy kontrolujú interpretáciu blesku, formátovanie, povolené URL, čiastočné načítanie JPEG, skutočný EXIF parser na syntetickej vzorke, aktiváciu, zmenu zdroja fotografie a vypnutie. Ďalšie testy kontrolujú migráciu nastavení, hover, deduplikáciu, zmenu sekcie, správny menovateľ percenta blesku a ukladanie volieb v okne. Reálne náhľady aj veľká verzia z testovacej galérie boli overené parserom. Súkromné fotografie nie sú súčasťou repozitára.

Verzia 0.1 bola používateľom overená v Arcu. Nové nastavenia a prehľad boli overené v lokálnom integračnom náhľade so skutočnými skriptmi a adaptérom Chrome API; verziu 0.2 treba ešte potvrdiť priamo v Arcu; automatické testy nie sú testom nainštalovaného rozšírenia.

## Ďalšia verzia

Analýza celej sekcie na vyžiadanie, zvýrazňovanie podľa nastavení, prístupnejší detail a viac rozložení Pixiesetu. Výkon blesku až po nájdení vzoriek s podporovanými údajmi výrobcu.
