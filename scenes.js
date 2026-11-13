/* myfawlt — real-time 3D still lifes (Three.js).
   One or two sculptural objects per card, matte physical materials,
   softbox key + fill, contact shadows, 50–85mm-equivalent camera,
   slow pointer-follow only (no idle looping). Palette-locked. */
(function () {
  'use strict';

  var PAL = {
    paper: 0xF2EFE9,
    ink: 0x1A1917,
    muted: 0x6E6A63,
    line: 0xD9D4CA,
    accent: 0xB4532A,
    paperHi: 0xF7F4EE,
    oak: 0xA98A63
  };

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var interactive = finePointer && !reduceMotion;

  function srgb(hex) { return new THREE.Color(hex).convertSRGBToLinear(); }

  /* ---- procedural surface imperfection: dust, faint scratches, roughness drift ---- */
  function imperfectionTexture(size) {
    size = size || 256;
    var c = document.createElement('canvas');
    c.width = c.height = size;
    var g = c.getContext('2d');
    g.fillStyle = '#808080';
    g.fillRect(0, 0, size, size);
    var i, x, y, r;
    for (i = 0; i < 2600; i++) {
      x = Math.random() * size; y = Math.random() * size;
      r = Math.random() * 1.1 + 0.2;
      var v = 128 + (Math.random() - 0.5) * 46;
      g.fillStyle = 'rgba(' + (v | 0) + ',' + (v | 0) + ',' + (v | 0) + ',' + (0.35 + Math.random() * 0.4) + ')';
      g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill();
    }
    g.lineCap = 'round';
    for (i = 0; i < 26; i++) {
      x = Math.random() * size; y = Math.random() * size;
      var len = 8 + Math.random() * 34, a = Math.random() * Math.PI;
      var sv = 128 + (Math.random() - 0.5) * 30;
      g.strokeStyle = 'rgba(' + (sv | 0) + ',' + (sv | 0) + ',' + (sv | 0) + ',0.28)';
      g.lineWidth = 0.5 + Math.random() * 0.5;
      g.beginPath(); g.moveTo(x, y);
      g.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len); g.stroke();
    }
    for (i = 0; i < 7; i++) {
      x = Math.random() * size; y = Math.random() * size; r = 14 + Math.random() * 30;
      var grad = g.createRadialGradient(x, y, 0, x, y, r);
      var bv = 128 + (Math.random() - 0.5) * 22;
      grad.addColorStop(0, 'rgba(' + (bv | 0) + ',' + (bv | 0) + ',' + (bv | 0) + ',0.18)');
      grad.addColorStop(1, 'rgba(128,128,128,0)');
      g.fillStyle = grad; g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill();
    }
    var tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 2);
    return tex;
  }

  function contactTexture() {
    var c = document.createElement('canvas');
    c.width = c.height = 128;
    var g = c.getContext('2d');
    var grad = g.createRadialGradient(64, 64, 4, 64, 64, 62);
    grad.addColorStop(0, 'rgba(26,25,23,0.55)');
    grad.addColorStop(0.55, 'rgba(26,25,23,0.22)');
    grad.addColorStop(1, 'rgba(26,25,23,0)');
    g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  }

  function wireframeTexture() {
    var c = document.createElement('canvas');
    c.width = 512; c.height = 352;
    var g = c.getContext('2d');
    g.clearRect(0, 0, 512, 352);
    g.strokeStyle = 'rgba(26,25,23,0.72)';
    g.lineWidth = 2; g.lineCap = 'round';
    function rect(x, y, w, h) { g.strokeRect(x, y, w, h); }
    rect(28, 26, 456, 40);
    rect(28, 86, 270, 150);
    rect(316, 86, 168, 68);
    rect(316, 168, 168, 68);
    rect(28, 254, 140, 70);
    rect(184, 254, 140, 70);
    rect(340, 254, 144, 70);
    g.strokeStyle = 'rgba(26,25,23,0.4)';
    g.lineWidth = 1.4;
    g.beginPath(); g.moveTo(44, 46); g.lineTo(150, 46); g.stroke();
    g.beginPath(); g.moveTo(44, 110); g.lineTo(270, 110); g.stroke();
    g.beginPath(); g.moveTo(44, 128); g.lineTo(240, 128); g.stroke();
    g.fillStyle = 'rgba(180,83,42,0.9)';
    g.beginPath(); g.arc(452, 46, 7, 0, 6.283); g.fill();
    var tex = new THREE.CanvasTexture(c);
    tex.anisotropy = 4;
    tex.encoding = THREE.sRGBEncoding;
    return tex;
  }

  var sharedBump = null;
  var sharedContact = null;
  function bump() { if (!sharedBump) sharedBump = imperfectionTexture(256); return sharedBump; }
  function contact() { if (!sharedContact) sharedContact = contactTexture(); return sharedContact; }

  function mat(hex, opts) {
    opts = opts || {};
    var m = new THREE.MeshStandardMaterial({
      color: srgb(hex),
      roughness: opts.roughness != null ? opts.roughness : 0.9,
      metalness: 0,
      bumpMap: bump(),
      bumpScale: opts.bumpScale != null ? opts.bumpScale : 0.012
    });
    if (opts.map) m.map = opts.map;
    return m;
  }

  function roundedRectShape(w, h, r) {
    r = Math.max(0.0005, Math.min(r, w / 2 - 0.0005, h / 2 - 0.0005));
    var s = new THREE.Shape();
    var x = -w / 2, y = -h / 2;
    s.moveTo(x + r, y);
    s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
    return s;
  }

  function bevelBox(w, h, d, r) {
    r = Math.min(r || 0.035, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001);
    var shape = roundedRectShape(w - 2 * r, h - 2 * r, r * 0.9);
    var geo = new THREE.ExtrudeGeometry(shape, {
      depth: d - 2 * r, bevelEnabled: true, bevelThickness: r, bevelSize: r,
      bevelSegments: 3, curveSegments: 6, steps: 1
    });
    geo.center();
    return geo;
  }

  function mesh(geo, material, x, y, z) {
    var m = new THREE.Mesh(geo, material);
    m.position.set(x || 0, y || 0, z || 0);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }

  function contactDisc(radius, opacity, x, z) {
    var m = new THREE.Mesh(
      new THREE.PlaneGeometry(radius * 2, radius * 2),
      new THREE.MeshBasicMaterial({ map: contact(), transparent: true, opacity: opacity != null ? opacity : 0.5, depthWrite: false })
    );
    m.rotation.x = -Math.PI / 2;
    m.position.set(x || 0, 0.004, z || 0);
    m.renderOrder = 1;
    return m;
  }

  function studio(scene) {
    var hemi = new THREE.HemisphereLight(srgb(PAL.paperHi), srgb(PAL.muted), 0.5);
    scene.add(hemi);

    var key = new THREE.DirectionalLight(srgb(0xFFF4E6), 1.15);
    key.position.set(3.2, 5.2, 4.0);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -3; key.shadow.camera.right = 3;
    key.shadow.camera.top = 3; key.shadow.camera.bottom = -3;
    key.shadow.camera.near = 0.5; key.shadow.camera.far = 14;
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.02;
    scene.add(key);

    var fill = new THREE.DirectionalLight(srgb(PAL.paper), 0.38);
    fill.position.set(-4, 2.4, -2.5);
    scene.add(fill);

    var ground = new THREE.Mesh(
      new THREE.PlaneGeometry(24, 24),
      new THREE.ShadowMaterial({ opacity: 0.16, color: srgb(PAL.ink) })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
  }

  /* ---------------- scenes ---------------- */

  function buildPlugins() {
    var g = new THREE.Group();
    var concrete = mat(PAL.line, { roughness: 0.96, bumpScale: 0.02 });
    var ceramic = mat(PAL.paperHi, { roughness: 0.62, bumpScale: 0.007 });
    var terra = mat(PAL.accent, { roughness: 0.7, bumpScale: 0.01 });
    g.add(mesh(bevelBox(1.25, 0.34, 0.9, 0.05), concrete, 0, 0.17, 0));
    var mid = mesh(bevelBox(0.86, 0.3, 0.62, 0.045), ceramic, -0.1, 0.49, 0.05);
    mid.rotation.y = 0.12; g.add(mid);
    var top = mesh(bevelBox(0.36, 0.3, 0.36, 0.04), terra, 0.22, 0.79, -0.04);
    top.rotation.y = -0.2; g.add(top);
    g.add(contactDisc(1.05, 0.5, 0, 0));
    g.position.x = -0.12;
    g.rotation.y = -0.28;
    return { group: g, lookAt: [0, 0.42, 0], cam: [0.2, 1.15, 4.1] };
  }

  function buildMods() {
    var g = new THREE.Group();
    var ceramic = mat(PAL.paperHi, { roughness: 0.58, bumpScale: 0.006 });
    var terra = mat(PAL.accent, { roughness: 0.66, bumpScale: 0.009 });
    var torus = mesh(new THREE.TorusGeometry(0.56, 0.22, 28, 72), ceramic, -0.18, 0.22, 0);
    torus.rotation.x = Math.PI / 2; g.add(torus);
    g.add(mesh(new THREE.SphereGeometry(0.23, 40, 32), terra, 0.72, 0.23, 0.18));
    g.add(contactDisc(0.95, 0.45, -0.18, 0));
    g.add(contactDisc(0.4, 0.5, 0.72, 0.18));
    g.position.x = -0.1;
    g.rotation.y = 0.3;
    return { group: g, lookAt: [0, 0.24, 0], cam: [0.15, 1.05, 3.9] };
  }

  function buildWebsites() {
    var g = new THREE.Group();
    var paper = mat(PAL.paperHi, { roughness: 0.98, bumpScale: 0.004 });
    var terra = mat(PAL.accent, { roughness: 0.7, bumpScale: 0.01 });
    for (var i = 0; i < 4; i++) {
      var sheet = mesh(bevelBox(1.34, 0.022, 0.92, 0.008), paper, (i - 1.5) * 0.018, 0.012 + i * 0.024, (i - 1.5) * 0.012);
      sheet.rotation.y = (i - 1.5) * 0.045;
      g.add(sheet);
    }
    var draw = new THREE.Mesh(
      new THREE.PlaneGeometry(1.2, 0.82),
      new THREE.MeshBasicMaterial({ map: wireframeTexture(), transparent: true, opacity: 0.92 })
    );
    draw.rotation.x = -Math.PI / 2;
    draw.rotation.z = 0.0675;
    draw.position.set(0.027, 0.1005, 0.018);
    g.add(draw);
    var mark = mesh(bevelBox(0.16, 0.16, 0.16, 0.025), terra, 0.78, 0.08, 0.34);
    mark.rotation.y = 0.4; g.add(mark);
    g.add(contactDisc(1.0, 0.42, 0, 0));
    g.add(contactDisc(0.26, 0.5, 0.78, 0.34));
    g.position.x = -0.14;
    g.rotation.y = -0.18;
    return { group: g, lookAt: [0, 0.06, 0], cam: [0.1, 1.5, 3.6] };
  }

  function buildSmp() {
    var g = new THREE.Group();
    var concrete = mat(PAL.line, { roughness: 0.96, bumpScale: 0.02 });
    var terra = mat(PAL.accent, { roughness: 0.7, bumpScale: 0.01 });
    var ink = mat(PAL.ink, { roughness: 0.8, bumpScale: 0.008 });
    g.add(mesh(bevelBox(0.8, 0.5, 0.8, 0.06), concrete, 0, 0.25, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.62, 10), ink, 0.12, 0.81, -0.08));
    g.add(mesh(bevelBox(0.26, 0.16, 0.016, 0.006), terra, 0.26, 1.02, -0.08));
    g.add(contactDisc(0.85, 0.5, 0, 0));
    g.position.x = -0.08;
    g.rotation.y = 0.34;
    return { group: g, lookAt: [0, 0.55, 0], cam: [0.18, 1.05, 3.6] };
  }

  function buildPortrait() {
    var g = new THREE.Group();
    var ceramic = mat(PAL.paperHi, { roughness: 0.6, bumpScale: 0.006 });
    var concrete = mat(PAL.line, { roughness: 0.96, bumpScale: 0.02 });
    var terra = mat(PAL.accent, { roughness: 0.66, bumpScale: 0.009 });
    g.add(mesh(bevelBox(0.95, 0.12, 0.75, 0.03), concrete, 0, 0.06, 0));
    var shoulders = mesh(new THREE.CylinderGeometry(0.3, 0.56, 0.52, 48), ceramic, 0, 0.38, 0);
    g.add(shoulders);
    var neck = mesh(new THREE.CylinderGeometry(0.13, 0.16, 0.16, 24), ceramic, 0, 0.7, 0);
    g.add(neck);
    var head = mesh(new THREE.SphereGeometry(0.4, 48, 36), ceramic, 0, 1.08, 0);
    head.scale.set(0.92, 1.06, 0.96);
    g.add(head);
    g.add(mesh(new THREE.SphereGeometry(0.065, 24, 18), terra, 0.3, 0.56, 0.28));
    g.add(contactDisc(0.85, 0.5, 0, 0));
    g.position.x = -0.05;
    g.rotation.y = -0.22;
    return { group: g, lookAt: [0, 0.72, 0], cam: [0.12, 1.0, 3.3] };
  }

  var BUILDERS = {
    plugins: buildPlugins,
    mods: buildMods,
    websites: buildWebsites,
    smp: buildSmp,
    portrait: buildPortrait
  };

  /* ---------------- runtime ---------------- */

  function SceneCard(canvas) {
    this.canvas = canvas;
    this.kind = canvas.getAttribute('data-scene');
    this.renderer = null;
    this.raf = 0;
    this.visible = false;
    this.targetX = 0; this.targetY = 0;
    this.curX = 0; this.curY = 0;
    this.disposed = false;
  }

  SceneCard.prototype.init = function () {
    if (this.renderer || this.disposed) return;
    var builder = BUILDERS[this.kind];
    if (!builder || typeof THREE === 'undefined') { this.fallback(); return; }
    try {
      this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
    } catch (e) { this.fallback(); return; }
    var r = this.renderer;
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    r.setClearColor(0x000000, 0);
    r.outputEncoding = THREE.sRGBEncoding;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.04;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    studio(this.scene);
    var built = builder();
    this.group = built.group;
    this.scene.add(this.group);
    this.baseRotY = this.group.rotation.y;
    this.baseRotX = this.group.rotation.x;

    this.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 60);
    this.camera.position.set(built.cam[0], built.cam[1], built.cam[2]);
    this.lookAt = new THREE.Vector3(built.lookAt[0], built.lookAt[1], built.lookAt[2]);
    this.camera.lookAt(this.lookAt);

    this.resize();
    this.bindPointer();
    this.renderOnce();
  };

  SceneCard.prototype.fallback = function () {
    var holder = this.canvas.closest('.card__media') || this.canvas.closest('.about__portrait');
    if (holder) holder.classList.add('no-webgl');
  };

  SceneCard.prototype.resize = function () {
    if (!this.renderer) return;
    var holder = this.canvas.parentElement;
    var w = Math.max(1, holder.clientWidth);
    var h = Math.max(1, holder.clientHeight);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderOnce();
  };

  SceneCard.prototype.bindPointer = function () {
    if (!interactive) return;
    var self = this;
    var host = this.canvas.closest('[data-project]') || this.canvas.parentElement;
    host.addEventListener('pointermove', function (e) {
      var rect = host.getBoundingClientRect();
      var nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      var ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
      self.targetY = nx * 0.16;
      self.targetX = -ny * 0.07;
      self.requestRender();
    });
    host.addEventListener('pointerleave', function () {
      self.targetY = 0; self.targetX = 0;
      self.requestRender();
    });
  };

  SceneCard.prototype.requestRender = function () {
    if (this.disposed || !this.renderer || !this.visible) return;
    if (!this.raf) {
      var self = this;
      this.raf = requestAnimationFrame(function () { self.tick(); });
    }
  };

  SceneCard.prototype.tick = function () {
    this.raf = 0;
    if (this.disposed || !this.renderer) return;
    this.curY += (this.targetY - this.curY) * 0.07;
    this.curX += (this.targetX - this.curX) * 0.07;
    this.group.rotation.y = this.baseRotY + this.curY;
    this.group.rotation.x = this.baseRotX + this.curX;
    this.renderer.render(this.scene, this.camera);
    var moving = Math.abs(this.targetY - this.curY) > 0.0006 || Math.abs(this.targetX - this.curX) > 0.0006;
    if (moving && this.visible) this.requestRender();
  };

  SceneCard.prototype.renderOnce = function () {
    if (this.renderer && !this.disposed) this.renderer.render(this.scene, this.camera);
  };

  SceneCard.prototype.setVisible = function (v) {
    this.visible = v;
    if (v) { this.init(); this.resize(); this.requestRender(); }
    else if (this.raf) { cancelAnimationFrame(this.raf); this.raf = 0; }
  };

  SceneCard.prototype.dispose = function () {
    this.disposed = true;
    if (this.raf) cancelAnimationFrame(this.raf);
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.forceContextLoss();
    }
  };

  window.MyScenes = {
    cards: [],
    started: false,
    start: function () {
      if (this.started) return;
      this.started = true;
      var canvases = Array.prototype.slice.call(document.querySelectorAll('canvas[data-scene]'));
      var self = this;
      if (!('IntersectionObserver' in window)) {
        canvases.forEach(function (c) { var card = new SceneCard(c); self.cards.push(card); card.setVisible(true); });
        return;
      }
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          var card = entry.target._sceneCard;
          if (card) card.setVisible(entry.isIntersecting);
        });
      }, { rootMargin: '120px 0px', threshold: 0.05 });
      canvases.forEach(function (c) {
        var card = new SceneCard(c);
        c._sceneCard = card;
        self.cards.push(card);
        io.observe(c);
      });
      var resizeTimer;
      window.addEventListener('resize', function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function () {
          self.cards.forEach(function (card) { if (card.visible) card.resize(); });
        }, 120);
      });
      window.addEventListener('pagehide', function () {
        self.cards.forEach(function (card) { card.dispose(); });
      });
    }
  };
})();
