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

  // --- CCTV Renderer (Canvas 2D) ---
  const ctx = DOM.cctvCanvas.getContext("2d");

  function drawCCTV() {
    const w = DOM.cctvCanvas.width;
    const h = DOM.cctvCanvas.height;

    // Background room tint (Greenish/Grey Night Vision)
    ctx.fillStyle = "#07130a";
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    if (GameState.currentCam === 0) {
      // CAM 1: Kasir
      ctx.fillStyle = "#16331c";
      ctx.fillRect(40, 140, 240, 70); // Meja kasir
      ctx.fillStyle = "#0c2011";
      ctx.fillRect(80, 100, 60, 45); // Monitor CRT
      ctx.fillRect(150, 115, 30, 25); // Printer Epson
      ctx.fillStyle = "#27592f";
      ctx.fillRect(90, 105, 40, 30); // CRT Glow
    } else if (GameState.currentCam === 1) {
      // CAM 2: Lorong Bilik
      ctx.fillStyle = "#142817";
      // Partisi sekat warnet
      for (let i = 0; i < 4; i++) {
        ctx.fillRect(20 + i * 70, 70, 55, 120);
        ctx.fillStyle = "#08160b";
        ctx.fillRect(25 + i * 70, 110, 45, 70);
        ctx.fillStyle = "#142817";
      }
    } else if (GameState.currentCam === 2) {
      // CAM 3: Bilik 4 (Sumber Horror)
      ctx.fillStyle = "#0e1c11";
      ctx.fillRect(60, 60, 200, 140); // Bilik 4 interior
      ctx.fillStyle = "#08130a";
      ctx.fillRect(110, 90, 80, 60); // Monitor 4
      
      if (GameState.clients[3].status !== "Offline") {
        ctx.fillStyle = "#1c4024";
        ctx.fillRect(115, 95, 70, 48); // Screen nyala
      }

      if (GameState.bilik4EntityPresent) {
        // Siluet bayangan di Bilik 4
        ctx.fillStyle = "#000000";
        ctx.beginPath();
        ctx.arc(150, 90, 22, 0, Math.PI * 2); // Kepala
        ctx.fill();
        ctx.fillRect(125, 110, 50, 65); // Badan
        
        // Mata merah tipis
        ctx.fillStyle = "#ff2200";
        ctx.fillRect(143, 88, 3, 3);
        ctx.fillRect(154, 88, 3, 3);
      }
    } else if (GameState.currentCam === 3) {
      // CAM 4: Pintu Luar
      ctx.fillStyle = "#102213";
      ctx.fillRect(50, 40, 220, 160); // Pintu Rolling Door
      ctx.strokeStyle = "#1b3820";
      ctx.lineWidth = 2;
      for (let y = 60; y < 200; y += 15) {
        ctx.beginPath();
        ctx.moveTo(50, y);
        ctx.lineTo(270, y);
        ctx.stroke();
      }
    }
    ctx.restore();

    // Glitch & Static Noise Overlay
    const noiseDensity = GameState.isSpookyEventActive ? 0.35 : 0.08;
    const imgData = ctx.getImageData(0, 0, w, h);
    const pix = imgData.data;
    for (let i = 0; i < pix.length; i += 4) {
      if (Math.random() < noiseDensity) {
        const val = Math.random() * 200;
        pix[i] = val;     // R
        pix[i + 1] = val + 40; // G (night vision tint)
        pix[i + 2] = val; // B
      }
    }
    ctx.putImageData(imgData, 0, 0);

    // Scanlines
    ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
    for (let y = 0; y < h; y += 4) {
      ctx.fillRect(0, y, w, 2);
    }
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
