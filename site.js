// Habu: todo lo que se mueve en el sitio. Sin librerías y sin enviar nada a ninguna parte
// (salvo la planilla que usted mismo suba para que Habu la lea).
(function () {
  var quieto = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var tactil = window.matchMedia && window.matchMedia("(hover: none)").matches;
  var uno = function (s, base) { return (base || document).querySelector(s); };
  var todos = function (s, base) { return Array.prototype.slice.call((base || document).querySelectorAll(s)); };
  var miles = function (n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, "."); };
  var pesos = function (n) { return "$ " + miles(n); };

  // 1. Lo que sube al aparecer, y los números que cuentan.
  var piezas = todos(".sube");
  var contar = function (b) {
    var fin = Number(b.getAttribute("data-n")), t0 = performance.now(), dura = quieto ? 1 : 1500;
    var anda = function (t) {
      var k = Math.min(1, (t - t0) / dura);
      b.textContent = miles(fin * (1 - Math.pow(1 - k, 4)));
      if (k < 1) requestAnimationFrame(anda);
    };
    requestAnimationFrame(anda);
  };
  if (!("IntersectionObserver" in window)) {
    piezas.forEach(function (el) { el.classList.add("ya"); });
    todos("[data-n]").forEach(function (b) { b.textContent = miles(b.getAttribute("data-n")); });
  } else {
    var ojo = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (!e.isIntersecting) return;
        ojo.unobserve(e.target); e.target.classList.add("ya");
        var b = uno("[data-n]", e.target); if (b) contar(b);
      });
    }, { threshold: 0.15 });
    piezas.forEach(function (el, i) { el.style.transitionDelay = (i % 3) * 70 + "ms"; ojo.observe(el); });
  }

  // 2. El punto que sigue al cursor, y los botones que se dejan atraer.
  var punto = uno("#punto"), raton = { x: 0.5, y: 0.45, vivo: 0 };
  window.addEventListener("pointermove", function (e) {
    if (e.pointerType === "touch") return;
    raton.x = e.clientX / window.innerWidth; raton.y = e.clientY / window.innerHeight; raton.vivo = performance.now();
    if (punto) { punto.style.left = e.clientX + "px"; punto.style.top = e.clientY + "px"; punto.classList.add("vivo"); }
  }, { passive: true });
  if (punto) todos("a,button,[role=button],input").forEach(function (el) {
    el.addEventListener("pointerenter", function () { punto.classList.add("grande"); });
    el.addEventListener("pointerleave", function () { punto.classList.remove("grande"); });
  });
  if (!quieto && !tactil) todos("[data-iman]").forEach(function (el) {
    el.addEventListener("pointermove", function (e) {
      var c = el.getBoundingClientRect();
      el.style.setProperty("--x", (e.clientX - c.left - c.width / 2) * 0.3 + "px");
      el.style.setProperty("--y", (e.clientY - c.top - c.height / 2) * 0.4 + "px");
    });
    el.addEventListener("pointerleave", function () { el.style.setProperty("--x", "0px"); el.style.setProperty("--y", "0px"); });
  });

  // 3. Portada: el timbre vivo. Filas de código que corren desordenadas y, donde usted pasa,
  //    se enderezan y se encienden. Sin cursor (teléfono), un punto recorre la pantalla solo.
  var lienzo = uno("#timbre"), letras = todos(".titulo span");
  if (lienzo) {
    var gl = null;
    try { gl = lienzo.getContext("webgl", { antialias: false, powerPreference: "low-power" }); } catch (e) {}
    var foco = [0.5, 0.45], visible = true;
    var destino = function (seg) {
      // Si el cursor está quieto hace rato (o no hay cursor), el foco pasea solo.
      if (!tactil && performance.now() - raton.vivo < 2500 && raton.vivo) return [raton.x, raton.y];
      return [0.5 + Math.sin(seg * 0.45) * 0.34, 0.45 + Math.sin(seg * 0.71 + 1.3) * 0.26];
    };
    if (gl) {
      var hacer = function (tipo, txt) { var s = gl.createShader(tipo); gl.shaderSource(s, txt); gl.compileShader(s); return s; };
      var prog = gl.createProgram();
      gl.attachShader(prog, hacer(gl.VERTEX_SHADER, "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}"));
      gl.attachShader(prog, hacer(gl.FRAGMENT_SHADER, [
        "precision highp float;uniform vec2 r,m;uniform float t;",
        "float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}",
        "void main(){",
        " float asp=r.x/r.y;vec2 p=vec2(gl_FragCoord.x/r.y,gl_FragCoord.y/r.y);vec2 q=vec2(m.x*asp,m.y);",
        " float d=distance(p,q);float lente=smoothstep(.42,.03,d);",
        // lejos del foco, las filas ondulan y se tuercen; cerca, quedan derechas
        " float onda=sin(p.x*2.6+t*.6+sin(p.y*4.+t*.25)*1.6)*.045+sin(p.x*7.-t*.8+p.y*3.)*.014;",
        " float y=p.y+onda*(1.-lente);",
        " float filas=15.;float fila=floor(y*filas);float fy=fract(y*filas);",
        " float vel=(h(vec2(fila,7.))*.5+.14)*(mod(fila,2.)<1.?1.:-1.);",
        " float x=p.x+t*vel*.16+sin(y*9.+t*.5)*.02*(1.-lente);",
        " float celda=floor(x*150.);float on=step(.48,h(vec2(celda,fila)));",
        " float hueco=mix(.2,.08,lente);float alto=smoothstep(hueco-.04,hueco,fy)*smoothstep(1.-hueco+.04,1.-hueco,fy);",
        // un lector que barre la pantalla, como en la caja
        " float bx=mod(t*.11,1.6)-.3;float barrido=smoothstep(.1,0.,abs(p.x/asp-bx))*.55;",
        " float luz=max(lente,barrido);float marca=on*alto;",
        " vec3 tinta=vec3(.043,.063,.125),fuego=vec3(1.,.29,.11),papel=vec3(.957,.945,.91);",
        " vec3 col=tinta+vec3(.05,.06,.09)*marca;",
        " col=mix(col,fuego,marca*luz);col=mix(col,papel,marca*smoothstep(.16,.0,d));",
        " col+=fuego*.07*lente*(1.-marca);",
        " gl_FragColor=vec4(col,1.);}"
      ].join("\n")));
      gl.linkProgram(prog);
      if (gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        gl.useProgram(prog);
        gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
        var a = gl.getAttribLocation(prog, "p"); gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
        var uR = gl.getUniformLocation(prog, "r"), uM = gl.getUniformLocation(prog, "m"), uT = gl.getUniformLocation(prog, "t");
        var medir = function () {
          var d = Math.min(window.devicePixelRatio || 1, 1.5);
          lienzo.width = lienzo.clientWidth * d; lienzo.height = lienzo.clientHeight * d;
          gl.viewport(0, 0, lienzo.width, lienzo.height);
        };
        medir(); window.addEventListener("resize", medir);
        if ("IntersectionObserver" in window) new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }).observe(lienzo);
        var pinta = function (ms) {
          if (visible) {
            var seg = ms / 1000, hacia = destino(seg);
            foco[0] += (hacia[0] - foco[0]) * 0.07; foco[1] += (hacia[1] - foco[1]) * 0.07;
            gl.uniform2f(uR, lienzo.width, lienzo.height); gl.uniform2f(uM, foco[0], 1 - foco[1]); gl.uniform1f(uT, seg);
            gl.drawArrays(gl.TRIANGLES, 0, 3);
            // las letras se ensanchan donde está el foco
            for (var i = 0; i < letras.length; i++) {
              var c = letras[i].getBoundingClientRect();
              var dx = (c.left + c.width / 2) / window.innerWidth - foco[0], dy = ((c.top + c.height / 2) / window.innerHeight - foco[1]) * 0.6;
              var cerca = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy) * 2.6);
              letras[i].style.fontVariationSettings = '"wdth" ' + (66 + 59 * cerca * cerca).toFixed(1) + ',"wght" 900';
              // cerca del foco la letra queda hueca y deja ver el timbre encendido
              letras[i].style.setProperty("--fx", (foco[0] * window.innerWidth - c.left).toFixed(0) + "px");
              letras[i].style.setProperty("--fy", (foco[1] * window.innerHeight - c.top).toFixed(0) + "px");
            }
          }
          if (!quieto) requestAnimationFrame(pinta);
        };
        requestAnimationFrame(pinta);
      } else gl = null;
    }
    if (!gl) lienzo.style.background = "repeating-linear-gradient(90deg,#0B1020 0 6px,#141B33 6px 9px,#0B1020 9px 17px,#141B33 17px 19px)";
    // seguro: pase lo que pase con la entrada, el título queda a la vista
    setTimeout(function () { letras.forEach(function (s) { s.style.animation = "none"; }); }, 1700);
  }

  // 4. La boleta viva: se agregan ventas, se timbra, y el IVA del mes va sumando.
  var papel = uno("#papel");
  if (papel) {
    var lineas = uno("#lineas"), total = uno("#total"), ivaBoleta = uno("#ivaBoleta"), codigo = uno("#codigo");
    var ivaMes = uno("#ivaMes"), nBoletas = uno("#nBoletas");
    var suma = 0, vistoSuma = 0, mes = 0, vistoMes = 0, boletas = 0, solo = true, semilla = 20261113;
    var correr = function () {
      vistoSuma += (suma - vistoSuma) * 0.25; if (Math.abs(suma - vistoSuma) < 1) vistoSuma = suma;
      vistoMes += (mes - vistoMes) * 0.12; if (Math.abs(mes - vistoMes) < 1) vistoMes = mes;
      total.textContent = pesos(vistoSuma); ivaBoleta.textContent = pesos(vistoSuma * 19 / 119); ivaMes.textContent = pesos(vistoMes);
      if (vistoSuma !== suma || vistoMes !== mes) requestAnimationFrame(correr);
    };
    // Un timbre con la forma de los de verdad (filas de barras), dibujado a partir de la venta.
    var dibujar = function () {
      var c = codigo.getContext("2d"), W = codigo.width, H = codigo.height, s = semilla;
      var azar = function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
      c.clearRect(0, 0, W, H); c.fillStyle = "#0B1020";
      var filas = 16, alto = H / filas, m = 3, inicio = [8, 1, 1, 1, 1, 1, 1, 3], fin = [7, 1, 1, 3, 1, 1, 1, 2, 1];
      var anchoFin = fin.reduce(function (a, b) { return a + b; }, 0) * m;
      for (var f = 0; f < filas; f++) {
        var x = 0, on = true, i;
        for (i = 0; i < inicio.length; i++) { if (on) c.fillRect(x, f * alto, inicio[i] * m, alto + 0.5); x += inicio[i] * m; on = !on; }
        while (x < W - anchoFin - m * 4) { var w = (1 + Math.floor(azar() * 4)) * m; if (on) c.fillRect(x, f * alto, Math.min(w, W - anchoFin - x), alto + 0.5); x += w; on = !on; }
        x = W - anchoFin; on = true;
        for (i = 0; i < fin.length; i++) { if (on) c.fillRect(x, f * alto, fin[i] * m, alto + 0.5); x += fin[i] * m; on = !on; }
      }
    };
    var agrega = function (nombre, precio) {
      if (papel.classList.contains("timbrada")) { papel.classList.remove("timbrada"); lineas.textContent = ""; suma = 0; }
      if (lineas.children.length >= 6) lineas.removeChild(lineas.firstChild);
      var li = document.createElement("li"), a = document.createElement("span"), b = document.createElement("span");
      a.textContent = nombre; b.textContent = pesos(precio); li.appendChild(a); li.appendChild(b); lineas.appendChild(li);
      suma += precio; semilla = (semilla * 31 + precio) >>> 0; correr();
    };
    var timbra = function () {
      if (!suma || papel.classList.contains("timbrada")) return;
      dibujar(); papel.classList.add("timbrada");
      mes += suma * 19 / 119; boletas++; nBoletas.textContent = miles(boletas); correr();
    };
    var teclas = todos("#teclas [data-p]");
    teclas.forEach(function (b) { b.addEventListener("click", function () { solo = false; var d = b.getAttribute("data-p").split("|"); agrega(d[0], Number(d[1])); }); });
    uno("#timbrar").addEventListener("click", function () { solo = false; timbra(); });
    // Mientras nadie la toque, trabaja sola (y solo cuando está a la vista).
    var aLaVista = false, paso = 0;
    if ("IntersectionObserver" in window) new IntersectionObserver(function (e) { aLaVista = e[0].isIntersecting; }, { threshold: 0.3 }).observe(papel);
    if (!quieto) setInterval(function () {
      if (!solo || !aLaVista || document.hidden) return;
      paso++;
      if (paso % 4 === 0) timbra(); else { var d = teclas[(paso * 3) % teclas.length].getAttribute("data-p").split("|"); agrega(d[0], Number(d[1])); }
    }, 1300);
    var impresora = papel.parentNode;
    if (!quieto && !tactil) {
      impresora.addEventListener("pointermove", function (e) {
        var r = papel.getBoundingClientRect();
        papel.style.transform = "rotateX(" + ((e.clientY - r.top) / r.height - 0.5) * -18 + "deg) rotateY(" + ((e.clientX - r.left) / r.width - 0.5) * 24 + "deg)";
      });
      impresora.addEventListener("pointerleave", function () { papel.style.transform = ""; });
    }
  }

  // 5. Cálculo de ejemplo del IVA del mes.
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

  // 6. En qué va: filtros.
  var filtros = todos("[data-ver]");
  filtros.forEach(function (boton) {
    boton.addEventListener("click", function () {
      var ver = boton.getAttribute("data-ver");
      filtros.forEach(function (b) { b.setAttribute("aria-pressed", b === boton); });
      todos(".hitos li").forEach(function (li) { li.hidden = ver !== "todo" && !li.classList.contains(ver); });
    });
  });

  // 7. Lectura de una planilla: se sube, Habu responde qué entendió y el archivo se descarta.
  var buzon = uno("[data-buzon]");
  if (buzon) {
    var servicio = buzon.getAttribute("data-servicio"), entrada = uno("[data-archivo]");
    var texto = uno("[data-buzon-txt]"), salida = uno("[data-lectura]");
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
          ? "Esta planilla está lista. En la prueba gratis puede cargarla y ver cada documento de demostración."
          : "Nada se emite a medias: con esto resuelto, la planilla quedaría lista.", "lectura-fin"));
      }
      buzon.classList.remove("andando");
      texto.textContent = "Probar con otra";
    };
    var subir = function (archivo) {
      if (!archivo || buzon.classList.contains("andando")) return;
      if (archivo.size > 5000000) return mostrar({ ok: false, mensaje: "El archivo pesa más de 5 MB. Para probar, suba uno más chico." });
      buzon.classList.add("andando");
      salida.hidden = true;
      texto.textContent = "Leyendo…";
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

  // 8. Consulta de boleta: el formulario solo se habilita si hay un servicio configurado.
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
