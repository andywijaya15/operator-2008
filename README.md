# OPERATOR 2008 - Shift Malam

Game simulasi analog horror kasir warnet era 2000-an berbasis HTML5 & Web Audio API murni.

## Cerita
Pukul 02:00 WIB di Warnet Berkah Jaya. Kamu memegang shift malam sendirian hingga pukul 03:00 WIB. Tugasmu tampak sederhana: layani perpanjangan paket billing, cetak dokumen, pantau CCTV 4-channel... sampai PC di Bilik 4 menyala sendiri.

## Fitur
- **Authentic Windows XP & Billing Explorer UI**: Interface bergaya retro klasik cyber cafe Indonesia.
- **Procedural Surveillance CCTV**: 4 kamera keamanan (Kasir, Lorong, Bilik 4, Pintu Luar) dengan efek night-vision & static glitch.
- **Native Synthesized Audio**: Sound effects (beep, alarm, camera interference) dibuat langsung via Web Audio API tanpa perlu download asset audio eksternal.
- **Cross-Platform**: Ringan, responsif, dan langsung bisa dimainkan di browser PC/Steam Deck maupun smartphone.

## Kontrol
- **Mouse / Trackpad / Layar Sentuh**: Klik tombol pada billing table untuk menambah waktu (`+1 Jam`) atau restart komputer (`Restart`).
- **CCTV**: Klik tab CAM 1 - 4 untuk memeriksa situasi lorong dan bilik warnet.

## Jalankan Lokal
Buka file `index.html` langsung di browser, atau jalankan local server:
```bash
python3 -m http.server 8080
```
Lalu buka `http://localhost:8080`.
