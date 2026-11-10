// Habu: todo lo que se mueve en el sitio. Sin librerías y sin enviar nada a ninguna parte.
(function () {
  var quieto = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var uno = function (s, base) { return (base || document).querySelector(s); };
  var miles = function (n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, "."); };
  var pesos = function (n) { return "$ " + miles(n); };

  // 1. Aparición suave al entrar en pantalla.
  var piezas = document.querySelectorAll(".aparece");
  if (quieto || !("IntersectionObserver" in window)) {
    piezas.forEach(function (el) { el.classList.add("visto"); });
  } else {
    var ojo = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("visto"); ojo.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -10% 0px", threshold: 0.1 });
    piezas.forEach(function (el) { ojo.observe(el); });
  }

  // 2. Portada: ventas sueltas que Habu ordena en una sola línea. Se apartan del cursor.
  var lienzo = uno("[data-corriente]");
  if (lienzo && lienzo.getContext) {
    var ctx = lienzo.getContext("2d"), ancho = 0, alto = 0, puntos = [], visible = true;
    var raton = { x: -999, y: -999 };
    var nuevo = function (x) {
      return { x: x, y: Math.random() * alto, y0: Math.random() * alto, v: 0.5 + Math.random() * 1.1, f: Math.random() * 6.28, r: 1.3 + Math.random() * 2 };
    };
    var medir = function () {
      var r = lienzo.getBoundingClientRect(), d = Math.min(window.devicePixelRatio || 1, 2);
      ancho = r.width; alto = r.height;
      lienzo.width = ancho * d; lienzo.height = alto * d;
      ctx.setTransform(d, 0, 0, d, 0, 0);
      var cuantos = Math.round(Math.min(150, Math.max(50, ancho / 9)));
      puntos = [];
      for (var i = 0; i < cuantos; i++) { puntos.push(nuevo(Math.random() * ancho)); puntos[i].y = -1; }
    };
    var cuadro = function (t) {
      ctx.clearRect(0, 0, ancho, alto);
      var corte = ancho * 0.5, meta = alto * 0.8;
      ctx.strokeStyle = "rgba(255,74,28,.9)"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(ancho * 0.86, meta); ctx.lineTo(ancho, meta); ctx.stroke();
      for (var i = 0; i < puntos.length; i++) {
        var p = puntos[i];
        p.x += p.v;
        var k = Math.max(0, Math.min(1, (p.x - corte) / (ancho * 0.36)));
        k = k * k * (3 - 2 * k);
        var libre = p.y0 + Math.sin(t / 1400 + p.f) * 18;
        var destino = libre + (meta - libre) * k;
        if (p.y < 0) p.y = destino;
        var dx = p.x - raton.x, dy = p.y - raton.y, d2 = dx * dx + dy * dy;
        if (d2 < 16900) destino += (dy >= 0 ? 1 : -1) * (1 - d2 / 16900) * 60 * (1 - k * 0.7);
        p.y += (destino - p.y) * 0.06;
        if (p.x > ancho + 10) { puntos[i] = nuevo(-10); continue; }
        ctx.fillStyle = k > 0.92 ? "rgba(255,74,28,.95)" : "rgba(11,16,32," + (0.16 + k * 0.5) + ")";
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (1 - k * 0.35), 0, 6.283); ctx.fill();
      }
      if (visible && !quieto) requestAnimationFrame(cuadro);
    };
    medir();
    window.addEventListener("resize", medir);
    var portada = lienzo.parentNode;
    portada.addEventListener("pointermove", function (e) {
      var r = lienzo.getBoundingClientRect(); raton.x = e.clientX - r.left; raton.y = e.clientY - r.top;
    });
    portada.addEventListener("pointerleave", function () { raton.x = raton.y = -999; });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (e) {
        var antes = visible; visible = e[0].isIntersecting;
        if (visible && !antes && !quieto) requestAnimationFrame(cuadro);
      }).observe(lienzo);
    }
    requestAnimationFrame(cuadro);
  }

  // 3. Historia: el paso cambia con el avance de la página.
  var historia = uno("[data-historia]");
  if (historia && !quieto) {
    var cuenta = uno("[data-n]", historia), mes = uno("[data-mes]", historia), total = 412300, reloj = null;
    var alMoverse = function () {
      var r = historia.getBoundingClientRect(), largo = r.height - window.innerHeight;
      var avance = Math.max(0, Math.min(0.999, -r.top / largo));
      var paso = String(Math.floor(avance * 3));
      if (historia.getAttribute("data-paso") === paso) return;
      historia.setAttribute("data-paso", paso);
      cuenta.textContent = Number(paso) + 1;
      clearInterval(reloj);
      if (paso === "2") reloj = setInterval(function () { total += 1517; mes.textContent = pesos(total); }, 1400);
    };
    window.addEventListener("scroll", alMoverse, { passive: true });
    window.addEventListener("resize", alMoverse);
    alMoverse();
  }

  // 4. Cálculo de ejemplo del IVA del mes.
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

  // 5. Dos maneras de usarlo.
  var pestanas = document.querySelectorAll("[data-forma]");
  pestanas.forEach(function (boton) {
    boton.addEventListener("click", function () {
      pestanas.forEach(function (b) {
        var activa = b === boton;
        b.setAttribute("aria-selected", activa);
        b.tabIndex = activa ? 0 : -1;
        uno("#forma-" + b.getAttribute("data-forma")).hidden = !activa;
      });
    });
    boton.addEventListener("keydown", function (e) {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      var otra = pestanas[(Array.prototype.indexOf.call(pestanas, boton) + 1) % pestanas.length];
      otra.focus(); otra.click();
    });
  });

  // 6. Carga de archivo: solo una demostración. El archivo no se lee ni se envía.
  var buzon = uno("[data-buzon]");
  if (buzon) {
    var texto = uno("[data-buzon-txt]"), numero = uno("[data-buzon-n]"), barra = uno("[data-buzon-barra]");
    var inicial = texto.textContent;
    var probar = function () {
      if (buzon.classList.contains("andando")) return;
      if (buzon.classList.contains("listo")) {
        buzon.classList.remove("listo"); texto.textContent = inicial; barra.style.width = "0"; return;
      }
      var meta = 800 + Math.round(Math.random() * 900), hechas = 0;
      buzon.classList.add("andando");
      numero.textContent = "0";
      texto.textContent = "Leyendo su planilla…";
      var paso = function () {
        hechas = Math.min(meta, hechas + Math.ceil(meta / (quieto ? 1 : 70)));
        numero.textContent = miles(hechas);
        barra.style.width = hechas / meta * 100 + "%";
        if (hechas > meta * 0.12) texto.textContent = "Emitiendo boletas…";
        if (hechas > meta * 0.8) texto.textContent = "Entregándolas al SII…";
        if (hechas < meta) return setTimeout(paso, 45);
        buzon.classList.remove("andando"); buzon.classList.add("listo");
        texto.textContent = "boletas listas. Así de simple. Toque para repetir.";
      };
      setTimeout(paso, 600);
    };
    buzon.addEventListener("click", probar);
    buzon.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); probar(); } });
    ["dragenter", "dragover"].forEach(function (n) {
      buzon.addEventListener(n, function (e) { e.preventDefault(); buzon.classList.add("encima"); });
    });
    buzon.addEventListener("dragleave", function () { buzon.classList.remove("encima"); });
    buzon.addEventListener("drop", function (e) { e.preventDefault(); buzon.classList.remove("encima"); probar(); });
  }

  // 7. Consulta de boleta: el formulario solo se habilita si hay un servicio configurado.
  var formulario = uno("form[data-servicio]");
  if (formulario) {
    var servicio = formulario.getAttribute("data-servicio");
    var aviso = uno("[data-aviso]"), boton = uno("button", formulario);
    if (servicio) {
      formulario.action = servicio;
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
