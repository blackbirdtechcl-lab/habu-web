// Habu: aparición suave al entrar en pantalla y tablero de demostración.
(function () {
  var quieto = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var piezas = document.querySelectorAll(".aparece");
  if (quieto || !("IntersectionObserver" in window)) {
    piezas.forEach(function (el) { el.classList.add("visto"); });
  } else {
    var ojo = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (entrada) {
        if (entrada.isIntersecting) {
          entrada.target.classList.add("visto");
          ojo.unobserve(entrada.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    piezas.forEach(function (el, i) {
      el.style.transitionDelay = Math.min(i % 6, 5) * 60 + "ms";
      ojo.observe(el);
    });
  }

  // Tablero de la portada: datos de demostración, inventados en el navegador.
  var feed = document.querySelector("[data-feed]");
  if (feed && !quieto) {
    var pesos = function (n) { return "$ " + String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, "."); };
    var miles = function (n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, "."); };
    var el = function (s) { return document.querySelector(s); };
    var ventas = 1284600, docs = 96, iva = 3912400, boleta = 4812, factura = 318;
    setInterval(function () {
      if (document.hidden) return;
      var esFactura = Math.random() < 0.18;
      var monto = esFactura ? 60000 + Math.round(Math.random() * 240) * 1000 : 2900 + Math.round(Math.random() * 380) * 50;
      var nombre = esFactura ? "Factura " + miles(++factura) : "Boleta " + miles(++boleta);
      var neto = monto / 1.19;
      ventas += monto; docs += 1; iva += monto - neto;
      el("[data-ventas]").textContent = pesos(ventas);
      el("[data-docs]").textContent = docs;
      el("[data-iva]").textContent = pesos(iva);
      el("[data-ppm]").textContent = pesos(205900 + (ventas - 1284600) / 1.19 * 0.0025);
      var li = document.createElement("li");
      li.className = "nueva";
      li.innerHTML = '<span class="punto ok"></span><span></span><span></span><em>aceptada</em>';
      li.children[1].textContent = nombre;
      li.children[2].textContent = pesos(monto);
      feed.insertBefore(li, feed.firstChild);
      while (feed.children.length > 4) feed.removeChild(feed.lastChild);
    }, 2600);
  }

  // Consulta de boleta: el formulario solo se habilita si hay un servicio configurado.
  var formulario = document.querySelector("form[data-servicio]");
  if (formulario) {
    var servicio = formulario.getAttribute("data-servicio");
    var aviso = document.querySelector("[data-aviso]");
    var boton = formulario.querySelector("button");
    if (servicio) {
      formulario.action = servicio;
      if (aviso) aviso.hidden = true;
    } else {
      boton.disabled = true;
      formulario.addEventListener("submit", function (e) { e.preventDefault(); });
    }
    var monto = formulario.querySelector("[name=monto]");
    if (monto) {
      monto.addEventListener("input", function () {
        var limpio = monto.value.replace(/\D/g, "").slice(0, 10);
        monto.value = limpio.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
      });
    }
  }
})();
