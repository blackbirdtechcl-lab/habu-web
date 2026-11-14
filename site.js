// Habu: todo lo que se mueve en el sitio. Sin librerías y sin enviar nada a ninguna parte
// (salvo la planilla que usted mismo suba para que Habu la lea).
// La idea que manda: lo que entra desordenado, sale en orden.
(function () {
  var quieto = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var uno = function (s, base) { return (base || document).querySelector(s); };
  var todos = function (s, base) { return Array.prototype.slice.call((base || document).querySelectorAll(s)); };
  var miles = function (n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, "."); };
  var pesos = function (n) { return "$ " + miles(n); };
  var entre = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var suave = function (v) { v = entre(v, 0, 1); return v * v * (3 - 2 * v); };
  // Azar con semilla: el desorden es siempre el mismo, así la página no cambia entre visitas.
  var azar = (function () { var s = 20261113; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();
  var PASTEL = [[255, 201, 214], [255, 233, 138], [189, 239, 203], [191, 217, 255], [217, 204, 255]];
  var NOCHE = "#070B24", AZUL = "#2238FF";

  // 1. LA MÁQUINA. Papeles sueltos (ventas) entran por la izquierda, cada uno a su manera;
  //    Habu, en la costura, los endereza, los timbra y los deja en fila. Al bajar, el orden
  //    gana la pantalla: rejilla de boletas, entrega al SII, y pilas que suman el mes.
  //    En todo momento se pueden empujar con el cursor: vuelven solos a su lugar.
  var maquina = uno("[data-maquina]");
  if (maquina && uno("canvas", maquina).getContext) (function () {
    var escena = uno(".escena", maquina), lienzo = uno("canvas", escena), ctx = lienzo.getContext("2d");
    var W = 0, H = 0, dpr = 1, N = 0, R = 5, pw = 30, ph = 40, margen = 60, periodo = 30, angosto = false;
    var banda = { a: 0, b: 0 }, filasY = [], region = {}, rej = {}, bar = {}, ent = {};
    var papeles = [], paso = 0, pasoDesde = -10, costura = 0.5, t = 0, ultimo = 0, visible = true, andando = false;
    var raton = { x: -9999, y: -9999 }, soltar = 0;
    var recibidasEl = uno("[data-recibidas]"), sumaEl = uno("[data-suma]"), ultRec = -1, ultSuma = -1;
    var riel = todos("[data-ir]", maquina);
    var logo = window.Path2D ? new Path2D("M32 6 40 34 58 48 40 46 36 58H28L24 46 6 48 24 34Z") : null;
    var logoIn = window.Path2D ? new Path2D("M32 6 35.5 34H28.5Z") : null;
    var M = { x: 0, y: 0, r: 0, w: 0, h: 0, blanco: 0, sello: 0, k: 60, lag: 0 };

    var crear = function () {
      papeles = [];
      for (var i = 0; i < N; i++) papeles.push({
        x: azar() * W, y: azar() * H, vx: 0, vy: 0, r: (azar() - 0.5) * 3, vr: 0, w: pw, h: ph, blanco: 0, sello: 0,
        tono: PASTEL[Math.floor(azar() * 5)], cy: azar(), jx: azar() - 0.5, fa: azar() * 6.28, fb: azar() * 6.28,
        r0: (azar() - 0.5) * 2.2, giro: 0.3 + azar() * 0.7, esc: 0.75 + azar() * 0.8, asp: 0.8 + azar() * 0.7, lag: azar()
      });
    };
    var medir = function () {
      var r = escena.getBoundingClientRect(), k, c, d, j, i;
      W = r.width; H = r.height; dpr = Math.min(window.devicePixelRatio || 1, 2);
      lienzo.width = Math.round(W * dpr); lienzo.height = Math.round(H * dpr);
      angosto = W < 760;
      R = 5;
      var n = R * (angosto ? 14 : 24);
      pw = angosto ? 19 : entre(W * 0.0225, 24, 36); ph = pw * 1.32; margen = pw * 2;
      periodo = entre((W + 2 * margen) / (angosto ? 26 : 46), 12, 38);
      banda.a = H * (angosto ? 0.13 : 0.14); banda.b = H * (angosto ? 0.56 : 0.59);
      filasY = []; for (k = 0; k < R; k++) filasY.push(banda.a + (banda.b - banda.a) * (k + 0.5) / R);
      region = angosto ? { x0: W * 0.07, x1: W * 0.93, y0: H * 0.5, y1: H * 0.9 } : { x0: W * 0.47, x1: W * 0.95, y0: H * 0.17, y1: H * 0.83 };
      var Rw = region.x1 - region.x0, Rh = region.y1 - region.y0, mejor = null;
      // la rejilla: la cantidad de columnas que deja las boletas más grandes
      for (c = 4; c <= 40; c++) {
        if (n % c) continue;      // filas completas: ni una boleta suelta
        var f = n / c, s = Math.min((Rw / c) * 0.78 / pw, (Rh / f) * 0.8 / ph);
        if (!mejor || s > mejor.s) mejor = { c: c, f: f, s: s };
      }
      mejor.s = Math.min(mejor.s, 1.3);
      rej = { c: mejor.c, s: mejor.s, cw: pw * mejor.s / 0.78, ch: ph * mejor.s / 0.8 };
      rej.x = region.x0 + (Rw - rej.c * rej.cw) / 2; rej.y = region.y0 + (Rh - mejor.f * rej.ch) / 2;
      // las pilas del mes: días que venden distinto, todos sumando
      var D = angosto ? 8 : 12, peso = [], total = 0, cuentas = [], usados = 0;
      for (d = 0; d < D; d++) { peso.push(3 + d * 0.85 + (d % 3 === 1 ? 1.6 : 0) - (d % 4 === 2 ? 1 : 0)); total += peso[d]; }
      for (d = 0; d < D; d++) { var q = d === D - 1 ? Math.max(1, n - usados) : Math.max(1, Math.round(peso[d] / total * n)); cuentas.push(q); usados += q; }
      var mayor = Math.max.apply(null, cuentas);
      bar = { colW: Rw / D, sh: entre(Rh * 0.86 / mayor - 2, 3, 9), base: region.y1 - 4, de: [] };
      bar.sw = bar.colW * 0.72;
      for (d = 0, i = 0; d < D; d++) for (j = 0; j < cuentas[d]; j++) bar.de[i++] = [d, j];
      while (i < n) bar.de[i++] = [D - 1, cuentas[D - 1]++];
      // la entrega: un mazo a la izquierda, la fila, y el archivo del SII a la derecha
      var mini = angosto ? 0.5 : 0.56, bc = angosto ? 8 : 12;
      ent = { mini: mini, mw: pw * mini + 2, mh: ph * mini + 2, bc: bc, ymid: (region.y0 + region.y1) / 2 };
      ent.bw = bc * ent.mw; ent.bh = Math.ceil(n / bc) * ent.mh;
      ent.bx = region.x1 - ent.bw; ent.by = ent.ymid - ent.bh / 2; ent.xa = region.x0 + pw * 0.8; ent.xb = ent.bx - pw * 1.5;
      ent.viaje = 1.1; ent.delta = ent.viaje / Math.max(3, Math.floor((ent.xb - ent.xa) / (pw * 1.3)));   // en la cinta, una detrás de otra
      ent.ciclo = n * ent.delta + ent.viaje + 3.5;
      if (n !== N) { N = n; crear(); }
    };

    // Dónde tiene que estar el papel i en este instante, según el paso.
    var meta = function (p, i) {
      M.lag = p.lag * 0.45;
      if (paso === 0) {
        var ncol = N / R, fase = (t / periodo + Math.floor(i / R) / ncol) % 1;
        var largo = W + 2 * margen, X = -margen + fase * largo, sx = costura * W, fila = filasY[i % R];
        if (X >= sx) { M.x = X; M.y = fila; M.r = 0; M.w = pw; M.h = ph; M.blanco = 1; M.sello = 1; M.k = 70; return; }
        var emb = Math.min(260, W * 0.2), g = suave((X - (sx - emb)) / emb), libre = 1 - g, asoma = entre((X + margen) / 140, 0, 1);
        var yc = banda.a - H * 0.03 + p.cy * (banda.b - banda.a + H * 0.06) + Math.sin(t * 0.55 + p.fb) * 22;
        var e = p.esc + (1 - p.esc) * g;
        M.x = X + libre * asoma * (p.jx * 150 + Math.sin(t * 0.4 + p.fa) * 26);
        M.y = yc + (fila - yc) * g;
        M.r = libre * (p.r0 + Math.sin(t * p.giro + p.fa) * 0.5);
        M.w = pw * e * (p.asp + (1 - p.asp) * g); M.h = ph * e;
        M.blanco = 0; M.sello = 0; M.k = 16 + 54 * g;
      } else if (paso === 1) {
        M.x = rej.x + (i % rej.c + 0.5) * rej.cw; M.y = rej.y + (Math.floor(i / rej.c) + 0.5) * rej.ch;
        M.r = 0; M.w = pw * rej.s; M.h = ph * rej.s; M.blanco = 1; M.sello = 1; M.k = 64;
      } else if (paso === 2) {
        var tau = t - pasoDesde - 0.9, u = quieto ? 2 : tau < 0 ? -1 : (tau % ent.ciclo - i * ent.delta) / ent.viaje;
        if (u <= 0) { M.x = ent.xa - (i % 6) * 1.2; M.y = ent.ymid - (i % 8) * 1.1 + 4; M.w = pw; M.h = ph; M.r = (i % 5 - 2) * 0.012; }
        else if (u < 1) { M.x = ent.xa + (ent.xb - ent.xa) * u; M.y = ent.ymid; M.w = pw; M.h = ph; M.r = 0; }
        else { M.x = ent.bx + (i % ent.bc + 0.5) * ent.mw; M.y = ent.by + (Math.floor(i / ent.bc) + 0.5) * ent.mh; M.w = pw * ent.mini; M.h = ph * ent.mini; M.r = 0; M.recibida = true; }
        M.blanco = 1; M.sello = 1; M.k = 80; M.lag = 0;
      } else {
        var dj = bar.de[i];
        M.x = region.x0 + (dj[0] + 0.5) * bar.colW; M.y = bar.base - dj[1] * (bar.sh + 2) - bar.sh / 2;
        M.r = 0; M.w = bar.sw; M.h = bar.sh; M.blanco = 1; M.sello = 0; M.k = 58; M.lag = dj[0] * 0.05 + dj[1] * 0.035;
      }
    };

    var pinta = function (p) {
      var c = Math.cos(p.r), s = Math.sin(p.r), w = p.w, h = p.h, b = p.blanco, T = p.tono;
      ctx.setTransform(dpr * c, dpr * s, -dpr * s, dpr * c, dpr * p.x, dpr * p.y);
      ctx.fillStyle = "rgba(3,5,24,.26)"; ctx.fillRect(-w / 2 + 2, -h / 2 + 3, w, h);
      ctx.fillStyle = "rgb(" + ((T[0] + (255 - T[0]) * b) | 0) + "," + ((T[1] + (255 - T[1]) * b) | 0) + "," + ((T[2] + (255 - T[2]) * b) | 0) + ")";
      ctx.fillRect(-w / 2, -h / 2, w, h);
      if (h <= 15) return;
      ctx.fillStyle = "rgba(10,16,51,.34)";
      ctx.fillRect(-w * 0.3, -h * 0.3, w * 0.42, 1.6); ctx.fillRect(-w * 0.3, -h * 0.16, w * 0.6, 1.6); ctx.fillRect(-w * 0.3, -h * 0.02, w * 0.34, 1.6);
      if (p.sello > 0.03) {   // el timbre: aparece cuando pasa por Habu
        var y0 = h * 0.2, hh = h * 0.18, x = -w * 0.3, u = w * 0.6 / 14;
        ctx.globalAlpha = p.sello; ctx.fillStyle = AZUL;
        ctx.fillRect(x, y0, u * 2, hh); ctx.fillRect(x + u * 3, y0, u, hh); ctx.fillRect(x + u * 5, y0, u * 3, hh);
        ctx.fillRect(x + u * 9, y0, u, hh); ctx.fillRect(x + u * 11, y0, u * 3, hh);
        ctx.globalAlpha = 1;
      }
    };

    var rotulo = function (texto, x, y, alfa) {
      ctx.font = "500 12px 'IBM Plex Mono', ui-monospace, monospace"; ctx.textAlign = "center";
      ctx.fillStyle = "rgba(255,255,255," + alfa + ")"; ctx.fillText(texto, x, y);
    };

    var cuadro = function (ms) {
      var ahora = ms / 1000, dt = quieto ? 0 : entre(ahora - ultimo, 0, 0.034), i, p;
      ultimo = ahora; t += dt;
      costura += ((paso === 0 ? 0.5 : 0) - costura) * (quieto ? 1 : Math.min(1, dt * 4.5));
      var sx = costura * W, llega = quieto ? 1 : entre((t - pasoDesde) / 0.7, 0, 1);

      // el fondo: a la izquierda de Habu, la noche; a la derecha, el orden
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = NOCHE; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = AZUL; ctx.fillRect(sx, 0, W - sx + 1, H);
      if (paso === 0) {     // los carriles del lado ordenado
        ctx.fillStyle = "rgba(255,255,255,.09)";
        for (i = 0; i < R; i++) ctx.fillRect(sx, filasY[i] + ph * 0.5 + 5, W - sx, 1);
      } else if (paso === 2) {
        ctx.fillStyle = "rgba(255,255,255," + 0.32 * llega + ")";
        ctx.fillRect(ent.xa, ent.ymid + ph * 0.5 + 7, ent.xb - ent.xa + pw * 0.6, 1.5);
        ctx.strokeStyle = "rgba(255,255,255," + 0.32 * llega + ")"; ctx.lineWidth = 1.5;
        ctx.strokeRect(ent.bx - 9, ent.by - 9, ent.bw + 18, ent.bh + 18);
        rotulo("Habu", ent.xa, ent.ymid + ph * 0.5 + 28, 0.9 * llega);
        rotulo("SII · recibidas", ent.bx + ent.bw / 2, ent.by - 22, 0.9 * llega);
      } else if (paso === 3) {
        ctx.fillStyle = "rgba(255,255,255," + 0.5 * llega + ")";
        ctx.fillRect(region.x0, bar.base + 3, region.x1 - region.x0, 1.5);
      }

      var radio = angosto ? 84 : 124, R2 = radio * radio, recibidas = 0;
      for (i = 0; i < N; i++) {
        p = papeles[i]; M.recibida = false; meta(p, i);
        if (M.recibida) recibidas++;
        if (quieto) { p.x = M.x; p.y = M.y; p.r = M.r; p.w = M.w; p.h = M.h; p.blanco = M.blanco; p.sello = M.sello; pinta(p); continue; }
        if (paso === 0 && p.x - M.x > W * 0.6) { p.x = M.x; p.y = M.y; p.vx = p.vy = 0; p.blanco = 0; p.sello = 0; p.w = M.w; p.h = M.h; }
        var a = entre((t - pasoDesde - M.lag) / 0.25, 0, 1), k = M.k * a, roce = 2 * Math.sqrt(M.k) * 0.62;
        var ax = (M.x - p.x) * k - p.vx * roce, ay = (M.y - p.y) * k - p.vy * roce;
        var dx = p.x - raton.x, dy = p.y - raton.y, d2 = dx * dx + dy * dy;
        if (d2 < R2) {      // el cursor desordena; Habu vuelve a ordenar
          var d = Math.sqrt(d2) || 1, f = (1 - d / radio) * 5600;
          ax += dx / d * f; ay += dy / d * f; p.vr += (dx > 0 ? 1 : -1) * f * dt * 0.004;
        }
        p.vx += ax * dt; p.vy += ay * dt; p.x += p.vx * dt; p.y += p.vy * dt;
        p.vr += ((M.r - p.r) * k - p.vr * roce) * dt; p.r += p.vr * dt;
        var paso8 = Math.min(1, dt * 8) * (a > 0 ? 1 : 0);
        p.w += (M.w - p.w) * paso8; p.h += (M.h - p.h) * paso8;
        p.blanco += (M.blanco - p.blanco) * paso8; p.sello += (M.sello - p.sello) * paso8;
        pinta(p);
      }

      // Habu, en la costura
      if (costura > 0.03 && logo) {
        var alfa = Math.min(1, costura * 2.4), cy = (banda.a + banda.b) / 2, rr = angosto ? 22 : 32;
        var pulso = (t / periodo * (N / R)) % 1;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.globalAlpha = alfa * (1 - pulso) * 0.7; ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(sx, cy, rr + pulso * 20, 0, 6.2832); ctx.stroke();
        ctx.globalAlpha = alfa; ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(sx, cy, rr, 0, 6.2832); ctx.fill();
        var e = rr / 44;
        ctx.setTransform(dpr * e, 0, 0, dpr * e, dpr * (sx - 32 * e), dpr * (cy - 33 * e));
        ctx.fillStyle = NOCHE; ctx.fill(logo); ctx.fillStyle = AZUL; ctx.fill(logoIn);
        ctx.globalAlpha = 1;
      }

      if (paso === 2 && recibidasEl && recibidas !== ultRec) { ultRec = recibidas; recibidasEl.textContent = miles(recibidas); }
      if (paso === 3 && sumaEl) {
        var v = Math.round(1284300 * (quieto ? 1 : 1 - Math.pow(1 - entre((t - pasoDesde - 0.5) / 2.8, 0, 1), 3)));
        if (v !== ultSuma) { ultSuma = v; sumaEl.textContent = pesos(v); }
      }
      if (soltar && ahora > soltar) { soltar = 0; raton.x = raton.y = -9999; }
      if (visible && !quieto) requestAnimationFrame(cuadro); else andando = false;
    };
    var arrancar = function () { if (!andando) { andando = true; requestAnimationFrame(cuadro); } };

    var alMoverse = function () {
      var r = maquina.getBoundingClientRect(), largo = r.height - window.innerHeight;
      var avance = entre(-r.top / largo, 0, 0.9999) * 4, nuevo = Math.floor(avance);
      riel.forEach(function (b, i) {
        b.classList.toggle("pasado", i < nuevo); b.classList.toggle("actual", i === nuevo);
        if (i === nuevo) b.style.setProperty("--avance", ((avance - nuevo) * 100).toFixed(1) + "%");
      });
      if (nuevo !== paso) { paso = nuevo; pasoDesde = t; ultRec = ultSuma = -1; maquina.setAttribute("data-paso", paso); }
      if (quieto) arrancar();
    };
    riel.forEach(function (b, i) {
      b.addEventListener("click", function () {
        var largo = maquina.offsetHeight - window.innerHeight;
        window.scrollTo({ top: maquina.offsetTop + largo * (i + 0.12) / 4, behavior: quieto ? "auto" : "smooth" });
      });
    });
    escena.addEventListener("pointermove", function (e) {
      var r = escena.getBoundingClientRect(); raton.x = e.clientX - r.left; raton.y = e.clientY - r.top;
      soltar = e.pointerType === "touch" ? performance.now() / 1000 + 0.35 : 0;
    }, { passive: true });
    escena.addEventListener("pointerdown", function (e) {
      var r = escena.getBoundingClientRect(); raton.x = e.clientX - r.left; raton.y = e.clientY - r.top;
      if (e.pointerType === "touch") soltar = performance.now() / 1000 + 0.35;
    }, { passive: true });
    escena.addEventListener("pointerleave", function () { raton.x = raton.y = -9999; });
    window.addEventListener("scroll", alMoverse, { passive: true });
    window.addEventListener("resize", function () { medir(); alMoverse(); arrancar(); });
    if ("IntersectionObserver" in window) new IntersectionObserver(function (e) { visible = e[0].isIntersecting; if (visible) arrancar(); }).observe(escena);
    medir(); alMoverse(); arrancar();
  })();

  // 2. Todo lo demás también llega desordenado y se ordena al aparecer.
  todos("[data-ordenar]").forEach(function (h) {
    var palabras = h.textContent.trim().split(/\s+/);
    h.setAttribute("aria-label", palabras.join(" ")); h.textContent = "";
    palabras.forEach(function (w, i) {
      var s = document.createElement("span");
      s.className = "pal"; s.textContent = w; s.setAttribute("aria-hidden", "true");
      s.style.setProperty("--dx", ((azar() - 0.5) * 0.9).toFixed(2) + "em");
      s.style.setProperty("--dy", ((azar() - 0.5) * 0.7).toFixed(2) + "em");
      s.style.setProperty("--dr", ((azar() - 0.5) * 30).toFixed(1) + "deg");
      s.style.setProperty("--i", i);
      h.appendChild(s); h.appendChild(document.createTextNode(" "));
    });
  });
  todos("[data-hoja] .fila").forEach(function (f, i) {
    f.style.setProperty("--dx", ((azar() - 0.5) * 30).toFixed(0) + "px");
    f.style.setProperty("--dr", ((azar() - 0.5) * 5).toFixed(1) + "deg");
    f.style.setProperty("--i", i);
  });
  // El pie: papeles sueltos que arman el nombre.
  var nombre = uno("[data-nombre]");
  if (nombre) {
    var LETRAS = ["10001100011000111111100011000110001", "01110100011000111111100011000110001",
                  "11110100011000111110100011000111110", "10001100011000110001100011000101110"], n = 0;
    for (var fila = 0; fila < 7; fila++) for (var l = 0; l < 4; l++) for (var c = 0; c < 5; c++) {
      if (LETRAS[l].charAt(fila * 5 + c) !== "1") continue;
      var papel = document.createElement("i"), tono = PASTEL[Math.floor(azar() * 5)];
      papel.style.gridColumn = String(l * 6 + c + 1); papel.style.gridRow = String(fila + 1);
      papel.style.setProperty("--tono", "rgb(" + tono.join(",") + ")");
      papel.style.setProperty("--dx", ((azar() - 0.5) * 1400).toFixed(0) + "%");
      papel.style.setProperty("--dy", ((azar() - 0.5) * 700).toFixed(0) + "%");
      papel.style.setProperty("--dr", ((azar() - 0.5) * 220).toFixed(0) + "deg");
      papel.style.setProperty("--i", n++);
      nombre.appendChild(papel);
    }
  }
  var contar = function (b) {
    var fin = Number(b.getAttribute("data-n")), t0 = 0, dura = quieto ? 1 : 1500;
    var anda = function (ahora) {
      if (!t0) t0 = ahora;      // el reloj parte con el primer cuadro: nunca cuenta hacia atrás
      var k = Math.max(0, Math.min(1, (ahora - t0) / dura));
      b.textContent = miles(Math.round(fin * (1 - Math.pow(1 - k, 4))));
      if (k < 1) requestAnimationFrame(anda);
    };
    requestAnimationFrame(anda);
  };
  var porVer = todos(".entra,[data-ordenar],[data-nombre],[data-n]");
  var alVer = function (el) {
    el.classList.add(el.classList.contains("entra") ? "ya" : "en-orden");
    if (el.hasAttribute("data-n")) contar(el);
  };
  if (!("IntersectionObserver" in window)) porVer.forEach(function (el) { alVer(el); if (el.hasAttribute("data-n")) el.textContent = miles(el.getAttribute("data-n")); });
  else {
    var ojo = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) { if (e.isIntersecting) { ojo.unobserve(e.target); alVer(e.target); } });
    }, { threshold: 0.25 });
    porVer.forEach(function (el) { ojo.observe(el); });
  }

  // 3. Cálculo de ejemplo del IVA del mes.
  var ventas = uno("[data-ventas]"), compras = uno("[data-compras]");
  if (ventas && compras) {
    var calcular = function () {
      var v = Number(ventas.value) * 1e6, c = Number(compras.value) * 1e6;
      uno("[data-ventas-txt]").textContent = pesos(v);
      uno("[data-compras-txt]").textContent = pesos(c);
      uno("[data-iva]").textContent = pesos(Math.max(0, (v - c) * 19 / 119));
      [ventas, compras].forEach(function (el) {
        el.style.setProperty("--p", (el.value - el.min) / (el.max - el.min) * 100 + "%");
      });
    };
    ventas.addEventListener("input", calcular);
    compras.addEventListener("input", calcular);
    calcular();
  }

  // 4. En qué va: filtros.
  var filtros = todos("[data-ver]");
  filtros.forEach(function (boton) {
    boton.addEventListener("click", function () {
      var ver = boton.getAttribute("data-ver");
      filtros.forEach(function (b) { b.setAttribute("aria-pressed", b === boton); });
      todos(".hitos li").forEach(function (li) { li.hidden = ver !== "todo" && !li.classList.contains(ver); });
    });
  });

  // 5. Lectura de una planilla: se sube, Habu responde qué entendió y el archivo se descarta.
  var buzon = uno("[data-buzon]");
  if (buzon) {
    var servicio = buzon.getAttribute("data-servicio"), entrada = uno("[data-archivo]");
    var texto = uno("[data-buzon-txt]"), salida = uno("[data-lectura]"), espera = uno("[data-espera]"), hoja = uno("[data-hoja]");
    var crearEl = function (etiqueta, contenido, clase) {
      var el = document.createElement(etiqueta);
      if (contenido != null) el.textContent = contenido;
      if (clase) el.className = clase;
      return el;
    };
    var lista = function (titulo, items) {
      if (!items.length) return;
      salida.appendChild(crearEl("h4", titulo));
      var ul = crearEl("ul");
      items.forEach(function (item) { ul.appendChild(crearEl("li", item)); });
      salida.appendChild(ul);
    };
    var fecha = function (iso) { var p = iso.split("-"); return p[2] + "-" + p[1] + "-" + p[0]; };
    var mostrar = function (r, deEjemplo) {
      salida.textContent = "";
      salida.hidden = false;
      if (espera) espera.hidden = true;
      if (!r.ok) {
        salida.appendChild(crearEl("p", r.mensaje, "lectura-no"));
      } else {
        if (deEjemplo && hoja) {   // la planilla de ejemplo se ordena a la vista, con lo que Habu respondió
          hoja.classList.add("ordenada");
          (r.apartadas || []).forEach(function (a) { var f = uno('[data-fila="' + a.fila + '"]', hoja); if (f) f.classList.add("duda"); });
        }
        if (r.boletas) {
          salida.appendChild(crearEl("p", "Entendí su planilla. Saldrían"));
          salida.appendChild(crearEl("b", miles(r.boletas) + (r.boletas === 1 ? " boleta" : " boletas"), "lectura-n"));
          var detalle = "por " + pesos(r.suma) + " en total";
          if (r.desde) detalle += r.desde === r.hasta ? ", del " + fecha(r.desde) : ", del " + fecha(r.desde) + " al " + fecha(r.hasta);
          salida.appendChild(crearEl("p", detalle + "."));
        } else {
          salida.appendChild(crearEl("p", "Abrí su archivo, pero todavía no puedo sacar boletas de él.", "lectura-no"));
        }
        lista("Esto entendí", r.columnas.map(function (c) { return "«" + c.titulo + "» es " + c.es + "."; }));
        var supuse = r.supuestos.map(function (s) { return s.charAt(0).toUpperCase() + s.slice(1); });
        if (r.sin_usar.length) supuse.push("No necesité: " + r.sin_usar.map(function (s) { return "«" + s + "»"; }).join(", ") + ".");
        lista("Lo que supuse", supuse);
        var aparte = r.apartadas.map(function (a) { return "Fila " + a.fila + ": " + a.motivo + "."; });
        if (r.total_apartadas > aparte.length) aparte.push("… y " + (r.total_apartadas - aparte.length) + " más.");
        lista(r.total_apartadas === 1 ? "Una fila quedó aparte" : r.total_apartadas + " filas quedaron aparte", aparte);
        lista("Para seguir, necesito saber", r.preguntas);
        salida.appendChild(crearEl("p", r.limpia
          ? "Esta planilla está lista. En la prueba gratis puede cargarla y ver cada documento de demostración."
          : "Nada se emite a medias: con esto resuelto, la planilla quedaría lista.", "lectura-fin"));
      }
      buzon.classList.remove("andando");
      texto.textContent = "O suelte aquí la suya";
      // en pantallas chicas la respuesta queda más abajo: se la acerca, después de ver ordenarse la planilla
      setTimeout(function () {
        if (salida.getBoundingClientRect().top > window.innerHeight * 0.8) salida.scrollIntoView({ behavior: quieto ? "auto" : "smooth", block: "center" });
      }, deEjemplo ? 1300 : 200);
    };
    var subir = function (archivo, deEjemplo) {
      if (!archivo || buzon.classList.contains("andando")) return;
      if (archivo.size > 5000000) return mostrar({ ok: false, mensaje: "El archivo pesa más de 5 MB. Para probar, suba uno más chico." });
      buzon.classList.add("andando");
      texto.textContent = "Leyendo…";
      fetch(servicio, { method: "POST", body: archivo, headers: { "Content-Type": "application/octet-stream" } })
        .then(function (respuesta) { return respuesta.json(); })
        .then(function (r) { mostrar(r, deEjemplo); })
        .catch(function () { mostrar({ ok: false, mensaje: "No pude conectarme con Habu en este momento. Intente en un rato." }); });
    };
    buzon.addEventListener("click", function () { if (!buzon.classList.contains("andando")) entrada.click(); });
    buzon.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); entrada.click(); } });
    entrada.addEventListener("click", function (e) { e.stopPropagation(); });
    entrada.addEventListener("change", function () { subir(entrada.files[0]); entrada.value = ""; });
    ["dragenter", "dragover"].forEach(function (n) {
      buzon.addEventListener(n, function (e) { e.preventDefault(); buzon.classList.add("encima"); });
    });
    buzon.addEventListener("dragleave", function () { buzon.classList.remove("encima"); });
    buzon.addEventListener("drop", function (e) {
      e.preventDefault(); buzon.classList.remove("encima");
      subir(e.dataTransfer && e.dataTransfer.files[0]);
    });
    var ejemplo = uno("[data-ejemplo]");
    if (ejemplo) ejemplo.addEventListener("click", function () {
      var planilla = "Café Central;;;\nVentas de la semana;;;\n;;;\nDescripción;Fecha Emisión;Monto;Vendedor\n" +
        "Café;03/11/26;$ 5.600;Ana\nTorta;03/11/26;$ 3.900;Ana\nAlmuerzo;04/11/26;$ 22.500;Luis\n" +
        "Té;04/11/26;12,000;Luis\nJugo natural;15/11/26;$ 12.900;Ana\nTOTAL;;$ 56.900;\n";
      subir(new File([planilla], "ventas de ejemplo.csv", { type: "text/csv" }), true);
    });
  }

  // 6. Consulta de boleta: el formulario solo se habilita si hay un servicio configurado.
  var formulario = uno("form[data-servicio]");
  if (formulario) {
    var destinoForm = formulario.getAttribute("data-servicio");
    var aviso = uno("[data-aviso]"), boton = uno("button", formulario);
    if (destinoForm) {
      formulario.action = destinoForm;
      if (aviso) aviso.hidden = true;
    } else {
      boton.disabled = true;
      formulario.addEventListener("submit", function (e) { e.preventDefault(); });
    }
    var monto = uno("[name=monto]", formulario);
    if (monto) {
      monto.addEventListener("input", function () {
        var limpio = monto.value.replace(/\D/g, "").slice(0, 10);
        monto.value = limpio.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
      });
    }
  }
})();
