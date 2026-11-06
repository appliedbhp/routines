
    /* ==========================================================================
       1. SYNTHESIS ENGINE (Web Audio API)
       ========================================================================== */
    class ProceduralAudio {
      constructor() {
        this.ctx = null;
        this.enabled = false;
      }

      init() {
        if (!this.ctx) {
          const AudioContext = window.AudioContext || window.webkitAudioContext;
          if (AudioContext) this.ctx = new AudioContext();
        }
        if (this.ctx && this.ctx.state === 'suspended') {
          this.ctx.resume();
        }
      }

      playLaser(type = 'COLLECT') {
        if (!this.enabled || !this.ctx) return;
        try {
          const now = this.ctx.currentTime;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();

          if (type === 'COLLECT') {
            // High crystalline ping
            osc.type = 'sine';
            osc.frequency.setValueAtTime(1046.5, now); // C6
            osc.frequency.exponentialRampToValueAtTime(329.63, now + 0.12);
            gain.gain.setValueAtTime(0.18, now);
            gain.gain.linearRampToValueAtTime(0.001, now + 0.12);
          } else {
            // Heavy resonant beam
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(260, now);
            osc.frequency.exponentialRampToValueAtTime(80, now + 0.16);
            gain.gain.setValueAtTime(0.16, now);
            gain.gain.linearRampToValueAtTime(0.001, now + 0.16);
          }

          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now);
          osc.stop(now + 0.17);
        } catch (e) {
          console.error(e);
        }
      }

      playThrust() {
        if (!this.enabled || !this.ctx) return;
        try {
          const now = this.ctx.currentTime;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(65 + Math.random() * 25, now);
          gain.gain.setValueAtTime(0.05, now);
          gain.gain.linearRampToValueAtTime(0.001, now + 0.08);

          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now);
          osc.stop(now + 0.09);
        } catch (e) {
          console.error(e);
        }
      }

      playCollectChime() {
        if (!this.enabled || !this.ctx) return;
        try {
          const now = this.ctx.currentTime;
          // Celestial major harmonic chord (C5, E5, G5, B5, C6)
          const freqs = [523.25, 659.25, 783.99, 987.77, 1046.50];
          freqs.forEach((f, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const t = now + (idx * 0.045);

            osc.type = 'sine';
            osc.frequency.setValueAtTime(f, t);

            gain.gain.setValueAtTime(0.12, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(t);
            osc.stop(t + 0.36);
          });
        } catch (e) {
          console.error(e);
        }
      }

      playReleaseWhoosh() {
        if (!this.enabled || !this.ctx) return;
        try {
          const now = this.ctx.currentTime;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();

          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(320, now);
          osc.frequency.exponentialRampToValueAtTime(65, now + 0.32);

          gain.gain.setValueAtTime(0.16, now);
          gain.gain.linearRampToValueAtTime(0.001, now + 0.32);

          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now);
          osc.stop(now + 0.33);
        } catch (e) {
          console.error(e);
        }
      }
    }

    const audio = new ProceduralAudio();

    /* ==========================================================================
       2. LIFE VALUES DATASET
       ========================================================================== */
    const VALUES_POOL = ValuesBlaster.values;

    let activeWeapon = 'COLLECT'; // 'COLLECT' (Weapon 1) or 'RELEASE' (Weapon 2)
    let collectedValues = [];
    let releasedValues = [];
    let totalTargetValues = VALUES_POOL.length;

    /* ==========================================================================
       3. RESPONSIVE CANVAS & MATH HELPERS
       ========================================================================== */
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    let screenWidth = window.innerWidth;
    let screenHeight = window.innerHeight;

    function resizeCanvas() {
      screenWidth = window.innerWidth;
      screenHeight = window.innerHeight;
      canvas.width = screenWidth * window.devicePixelRatio;
      canvas.height = screenHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    /* Starfield */
    class DeepSpaceStars {
      constructor(count = 130) {
        this.stars = [];
        for (let i = 0; i < count; i++) {
          this.stars.push({
            x: Math.random() * screenWidth,
            y: Math.random() * screenHeight,
            radius: Math.random() * 1.5 + 0.4,
            alpha: Math.random() * 0.8 + 0.2,
            twinkle: (Math.random() * 0.02 + 0.008) * (Math.random() > 0.5 ? 1 : -1)
          });
        }
      }

      draw() {
        ctx.save();
        for (let s of this.stars) {
          s.alpha += s.twinkle;
          if (s.alpha >= 1 || s.alpha <= 0.15) s.twinkle = -s.twinkle;
          ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0.1, s.alpha)})`;
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
    }

    /* Particle VFX System */
    class ParticleFX {
      constructor() {
        this.particles = [];
        this.floatingTexts = [];
      }

      burst(x, y, color, count = 28, label = null) {
        for (let i = 0; i < count; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = Math.random() * 5 + 1.5;
          this.particles.push({
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 1.0,
            decay: Math.random() * 0.025 + 0.018,
            color,
            size: Math.random() * 3 + 1.5
          });
        }

        if (label) {
          this.floatingTexts.push({
            x, y,
            text: label.text,
            color: label.color,
            life: 1.0,
            vy: -1.3
          });
        }
      }

      addThrusterPuff(x, y, angle, color) {
        const spread = (Math.random() - 0.5) * 0.4;
        const speed = Math.random() * 3 + 2;
        this.particles.push({
          x, y,
          vx: Math.cos(angle + Math.PI + spread) * speed,
          vy: Math.sin(angle + Math.PI + spread) * speed,
          life: 0.8,
          decay: 0.05,
          color,
          size: Math.random() * 3.5 + 2
        });
      }

      update() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
          const p = this.particles[i];
          p.x += p.vx;
          p.y += p.vy;
          p.vx *= 0.97;
          p.vy *= 0.97;
          p.life -= p.decay;
          if (p.life <= 0) this.particles.splice(i, 1);
        }

        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
          const t = this.floatingTexts[i];
          t.y += t.vy;
          t.life -= 0.02;
          if (t.life <= 0) this.floatingTexts.splice(i, 1);
        }
      }

      draw() {
        ctx.save();
        for (let p of this.particles) {
          ctx.globalAlpha = Math.max(0, p.life);
          ctx.fillStyle = p.color;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }

        for (let t of this.floatingTexts) {
          ctx.globalAlpha = Math.max(0, t.life);
          ctx.font = 'bold 15px Arial, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillStyle = t.color;
          ctx.shadowColor = t.color;
          ctx.shadowBlur = 12;
          ctx.fillText(t.text, t.x, t.y);
        }
        ctx.restore();
      }
    }

    /* ==========================================================================
       4. REDESIGNED SLEEK INTERCEPTOR SHIP
       ========================================================================== */
    class FuturisticInterceptorShip {
      constructor() {
        this.x = screenWidth / 2;
        this.y = screenHeight / 2;
        this.vx = 0;
        this.vy = 0;
        this.angle = -Math.PI / 2;
        this.rotSpeed = 0.068;
        this.thrustForce = 0.17;
        this.friction = 0.985;
        this.radius = 22;
        this.isThrusting = false;
        this.lastShotTime = 0;
      }

      reset() {
        this.x = screenWidth / 2;
        this.y = screenHeight / 2;
        this.vx = 0;
        this.vy = 0;
        this.angle = -Math.PI / 2;
      }

      thrust() {
        this.vx += Math.cos(this.angle) * this.thrustForce;
        this.vy += Math.sin(this.angle) * this.thrustForce;
        this.isThrusting = true;
        audio.playThrust();

        // Emit particle trail from dual engines
        const engineOffsetX = -this.radius * 0.9;
        const engineOffsetY = 6;
        const color = activeWeapon === 'COLLECT' ? 'rgba(16, 185, 129, 0.8)' : 'rgba(244, 63, 94, 0.8)';

        // Transform engine locations
        const leftExhaustX = this.x + Math.cos(this.angle) * engineOffsetX - Math.sin(this.angle) * engineOffsetY;
        const leftExhaustY = this.y + Math.sin(this.angle) * engineOffsetX + Math.cos(this.angle) * engineOffsetY;
        const rightExhaustX = this.x + Math.cos(this.angle) * engineOffsetX - Math.sin(this.angle) * (-engineOffsetY);
        const rightExhaustY = this.y + Math.sin(this.angle) * engineOffsetX + Math.cos(this.angle) * (-engineOffsetY);

        particles.addThrusterPuff(leftExhaustX, leftExhaustY, this.angle, color);
        particles.addThrusterPuff(rightExhaustX, rightExhaustY, this.angle, color);
      }

      rotate(dir) {
        this.angle += this.rotSpeed * dir;
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vx *= this.friction;
        this.vy *= this.friction;

        // Toroidal screen wrapping
        if (this.x < -this.radius) this.x = screenWidth + this.radius;
        if (this.x > screenWidth + this.radius) this.x = -this.radius;
        if (this.y < -this.radius) this.y = screenHeight + this.radius;
        if (this.y > screenHeight + this.radius) this.y = -this.radius;
      }

      draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        const themeColor = activeWeapon === 'COLLECT' ? '#10b981' : '#f43f5e';

        // 1. Sleek Outer Wings & Forward Split Blades
        ctx.beginPath();
        // Nose point
        ctx.moveTo(this.radius * 1.5, 0);
        // Forward right blade notch
        ctx.lineTo(this.radius * 0.7, 9);
        // Right wingtip
        ctx.lineTo(-this.radius * 0.5, 18);
        // Right outrigger laser pod
        ctx.lineTo(-this.radius * 0.2, 18);
        ctx.lineTo(-this.radius * 0.1, 15);
        // Right engine intake
        ctx.lineTo(-this.radius * 0.9, 10);
        // Center rear thruster bay
        ctx.lineTo(-this.radius * 0.5, 0);
        // Left engine intake
        ctx.lineTo(-this.radius * 0.9, -10);
        // Left outrigger laser pod
        ctx.lineTo(-this.radius * 0.1, -15);
        ctx.lineTo(-this.radius * 0.2, -18);
        // Left wingtip
        ctx.lineTo(-this.radius * 0.5, -18);
        // Forward left blade notch
        ctx.lineTo(this.radius * 0.7, -9);
        ctx.closePath();

        // Hull Fill with metallic dark shading
        ctx.fillStyle = '#0b1120';
        ctx.fill();

        // Neon Glow Hull Outline
        ctx.lineWidth = 2.2;
        ctx.strokeStyle = '#f8fafc';
        ctx.shadowColor = themeColor;
        ctx.shadowBlur = 12;
        ctx.stroke();

        // 2. Interior Hull Lines & Paneling
        ctx.beginPath();
        ctx.moveTo(this.radius * 1.1, 0);
        ctx.lineTo(0, 5);
        ctx.lineTo(-this.radius * 0.4, 5);
        ctx.moveTo(this.radius * 1.1, 0);
        ctx.lineTo(0, -5);
        ctx.lineTo(-this.radius * 0.4, -5);
        ctx.strokeStyle = themeColor;
        ctx.lineWidth = 1.4;
        ctx.stroke();

        // 3. Glowing Cockpit Canopy (Directional Glass)
        ctx.beginPath();
        ctx.ellipse(this.radius * 0.4, 0, 8, 4, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.shadowColor = themeColor;
        ctx.shadowBlur = 10;
        ctx.fill();

        // 4. Overclocked Quantum Reactor Core
        ctx.beginPath();
        ctx.arc(-this.radius * 0.2, 0, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = themeColor;
        ctx.shadowColor = themeColor;
        ctx.shadowBlur = 15;
        ctx.fill();

        // 5. Thruster Flame Burst (Active Thrust)
        if (this.isThrusting) {
          ctx.beginPath();
          ctx.moveTo(-this.radius * 0.8, -6);
          ctx.lineTo(-this.radius * 1.8 - Math.random() * 8, 0);
          ctx.lineTo(-this.radius * 0.8, 6);
          ctx.closePath();
          ctx.fillStyle = themeColor;
          ctx.shadowColor = themeColor;
          ctx.shadowBlur = 16;
          ctx.fill();
        }

        ctx.restore();
      }
    }

    /* ==========================================================================
       5. LASER BEAM ENTITY
       ========================================================================== */
    class LaserBeam {
      constructor(x, y, angle, type) {
        this.x = x;
        this.y = y;
        this.type = type; // 'COLLECT' or 'RELEASE'
        this.speed = 11.5;
        this.vx = Math.cos(angle) * this.speed;
        this.vy = Math.sin(angle) * this.speed;
        this.radius = 4;
        this.distanceTravelled = 0;
        this.maxDistance = Math.max(screenWidth, screenHeight) * 0.88;
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;
        this.distanceTravelled += this.speed;
      }

      isDead() {
        return this.distanceTravelled >= this.maxDistance;
      }

      draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        const color = this.type === 'COLLECT' ? '#10b981' : '#f43f5e';

        ctx.shadowColor = color;
        ctx.shadowBlur = 14;
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;

        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Projectile Tail
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-this.vx * 1.8, -this.vy * 1.8);
        ctx.lineWidth = 2.5;
        ctx.stroke();

        ctx.restore();
      }
    }

    /* ==========================================================================
       6. TEXT-FITTED GEOMETRIC ASTEROIDS
       ========================================================================== */
    class DynamicValueAsteroid {
      constructor(valueText, x = null, y = null) {
        this.value = valueText;

        // Precompute precise text dimensions to GUARANTEE 100% text fitting
        ctx.font = 'bold 13px Arial, sans-serif';
        const textMetrics = ctx.measureText(this.value.toUpperCase());
        const measuredWidth = textMetrics.width;

        // Dynamic capsule / pill dimensions with safe internal padding
        this.boxWidth = Math.max(86, measuredWidth + 34);
        this.boxHeight = 44;
        this.halfW = this.boxWidth / 2;
        this.halfH = this.boxHeight / 2;
        // Collision bounding radius
        this.radius = Math.hypot(this.halfW, this.halfH);

        // Spawn position
        if (x === null || y === null) {
          const edge = Math.floor(Math.random() * 4);
          if (edge === 0) { // Top
            this.x = Math.random() * screenWidth;
            this.y = -this.radius;
          } else if (edge === 1) { // Right
            this.x = screenWidth + this.radius;
            this.y = Math.random() * screenHeight;
          } else if (edge === 2) { // Bottom
            this.x = Math.random() * screenWidth;
            this.y = screenHeight + this.radius;
          } else { // Left
            this.x = -this.radius;
            this.y = Math.random() * screenHeight;
          }
        } else {
          this.x = x;
          this.y = y;
        }

        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 0.7 + 0.4;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;

        this.angle = 0;
        this.rotSpeed = (Math.random() - 0.5) * 0.01;

        const shape = ValuesBlaster.polygon(measuredWidth, 18);
        this.corners = shape.points;
        this.radius = shape.radius;
        this.x = Math.max(this.radius,Math.min(screenWidth-this.radius,this.x));
        this.y = Math.max(this.radius+80,Math.min(screenHeight-this.radius-90,this.y));

      }

      update() {
        this.x += this.vx;
        this.y += this.vy;
        this.angle += this.rotSpeed;

        // Gentle edge repulsion to keep active values floating on screen
        const pad = this.radius + 4;
        if (this.x < pad && this.vx < 0) this.vx *= -1;
        if (this.x > screenWidth - pad && this.vx > 0) this.vx *= -1;
        if (this.y < pad + 80 && this.vy < 0) this.vy *= -1;
        if (this.y > screenHeight - pad && this.vy > 0) this.vy *= -1;
      }

      draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        ctx.beginPath();
        this.corners.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));
        ctx.closePath();

        // Dark celestial bedrock fill
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.fill();

        // Luminescent border
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2.2;
        ctx.shadowColor = 'rgba(56, 189, 248, 0.6)';
        ctx.shadowBlur = 10;
        ctx.stroke();

        ctx.restore();

        // 2. High-Legibility Values Typography (Rendered horizontally for instant scanning)
        ctx.save();
        ctx.translate(this.x, this.y);

        ctx.font = '700 13px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Dark backshadow for contrast against stars and beams
        ctx.fillStyle = '#030712';
        ctx.fillText(this.value.toUpperCase(), 0, 1.5);

        // Radiant text fill
        ctx.fillStyle = '#f8fafc';
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 8;
        ctx.fillText(this.value.toUpperCase(), 0, 0);

        ctx.restore();
      }
    }

    /* ==========================================================================
       7. GAME ENGINE & STATE MANAGEMENT
       ========================================================================== */
    const starfield = new DeepSpaceStars(130);
    const particles = new ParticleFX();
    const ship = new FuturisticInterceptorShip();

    let lasers = [];
    let asteroids = [];
    let remainingPool = [];
    let isGameOver = false;
    let isGameRunning = false;
    let paused = false;

    // Keys Map
    const keys = {
      ArrowUp: false,
      ArrowLeft: false,
      ArrowRight: false,
      KeyW: false,
      KeyA: false,
      KeyD: false,
      Space: false
    };

    /* Weapon Switching System */
    function selectWeapon(type) {
      activeWeapon = type;
      const w1Btn = document.getElementById('weapon1Btn');
      const w2Btn = document.getElementById('weapon2Btn');

      if (type === 'COLLECT') {
        w1Btn.classList.add('active-w1');
        w2Btn.classList.remove('active-w2');
      } else {
        w2Btn.classList.add('active-w2');
        w1Btn.classList.remove('active-w1');
      }
    }

    document.getElementById('weapon1Btn').addEventListener('click', () => {selectWeapon('COLLECT');canvas.focus();});
    document.getElementById('weapon2Btn').addEventListener('click', () => {selectWeapon('RELEASE');canvas.focus();});

    /* Keyboard Controls */
    window.addEventListener('keydown', (e) => {
      if((e.target.closest('button')&&['Space','Enter'].includes(e.code))||!isGameRunning||isGameOver||paused)return;
      audio.init();
      if (keys.hasOwnProperty(e.code)) {
        keys[e.code] = true;e.preventDefault();
      }

      // Hotkey weapon selection
      if (e.code === 'Digit1' || e.code === 'KeyQ') {
        selectWeapon('COLLECT');
      } else if (e.code === 'Digit2' || e.code === 'KeyE') {
        selectWeapon('RELEASE');
      }

      if (e.code === 'Space') {
        e.preventDefault();
        fireLaser(activeWeapon);
      }
    });

    window.addEventListener('keyup', (e) => {
      if (keys.hasOwnProperty(e.code)) {
        keys[e.code] = false;
      }
      if (e.code === 'KeyW' || e.code === 'ArrowUp') {
        ship.isThrusting = false;
      }
    });

    /* Mouse / Pointer Controls: Left-Click = Weapon 1, Right-Click = Weapon 2 */
    window.addEventListener('mousedown', (e) => {
      // Don't fire if clicking interactive UI elements
      if (e.target.closest('button') || e.target.closest('aside') || e.target.closest('#introModal') || e.target.closest('#resultsModal')) {
        return;
      }
      audio.init();
      if (e.button === 0) {
        // Left click = Collect
        selectWeapon('COLLECT');
        fireLaser('COLLECT');
      } else if (e.button === 2) {
        // Right click = Release
        e.preventDefault();
        selectWeapon('RELEASE');
        fireLaser('RELEASE');
      }
    });

    function fireLaser(type) {
      if (!isGameRunning || isGameOver || paused) return;
      const now = performance.now();
      if (now - ship.lastShotTime < 180) return; // Cooldown
      ship.lastShotTime = now;

      // Spawn from nose
      const noseX = ship.x + Math.cos(ship.angle) * ship.radius * 1.5;
      const noseY = ship.y + Math.sin(ship.angle) * ship.radius * 1.5;

      lasers.push(new LaserBeam(noseX, noseY, ship.angle, type));
      audio.playLaser(type);
    }

    /* Spawning Strategy */
    function maintainAsteroidField() {
      const targetOnScreen = Math.min(5, remainingPool.length + asteroids.length);
      while (asteroids.length < targetOnScreen && remainingPool.length > 0) {
        const nextValue = remainingPool.shift();
        asteroids.push(new DynamicValueAsteroid(nextValue));
      }
    }

    /* Start / Restart Cycle */
    function startNewGame() {
      starfield.stars = new DeepSpaceStars(130).stars;
      remainingPool = [...VALUES_POOL];
      // Fisher-Yates Shuffle
      for (let i = remainingPool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [remainingPool[i], remainingPool[j]] = [remainingPool[j], remainingPool[i]];
      }

      collectedValues = [];
      releasedValues = [];
      asteroids = [];
      lasers = [];
      isGameOver = false;
      isGameRunning = true;paused=false;document.getElementById('pauseBtn').textContent='Pause';
      ship.reset();

      updateHUD();
      renderCollectedDock();

      document.getElementById('resultsModal').classList.add('hidden');
      document.getElementById('introModal').classList.add('hidden');canvas.focus();

      maintainAsteroidField();
    }

    /* Value Sorting Handler */
    function handleAsteroidHit(asteroid, weaponType) {
      if (weaponType === 'COLLECT') {
        collectedValues.push(asteroid.value);
        audio.playCollectChime();

        // Green burst
        particles.burst(asteroid.x, asteroid.y, '#10b981', 32, {
          text: `+ COLLECTED: ${asteroid.value}`,
          color: '#10b981'
        });
        renderCollectedDock();
      } else {
        releasedValues.push(asteroid.value);
        audio.playReleaseWhoosh();

        // Red burst
        particles.burst(asteroid.x, asteroid.y, '#f43f5e', 32, {
          text: `× RELEASED: ${asteroid.value}`,
          color: '#f43f5e'
        });
      }

      updateHUD();

      // Check for completion
      if (collectedValues.length + releasedValues.length >= totalTargetValues) {
        showFinalResults();
      }
    }

    /* Real-Time Live HUD Updates */
    function updateHUD() {
      const totalSorted = collectedValues.length + releasedValues.length;
      document.getElementById('counterProgressText').innerText = `${totalSorted} / ${totalTargetValues} SORTED`;
      document.getElementById('quickCoreCount').innerText = collectedValues.length;
      document.getElementById('quickReleaseCount').innerText = releasedValues.length;
      parent.postMessage({type:'values-blaster-results',values:collectedValues},location.origin);
    }

    function renderCollectedDock() {
      const trayList = document.getElementById('collectedTrayList');
      const counterBadge = document.getElementById('collectedCounterBadge');

      counterBadge.innerText = collectedValues.length;

      if (collectedValues.length === 0) {
        trayList.innerHTML = `
          <div id="emptyTrayNotice" class="w-full text-center py-4 text-xs text-slate-400 italic">
            Shoot asteroids with Weapon 1 (Collect) to anchor your core life values.
          </div>
        `;
        return;
      }

      trayList.innerHTML = '';
      collectedValues.forEach((val) => {
        const badge = document.createElement('span');
        badge.className = 'px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 shadow-[0_0_8px_rgba(16,185,129,0.2)] animate-pulse';
        badge.innerText = val;
        trayList.appendChild(badge);
      });
    }

    /* Results Screen */
    function showFinalResults() {
      isGameOver = true;
      const modal = document.getElementById('resultsModal');
      const coreList = document.getElementById('finalCoreList');
      const releaseList = document.getElementById('finalReleaseList');

      coreList.innerHTML = '';
      releaseList.innerHTML = '';

      collectedValues.forEach(val => {
        const chip = document.createElement('span');
        chip.className = 'px-3 py-1 rounded-lg text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 shadow-[0_0_8px_rgba(16,185,129,0.25)]';
        chip.innerText = val;
        coreList.appendChild(chip);
      });

      releasedValues.forEach(val => {
        const chip = document.createElement('span');
        chip.className = 'px-3 py-1 rounded-lg text-xs font-semibold bg-rose-500/15 text-rose-300/80 border border-rose-500/30';
        chip.innerText = val;
        releaseList.appendChild(chip);
      });

      document.getElementById('finalCoreCountBadge').innerText = collectedValues.length;
      document.getElementById('finalReleaseCountBadge').innerText = releasedValues.length;

      modal.classList.remove('hidden');document.getElementById('finishBtn').focus();
    }

    /* Clipboard Copy Export */
    document.getElementById('copySummaryBtn').addEventListener('click', () => {
      const summaryText =
`✦ MY COSMIC LIFE VALUES CONSTELLATION ✦
Core Collected Priorities (${collectedValues.length}):
${collectedValues.map(v => ` • ${v}`).join('\n')}

Released Energies (${releasedValues.length}):
${releasedValues.map(v => ` • ${v}`).join('\n')}
───────────────────────────────`;

      const tempArea = document.createElement('textarea');
      tempArea.value = summaryText;
      document.body.appendChild(tempArea);
      tempArea.select();
      try {
        document.execCommand('copy');
        const notice = document.getElementById('copyNoticeToast');
        notice.classList.remove('opacity-0');
        setTimeout(() => notice.classList.add('opacity-0'), 2500);
      } catch (err) {
        console.error('Failed to copy', err);
      }
      document.body.removeChild(tempArea);
    });

    document.getElementById('replayBtn').addEventListener('click', () => {
      startNewGame();
    });

    document.getElementById('startPlayBtn').addEventListener('click', () => {
      audio.init();
      startNewGame();
    });

    /* Audio Toggle */
    const soundBtn = document.getElementById('soundToggleBtn');
    soundBtn.addEventListener('click', () => {
      audio.enabled = !audio.enabled;
      document.getElementById('soundIconOn').classList.toggle('hidden', !audio.enabled);
      document.getElementById('soundIconOff').classList.toggle('hidden', audio.enabled);
      if (audio.enabled) audio.init();
    });

    /* ==========================================================================
       8. MOBILE TOUCH JOYSTICK & BUTTONS
       ========================================================================== */
    const joyZone = document.getElementById('touchJoystickZone');
    const joyKnob = document.getElementById('touchJoystickKnob');
    let isJoystickActive = false;
    let joyCenter = { x: 0, y: 0 };

    joyZone.addEventListener('touchstart', (e) => {
      audio.init();
      isJoystickActive = true;
      const rect = joyZone.getBoundingClientRect();
      joyCenter = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      handleMobileStick(e.touches[0]);
    }, { passive: false });

    window.addEventListener('touchmove', (e) => {
      if (!isJoystickActive) return;
      handleMobileStick(e.touches[0]);
    }, { passive: false });

    window.addEventListener('touchend', () => {
      if (isJoystickActive) {
        isJoystickActive = false;
        joyKnob.style.transform = `translate(0px, 0px)`;
        ship.isThrusting = false;
      }
    });

    function handleMobileStick(touch) {
      const dx = touch.clientX - joyCenter.x;
      const dy = touch.clientY - joyCenter.y;
      const dist = Math.hypot(dx, dy);
      const maxRange = 36;

      const angle = Math.atan2(dy, dx);
      const clamped = Math.min(dist, maxRange);

      joyKnob.style.transform = `translate(${Math.cos(angle) * clamped}px, ${Math.sin(angle) * clamped}px)`;

      if (dist > 8) {
        ship.angle = angle;
        ship.thrust();
      }
    }

    document.getElementById('touchFireCollectBtn').addEventListener('touchstart', (e) => {
      e.preventDefault();
      audio.init();
      selectWeapon('COLLECT');
      fireLaser('COLLECT');
    });

    document.getElementById('touchFireReleaseBtn').addEventListener('touchstart', (e) => {
      e.preventDefault();
      audio.init();
      selectWeapon('RELEASE');
      fireLaser('RELEASE');
    });

    /* ==========================================================================
       9. MAIN ENGINE RUNTIME LOOP
       ========================================================================== */
    function update() {
      if(paused||!isGameRunning||isGameOver)return;
      // Flight controls
      if (keys.ArrowLeft || keys.KeyA) ship.rotate(-1);
      if (keys.ArrowRight || keys.KeyD) ship.rotate(1);
      if (keys.ArrowUp || keys.KeyW) ship.thrust();

      ship.update();

      // Lasers vs Asteroids
      for (let i = lasers.length - 1; i >= 0; i--) {
        const laser = lasers[i];
        laser.update();

        let hit = false;
        for (let j = asteroids.length - 1; j >= 0; j--) {
          const ast = asteroids[j];
          // Elliptical box approximation for accurate collision
          const dx = laser.x - ast.x;
          const dy = laser.y - ast.y;
          const dist = Math.hypot(dx, dy);

          const lx=dx*Math.cos(ast.angle)+dy*Math.sin(ast.angle),ly=-dx*Math.sin(ast.angle)+dy*Math.cos(ast.angle);
          let inside=false;for(let a=0,b=ast.corners.length-1;a<ast.corners.length;b=a++){const p=ast.corners[a],q=ast.corners[b];if((p.y>ly)!==(q.y>ly)&&lx<(q.x-p.x)*(ly-p.y)/(q.y-p.y)+p.x)inside=!inside;}
          if (inside) {
            handleAsteroidHit(ast, laser.type);
            asteroids.splice(j, 1);
            hit = true;
            break;
          }
        }

        if (hit || laser.isDead()) {
          lasers.splice(i, 1);
        }
      }

      // Asteroids drift
      for (let ast of asteroids) {
        ast.update();
      }

      if (isGameRunning && !isGameOver) {
        maintainAsteroidField();
      }

      particles.update();
    }

    function render() {
      ctx.clearRect(0, 0, screenWidth, screenHeight);

      // Starfield
      starfield.draw();

      // Lasers
      for (let laser of lasers) {
        laser.draw();
      }

      // Asteroids
      for (let ast of asteroids) {
        ast.draw();
      }

      // Player Ship
      if (isGameRunning) {
        ship.draw();
      }

      // VFX
      particles.draw();
    }

    let lastFrame=0;
    function gameLoop(now=0) {
      if(now-lastFrame>=1000/60-1){if(!document.hidden){update();render();}lastFrame=now;}
      requestAnimationFrame(gameLoop);
    }

    window.onload = function() {
      resizeCanvas();
      gameLoop();
    };

    function setPaused(value){paused=value;Object.keys(keys).forEach(k=>keys[k]=false);ship.isThrusting=false;document.getElementById('pauseBtn').textContent=paused?'Resume':'Pause';}
    document.getElementById('pauseBtn').onclick=()=>{setPaused(!paused);if(!paused)canvas.focus();};
    document.getElementById('finishBtn').onclick=()=>parent.postMessage({type:'values-blaster-close'},location.origin);
    addEventListener('blur',()=>setPaused(true));
    document.addEventListener('visibilitychange',()=>{if(document.hidden)setPaused(true);});
    addEventListener('message',e=>{if(e.origin!==location.origin||e.source!==parent)return;if(e.data?.type==='values-blaster-pause')setPaused(true);});
    canvas.addEventListener('contextmenu',e=>e.preventDefault());

addEventListener('resize',()=>{starfield.stars=new DeepSpaceStars(130).stars;for(const a of asteroids){a.x=Math.max(a.radius,Math.min(screenWidth-a.radius,a.x));a.y=Math.max(a.radius+80,Math.min(screenHeight-a.radius-90,a.y));}});
