// OPERATOR 2008 - Game Engine
// Minimalist, Native Web Audio & Canvas Procedural Horror Simulator

(function () {
  "use strict";

  // --- Sound Engine (Native Web Audio API, Zero External Assets) ---
  const AudioEngine = {
    ctx: null,
    init() {
      if (!this.ctx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();
      }
      if (this.ctx.state === "suspended") {
        this.ctx.resume();
      }
    },
    beep(freq = 800, duration = 0.08, type = "sine") {
      if (!this.ctx) return;
      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
      } catch (e) {}
    },
    notify() {
      this.beep(659, 0.08, "triangle");
      setTimeout(() => this.beep(880, 0.12, "triangle"), 90);
    },
    alarm() {
      this.beep(400, 0.15, "sawtooth");
      setTimeout(() => this.beep(320, 0.25, "sawtooth"), 120);
    },
    staticBurst() {
      if (!this.ctx) return;
      try {
        const bufferSize = this.ctx.sampleRate * 0.15;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);
        noise.connect(gain);
        gain.connect(this.ctx.destination);
        noise.start();
      } catch (e) {}
    }
  };

  // --- Game State ---
  const GameState = {
    timeMinutes: 120, // 02:00 WIB (120 min) to 03:00 WIB (180 min)
    cash: 12000,
    power: 100,
    currentCam: 0,
    isSpookyEventActive: false,
    gameActive: false,
    bilik4EntityPresent: false,

    clients: [
      { id: 1, user: "Budi_PB", pkg: "Paket 2 Jam", timeLeft: 18, status: "Online" },
      { id: 2, user: "Rian_Dota", pkg: "Paket Malam", timeLeft: 45, status: "Online" },
      { id: 3, user: "Doni_Kaskus", pkg: "Reguler 1 Jam", timeLeft: 8, status: "Warning" },
      { id: 4, user: "[KOSONG]", pkg: "-", timeLeft: 0, status: "Offline" },
      { id: 5, user: "Agus_CS16", pkg: "Paket 3 Jam", timeLeft: 32, status: "Online" },
      { id: 6, user: "Dina_Tugas", pkg: "Reguler 1 Jam", timeLeft: 14, status: "Online" },
      { id: 7, user: "[KOSONG]", pkg: "-", timeLeft: 0, status: "Offline" },
      { id: 8, user: "Eko_Audition", pkg: "Paket Malam", timeLeft: 52, status: "Online" }
    ],

    chatMessages: [
      { sender: "Sistem", text: "Shift malam dimulai. Jam operasional 02:00 - 03:00.", type: "in" }
    ]
  };

  // DOM Elements
  const DOM = {
    clock: document.getElementById("clock-display"),
    cash: document.getElementById("cash-display"),
    power: document.getElementById("power-display"),
    alert: document.getElementById("status-alert"),
    clientList: document.getElementById("client-list"),
    chatLog: document.getElementById("chat-log"),
    chatTitle: document.getElementById("chat-title"),
    chatInput: document.getElementById("chat-input"),
    chatReplyBtn: document.getElementById("chat-reply-btn"),
    cctvCanvas: document.getElementById("cctv-canvas"),
    cctvOverlayText: document.getElementById("cctv-overlay-text"),
    cctvButtons: document.querySelectorAll(".cctv-btn"),
    startModal: document.getElementById("start-screen"),
    btnStart: document.getElementById("btn-start"),
    gameOverModal: document.getElementById("game-over-modal"),
    gameOverTitle: document.getElementById("game-over-title"),
    gameOverMsg: document.getElementById("game-over-msg"),
    btnRestart: document.getElementById("btn-restart"),
    trayTime: document.getElementById("tray-time")
  };

  // --- Helpers ---
  function formatWIB(totalMinutes) {
    const hours = Math.floor(totalMinutes / 60) % 24;
    const mins = totalMinutes % 60;
    const pad = (n) => String(n).padStart(2, "0");
    return `${pad(hours)}:${pad(mins)}`;
  }

  function formatRp(val) {
    return "Rp " + val.toLocaleString("id-ID");
  }

  // --- Render Functions ---
  function renderClients() {
    DOM.clientList.innerHTML = "";
    GameState.clients.forEach((c) => {
      const tr = document.createElement("tr");
      if (c.status === "GLITCH" || c.status === "CORRUPT") {
        tr.className = "danger-row";
      }

      const actions = c.status === "Offline"
        ? `<span style="color:#888">-</span>`
        : `
          <button class="xp-btn btn-sm btn-add" data-id="${c.id}" data-act="add">+1 Jam</button>
          <button class="xp-btn btn-sm btn-kick" data-id="${c.id}" data-act="reset">Restart</button>
        `;

      tr.innerHTML = `
        <td><strong>PC ${c.id}</strong></td>
        <td>${c.user}</td>
        <td>${c.pkg}</td>
        <td>${c.timeLeft > 0 ? c.timeLeft + " mnt" : "0 mnt"}</td>
        <td><span class="badge-${c.status.toLowerCase()}">${c.status}</span></td>
        <td>${actions}</td>
      `;
      DOM.clientList.appendChild(tr);
    });
  }

  function renderChat() {
    DOM.chatLog.innerHTML = "";
    GameState.chatMessages.forEach((msg) => {
      const div = document.createElement("div");
      div.className = `chat-bubble ${msg.type}`;
      div.innerHTML = `<strong>${msg.sender}:</strong> ${msg.text}`;
      DOM.chatLog.appendChild(div);
    });
    DOM.chatLog.scrollTop = DOM.chatLog.scrollHeight;
  }

  function addChatMessage(sender, text, type = "in") {
    GameState.chatMessages.push({ sender, text, type });
    renderChat();
    if (type === "spooky") {
      AudioEngine.alarm();
      DOM.chatTitle.textContent = "⚠️ PERINGATAN SISTEM: PESAN TIDAK DIKENAL!";
      DOM.chatTitle.style.color = "#ffcccc";
    } else {
      AudioEngine.notify();
      DOM.chatTitle.textContent = `💬 Pesan Baru dari ${sender}`;
    }
  }

  // --- CCTV Advanced Procedural Renderer ---
  const ctx = DOM.cctvCanvas.getContext("2d");
  let cctvFrame = 0;
  let trackingBarY = 0;
  const dustParticles = Array.from({ length: 28 }, () => ({
    x: Math.random() * 480,
    y: Math.random() * 360,
    r: Math.random() * 2 + 0.8,
    vx: (Math.random() - 0.5) * 0.4,
    vy: (Math.random() - 0.5) * 0.3,
    alpha: Math.random() * 0.5 + 0.2
  }));

  function drawCCTV() {
    cctvFrame++;
    const w = DOM.cctvCanvas.width;
    const h = DOM.cctvCanvas.height;

    // Base Infrared Dark Tint
    ctx.fillStyle = "#040b05";
    ctx.fillRect(0, 0, w, h);

    ctx.save();

    // Fluorescent flicker factor
    const flicker = Math.sin(cctvFrame * 0.2) > 0.94 ? 0.6 : 1.0;

    if (GameState.currentCam === 0) {
      // === CAM 1: KASIR & OPERATOR DESK ===
      // Ubin lantai keramik
      ctx.strokeStyle = "#0d2212";
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 160);
        ctx.lineTo(x * 1.3 - 60, h);
        ctx.stroke();
      }
      for (let y = 160; y < h; y += 28) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Dinding Kasir & Kalender 2008
      ctx.fillStyle = "#0c1f10";
      ctx.fillRect(0, 0, w, 160);

      // Poster Point Blank / Game jadul di tembok
      ctx.fillStyle = "#122a16";
      ctx.fillRect(40, 30, 75, 95);
      ctx.fillStyle = "#1b3e21";
      ctx.fillRect(45, 35, 65, 55);
      ctx.fillStyle = "#2d6335";
      ctx.font = "8px monospace";
      ctx.fillText("POINT BLANK", 48, 105);
      ctx.fillText("2008 TOURNAMENT", 46, 117);

      // Kalender Sobek 2008
      ctx.fillStyle = "#1d3a22";
      ctx.fillRect(140, 40, 45, 55);
      ctx.fillStyle = "#2e5f37";
      ctx.font = "bold 16px monospace";
      ctx.fillText("01", 152, 72);
      ctx.font = "7px monospace";
      ctx.fillText("NOV 2008", 144, 86);

      // Jam Dinding Analog
      ctx.beginPath();
      ctx.arc(225, 55, 22, 0, Math.PI * 2);
      ctx.fillStyle = "#142c18";
      ctx.fill();
      ctx.strokeStyle = "#27562f";
      ctx.stroke();
      // Jarum jam
      const secAngle = (cctvFrame * 0.05) % (Math.PI * 2);
      ctx.beginPath();
      ctx.moveTo(225, 55);
      ctx.lineTo(225 + Math.cos(secAngle) * 16, 55 + Math.sin(secAngle) * 16);
      ctx.strokeStyle = "#4da35a";
      ctx.stroke();

      // Etalase Kaca Makanan / Pop Mie di Pojok
      ctx.fillStyle = "#132817";
      ctx.fillRect(360, 40, 105, 120);
      ctx.strokeStyle = "#234c2a";
      ctx.strokeRect(360, 40, 105, 120);
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = "#1e3e24";
        ctx.fillRect(370 + i * 30, 80, 22, 30); // Cup Mie
      }

      // Meja Kasir L-Shape
      ctx.fillStyle = "#18361e";
      ctx.beginPath();
      ctx.moveTo(60, 210);
      ctx.lineTo(440, 210);
      ctx.lineTo(470, 360);
      ctx.lineTo(40, 360);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#24502d";
      ctx.stroke();

      // Monitor CRT Kasir
      ctx.fillStyle = "#0d1f11";
      ctx.fillRect(160, 150, 95, 75); // CRT Case
      // CRT Screen Glow
      const screenGlow = ctx.createLinearGradient(170, 160, 245, 215);
      screenGlow.addColorStop(0, "#195029");
      screenGlow.addColorStop(1, "#0f3219");
      ctx.fillStyle = screenGlow;
      ctx.fillRect(170, 158, 75, 58);
      // Windows UI lines di monitor
      ctx.fillStyle = "#3da859";
      ctx.fillRect(174, 164, 40, 5);
      ctx.fillRect(174, 174, 66, 3);
      ctx.fillRect(174, 182, 50, 3);

      // Keyboard & Mouse
      ctx.fillStyle = "#132817";
      ctx.fillRect(165, 235, 85, 26); // Keyboard beige
      ctx.fillRect(265, 242, 18, 24); // Mouse

      // Gelas Kopi & Asbak
      ctx.fillStyle = "#224729";
      ctx.beginPath();
      ctx.arc(125, 245, 12, 0, Math.PI * 2);
      ctx.fill(); // Asbak
      ctx.fillRect(100, 230, 14, 25); // Cangkir kopi

      // Kursi Operator (kosong, bergoyang lembut)
      const chairSway = Math.sin(cctvFrame * 0.03) * 3;
      ctx.fillStyle = "#0c1b0f";
      ctx.beginPath();
      ctx.ellipse(215 + chairSway, 290, 35, 26, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(205 + chairSway, 260, 20, 28); // Sandaran

    } else if (GameState.currentCam === 1) {
      // === CAM 2: LORONG BILIK (PERSPECTIVE CORRIDOR) ===
      const vpX = 240; // Vanishing point
      const vpY = 130;

      // Lantai Lorong Bersekat
      ctx.fillStyle = "#0b1c0e";
      ctx.beginPath();
      ctx.moveTo(170, vpY);
      ctx.lineTo(310, vpY);
      ctx.lineTo(w + 60, h);
      ctx.lineTo(-60, h);
      ctx.closePath();
      ctx.fill();

      // Ubin garis perspektif lorong
      ctx.strokeStyle = "#133119";
      ctx.lineWidth = 1;
      for (let i = -40; i <= w + 40; i += 50) {
        ctx.beginPath();
        ctx.moveTo(vpX, vpY);
        ctx.lineTo(i, h);
        ctx.stroke();
      }

      // Plafon & Lampu Neon TL
      ctx.fillStyle = "#08150a";
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(w, 0);
      ctx.lineTo(310, vpY);
      ctx.lineTo(170, vpY);
      ctx.closePath();
      ctx.fill();

      // Lampu Neon Panjang
      ctx.fillStyle = flicker > 0.8 ? "#3ea656" : "#173b1f";
      ctx.fillRect(225, 30, 30, 60);

      // Kabel UTP LAN bergantungan di plafon
      ctx.strokeStyle = "#1a4020";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(30, 40);
      ctx.quadraticCurveTo(240, 110, 450, 35);
      ctx.stroke();

      // Partisi Bilik Kiri & Kanan
      // Kiri: Bilik 1, 2, 3, 4
      for (let i = 0; i < 3; i++) {
        const step = i * 45;
        const x1 = 170 - step * 1.5;
        const y1 = vpY + step;
        ctx.fillStyle = "#122a15";
        ctx.fillRect(0, y1, x1, 75);
        ctx.strokeStyle = "#1b4021";
        ctx.strokeRect(0, y1, x1, 75);

        // Nomor Bilik
        ctx.fillStyle = "#3ea656";
        ctx.font = "bold 9px monospace";
        ctx.fillText(`0${i + 1}`, x1 - 25, y1 + 30);

        // Cahaya monitor dari dalam bilik
        ctx.fillStyle = (i === 1) ? "#1f5f30" : "#123a1c";
        ctx.fillRect(x1 - 40, y1 + 35, 18, 25);
      }

      // Kanan: Bilik 5, 6, 7, 8
      for (let i = 0; i < 3; i++) {
        const step = i * 45;
        const x1 = 310 + step * 0.8;
        const y1 = vpY + step;
        ctx.fillStyle = "#102613";
        ctx.fillRect(x1, y1, w - x1, 75);
        ctx.strokeStyle = "#1b4021";
        ctx.strokeRect(x1, y1, w - x1, 75);

        ctx.fillStyle = "#3ea656";
        ctx.font = "bold 9px monospace";
        ctx.fillText(`0${i + 5}`, x1 + 10, y1 + 30);

        ctx.fillStyle = "#143e1e";
        ctx.fillRect(x1 + 25, y1 + 35, 18, 25);
      }

      // Pintu darurat di ujung lorong
      ctx.fillStyle = "#050e06";
      ctx.fillRect(220, vpY - 10, 40, 60);

    } else if (GameState.currentCam === 2) {
      // === CAM 3: BILIK 4 (THE CURSED CORNER) ===
      // Sudut bilik sempit dan mencekam
      ctx.fillStyle = "#0a170c";
      ctx.fillRect(0, 0, w, h);

      // Partisi sekat kayu triplek kusam
      ctx.fillStyle = "#142e18";
      ctx.fillRect(30, 20, 420, 240);
      ctx.strokeStyle = "#204a27";
      ctx.strokeRect(30, 20, 420, 240);

      // Coretan tipe-x khas anak warnet di dinding
      ctx.fillStyle = "#2c5b35";
      ctx.font = "9px monospace";
      ctx.fillText("PB CHEAT DLL 0812xxxx", 60, 60);
      ctx.fillText("DOTA 6.57b ALLSTARS", 290, 75);
      ctx.fillText("BILIK 4 JANGAN SENDIRIAN", 80, 105);

      // Meja Komputer Bilik 4
      ctx.fillStyle = "#18361e";
      ctx.fillRect(50, 190, 380, 130);

      // CPU Case di lantai
      ctx.fillStyle = "#0e2012";
      ctx.fillRect(70, 240, 45, 90);
      // Blinking Power LED
      ctx.fillStyle = (cctvFrame % 14 < 7) ? "#4ef072" : "#1a5e29";
      ctx.fillRect(80, 255, 4, 4);

      // Monitor Tabung CRT Bilik 4
      ctx.fillStyle = "#102313";
      ctx.fillRect(170, 120, 140, 110);
      ctx.strokeStyle = "#25502c";
      ctx.strokeRect(170, 120, 140, 110);

      // Screen Monitor Bilik 4
      const isOnline = GameState.clients[3].status !== "Offline";
      if (isOnline) {
        // Layar nyala aneh
        if (GameState.isSpookyEventActive) {
          ctx.fillStyle = (cctvFrame % 6 < 3) ? "#601212" : "#220808"; // Glitch merah
          ctx.fillRect(182, 132, 116, 86);
          ctx.fillStyle = "#ff5555";
          ctx.font = "bold 11px monospace";
          ctx.fillText("YOU ARE WATCHED", 188, 178);
        } else {
          ctx.fillStyle = "#1b4f28";
          ctx.fillRect(182, 132, 116, 86);
          ctx.fillStyle = "#4ef072";
          ctx.font = "8px monospace";
          ctx.fillText("WARNET 2008 BILLING", 188, 165);
        }
      } else {
        ctx.fillStyle = "#061008"; // Layar mati
        ctx.fillRect(182, 132, 116, 86);
      }

      // Keyboard & mousepad kusam
      ctx.fillStyle = "#122615";
      ctx.fillRect(180, 235, 120, 30);
      ctx.fillRect(320, 245, 25, 20);

      // Kursi Plastik Merah
      ctx.fillStyle = "#17381d";
      ctx.fillRect(195, 275, 90, 75);

      // === ENTITAS PENAMPAKAN DI BILIK 4 ===
      if (GameState.bilik4EntityPresent) {
        // Sosok gelap menjulang di kursi bilik 4
        const twitchX = (Math.random() - 0.5) * 4;
        const twitchY = (Math.random() - 0.5) * 2;

        ctx.fillStyle = "#010401"; // Siluet pekat hitam
        ctx.beginPath();
        // Kepala menunduk patah
        ctx.arc(240 + twitchX, 175 + twitchY, 32, 0, Math.PI * 2);
        ctx.fill();

        // Badan / Jubah membungkuk
        ctx.beginPath();
        ctx.moveTo(195 + twitchX, 290);
        ctx.lineTo(240 + twitchX, 195 + twitchY);
        ctx.lineTo(285 + twitchX, 290);
        ctx.closePath();
        ctx.fill();

        // Lengan kurus panjang memanjang ke keyboard
        ctx.strokeStyle = "#010401";
        ctx.lineWidth = 9;
        ctx.beginPath();
        ctx.moveTo(215 + twitchX, 220);
        ctx.lineTo(205, 245);
        ctx.moveTo(265 + twitchX, 220);
        ctx.lineTo(275, 245);
        ctx.stroke();

        // Mata putih berkedip dingin sesekali
        if (cctvFrame % 30 > 8) {
          ctx.fillStyle = "#c8ffcc";
          ctx.beginPath();
          ctx.arc(230 + twitchX, 172 + twitchY, 3, 0, Math.PI * 2);
          ctx.arc(248 + twitchX, 172 + twitchY, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }

    } else if (GameState.currentCam === 3) {
      // === CAM 4: PINTU MASUK & JALAN SEPI ===
      // Luar warnet malam hari
      ctx.fillStyle = "#030804";
      ctx.fillRect(0, 0, w, h);

      // Jalanan Aspal Basah
      ctx.fillStyle = "#081409";
      ctx.fillRect(0, 200, w, 160);

      // Tiang Lampu Jalan Kuning Redup
      ctx.fillStyle = "#1b3d1f";
      ctx.fillRect(380, 60, 10, 240);
      // Pendaran Cahaya Lampu Merkuri
      const lampGlow = ctx.createRadialGradient(385, 60, 5, 385, 60, 90);
      lampGlow.addColorStop(0, "rgba(90, 180, 100, 0.4)");
      lampGlow.addColorStop(1, "rgba(90, 180, 100, 0)");
      ctx.fillStyle = lampGlow;
      ctx.beginPath();
      ctx.arc(385, 60, 90, 0, Math.PI * 2);
      ctx.fill();

      // Pantulan aspal basah
      ctx.fillStyle = "rgba(45, 95, 52, 0.2)";
      ctx.fillRect(320, 240, 130, 80);

      // Rolling Door Besi Berkarat
      ctx.fillStyle = "#132816";
      ctx.fillRect(30, 20, 320, 200);

      // Garis horizontal rolling door
      ctx.strokeStyle = "#1d3c22";
      ctx.lineWidth = 3;
      for (let y = 30; y < 215; y += 14) {
        ctx.beginPath();
        ctx.moveTo(30, y);
        ctx.lineTo(350, y);
        ctx.stroke();
      }

      // Celah rolling door terbuka di bawah (30cm)
      ctx.fillStyle = "#020502";
      ctx.fillRect(30, 215, 320, 45);

      // Rantai & Gembok Besar di Celah
      ctx.fillStyle = "#2a5431";
      ctx.fillRect(180, 220, 18, 25);

      // Spanduk Warnet di Atas Pintu
      ctx.fillStyle = "#16381c";
      ctx.fillRect(20, 0, 340, 32);
      ctx.strokeStyle = "#275e31";
      ctx.strokeRect(20, 0, 340, 32);
      ctx.fillStyle = "#55d16f";
      ctx.font = "bold 11px monospace";
      ctx.fillText("WARNET BERKAH JAYA - BUKA 24 JAM", 42, 21);

      // Rintik Hujan Halus
      ctx.strokeStyle = "rgba(75, 170, 90, 0.3)";
      ctx.lineWidth = 1;
      for (let i = 0; i < 20; i++) {
        const rx = (cctvFrame * 7 + i * 27) % w;
        const ry = (cctvFrame * 11 + i * 19) % h;
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx - 3, ry + 8);
        ctx.stroke();
      }
    }

    // === PARTICLES: FLOATING DUST MOTES (IR ILLUMINATION) ===
    ctx.fillStyle = "#70d182";
    dustParticles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0) p.x = w;
      if (p.x > w) p.x = 0;
      if (p.y < 0) p.y = h;
      if (p.y > h) p.y = 0;
      ctx.globalAlpha = p.alpha * (Math.sin(cctvFrame * 0.05 + p.x) * 0.3 + 0.7);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1.0;

    // === VCR TRACKING ROLL BAR ===
    trackingBarY = (trackingBarY + 1.2) % h;
    ctx.fillStyle = "rgba(45, 110, 55, 0.15)";
    ctx.fillRect(0, trackingBarY, w, 22);

    // === ANALOG TAPE NOISE ARTIFACTS ===
    const noiseDensity = GameState.isSpookyEventActive ? 0.22 : 0.05;
    const imgData = ctx.getImageData(0, 0, w, h);
    const pix = imgData.data;
    for (let i = 0; i < pix.length; i += 4) {
      if (Math.random() < noiseDensity) {
        const n = Math.random() * 160;
        pix[i] = n * 0.5;     // R
        pix[i + 1] = n * 1.1; // G (Green phosphor night vision)
        pix[i + 2] = n * 0.5; // B
      }
    }
    ctx.putImageData(imgData, 0, 0);

    // === INTERLACED SCANLINES ===
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    for (let y = 0; y < h; y += 3) {
      ctx.fillRect(0, y, w, 1.2);
    }

    // === SECURITY CAMERA LENS VIGNETTE ===
    const vignette = ctx.createRadialGradient(w / 2, h / 2, h * 0.35, w / 2, h / 2, h * 0.75);
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(1, "rgba(0,0,0,0.7)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);

    // === OSD (ON SCREEN DISPLAY) TIMESTAMP & SYSTEM INFO ===
    ctx.fillStyle = "#4ef072";
    ctx.font = "bold 12px monospace";
    ctx.textBaseline = "top";

    const liveSec = String(Math.floor((cctvFrame * 0.1) % 60)).padStart(2, "0");
    const camNames = ["CH 01 - KASIR", "CH 02 - LORONG", "CH 03 - BILIK 4", "CH 04 - PINTU DEPAN"];
    const timeStr = formatWIB(GameState.timeMinutes);

    ctx.fillText(`${camNames[GameState.currentCam]}`, 14, 12);
    ctx.fillText(`2008-11-01 ${timeStr}:${liveSec} WIB`, 14, 28);

    // Blinking REC dot
    if (Math.sin(cctvFrame * 0.15) > 0) {
      ctx.fillStyle = "#ff4444";
      ctx.beginPath();
      ctx.arc(w - 22, 20, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.fillText("REC", w - 54, 14);
    }

    if (GameState.isSpookyEventActive && GameState.currentCam === 2) {
      ctx.fillStyle = "#ff3333";
      ctx.fillText("(!) MOTION DETECTED", w - 170, h - 24);
    }

    ctx.restore();
  }

  // --- Core Game Loop & Scripted Events ---
  function updateUI() {
    const timeStr = formatWIB(GameState.timeMinutes);
    DOM.clock.textContent = `${timeStr} WIB`;
    DOM.trayTime.textContent = timeStr;
    DOM.cash.textContent = formatRp(GameState.cash);
    DOM.power.textContent = `${Math.round(GameState.power)}%`;

    if (GameState.power < 35) {
      DOM.alert.textContent = "PERINGATAN: TEGANGAN DROP!";
      DOM.alert.style.color = "#ff4444";
    } else if (GameState.isSpookyEventActive) {
      DOM.alert.textContent = "ANOMALI TERDETEKSI DI BILIK 4";
      DOM.alert.style.color = "#ffeb3b";
    } else {
      DOM.alert.textContent = "STATUS: NORMAL";
      DOM.alert.style.color = "#66ff66";
    }

    renderClients();
  }

  let tickCount = 0;

  function gameTick() {
    if (!GameState.gameActive) return;

    tickCount++;
    // Tiap 2 detik = 1 menit in-game (Total shift: 60 mnt in-game = ~2 menit real play)
    if (tickCount % 2 === 0) {
      GameState.timeMinutes++;
    }

    // Konsumsi daya listrik
    if (GameState.isSpookyEventActive) {
      GameState.power = Math.max(0, GameState.power - 1.2);
    } else {
      GameState.power = Math.min(100, GameState.power + 0.3);
    }

    // Countdown waktu client
    GameState.clients.forEach((c) => {
      if (c.status === "Online" || c.status === "Warning") {
        if (tickCount % 4 === 0 && c.timeLeft > 0) {
          c.timeLeft--;
        }
        if (c.timeLeft <= 5 && c.timeLeft > 0) {
          c.status = "Warning";
        } else if (c.timeLeft === 0 && c.status !== "Offline" && c.id !== 4) {
          c.status = "Habis";
        }
      }
    });

    // Random customer chat request (Budi / Doni)
    if (tickCount === 6) {
      addChatMessage("Budi_PB", "Mas, billing PC 1 tambahin sejam dong, tanggung war!");
    } else if (tickCount === 24) {
      addChatMessage("Doni_Kaskus", "Mas, ada stok es teh manis gak? Haus nih.");
    }

    // --- Scripted Horror Events ---
    // 02:12 WIB (tick 25): PC 4 nyala sendiri
    if (GameState.timeMinutes === 132 && GameState.clients[3].status === "Offline") {
      GameState.clients[3].status = "GLITCH";
      GameState.clients[3].user = "USER_UNKNOWN";
      GameState.clients[3].pkg = "Paket Tengah Malam";
      GameState.clients[3].timeLeft = 666;
      GameState.bilik4EntityPresent = true;
      GameState.isSpookyEventActive = true;
      AudioEngine.staticBurst();
      addChatMessage("PC_04", "Mas, AC di Bilik 4 kok dingin banget ya?", "spooky");
    }

    // 02:25 WIB (tick 50): Entity kontak lagi bila belum di-restart
    if (GameState.timeMinutes === 145 && GameState.bilik4EntityPresent) {
      AudioEngine.alarm();
      addChatMessage("PC_04", "Jangan cek kamera 3. Tolong jangan lihat.", "spooky");
    }

    // 02:40 WIB: Kejadian kedua jika sudah lolos
    if (GameState.timeMinutes === 160 && !GameState.isSpookyEventActive && Math.random() < 0.6) {
      GameState.clients[3].status = "CORRUPT";
      GameState.clients[3].user = "SYS_ERR_666";
      GameState.clients[3].timeLeft = 99;
      GameState.bilik4EntityPresent = true;
      GameState.isSpookyEventActive = true;
      addChatMessage("PC_04", "Ada yang ketinggalan di bawah meja bilik 4...", "spooky");
    }

    // Kalah kondisi: Power drop ke 0%
    if (GameState.power <= 0) {
      endGame(false, "Listrik warnet mati total. Sosok dari Bilik 4 berdiri tepat di belakang kursimu.");
      return;
    }

    // Menang kondisi: Jam 03:00 WIB
    if (GameState.timeMinutes >= 180) {
      endGame(true, `Selamat! Kamu selamat shift malam sampai 03:00 WIB. Pendapatan terkumpul: ${formatRp(GameState.cash)}`);
      return;
    }

    updateUI();
  }

  function endGame(isWin, message) {
    GameState.gameActive = false;
    DOM.gameOverTitle.textContent = isWin ? "SHIFT SELESAI (SURVIVED)" : "GAME OVER (TEROR BILIK 4)";
    DOM.gameOverMsg.textContent = message;
    DOM.gameOverModal.classList.remove("hidden");
    if (!isWin) {
      AudioEngine.alarm();
    } else {
      AudioEngine.notify();
    }
  }

  // --- User Interactions ---
  DOM.clientList.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    const id = parseInt(btn.dataset.id, 10);
    const act = btn.dataset.act;
    const client = GameState.clients.find((c) => c.id === id);
    if (!client) return;

    AudioEngine.beep(950, 0.05);

    if (act === "add") {
      client.timeLeft += 60;
      client.status = "Online";
      GameState.cash += 3000;
      addChatMessage("Kasir", `Menambah 1 jam untuk PC ${id} (+Rp 3.000)`, "out");
    } else if (act === "reset") {
      // Tombol restart dipakai untuk mengusir glitch bilik 4 atau merestart client
      AudioEngine.staticBurst();
      if (id === 4) {
        client.status = "Offline";
        client.user = "[KOSONG]";
        client.pkg = "-";
        client.timeLeft = 0;
        GameState.isSpookyEventActive = false;
        GameState.bilik4EntityPresent = false;
        addChatMessage("Sistem", `PC 4 berhasil di-restart paksa. Koneksi anomali terputus.`, "in");
      } else {
        client.timeLeft = Math.max(0, client.timeLeft);
        addChatMessage("Sistem", `PC ${id} di-restart.`, "in");
      }
    }
    updateUI();
  });

  // CCTV Cam buttons
  DOM.cctvButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      DOM.cctvButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      GameState.currentCam = parseInt(btn.dataset.cam, 10);
      const names = ["CAM 1: KASIR", "CAM 2: LORONG", "CAM 3: BILIK 4", "CAM 4: PINTU LUAR"];
      DOM.cctvOverlayText.textContent = `${names[GameState.currentCam]} - REC ●`;
      AudioEngine.staticBurst();
      drawCCTV();
    });
  });

  // Start & Restart Handlers
  DOM.btnStart.addEventListener("click", () => {
    AudioEngine.init();
    AudioEngine.beep(880, 0.2);
    DOM.startModal.classList.add("hidden");
    GameState.gameActive = true;
    updateUI();
  });

  DOM.btnRestart.addEventListener("click", () => {
    window.location.reload();
  });

  // Render CCTV ticker (10 FPS for authentic security camera stutter)
  setInterval(() => {
    drawCCTV();
  }, 100);

  // Main game tick (1 second)
  setInterval(() => {
    gameTick();
  }, 1000);

  // Initial draw
  renderClients();
  renderChat();
  drawCCTV();
})();
