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

  // 2. Portada: boletas sueltas y desordenadas llegan a Habu, que las endereza,
  //    las timbra y las deja en fila, parejas, camino al SII. Se apartan del cursor.
  var lienzo = uno("[data-corriente]");
  if (lienzo && lienzo.getContext) {
    var ctx = lienzo.getContext("2d"), ancho = 0, alto = 0, visible = true;
    var sueltas = [], enFila = [], porSalir = 0, pulso = 0, puertaX = 0, lineaY = 0, paso = 34, ritmo = 1.15;
    var raton = { x: -999, y: -999 };
    var TINTA = "11,16,32", FUEGO = "255,74,28";
    var avion = window.Path2D ? new Path2D("M32 6 40 34 58 48 40 46 36 58H28L24 46 6 48 24 34Z") : null;
    var punta = window.Path2D ? new Path2D("M32 6 35.5 34H28.5Z") : null;

    var suelta = function (x) {
      // Nacen arriba o abajo del texto, nunca encima: así el titular se lee limpio.
      var banda = Math.random() < 0.4 ? 0.05 + Math.random() * 0.15 : 0.73 + Math.random() * 0.22;
      return { x: x, y: -1, y0: alto * banda, v: 0.55 + Math.random() * 0.9,
               f: Math.random() * 6.28, giro: Math.random() * 6.28, w: (Math.random() - 0.5) * 0.03,
               t: 0.8 + Math.random() * 0.5 };
    };
    var medir = function () {
      var r = lienzo.getBoundingClientRect(), d = Math.min(window.devicePixelRatio || 1, 2);
      ancho = r.width; alto = r.height;
      lienzo.width = ancho * d; lienzo.height = alto * d;
      ctx.setTransform(d, 0, 0, d, 0, 0);
      var angosto = ancho < 720;
      puertaX = ancho * (angosto ? 0.46 : 0.6);
      lineaY = alto * (angosto ? 0.8 : 0.76);
      paso = angosto ? 28 : 34;
      sueltas = []; enFila = []; porSalir = 0;
      var cuantas = Math.round(Math.min(46, Math.max(16, puertaX / 22)));
      for (var i = 0; i < cuantas; i++) sueltas.push(suelta(Math.random() * puertaX));
      for (var x = puertaX + paso; x < ancho + paso; x += paso) enFila.push({ x: x, nace: 1 });
    };
    // Una boleta: papel blanco, dos renglones y, si ya pasó por Habu, su timbre.
    var boleta = function (x, y, giro, tam, opaco, timbrada) {
      ctx.save();
      ctx.translate(x, y); ctx.rotate(giro); ctx.scale(tam, tam);
      ctx.globalAlpha = opaco;
      ctx.fillStyle = "#fff"; ctx.strokeStyle = "rgba(" + TINTA + "," + (timbrada ? 0.55 : 0.34) + ")"; ctx.lineWidth = 1;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(-6, -8, 12, 16, 1.5); else ctx.rect(-6, -8, 12, 16);
      ctx.fill(); ctx.stroke();
      ctx.strokeStyle = "rgba(" + TINTA + ",.3)";
      ctx.beginPath(); ctx.moveTo(-3, -4); ctx.lineTo(3, -4); ctx.moveTo(-3, -1); ctx.lineTo(1.5, -1); ctx.stroke();
      if (timbrada) { ctx.fillStyle = "rgb(" + FUEGO + ")"; ctx.fillRect(-3, 2.5, 6, 2.5); }
      ctx.restore();
    };
    var rotulo = function (texto, x, y, alinear, fuerte) {
      ctx.font = (fuerte ? "700 " : "500 ") + "12px Inter, system-ui, sans-serif";
      ctx.textAlign = alinear; ctx.fillStyle = "rgba(" + TINTA + "," + (fuerte ? 0.9 : 0.5) + ")";
      ctx.fillText(texto, x, y);
    };
    var cuadro = function (t) {
      ctx.clearRect(0, 0, ancho, alto);
      var i, p;

      // La línea ordenada, de Habu al SII.
      ctx.strokeStyle = "rgba(" + FUEGO + ",.85)"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(puertaX, lineaY); ctx.lineTo(ancho, lineaY); ctx.stroke();

      // Boletas sueltas: llegan a distinto ritmo, giradas, cada una por su lado.
      var embudo = Math.min(260, puertaX * 0.55);
      for (i = sueltas.length - 1; i >= 0; i--) {
        p = sueltas[i];
        p.x += p.v;
        var k = Math.max(0, Math.min(1, (p.x - (puertaX - embudo)) / embudo));
        k = k * k * (3 - 2 * k);
        var libre = p.y0 + Math.sin(t / 1500 + p.f) * 16;
        var destino = libre + (lineaY - libre) * k;
        if (p.y < 0) p.y = destino;
        var dx = p.x - raton.x, dy = p.y - raton.y, d2 = dx * dx + dy * dy;
        if (d2 < 19600) { destino += (dy >= 0 ? 1 : -1) * (1 - d2 / 19600) * 70 * (1 - k); p.giro += 0.04 * (1 - k); }
        p.y += (destino - p.y) * 0.07;
        p.giro = (p.giro + p.w) * (1 - k * 0.12);       // Habu la va enderezando
        if (p.x >= puertaX - 4) { sueltas[i] = suelta(-12); porSalir++; continue; }
        boleta(p.x, p.y, p.giro, p.t + (1 - p.t) * k, 0.55 + 0.45 * k, false);
      }

      // Habu las suelta de a una, a la misma distancia, ya timbradas.
      var ultima = enFila.length ? enFila[enFila.length - 1].x : Infinity;
      if (porSalir > 0 && ultima - puertaX >= paso) { enFila.push({ x: puertaX, nace: 0 }); porSalir--; pulso = 1; }
      if (porSalir > 6) porSalir = 6;
      for (i = enFila.length - 1; i >= 0; i--) {
        p = enFila[i];
        p.x += ritmo; p.nace = Math.min(1, p.nace + 0.06);
        if (p.x > ancho + 12) { enFila.splice(i, 1); continue; }
        boleta(p.x, lineaY - 13, 0, 1, p.nace, true);
      }

      // Habu, en la puerta.
      if (pulso > 0.01) {
        ctx.strokeStyle = "rgba(" + FUEGO + "," + pulso * 0.5 + ")"; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(puertaX, lineaY, 20 + (1 - pulso) * 16, 0, 6.283); ctx.stroke();
        pulso *= 0.94;
      }
      ctx.fillStyle = "#FAFAF7"; ctx.beginPath(); ctx.arc(puertaX, lineaY, 20, 0, 6.283); ctx.fill();
      ctx.strokeStyle = "rgba(" + TINTA + ",.9)"; ctx.lineWidth = 1.5; ctx.stroke();
      if (avion) {
        ctx.save(); ctx.translate(puertaX, lineaY); ctx.rotate(Math.PI / 2); ctx.scale(0.42, 0.42); ctx.translate(-32, -32);
        ctx.fillStyle = "rgb(" + TINTA + ")"; ctx.fill(avion);
        ctx.fillStyle = "rgb(" + FUEGO + ")"; ctx.fill(punta);
        ctx.restore();
      }
      rotulo("Habu las ordena", puertaX, lineaY + 40, "center", true);
      if (ancho >= 720) rotulo("Sus ventas, como vengan", Math.max(20, puertaX - embudo), lineaY + 40, "left", false);
      rotulo("Al SII", ancho - 20, lineaY + 40, "right", false);

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

  // 6. Lectura de una planilla: se sube, Habu responde qué entendió y el archivo se descarta.
  var buzon = uno("[data-buzon]");
  if (buzon) {
    var servicio = buzon.getAttribute("data-servicio"), entrada = uno("[data-archivo]");
    var texto = uno("[data-buzon-txt]"), salida = uno("[data-lectura]"), inicial = texto.textContent;
    var crear = function (etiqueta, contenido, clase) {
      var el = document.createElement(etiqueta);
      if (contenido != null) el.textContent = contenido;
      if (clase) el.className = clase;
      return el;
    };
    var lista = function (titulo, items) {
      if (!items.length) return;
      salida.appendChild(crear("h4", titulo));
      var ul = crear("ul");
      items.forEach(function (item) { ul.appendChild(crear("li", item)); });
      salida.appendChild(ul);
    };
    var fecha = function (iso) { var p = iso.split("-"); return p[2] + "-" + p[1] + "-" + p[0]; };
    var mostrar = function (r) {
      salida.textContent = "";
      salida.hidden = false;
      if (!r.ok) {
        salida.appendChild(crear("p", r.mensaje, "lectura-no"));
      } else {
        if (r.boletas) {
          salida.appendChild(crear("p", "Entendí su planilla. Saldrían"));
          salida.appendChild(crear("b", miles(r.boletas) + (r.boletas === 1 ? " boleta" : " boletas"), "lectura-n"));
          var detalle = "por " + pesos(r.suma) + " en total";
          if (r.desde) detalle += r.desde === r.hasta ? ", del " + fecha(r.desde) : ", del " + fecha(r.desde) + " al " + fecha(r.hasta);
          salida.appendChild(crear("p", detalle + "."));
        } else {
          salida.appendChild(crear("p", "Abrí su archivo, pero todavía no puedo sacar boletas de él.", "lectura-no"));
        }
        lista("Esto entendí", r.columnas.map(function (c) { return "«" + c.titulo + "» es " + c.es + "."; }));
        var supuse = r.supuestos.map(function (t) { return t.charAt(0).toUpperCase() + t.slice(1); });
        if (r.sin_usar.length) supuse.push("No necesité: " + r.sin_usar.map(function (t) { return "«" + t + "»"; }).join(", ") + ".");
        lista("Lo que supuse", supuse);
        var aparte = r.apartadas.map(function (a) { return "Fila " + a.fila + ": " + a.motivo + "."; });
        if (r.total_apartadas > aparte.length) aparte.push("… y " + (r.total_apartadas - aparte.length) + " más.");
        lista(r.total_apartadas === 1 ? "Una fila quedó aparte" : r.total_apartadas + " filas quedaron aparte", aparte);
        lista("Para seguir, necesito saber", r.preguntas);
        salida.appendChild(crear("p", r.limpia
          ? "Esta planilla está lista. La emisión desde la web se abrirá junto con las cuentas de cliente."
          : "Nada se emite a medias: con esto resuelto, la planilla quedaría lista.", "lectura-fin"));
      }
      buzon.classList.remove("andando");
      texto.textContent = "Probar con otra planilla";
    };
    var subir = function (archivo) {
      if (!archivo || buzon.classList.contains("andando")) return;
      if (archivo.size > 5000000) return mostrar({ ok: false, mensaje: "El archivo pesa más de 5 MB. Para probar, suba uno más chico." });
      buzon.classList.add("andando");
      salida.hidden = true;
      texto.textContent = "Leyendo «" + (archivo.name || "su planilla") + "»…";
      fetch(servicio, { method: "POST", body: archivo, headers: { "Content-Type": "application/octet-stream" } })
        .then(function (respuesta) { return respuesta.json(); })
        .then(mostrar)
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
      subir(new File([planilla], "ventas de ejemplo.csv", { type: "text/csv" }));
    });
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
