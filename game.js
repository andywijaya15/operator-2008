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
    // Continuous Creepy Ambient Drone (45Hz Fluorescent + Ground Hum)
    startAmbience() {
      if (!this.ctx) return;
      try {
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc1.type = "sine";
        osc1.frequency.setValueAtTime(48, this.ctx.currentTime); // Low room drone
        
        osc2.type = "sawtooth";
        osc2.frequency.setValueAtTime(50, this.ctx.currentTime); // Mains hum
        
        const filter = this.ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(90, this.ctx.currentTime);

        gain.gain.setValueAtTime(0.04, this.ctx.currentTime); // Subtle background
        
        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc1.start();
        osc2.start();
      } catch (e) {}
    },
    horrorThud() {
      if (!this.ctx) return;
      try {
        // Deep sub-bass drop + metallic impact
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(140, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(32, this.ctx.currentTime + 0.8);
        gain.gain.setValueAtTime(0.35, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.9);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.9);
        this.staticBurst();
      } catch (e) {}
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

  // --- CCTV Authentic Analog Horror Renderer (High Contrast B&W Infrared) ---
  const ctx = DOM.cctvCanvas.getContext("2d");
  let cctvFrame = 0;
  let trackingBarY = 0;
  const dustParticles = Array.from({ length: 30 }, () => ({
    x: Math.random() * 480,
    y: Math.random() * 360,
    r: Math.random() * 2 + 0.6,
    vx: (Math.random() - 0.5) * 0.35,
    vy: (Math.random() - 0.5) * 0.25,
    alpha: Math.random() * 0.4 + 0.1
  }));

  function drawCCTV() {
    cctvFrame++;
    const w = DOM.cctvCanvas.width;
    const h = DOM.cctvCanvas.height;

    // Camera jitter during horror
    const camJitterX = GameState.isSpookyEventActive ? (Math.random() - 0.5) * 4 : 0;
    const camJitterY = GameState.isSpookyEventActive ? (Math.random() - 0.5) * 2 : 0;

    // Pitch Black Void Base
    ctx.fillStyle = "#030303";
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(camJitterX, camJitterY);

    if (GameState.currentCam === 0) {
      // === CAM 1: KASIR & LOBBY (Ceiling Surveillance Angle) ===
      // Lantai ruko warnet (ubin redup)
      ctx.fillStyle = "#121212";
      ctx.fillRect(0, 150, w, h - 150);
      ctx.strokeStyle = "#1c1c1c";
      ctx.lineWidth = 1;
      for (let x = -20; x < w + 60; x += 45) {
        ctx.beginPath();
        ctx.moveTo(x, 150);
        ctx.lineTo(x * 1.4 - 80, h);
        ctx.stroke();
      }

      // Tembok belakang & Lorong Gudang Gelap
      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, 0, w, 150);

      // Pintu lorong belakang kasir (Gelap gulita)
      ctx.fillStyle = "#010101";
      ctx.fillRect(320, 30, 80, 140);
      ctx.strokeStyle = "#222";
      ctx.strokeRect(320, 30, 80, 140);

      // Horror: Bayangan mengintip dari lorong belakang jika anomali aktif
      if (GameState.bilik4EntityPresent) {
        ctx.fillStyle = "#000000";
        // Kepala mengintip dari tepi kusen pintu
        ctx.beginPath();
        ctx.ellipse(326, 68, 14, 20, 0.2, 0, Math.PI * 2);
        ctx.fill();
        // Mata pucat redup mengarah ke kasir
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(324, 65, 3, 3);
      }

      // Kalender & Jam Dinding
      ctx.fillStyle = "#222222";
      ctx.fillRect(100, 40, 50, 60);
      ctx.fillStyle = "#888888";
      ctx.font = "bold 18px monospace";
      ctx.fillText("01", 112, 75);
      ctx.font = "8px monospace";
      ctx.fillText("NOV 2008", 104, 90);

      // Meja Kasir L-Shape Formica
      ctx.fillStyle = "#181818";
      ctx.beginPath();
      ctx.moveTo(40, 200);
      ctx.lineTo(440, 200);
      ctx.lineTo(470, 360);
      ctx.lineTo(20, 360);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#2e2e2e";
      ctx.stroke();

      // Monitor CRT Kasir
      ctx.fillStyle = "#101010";
      ctx.fillRect(160, 145, 95, 75);
      // Pendaran layar monitor kasir (Soft cold light)
      const monitorGlow = ctx.createRadialGradient(207, 180, 10, 207, 180, 65);
      monitorGlow.addColorStop(0, "rgba(180, 210, 230, 0.35)");
      monitorGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = monitorGlow;
      ctx.fillRect(140, 120, 140, 140);

      // Keyboard & Cangkir Kopi
      ctx.fillStyle = "#282828";
      ctx.fillRect(165, 230, 85, 25);
      ctx.fillStyle = "#333333";
      ctx.fillRect(110, 225, 16, 22); // Cangkir

      // Kursi Operator Kasir
      const chairTwitch = Math.sin(cctvFrame * 0.04) * 2;
      ctx.fillStyle = "#0c0c0c";
      ctx.beginPath();
      ctx.ellipse(210 + chairTwitch, 285, 32, 22, 0, 0, Math.PI * 2);
      ctx.fill();

    } else if (GameState.currentCam === 1) {
      // === CAM 2: LORONG BILIK (Corridor Perspective Dread) ===
      const vpX = 240;
      const vpY = 125;

      // Lantai Lorong Sunyi
      ctx.fillStyle = "#0a0a0a";
      ctx.beginPath();
      ctx.moveTo(170, vpY);
      ctx.lineTo(310, vpY);
      ctx.lineTo(w + 80, h);
      ctx.lineTo(-80, h);
      ctx.closePath();
      ctx.fill();

      // Garis perspektif lantai
      ctx.strokeStyle = "#161616";
      for (let i = -60; i <= w + 60; i += 45) {
        ctx.beginPath();
        ctx.moveTo(vpX, vpY);
        ctx.lineTo(i, h);
        ctx.stroke();
      }

      // Plafon Gelap & Lampu TL Berkedip
      ctx.fillStyle = "#050505";
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(w, 0);
      ctx.lineTo(310, vpY);
      ctx.lineTo(170, vpY);
      ctx.closePath();
      ctx.fill();

      // Lampu TL Neon (Sering redup/flicker)
      const tlFlicker = Math.random() > 0.06 ? 0.9 : 0.2;
      ctx.fillStyle = `rgba(200, 220, 240, ${tlFlicker * 0.7})`;
      ctx.fillRect(230, 25, 20, 50);

      // Pendaran cahaya dari bilik-bilik yang aktif (Biru redup di lantai gelap)
      const boothGlow = ctx.createRadialGradient(100, 250, 10, 100, 250, 90);
      boothGlow.addColorStop(0, "rgba(80, 140, 220, 0.25)");
      boothGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = boothGlow;
      ctx.fillRect(10, 180, 180, 140);

      // Sekat triplek bilik kiri
      for (let i = 0; i < 3; i++) {
        const y = vpY + i * 50;
        const x = 170 - i * 55;
        ctx.fillStyle = "#121212";
        ctx.fillRect(0, y, x, 80);
        ctx.strokeStyle = "#242424";
        ctx.strokeRect(0, y, x, 80);
        ctx.fillStyle = "#555";
        ctx.font = "bold 9px monospace";
        ctx.fillText(`0${i + 1}`, x - 22, y + 25);
      }

      // Sekat triplek bilik kanan
      for (let i = 0; i < 3; i++) {
        const y = vpY + i * 50;
        const x = 310 + i * 35;
        ctx.fillStyle = "#101010";
        ctx.fillRect(x, y, w - x, 80);
        ctx.strokeStyle = "#222222";
        ctx.strokeRect(x, y, w - x, 80);
        ctx.fillStyle = "#555";
        ctx.font = "bold 9px monospace";
        ctx.fillText(`0${i + 5}`, x + 8, y + 25);
      }

      // Ujung lorong (Bilik 4 berada di pojok paling gelap)
      ctx.fillStyle = "#000000";
      ctx.fillRect(215, vpY - 5, 50, 55);

    } else if (GameState.currentCam === 2) {
      // === CAM 3: BILIK 4 (THE HORROR INCIDENT) ===
      ctx.fillStyle = "#050505";
      ctx.fillRect(0, 0, w, h);

      // Dinding Bilik Plywood Gelap
      ctx.fillStyle = "#101010";
      ctx.fillRect(25, 20, 430, 250);
      ctx.strokeStyle = "#222222";
      ctx.strokeRect(25, 20, 430, 250);

      // Coretan menyeramkan di triplek
      ctx.fillStyle = "#2a2a2a";
      ctx.font = "10px monospace";
      ctx.fillText("JANGAN LIHAT KE BELAKANG", 60, 65);
      ctx.fillText("DIA MASIH DI SINI", 280, 80);
      ctx.fillText("02:15 WIB", 70, 110);

      // Meja Bilik 4
      ctx.fillStyle = "#161616";
      ctx.fillRect(40, 200, 400, 130);

      // CPU Case di lantai
      ctx.fillStyle = "#0b0b0b";
      ctx.fillRect(60, 240, 50, 100);

      // Monitor CRT Bilik 4
      ctx.fillStyle = "#121212";
      ctx.fillRect(170, 115, 140, 110);
      ctx.strokeStyle = "#262626";
      ctx.strokeRect(170, 115, 140, 110);

      const isOnline = GameState.clients[3].status !== "Offline";
      if (isOnline) {
        // Layar monitor aktif di bilik 4
        if (GameState.isSpookyEventActive) {
          // Monitor glitching horor
          ctx.fillStyle = (cctvFrame % 6 < 3) ? "#330000" : "#110000";
          ctx.fillRect(182, 127, 116, 86);
          ctx.fillStyle = "#ff4444";
          ctx.font = "bold 10px monospace";
          ctx.fillText("SYSTEM COMPROMISED", 188, 165);
          ctx.fillText("RUN AWAY", 215, 185);
        } else {
          ctx.fillStyle = "#1a2530";
          ctx.fillRect(182, 127, 116, 86);
        }
      } else {
        ctx.fillStyle = "#020202";
        ctx.fillRect(182, 127, 116, 86);
      }

      // Kursi Plastik di Bilik 4
      ctx.fillStyle = "#1e1e1e";
      ctx.fillRect(190, 270, 100, 80);

      // === TRUE ANALOG HORROR ENTITY (The Uncanny Figure) ===
      if (GameState.bilik4EntityPresent) {
        const jitter = (Math.random() - 0.5) * 3;
        const headTilt = Math.sin(cctvFrame * 0.08) * 0.15;

        // Bayangan tubuh kurus tinggi tak wajar
        ctx.save();
        ctx.translate(240, 220);
        ctx.rotate(headTilt);

        // Jubah / Pakaian Hitam Pekat
        ctx.fillStyle = "#000000";
        ctx.beginPath();
        ctx.moveTo(-45, 120);
        ctx.lineTo(-30, 20);
        ctx.lineTo(0, -30);
        ctx.lineTo(30, 20);
        ctx.lineTo(45, 120);
        ctx.closePath();
        ctx.fill();

        // Leher kurus memanjang
        ctx.fillStyle = "#b0b0b0";
        ctx.fillRect(-7, -40, 14, 25);

        // Kepala Pucat (Uncanny Valley Head)
        ctx.fillStyle = "#cccccc";
        ctx.beginPath();
        ctx.ellipse(0, -60, 22, 30, 0, 0, Math.PI * 2);
        ctx.fill();

        // Rambut hitam tipis menempel
        ctx.fillStyle = "#000000";
        ctx.beginPath();
        ctx.arc(0, -68, 23, Math.PI, Math.PI * 2);
        ctx.fill();

        // Rongga Mata Hitam Pekat (Sunken Sockets)
        ctx.fillStyle = "#000000";
        ctx.beginPath();
        ctx.ellipse(-8, -62, 5, 8, 0, 0, Math.PI * 2);
        ctx.ellipse(8, -62, 5, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        // Pupil Mata Kecil Menatap CCTV (Piercing Pinpoints)
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(-9, -63, 2, 2);
        ctx.fillRect(7, -63, 2, 2);

        // Senyum Lebar Tak Wajar (Unnatural Grin)
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, -56, 12, 0.2, Math.PI - 0.2, false);
        ctx.stroke();

        ctx.restore();

        // Lengan pucat kurus memanjang di atas meja
        ctx.strokeStyle = "#888888";
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(210, 240);
        ctx.lineTo(195, 270);
        ctx.moveTo(270, 240);
        ctx.lineTo(285, 270);
        ctx.stroke();
      }

    } else if (GameState.currentCam === 3) {
      // === CAM 4: PINTU LUAR & JALAN SEPI ===
      ctx.fillStyle = "#040404";
      ctx.fillRect(0, 0, w, h);

      // Jalanan Aspal Basah
      ctx.fillStyle = "#0c0c0c";
      ctx.fillRect(0, 210, w, 150);

      // Tiang Lampu Jalan Dingin
      ctx.fillStyle = "#222222";
      ctx.fillRect(400, 40, 8, 280);
      const streetLight = ctx.createRadialGradient(404, 50, 4, 404, 50, 110);
      streetLight.addColorStop(0, "rgba(220, 220, 220, 0.35)");
      streetLight.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = streetLight;
      ctx.beginPath();
      ctx.arc(404, 50, 110, 0, Math.PI * 2);
      ctx.fill();

      // Rolling Door Besi Berkarat
      ctx.fillStyle = "#141414";
      ctx.fillRect(30, 20, 330, 190);
      ctx.strokeStyle = "#252525";
      ctx.lineWidth = 2;
      for (let y = 30; y < 205; y += 12) {
        ctx.beginPath();
        ctx.moveTo(30, y);
        ctx.lineTo(360, y);
        ctx.stroke();
      }

      // Celah Bawah Pintu (Gelap Gulita)
      ctx.fillStyle = "#000000";
      ctx.fillRect(30, 205, 330, 45);

      // Sosok Berdiri di Luar Hujan
      if (GameState.isSpookyEventActive) {
        ctx.fillStyle = "#020202";
        // Siluet manusia berdiri kaku di bawah lampu jalan
        ctx.beginPath();
        ctx.arc(385, 175, 10, 0, Math.PI * 2); // Kepala
        ctx.fill();
        ctx.fillRect(378, 185, 14, 50); // Tubuh
      }

      // Rintik Hujan
      ctx.strokeStyle = "rgba(180, 180, 180, 0.25)";
      ctx.lineWidth = 1;
      for (let i = 0; i < 24; i++) {
        const rx = (cctvFrame * 8 + i * 29) % w;
        const ry = (cctvFrame * 12 + i * 23) % h;
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx - 2, ry + 10);
        ctx.stroke();
      }
    }

    // === FLOATING DUST PARTICLES (Infrared Flashlight Illumination) ===
    ctx.fillStyle = "#ffffff";
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

    // === VCR TRACKING NOISE ROLLER ===
    trackingBarY = (trackingBarY + 1.6) % h;
    ctx.fillStyle = "rgba(255, 255, 255, 0.06)";
    ctx.fillRect(0, trackingBarY, w, 18);

    // === HIGH-CONTRAST SENSOR GRAIN (ISO 12800) ===
    const noiseDensity = GameState.isSpookyEventActive ? 0.28 : 0.07;
    const imgData = ctx.getImageData(0, 0, w, h);
    const pix = imgData.data;
    for (let i = 0; i < pix.length; i += 4) {
      if (Math.random() < noiseDensity) {
        const n = Math.random() * 220;
        pix[i] = n;     // R
        pix[i + 1] = n; // G
        pix[i + 2] = n; // B
      }
    }
    ctx.putImageData(imgData, 0, 0);

    // === CONVEX CCTV LENS VIGNETTE (IR Flashlight Center Falloff) ===
    const vignette = ctx.createRadialGradient(w / 2, h / 2, h * 0.25, w / 2, h / 2, h * 0.78);
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(0.7, "rgba(0,0,0,0.45)");
    vignette.addColorStop(1, "rgba(0,0,0,0.92)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);

    // === OSD HUD (AUTHENTIC SECURITY RECORDER) ===
    ctx.fillStyle = "#e0e0e0";
    ctx.font = "bold 12px monospace";
    ctx.textBaseline = "top";

    const liveSec = String(Math.floor((cctvFrame * 0.1) % 60)).padStart(2, "0");
    const camNames = ["CH 01 - KASIR", "CH 02 - LORONG", "CH 03 - BILIK 4", "CH 04 - PINTU DEPAN"];
    const timeStr = formatWIB(GameState.timeMinutes);

    ctx.fillText(`${camNames[GameState.currentCam]}`, 14, 12);
    ctx.fillText(`2008-11-01 ${timeStr}:${liveSec} WIB`, 14, 28);

    // Blinking REC dot
    if (Math.sin(cctvFrame * 0.15) > 0) {
      ctx.fillStyle = "#ff2222";
      ctx.beginPath();
      ctx.arc(w - 20, 20, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.fillText("REC", w - 52, 14);
    }

    if (GameState.isSpookyEventActive && GameState.currentCam === 2) {
      ctx.fillStyle = "#ff2222";
      ctx.fillText("(!) ANOMALY DETECTED", w - 175, h - 24);
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
      AudioEngine.horrorThud();
      addChatMessage("PC_04", "Mas, AC di Bilik 4 kok dingin banget ya?", "spooky");
    }

    // 02:25 WIB (tick 50): Entity kontak lagi bila belum di-restart
    if (GameState.timeMinutes === 145 && GameState.bilik4EntityPresent) {
      AudioEngine.horrorThud();
      addChatMessage("PC_04", "Jangan cek kamera 3. Tolong jangan lihat.", "spooky");
    }

    // 02:40 WIB: Kejadian kedua jika sudah lolos
    if (GameState.timeMinutes === 160 && !GameState.isSpookyEventActive && Math.random() < 0.6) {
      GameState.clients[3].status = "CORRUPT";
      GameState.clients[3].user = "SYS_ERR_666";
      GameState.clients[3].timeLeft = 99;
      GameState.bilik4EntityPresent = true;
      GameState.isSpookyEventActive = true;
      AudioEngine.horrorThud();
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
    AudioEngine.startAmbience();
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
