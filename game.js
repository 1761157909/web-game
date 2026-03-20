
(function () {
  "use strict";

  const canvas = document.getElementById("game-canvas");
  const ctx = canvas.getContext("2d");

  const overlay = document.getElementById("overlay");
  const overlayTitle = document.getElementById("overlay-title");
  const overlayDesc = document.getElementById("overlay-desc");
  const actionBtn = document.getElementById("action-btn");
  const choicePanel = document.getElementById("choice-panel");
  const choiceButtons = Array.from(document.querySelectorAll(".choice-btn"));

  const bossHud = document.getElementById("boss-hud");
  const bossHpFill = document.getElementById("boss-hp-fill");
  const bossAlert = document.getElementById("boss-alert");

  const bossIntro = document.getElementById("boss-intro");
  const bossAvatar = document.getElementById("boss-avatar");
  const bossName = document.getElementById("boss-name");
  const bossLine = document.getElementById("boss-line");

  const levelText = document.getElementById("level-text");
  const scoreText = document.getElementById("score-text");
  const hpText = document.getElementById("hp-text");
  const weaponText = document.getElementById("weapon-text");

  const skillBtn = document.getElementById("skill-btn");
  const skillCdText = document.getElementById("skill-cd");

  const LEVELS = [
    { level: 1, distanceToBoss: 3200, scrollSpeed: 350, enemySpeed: 230, spawnEvery: 0.65, enemyHp: 16, enemyDmg: 12, bulletPower: 8, boss: { hp: 1500, shield: 850, speed: 86, fireEvery: 0.98, bulletSpeed: 280, crashDmg: 24, pattern: "spread" } },
    { level: 2, distanceToBoss: 3900, scrollSpeed: 410, enemySpeed: 280, spawnEvery: 0.54, enemyHp: 22, enemyDmg: 15, bulletPower: 9, boss: { hp: 2100, shield: 1200, speed: 102, fireEvery: 0.84, bulletSpeed: 350, crashDmg: 28, pattern: "tracking" } },
    { level: 3, distanceToBoss: 4600, scrollSpeed: 470, enemySpeed: 330, spawnEvery: 0.45, enemyHp: 30, enemyDmg: 18, bulletPower: 10, boss: { hp: 2800, shield: 1650, speed: 120, fireEvery: 0.9, bulletSpeed: 420, crashDmg: 34, pattern: "column" } },
    { level: 4, distanceToBoss: 5300, scrollSpeed: 520, enemySpeed: 370, spawnEvery: 0.38, enemyHp: 38, enemyDmg: 22, bulletPower: 12, boss: { hp: 3600, shield: 2200, speed: 140, fireEvery: 0.63, bulletSpeed: 490, crashDmg: 42, pattern: "scatterburst" } },
    { level: 5, distanceToBoss: 6100, scrollSpeed: 575, enemySpeed: 410, spawnEvery: 0.32, enemyHp: 46, enemyDmg: 27, bulletPower: 14, boss: { hp: 4700, shield: 2900, speed: 164, fireEvery: 0.54, bulletSpeed: 560, crashDmg: 50, pattern: "hybrid" } }
  ];

  const BOSS_PROFILES = [
    { name: "镜海守卫", line: "入侵者，立即停驶。", avatarClass: "lv1" },
    { name: "猩红审判", line: "你的速度毫无意义。", avatarClass: "lv2" },
    { name: "虚空共鸣体", line: "在旋涡里湮灭吧。", avatarClass: "lv3" },
    { name: "焚星统御", line: "我会把赛道烧成灰。", avatarClass: "lv4" },
    { name: "终焉机皇", line: "见证最终协议启动。", avatarClass: "lv5" }
  ];

  const WEAPONS = {
    mg: { id: "mg", name: "速射机枪", desc: "高射速，稳定压制。", fireInterval: 0.11, baseDamage: 9, bulletSpeed: 780, spread: 0.05, skillName: "弹幕风暴", skillDesc: "5秒内射速+50%，并清除敌方子弹", skillCooldown: 9.5 },
    laser: { id: "laser", name: "激光炮", desc: "高伤能束，破盾特化。", fireInterval: 0.19, baseDamage: 62, bulletSpeed: 960, spread: 0.01, skillName: "贯穿天光", skillDesc: "发射巨型贯穿光束并造成重创", skillCooldown: 10.8 },
    ray: { id: "ray", name: "镭射枪", desc: "中频精准射线。", fireInterval: 0.16, baseDamage: 16, bulletSpeed: 860, spread: 0.018, skillName: "电弧锁链", skillDesc: "对全屏敌人施加连锁电弧", skillCooldown: 9.8 }
  };

  const CHOICE_STATS = [
    { key: "hp", label: "生命", text: "+35 生命", apply: function (s) { s.player.maxHp += 35; s.player.hp = Math.min(s.player.maxHp, s.player.hp + 45); } },
    { key: "fire", label: "射速", text: "射速 +14%", apply: function (s) { s.stats.fireRate *= 1.14; } },
    { key: "damage", label: "伤害", text: "伤害 +18%", apply: function (s) { s.stats.damage *= 1.18; } },
    { key: "count", label: "子弹数量", text: "子弹 +1", apply: function (s) { s.stats.bulletCount = Math.min(7, s.stats.bulletCount + 1); } }
  ];

  const state = {
    running: false, choosingReward: false, pendingLevel: -1,
    width: 0, height: 0, dpr: 1,
    levelIndex: 0, levelDistance: 0, score: 0,
    roadOffset: 0, spawnClock: 0, bulletClock: 0, bossFireClock: 0,
    skillTimer: 0, weaponBuffTimer: 0, laserBeamTime: 0,
    shieldTimer: 0,
    shockwaveActive: false, shockwaveRadius: 0, shockwaveLast: 0,
    timeScale: 1, slowMoTimer: 0,
    edgeGlow: 0, edgeColor: "#8fd8ff",
    shake: 0, shakeX: 0, shakeY: 0,
    camX: 0, camY: 0, camWave: 0,
    bossAlertTimer: 0, bossIntroTimer: 0,
    stars: [], enemies: [], bullets: [], enemyBullets: [], enemyLasers: [], particles: [], statGates: [], rayChains: [],
    statGateSpawned: [false, false, false],
    eliteSpawned: false,
    boss: null, bossDefeated: false,
    touchActive: false, pointerX: 0, pointerY: 0,
    rewardChoices: [], unlockedWeapons: new Set(["mg"]),
    weaponMods: {
      mg: { fireBonus: 1, shieldBreak: 0.38 },
      laser: { chargeRate: 1.08, burstInterval: 0.12, shieldBreak: 2.2 },
      ray: { chainCount: 2, chainPower: 0.35, shieldBreak: 0.75 }
    },
    laserCharge: 1,
    stats: { fireRate: 1, damage: 1, bulletCount: 1 },
    player: { x: 0, y: 0, radius: 24, speed: 620, hp: 120, maxHp: 120, regenPerSec: 2.8, killHeal: 6 },
    currentWeaponId: "mg",
    sfx: { ctx: null, unlocked: false, lastShotAt: 0 },
    lastTs: 0
  };

  function currentWeapon() { return WEAPONS[state.currentWeaponId]; }

  function resize() {
    state.dpr = Math.min(window.devicePixelRatio || 1, 2);
    state.width = Math.floor(window.innerWidth);
    state.height = Math.floor(window.innerHeight);
    canvas.width = Math.floor(state.width * state.dpr);
    canvas.height = Math.floor(state.height * state.dpr);
    canvas.style.width = state.width + "px";
    canvas.style.height = state.height + "px";
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    if (!state.running) {
      state.player.x = state.width * 0.5;
      state.player.y = state.height * 0.83;
    }
    ensureStars();
  }

  function ensureStars() {
    const desired = Math.max(55, Math.floor((state.width * state.height) / 16000));
    while (state.stars.length < desired) state.stars.push({ x: Math.random() * state.width, y: Math.random() * state.height, r: 0.8 + Math.random() * 1.8, s: 24 + Math.random() * 76 });
    if (state.stars.length > desired) state.stars.length = desired;
  }

  function laneWidthTop() { return state.width * 0.34; }
  function laneWidthBottom() { return state.width * 0.84; }
  function laneLeftAtY(y) {
    const t = y / state.height;
    const width = laneWidthTop() + (laneWidthBottom() - laneWidthTop()) * t;
    return (state.width - width) * 0.5;
  }
  function laneRightAtY(y) { return state.width - laneLeftAtY(y); }

  function resetLevel(index) {
    state.levelIndex = index;
    state.levelDistance = 0;
    state.spawnClock = 0;
    state.bulletClock = 0;
    state.bossFireClock = 0;
    state.enemies.length = 0;
    state.bullets.length = 0;
    state.enemyBullets.length = 0;
    state.enemyLasers.length = 0;
    state.particles.length = 0;
    state.rayChains.length = 0;
    state.statGates.length = 0;
    state.statGateSpawned = [false, false, false];
    state.eliteSpawned = false;
    state.shieldTimer = 0;
    state.shockwaveActive = false;
    state.shockwaveRadius = 0;
    state.shockwaveLast = 0;
    state.edgeGlow = 0;
    state.boss = null;
    state.bossDefeated = false;
    bossHud.classList.add("hidden");
    bossAlert.classList.add("hidden");
    bossIntro.classList.add("hidden");
    levelText.textContent = String(index + 1);
  }

  function startGame() {
    unlockAudio();
    state.running = true;
    state.choosingReward = false;
    state.pendingLevel = -1;
    state.score = 0;
    state.player.maxHp = 120;
    state.player.hp = 120;
    state.stats.fireRate = 1;
    state.stats.damage = 1;
    state.stats.bulletCount = 1;
    state.currentWeaponId = "mg";
    state.unlockedWeapons = new Set(["mg"]);
    state.skillTimer = 0;
    state.weaponBuffTimer = 0;
    state.laserBeamTime = 0;
    state.shieldTimer = 0;
    state.shockwaveActive = false;
    state.shockwaveRadius = 0;
    state.shockwaveLast = 0;
    state.timeScale = 1;
    state.slowMoTimer = 0;
    state.edgeGlow = 0;
    state.weaponMods.mg = { fireBonus: 1, shieldBreak: 0.38 };
    state.weaponMods.laser = { chargeRate: 1.08, burstInterval: 0.12, shieldBreak: 2.2 };
    state.weaponMods.ray = { chainCount: 2, chainPower: 0.35, shieldBreak: 0.75 };
    state.laserCharge = 1;
    state.camX = 0;
    state.camY = 0;
    state.camWave = 0;
    state.player.x = state.width * 0.5;
    state.player.y = state.height * 0.83;
    resetLevel(0);
    hideOverlay();
    updateHud();
    updateSkillUi();
    sfxStart();
    state.lastTs = performance.now();
    requestAnimationFrame(loop);
  }

  function showOverlay(opts) {
    overlay.style.display = "flex";
    overlayTitle.textContent = opts.title || "";
    overlayDesc.textContent = opts.desc || "";
    actionBtn.textContent = opts.buttonText || "开始游戏";
    if (opts.showButton === false) actionBtn.classList.add("hidden"); else actionBtn.classList.remove("hidden");
    if (opts.showChoices) choicePanel.classList.remove("hidden"); else choicePanel.classList.add("hidden");
  }

  function hideOverlay() {
    overlay.style.display = "none";
    choicePanel.classList.add("hidden");
    actionBtn.classList.remove("hidden");
  }

  function spawnEnemy() {
    const lvl = LEVELS[state.levelIndex];
    const y = -42;
    const x = randomRange(laneLeftAtY(120) + 24, laneRightAtY(120) - 24);
    const big = Math.random() > 0.82;
    state.enemies.push({ x, y, radius: big ? 22 : 15, hp: big ? lvl.enemyHp * 1.9 : lvl.enemyHp, speed: lvl.enemySpeed * (big ? 0.82 : 1 + Math.random() * 0.12), dmg: big ? lvl.enemyDmg * 1.4 : lvl.enemyDmg });
  }

  function spawnEliteEnemy() {
    if (state.eliteSpawned || state.boss) return;
    const lvl = LEVELS[state.levelIndex];
    const y = -56;
    const x = randomRange(laneLeftAtY(120) + 32, laneRightAtY(120) - 32);
    state.enemies.push({
      x, y,
      elite: true,
      radius: 24,
      hp: lvl.enemyHp * 5.8,
      speed: lvl.enemySpeed * 0.8,
      dmg: lvl.enemyDmg * 2
    });
    state.eliteSpawned = true;
    showTempText("精英机甲出现", "#d8a9ff");
  }

  function maybeSpawnStatGate() {
    if (state.boss || state.statGates.length > 0) return;
    const lvl = LEVELS[state.levelIndex];
    const countByLevel = 3;
    const segment = lvl.distanceToBoss / (countByLevel + 1);
    for (let i = 0; i < countByLevel; i++) {
      if (state.statGateSpawned[i]) continue;
      const triggerDistance = (i + 1) * segment;
      if (state.levelDistance >= triggerDistance - 40) {
        const opts = shuffle(CHOICE_STATS.slice()).slice(0, 2);
        state.statGates.push({ marker: i, y: -140, speed: lvl.scrollSpeed * 0.95, left: opts[0], right: opts[1], chosen: false, radius: 28 });
        state.statGateSpawned[i] = true;
        break;
      }
    }
  }

  function spawnBoss() {
    const cfg = LEVELS[state.levelIndex].boss;
    state.boss = {
      x: state.width * 0.5, y: -120, targetY: state.height * 0.2, radius: 64,
      hp: cfg.hp, maxHp: cfg.hp, dir: 1, fireEvery: cfg.fireEvery,
      shield: cfg.shield || 0, maxShield: cfg.shield || 0,
      bulletSpeed: cfg.bulletSpeed, bulletDmg: 10 + state.levelIndex * 4,
      moveSpeed: Math.max(96, cfg.speed), crashDmg: cfg.crashDmg,
      pattern: cfg.pattern, shotStep: 0, spiralAngle: 0, enraged: false, ultimateEnraged: false
    };
    bossHud.classList.remove("hidden");
    const profile = BOSS_PROFILES[state.levelIndex];
    if (profile) showBossIntro(profile.name, profile.line, profile.avatarClass);
    updateBossHpUi();
    triggerShake(5);
  }

  function playerFireInterval() {
    const w = currentWeapon();
    const buff = state.weaponBuffTimer > 0 ? 1.5 : 1;
    const weaponFire = w.id === "mg" ? state.weaponMods.mg.fireBonus : 1;
    return w.fireInterval / (state.stats.fireRate * buff * weaponFire);
  }

  function playerBulletDamage() {
    const lvl = LEVELS[state.levelIndex];
    const w = currentWeapon();
    return (w.baseDamage + lvl.bulletPower) * state.stats.damage;
  }

  function shootPlayer() {
    const w = currentWeapon();
    if (w.id === "laser") {
      if (state.laserCharge < 1) return;
      state.laserBeamTime = Math.max(state.laserBeamTime, 0.16);
      state.laserCharge = 0;
      state.bulletClock = -state.weaponMods.laser.burstInterval;
      sfxUltimate();
      return;
    }
    const count = state.stats.bulletCount;
    const spread = w.spread;
    const dmg = playerBulletDamage();
    const speed = w.bulletSpeed;
    for (let i = 0; i < count; i++) {
      const offsetIndex = i - (count - 1) / 2;
      const angle = offsetIndex * spread;
      state.bullets.push({
        x: state.player.x + offsetIndex * 7,
        y: state.player.y - 18,
        prevX: state.player.x + offsetIndex * 7,
        prevY: state.player.y - 18,
        vx: Math.sin(angle) * speed,
        vy: -Math.cos(angle) * speed,
        radius: 4,
        dmg: dmg,
        pierce: 0,
        weapon: w.id
      });
    }
    if (performance.now() - state.sfx.lastShotAt > 65) {
      sfxShoot();
      state.sfx.lastShotAt = performance.now();
    }
  }
  function fireBossPattern(pattern, b, aimed, forceEnraged) {
    const enraged = forceEnraged || b.enraged;
    if (pattern === "spread") {
      const fan = enraged ? [-0.5, -0.34, -0.2, -0.08, 0.08, 0.2, 0.34, 0.5] : [-0.35, -0.18, 0, 0.18, 0.35];
      for (const a of fan) addEnemyBulletAngle(b.x, b.y + 34, aimed + a, b.bulletSpeed, b.bulletDmg);
      return true;
    }
    if (pattern === "tracking") {
      const count = enraged ? 4 : 2;
      for (let i = 0; i < count; i++) {
        const a = aimed + (i - (count - 1) / 2) * 0.14;
        addEnemyBulletAngle(b.x, b.y + 34, a, b.bulletSpeed * 0.86, b.bulletDmg * 0.95, "homing");
      }
      return true;
    }
    if (pattern === "column") {
      spawnEnemyLaserColumns(enraged ? 4 : 3, b.bulletDmg * 1.15);
      return true;
    }
    if (pattern === "scatterburst") {
      const burst = enraged ? [-0.24, -0.12, 0, 0.12, 0.24] : [-0.16, 0, 0.16];
      for (const x of burst) addEnemyBulletAngle(b.x, b.y + 34, aimed + x, b.bulletSpeed * 1.12, b.bulletDmg, "splitter");
      for (const s of [-0.8, 0.8]) addEnemyBulletAngle(b.x, b.y + 34, aimed + s, b.bulletSpeed * 0.9, b.bulletDmg * 0.9);
      return true;
    }
    return false;
  }

  function shootBoss() {
    if (!state.boss) return;
    const b = state.boss;
    const aimed = Math.atan2(state.player.x - b.x, state.player.y - b.y);

    if (fireBossPattern(b.pattern, b, aimed, false)) return;

    if (b.pattern === "hybrid") {
      const amp = b.ultimateEnraged ? 0.95 : b.enraged ? 0.7 : 0.5;
      const center = aimed + Math.sin(b.shotStep * 0.6) * amp;
      const set = b.ultimateEnraged ? [-0.5, -0.34, -0.22, -0.1, 0, 0.1, 0.22, 0.34, 0.5] : b.enraged ? [-0.32, -0.18, -0.06, 0.06, 0.18, 0.32] : [-0.22, -0.1, 0, 0.1, 0.22];
      for (const w of set) addEnemyBulletAngle(b.x, b.y + 34, center + w, b.bulletSpeed * (b.ultimateEnraged ? 1.2 : 1.08), b.bulletDmg);
      if (b.shotStep % 3 === 0) {
        addEnemyBulletAngle(b.x, b.y + 34, aimed, b.bulletSpeed * 0.82, b.bulletDmg * 0.9, "homing");
      }
      if (b.ultimateEnraged) {
        const spin = b.shotStep * 0.28;
        for (let i = 0; i < 6; i++) addEnemyBulletAngle(b.x, b.y + 34, spin + (Math.PI * 2 * i) / 6, b.bulletSpeed * 0.92, b.bulletDmg * 0.9);
        if (b.shotStep % 2 === 0) {
          const pool = ["spread", "tracking", "column", "scatterburst"];
          const copy = pool[Math.floor(Math.random() * pool.length)];
          fireBossPattern(copy, b, aimed, true);
          const nameMap = { spread: "散射", tracking: "追踪", column: "竖排激光", scatterburst: "分裂散弹" };
          showTempText("终极狂暴: " + (nameMap[copy] || copy), "#ffb7b7");
        }
      }
      b.shotStep += 1;
      return;
    }
  }

  function addEnemyBulletAngle(x, y, angle, speed, dmg, type) {
    const isHoming = (type || "normal") === "homing";
    state.enemyBullets.push({
      x, y,
      vx: Math.sin(angle) * speed,
      vy: Math.cos(angle) * speed,
      radius: 6,
      dmg,
      type: type || "normal",
      homingTurn: 2.5,
      age: 0,
      maxAge: isHoming ? 2.4 : 6,
      splitDone: false
    });
  }

  function spawnEnemyLaserColumns(count, dmg) {
    const minX = laneLeftAtY(state.player.y) + 22;
    const maxX = laneRightAtY(state.player.y) - 22;
    const used = [];
    for (let i = 0; i < count; i++) {
      let x = randomRange(minX, maxX);
      let safe = 0;
      while (used.some(function (u) { return Math.abs(u - x) < 44; }) && safe < 10) {
        x = randomRange(minX, maxX);
        safe += 1;
      }
      used.push(x);
      state.enemyLasers.push({
        x: x,
        warn: 0.75,
        active: 0.35,
        width: 18,
        dmg: dmg
      });
    }
  }

  function update(dt) {
    if (!state.running) return;
    const lvl = LEVELS[state.levelIndex];

    state.levelDistance += dt * lvl.scrollSpeed;
    state.spawnClock += dt;
    state.bulletClock += dt;
    state.roadOffset += dt * lvl.scrollSpeed;

    if (state.skillTimer > 0) {
      state.skillTimer = Math.max(0, state.skillTimer - dt);
      updateSkillUi();
    }
    if (state.currentWeaponId === "laser") {
      state.laserCharge = Math.min(1, state.laserCharge + dt * (1.95 * state.weaponMods.laser.chargeRate));
    }
    if (state.shieldTimer > 0) state.shieldTimer = Math.max(0, state.shieldTimer - dt);
    state.player.hp = Math.min(state.player.maxHp, state.player.hp + state.player.regenPerSec * dt);
    if (state.weaponBuffTimer > 0) state.weaponBuffTimer = Math.max(0, state.weaponBuffTimer - dt);
    if (state.laserBeamTime > 0) state.laserBeamTime = Math.max(0, state.laserBeamTime - dt);
    if (state.laserBeamTime > 0) applyLaserBeamDamage(dt);
    if (state.shockwaveActive) updateShockwave(dt);
    state.edgeGlow = Math.max(0, state.edgeGlow - dt * 1.8);
    updateCamera(dt, lvl.scrollSpeed);
    updateBossAlert(dt);
    updateBossIntro(dt);

    if (state.touchActive) {
      const dx = state.pointerX - state.player.x;
      const dy = state.pointerY - state.player.y;
      const len = Math.hypot(dx, dy);
      if (len > 2) {
        const step = state.player.speed * 1.45 * dt;
        const ratio = Math.min(1, step / len);
        state.player.x += dx * ratio;
        state.player.y += dy * ratio;
      }
    }

    const leftClamp = laneLeftAtY(state.player.y) + state.player.radius;
    const rightClamp = laneRightAtY(state.player.y) - state.player.radius;
    state.player.x = clamp(state.player.x, leftClamp, rightClamp);
    state.player.y = clamp(state.player.y, state.height * 0.62, state.height * 0.9);

    if (!state.boss && state.levelDistance < lvl.distanceToBoss && state.spawnClock >= lvl.spawnEvery) {
      state.spawnClock = 0;
      spawnEnemy();
    }
    if (!state.boss && !state.eliteSpawned && state.levelDistance >= lvl.distanceToBoss * 0.6 && state.levelDistance < lvl.distanceToBoss * 0.92) {
      spawnEliteEnemy();
    }

    maybeSpawnStatGate();
    if (!state.boss && state.levelDistance >= lvl.distanceToBoss) spawnBoss();

    if (state.bulletClock >= playerFireInterval()) {
      state.bulletClock = 0;
      shootPlayer();
    }

    if (state.boss) {
      if (state.boss.y < state.boss.targetY) state.boss.y += lvl.boss.speed * dt;
      else {
        state.boss.x += state.boss.dir * state.boss.moveSpeed * dt;
        if (state.boss.x < laneLeftAtY(state.boss.y) + state.boss.radius || state.boss.x > laneRightAtY(state.boss.y) - state.boss.radius) state.boss.dir *= -1;
      }
      state.bossFireClock += dt;
      if (state.bossFireClock >= state.boss.fireEvery) {
        state.bossFireClock = 0;
        shootBoss();
      }
      syncBossPhase();
    }

    for (const star of state.stars) {
      star.y += dt * star.s;
      if (star.y > state.height) { star.y = -2; star.x = Math.random() * state.width; }
    }

    for (let i = state.enemies.length - 1; i >= 0; i--) {
      state.enemies[i].y += state.enemies[i].speed * dt;
      if (state.enemies[i].y > state.height + 50) {
        state.enemies.splice(i, 1);
        const leakDamage = Math.ceil(state.player.maxHp / 3);
        applyPlayerDamage(leakDamage, "#ff8da8");
        showTempText("漏怪! -" + leakDamage, "#ff8da8");
        state.slowMoTimer = 0.22;
        sfxLeak();
        triggerShake(10);
      }
    }

    for (let i = state.bullets.length - 1; i >= 0; i--) {
      const b = state.bullets[i];
      b.prevX = b.x;
      b.prevY = b.y;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.y < -30 || b.x < -40 || b.x > state.width + 40) state.bullets.splice(i, 1);
    }

    for (let i = state.enemyBullets.length - 1; i >= 0; i--) {
      const b = state.enemyBullets[i];
      b.age += dt;
      if (b.type === "homing") {
        const targetAngle = Math.atan2(state.player.x - b.x, state.player.y - b.y);
        const current = Math.atan2(b.vx, b.vy);
        let delta = targetAngle - current;
        while (delta > Math.PI) delta -= Math.PI * 2;
        while (delta < -Math.PI) delta += Math.PI * 2;
        const step = clamp(delta, -b.homingTurn * dt, b.homingTurn * dt);
        const next = current + step;
        const speed = Math.hypot(b.vx, b.vy);
        b.vx = Math.sin(next) * speed;
        b.vy = Math.cos(next) * speed;
      }
      if (b.type === "splitter" && !b.splitDone && b.age >= 0.42) {
        b.splitDone = true;
        const baseAngle = Math.atan2(b.vx, b.vy);
        const speed = Math.hypot(b.vx, b.vy) * 1.04;
        addEnemyBulletAngle(b.x, b.y, baseAngle - 0.34, speed, b.dmg * 0.72, "normal");
        addEnemyBulletAngle(b.x, b.y, baseAngle + 0.34, speed, b.dmg * 0.72, "normal");
        spawnSpark(b.x, b.y, "#ffb8c7");
        state.enemyBullets.splice(i, 1);
        continue;
      }
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      const turnBack = b.type === "homing" && b.vy < -20;
      if (turnBack || b.age >= b.maxAge || b.y > state.height + 30 || b.x < -30 || b.x > state.width + 30) {
        state.enemyBullets.splice(i, 1);
      }
    }

    for (let i = state.enemyLasers.length - 1; i >= 0; i--) {
      const l = state.enemyLasers[i];
      if (l.warn > 0) {
        l.warn -= dt;
      } else {
        l.active -= dt;
        if (l.active > 0) {
          const inWidth = Math.abs(state.player.x - l.x) <= l.width * 0.5 + state.player.radius;
          if (inWidth) applyPlayerDamage(l.dmg * dt * 3.2, "#ff7f7f");
        }
      }
      if (l.warn <= 0 && l.active <= 0) state.enemyLasers.splice(i, 1);
    }

    for (let i = state.statGates.length - 1; i >= 0; i--) {
      const g = state.statGates[i];
      g.y += g.speed * dt;
      if (!g.chosen && g.y > state.player.y - 24 && g.y < state.player.y + 24) {
        const laneMid = state.width * 0.5;
        const picked = state.player.x < laneMid ? g.left : g.right;
        picked.apply(state);
        g.chosen = true;
        state.score += 8;
        showTempText((state.player.x < laneMid ? "左" : "右") + "路选择: " + picked.text, "#7fffe0");
        sfxUpgradePick();
      }
      if (g.y > state.height + 80) state.statGates.splice(i, 1);
    }

    handleCollisions();
    updateParticles(dt);
    updateRayChains(dt);
    updateShake(dt);
    updateHud();
    updateBossHpUi();

    if (state.player.hp <= 0) {
      state.running = false;
      sfxLose();
      showOverlay({ title: "挑战失败", desc: "生命值归零，点击重新挑战。", buttonText: "重新开始", showChoices: false });
      return;
    }

    if (state.bossDefeated) {
      state.bossDefeated = false;
      const next = state.levelIndex + 1;
      if (next >= LEVELS.length) {
        state.running = false;
        showOverlay({ title: "通关成功", desc: "你已通过全部 5 关。", buttonText: "再来一局", showChoices: false });
      } else openRewardSelection(next);
    }
  }

  function pickWeighted(items) {
    const total = items.reduce(function (sum, it) { return sum + it.weight; }, 0);
    let r = Math.random() * total;
    for (let i = 0; i < items.length; i++) {
      r -= items[i].weight;
      if (r <= 0) return items[i];
    }
    return items[items.length - 1];
  }

  function makeWeaponChoice(wid, forceGold) {
    const w = WEAPONS[wid];
    return {
      type: "weapon",
      tierClass: forceGold ? "tier-gold" : "tier-blue",
      title: (forceGold ? "金色武器: " : "武器: ") + w.name,
      desc: w.desc + "  技能: " + w.skillName,
      apply: function () {
        state.unlockedWeapons.add(wid);
        state.currentWeaponId = wid;
        state.skillTimer = 0;
      }
    };
  }

  function makeWeaponSkillChoice(wid) {
    if (wid === "mg") {
      return {
        type: "skill",
        tierClass: "tier-gold",
        title: "金色模组: 机枪冷铸弹链",
        desc: "机枪射速 +10%，破盾效率提升",
        apply: function () {
          state.weaponMods.mg.fireBonus *= 1.1;
          state.weaponMods.mg.shieldBreak *= 1.12;
          state.stats.fireRate *= 1.06;
        }
      };
    }
    if (wid === "laser") {
      return {
        type: "skill",
        tierClass: "tier-gold",
        title: "金色模组: 激光超导电容",
        desc: "激光充能 +22%，每发间隔更短",
        apply: function () {
          state.weaponMods.laser.chargeRate *= 1.22;
          state.weaponMods.laser.burstInterval = Math.max(0.06, state.weaponMods.laser.burstInterval - 0.015);
          state.weaponMods.laser.shieldBreak *= 1.08;
        }
      };
    }
    return {
      type: "skill",
      tierClass: "tier-gold",
      title: "金色模组: 镭射链路扩展",
      desc: "连锁数量 +1，链伤提升",
      apply: function () {
        state.weaponMods.ray.chainCount = Math.min(5, state.weaponMods.ray.chainCount + 1);
        state.weaponMods.ray.chainPower *= 1.12;
        state.weaponMods.ray.shieldBreak *= 1.06;
      }
    };
  }

  function makeAttributeChoice() {
    const rarity = pickWeighted([
      { key: "green", label: "绿色", weight: 4, tierClass: "tier-green" },
      { key: "blue", label: "蓝色", weight: 3, tierClass: "tier-blue" },
      { key: "purple", label: "紫色", weight: 2, tierClass: "tier-purple" },
      { key: "gold", label: "金色", weight: 1, tierClass: "tier-gold" }
    ]);
    const stat = CHOICE_STATS[Math.floor(Math.random() * CHOICE_STATS.length)];

    if (stat.key === "hp") {
      const gain = rarity.key === "green" ? 35 : rarity.key === "blue" ? 55 : rarity.key === "purple" ? 80 : 120;
      return {
        type: "attr",
        tierClass: rarity.tierClass,
        title: rarity.label + "属性: 生命强化",
        desc: "最大生命 +" + gain + "，并立即回复生命",
        apply: function () {
          state.player.maxHp += gain;
          state.player.hp = Math.min(state.player.maxHp, state.player.hp + Math.ceil(gain * 1.2));
        }
      };
    }
    if (stat.key === "fire") {
      const mul = rarity.key === "green" ? 1.14 : rarity.key === "blue" ? 1.2 : rarity.key === "purple" ? 1.28 : 1.38;
      return {
        type: "attr",
        tierClass: rarity.tierClass,
        title: rarity.label + "属性: 射速强化",
        desc: "射速 +" + Math.round((mul - 1) * 100) + "%",
        apply: function () { state.stats.fireRate *= mul; }
      };
    }
    if (stat.key === "damage") {
      const mul = rarity.key === "green" ? 1.18 : rarity.key === "blue" ? 1.26 : rarity.key === "purple" ? 1.35 : 1.5;
      return {
        type: "attr",
        tierClass: rarity.tierClass,
        title: rarity.label + "属性: 伤害强化",
        desc: "伤害 +" + Math.round((mul - 1) * 100) + "%",
        apply: function () { state.stats.damage *= mul; }
      };
    }

    const add = rarity.key === "green" || rarity.key === "blue" ? 1 : 2;
    return {
      type: "attr",
      tierClass: rarity.tierClass,
      title: rarity.label + "属性: 弹量强化",
      desc: "子弹数量 +" + add,
      apply: function () { state.stats.bulletCount = Math.min(7, state.stats.bulletCount + add); }
    };
  }

  function makeRewardChoices() {
    const weaponIds = Object.keys(WEAPONS);

    if (state.levelIndex === 0) {
      return weaponIds.map(function (wid) { return makeWeaponChoice(wid, true); });
    }

    const notOwned = weaponIds.filter(function (id) { return !state.unlockedWeapons.has(id); });
    const choices = [];

    while (choices.length < 3) {
      const cat = Math.floor(Math.random() * 3); // 0 武器 1 属性 2 武器技能

      if (cat === 0 && notOwned.length > 0) {
        const pick = notOwned.splice(Math.floor(Math.random() * notOwned.length), 1)[0];
        choices.push(makeWeaponChoice(pick, false));
        continue;
      }

      if (cat === 2) {
        const owned = Array.from(state.unlockedWeapons);
        const wid = owned[Math.floor(Math.random() * owned.length)];
        choices.push(makeWeaponSkillChoice(wid));
        continue;
      }

      choices.push(makeAttributeChoice());
    }

    return shuffle(choices).slice(0, 3);
  }

  function openRewardSelection(nextLevel) {
    state.running = false;
    state.choosingReward = true;
    state.pendingLevel = nextLevel;
    state.rewardChoices = makeRewardChoices();

    choiceButtons.forEach(function (btn, idx) {
      const c = state.rewardChoices[idx];
      if (!c) return;
      btn.dataset.choice = String(idx);
      btn.classList.remove("tier-green", "tier-blue", "tier-purple", "tier-gold", "reveal");
      btn.classList.add(c.tierClass || "tier-blue");
      btn.querySelector(".choice-name").textContent = c.title;
      btn.querySelector(".choice-desc").textContent = c.desc;
      btn.style.animationDelay = idx * 90 + "ms";
      void btn.offsetWidth;
      btn.classList.add("reveal");
    });

    const desc = state.levelIndex === 0
      ? "首个Boss奖励：三张金色武器卡，三选一。"
      : "后续奖励：随机出现武器 / 属性加成 / 金色武器技能。";
    showOverlay({ title: "通关奖励三选一", desc: desc, showButton: false, showChoices: true });
    sfxUpgradeOpen();
  }

  function applyReward(idx) {
    if (!state.choosingReward) return;
    const c = state.rewardChoices[idx];
    if (!c) return;
    c.apply();
    state.choosingReward = false;
    hideOverlay();
    resetLevel(state.pendingLevel);
    state.pendingLevel = -1;
    state.running = true;
    updateHud();
    state.lastTs = performance.now();
    requestAnimationFrame(loop);
  }
  function activateSkill() {
    if (!state.running || state.skillTimer > 0) return;
    const w = currentWeapon();
    state.skillTimer = w.skillCooldown;
    updateSkillUi();
    triggerShake(14);
    state.shieldTimer = 2.8;
    state.shockwaveActive = true;
    state.shockwaveRadius = 20;
    state.shockwaveLast = 20;
    pulseEdgeGlow("#ffd77a", 0.55);
    sfxUltimate();

    if (w.id === "mg") {
      state.weaponBuffTimer = 5;
      clearEnemyBullets();
      sfxSkill();
      showTempText("弹幕风暴启动", "#99f2ff");
      return;
    }
    if (w.id === "laser") {
      for (let i = state.enemies.length - 1; i >= 0; i--) {
        state.enemies[i].hp -= 260;
        spawnSpark(state.enemies[i].x, state.enemies[i].y, "#ffe29e");
        if (state.enemies[i].hp <= 0) {
          onEnemyKilled(state.enemies[i]);
          state.enemies.splice(i, 1);
        }
      }
      if (state.boss) {
        damageBoss(360, "laser");
        explode(state.boss.x, state.boss.y, "#ffd173");
        syncBossPhase();
      }
      return;
    }
    if (w.id === "ray") {
      sfxSkill();
      clearEnemyBullets();
      for (let i = state.enemies.length - 1; i >= 0; i--) {
        state.enemies[i].hp -= 180;
        spawnSpark(state.enemies[i].x, state.enemies[i].y, "#bfbcff");
        if (state.enemies[i].hp <= 0) {
          onEnemyKilled(state.enemies[i]);
          state.enemies.splice(i, 1);
        }
      }
      if (state.boss) {
        damageBoss(240, "ray");
        explode(state.boss.x, state.boss.y, "#c6b0ff");
        syncBossPhase();
      }
    }
  }

  function clearEnemyBullets() {
    for (let i = state.enemyBullets.length - 1; i >= 0; i--) {
      spawnSpark(state.enemyBullets[i].x, state.enemyBullets[i].y, "#9dfdff");
      state.enemyBullets.splice(i, 1);
    }
  }

  function applyPlayerDamage(amount, color) {
    if (amount <= 0) return;
    if (state.shieldTimer > 0) {
      spawnSpark(state.player.x, state.player.y, "#9dfdff");
      pulseEdgeGlow("#7ed5ff", 0.25);
      return;
    }
    state.player.hp -= amount;
    pulseEdgeGlow(color || "#ff8da8", 0.45);
    sfxDamage();
  }

  function pulseEdgeGlow(color, amount) {
    state.edgeColor = color || "#8fd8ff";
    state.edgeGlow = Math.min(1, state.edgeGlow + amount);
  }

  function updateShockwave(dt) {
    const prev = state.shockwaveRadius;
    state.shockwaveRadius += 860 * dt;
    const playerX = state.player.x;
    const playerY = state.player.y;
    for (let i = state.enemies.length - 1; i >= 0; i--) {
      const e = state.enemies[i];
      const d = Math.hypot(e.x - playerX, e.y - playerY);
      if (d >= prev && d < state.shockwaveRadius + e.radius) {
        onEnemyKilled(e);
        state.enemies.splice(i, 1);
      }
    }
    if (state.boss) {
      const d = Math.hypot(state.boss.x - playerX, state.boss.y - playerY);
      if (d >= prev && d < state.shockwaveRadius + state.boss.radius) {
        damageBoss(180, "skill");
        syncBossPhase();
      }
    }
    if (state.shockwaveRadius > Math.max(state.width, state.height) * 1.2) {
      state.shockwaveActive = false;
      state.shockwaveRadius = 0;
    }
  }

  function applyEliteDropReward() {
    const rarity = Math.random() < 0.72 ? "purple" : "gold";
    const stat = CHOICE_STATS[Math.floor(Math.random() * CHOICE_STATS.length)].key;
    if (stat === "hp") {
      const gain = rarity === "gold" ? 120 : 80;
      state.player.maxHp += gain;
      state.player.hp = Math.min(state.player.maxHp, state.player.hp + Math.ceil(gain * 1.2));
      showTempText((rarity === "gold" ? "金色" : "紫色") + "掉落: 生命+" + gain, rarity === "gold" ? "#ffd879" : "#ca9bff");
      return;
    }
    if (stat === "fire") {
      const mul = rarity === "gold" ? 1.38 : 1.28;
      state.stats.fireRate *= mul;
      showTempText((rarity === "gold" ? "金色" : "紫色") + "掉落: 射速+" + Math.round((mul - 1) * 100) + "%", rarity === "gold" ? "#ffd879" : "#ca9bff");
      return;
    }
    if (stat === "damage") {
      const mul = rarity === "gold" ? 1.5 : 1.35;
      state.stats.damage *= mul;
      showTempText((rarity === "gold" ? "金色" : "紫色") + "掉落: 伤害+" + Math.round((mul - 1) * 100) + "%", rarity === "gold" ? "#ffd879" : "#ca9bff");
      return;
    }
    const add = rarity === "gold" ? 2 : 1;
    state.stats.bulletCount = Math.min(7, state.stats.bulletCount + add);
    showTempText((rarity === "gold" ? "金色" : "紫色") + "掉落: 子弹+" + add, rarity === "gold" ? "#ffd879" : "#ca9bff");
  }

  function onEnemyKilled(enemy) {
    state.score += 12;
    state.player.hp = Math.min(state.player.maxHp, state.player.hp + state.player.killHeal);
    if (enemy && enemy.elite) {
      state.score += 58;
      explode(enemy.x, enemy.y, "#d39aff");
      pulseEdgeGlow("#dca6ff", 0.35);
      applyEliteDropReward();
    } else {
      explode(enemy.x, enemy.y, "#6fc7ff");
    }
    sfxExplode();
    triggerShake(4);
  }

  function applyLaserBeamDamage(dt) {
    const beamHalf = 22;
    const perSec = (currentWeapon().baseDamage + LEVELS[state.levelIndex].bulletPower) * state.stats.damage * 4.6;
    const dmg = perSec * dt;
    for (let i = state.enemies.length - 1; i >= 0; i--) {
      const e = state.enemies[i];
      if (Math.abs(e.x - state.player.x) <= beamHalf + e.radius && e.y < state.player.y + 16) {
        e.hp -= dmg;
        spawnSpark(e.x, e.y, "#ffe9ad");
        pulseEdgeGlow("#ffd98a", 0.08);
        if (e.hp <= 0) {
          onEnemyKilled(e);
          state.enemies.splice(i, 1);
        }
      }
    }
    if (state.boss && Math.abs(state.boss.x - state.player.x) <= beamHalf + state.boss.radius) {
      damageBoss(dmg * 0.55, "laser");
      pulseEdgeGlow("#ffd98a", 0.06);
      syncBossPhase();
    }
  }

  function damageBoss(amount, weaponTag) {
    if (!state.boss || amount <= 0) return;
    const b = state.boss;
    const breakMul = weaponTag === "laser"
      ? state.weaponMods.laser.shieldBreak
      : weaponTag === "ray"
        ? state.weaponMods.ray.shieldBreak
        : weaponTag === "skill"
          ? 1.25
          : state.weaponMods.mg.shieldBreak;

    if (b.shield > 0) {
      const shieldDmg = amount * breakMul;
      b.shield -= shieldDmg;
      pulseEdgeGlow("#9dc8ff", 0.06);
      if (b.shield < 0) {
        // overflow damage converts back to hp domain
        b.hp += b.shield / Math.max(0.1, breakMul);
        b.shield = 0;
      }
      return;
    }
    b.hp -= amount;
  }

  function syncBossPhase() {
    if (!state.boss || state.boss.hp <= 0) return;
    if (!state.boss.enraged && state.boss.hp / state.boss.maxHp <= 0.5) {
      state.boss.enraged = true;
      state.boss.fireEvery *= 0.66;
      state.boss.moveSpeed *= 1.34;
      state.boss.bulletSpeed *= 1.3;
      state.boss.bulletDmg *= 1.34;
      state.boss.crashDmg *= 1.24;
      showBossAlert("危险警报：Boss 狂暴", 3.8);
      sfxEnrage();
      triggerShake(16);
      explode(state.boss.x, state.boss.y, "#ff8b77");
    }
    if (state.levelIndex === 4 && state.boss.enraged && !state.boss.ultimateEnraged && state.boss.hp / state.boss.maxHp <= 0.2) {
      state.boss.ultimateEnraged = true;
      state.boss.fireEvery *= 0.58;
      state.boss.moveSpeed *= 1.28;
      state.boss.bulletSpeed *= 1.34;
      state.boss.bulletDmg *= 1.46;
      state.boss.crashDmg *= 1.32;
      showBossAlert("终极警报：二阶段·湮灭模式", 4.4);
      showBossIntro("终焉机皇·二阶段", "湮灭协议已锁定你。", "lv5");
      sfxUltimate();
      triggerShake(20);
      explode(state.boss.x, state.boss.y, "#ffd177");
    }
  }

  function handleCollisions() {
    for (let i = state.bullets.length - 1; i >= 0; i--) {
      const b = state.bullets[i];
      let hit = false;
      for (let j = state.enemies.length - 1; j >= 0; j--) {
        const e = state.enemies[j];
        if (circleHit(b, e)) {
          e.hp -= b.dmg;
          const hitColor = b.weapon === "ray" ? "#cdb6ff" : "#96ffe5";
          spawnSpark(b.x, b.y, hitColor);
          pulseEdgeGlow(b.weapon === "ray" ? "#bfa7ff" : "#9df6e6", b.weapon === "ray" ? 0.09 : 0.04);
          sfxHit();
          hit = true;
          if (b.weapon === "ray") spawnRayChains(e.x, e.y, b.dmg * state.weaponMods.ray.chainPower, e);
          if (e.hp <= 0) {
            onEnemyKilled(e);
            state.enemies.splice(j, 1);
          }
          if (b.pierce > 0) { b.pierce -= 1; hit = false; }
          break;
        }
      }
      if (!hit && state.boss && circleHit(b, state.boss)) {
        damageBoss(b.dmg, b.weapon || "mg");
        spawnSpark(b.x, b.y, b.weapon === "ray" ? "#ceb7ff" : "#ffcc88");
        pulseEdgeGlow(b.weapon === "ray" ? "#c2a8ff" : "#ffd194", b.weapon === "ray" ? 0.07 : 0.04);
        sfxHit();
        if (b.weapon === "ray") spawnRayChains(state.boss.x, state.boss.y, b.dmg * (state.weaponMods.ray.chainPower * 0.85), null);
        syncBossPhase();
        hit = true;
        if (state.boss.hp <= 0) {
          const bossClearHpBonus = (state.levelIndex + 1) * 100;
          state.player.maxHp += bossClearHpBonus;
          state.player.hp = Math.min(state.player.maxHp, state.player.hp + bossClearHpBonus);
          showTempText("击破Boss 生命+" + bossClearHpBonus, "#9effb8");
          explode(state.boss.x, state.boss.y, "#ff6688");
          state.boss = null;
          state.score += 260;
          state.bossDefeated = true;
          bossHud.classList.add("hidden");
          sfxExplode();
          triggerShake(12);
        }
      }
      if (hit) state.bullets.splice(i, 1);
    }

    for (let i = state.enemyBullets.length - 1; i >= 0; i--) {
      if (circleHit(state.enemyBullets[i], state.player)) {
        applyPlayerDamage(state.enemyBullets[i].dmg, "#ff96ac");
        state.enemyBullets.splice(i, 1);
        spawnSpark(state.player.x, state.player.y, "#ff7d9a");
        triggerShake(7);
      }
    }

    for (let i = state.enemies.length - 1; i >= 0; i--) {
      if (circleHit(state.enemies[i], state.player)) {
        applyPlayerDamage(state.enemies[i].dmg, "#ff9f7b");
        explode(state.enemies[i].x, state.enemies[i].y, "#ffa55f");
        state.enemies.splice(i, 1);
        triggerShake(8);
      }
    }

    if (state.boss && circleHit(state.boss, state.player)) {
      applyPlayerDamage(state.boss.crashDmg, "#ff6d86");
      state.boss.dir *= -1;
      state.boss.x += state.boss.dir * 18;
      triggerShake(12);
    }
  }

  function updateParticles(dt) {
    for (let i = state.particles.length - 1; i >= 0; i--) {
      const p = state.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      p.alpha = Math.max(0, p.life / p.maxLife);
      if (p.life <= 0) state.particles.splice(i, 1);
    }
  }

  function spawnRayChains(x, y, chainDmg, skipEnemy) {
    const candidates = state.enemies
      .filter(function (e) { return e !== skipEnemy; })
      .sort(function (a, b) { return Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y); })
      .slice(0, state.weaponMods.ray.chainCount);
    for (const e of candidates) {
      state.rayChains.push({ x1: x, y1: y, x2: e.x, y2: e.y, life: 0.14, maxLife: 0.14, color: "#b89dff" });
      e.hp -= chainDmg;
      if (e.hp <= 0) {
        onEnemyKilled(e);
        const idx = state.enemies.indexOf(e);
        if (idx >= 0) state.enemies.splice(idx, 1);
      }
    }
    if (state.boss) {
      state.rayChains.push({ x1: x, y1: y, x2: state.boss.x, y2: state.boss.y, life: 0.12, maxLife: 0.12, color: "#cfb9ff" });
      damageBoss(chainDmg * 0.55, "ray");
      syncBossPhase();
    }
  }

  function updateRayChains(dt) {
    for (let i = state.rayChains.length - 1; i >= 0; i--) {
      state.rayChains[i].life -= dt;
      if (state.rayChains[i].life <= 0) state.rayChains.splice(i, 1);
    }
  }

  function updateShake(dt) {
    if (state.shake > 0) {
      state.shake = Math.max(0, state.shake - dt * 32);
      const power = state.shake * 1.6;
      state.shakeX = randomRange(-power, power);
      state.shakeY = randomRange(-power, power);
    } else {
      state.shakeX = 0;
      state.shakeY = 0;
    }
  }

  function updateCamera(dt, speed) {
    const targetX = (state.width * 0.5 - state.player.x) * 0.2;
    state.camWave += dt * (2.2 + speed / 300);
    const targetY = Math.sin(state.camWave) * (2 + speed / 180);
    state.camX += (targetX - state.camX) * Math.min(1, dt * 8);
    state.camY += (targetY - state.camY) * Math.min(1, dt * 6);
  }

  function showBossAlert(text, duration) {
    bossAlert.textContent = text;
    bossAlert.classList.remove("hidden");
    state.bossAlertTimer = duration;
  }

  function updateBossAlert(dt) {
    if (state.bossAlertTimer <= 0) return;
    state.bossAlertTimer = Math.max(0, state.bossAlertTimer - dt);
    if (state.bossAlertTimer <= 0) bossAlert.classList.add("hidden");
  }

  function showBossIntro(name, line, avatarClass) {
    bossName.textContent = name;
    bossLine.textContent = line;
    bossAvatar.classList.remove("lv1", "lv2", "lv3", "lv4", "lv5");
    if (avatarClass) bossAvatar.classList.add(avatarClass);
    bossIntro.classList.remove("hidden");
    state.bossIntroTimer = 3.2;
  }

  function updateBossIntro(dt) {
    if (state.bossIntroTimer <= 0) return;
    state.bossIntroTimer = Math.max(0, state.bossIntroTimer - dt);
    if (state.bossIntroTimer <= 0) bossIntro.classList.add("hidden");
  }

  function showTempText(text, color) {
    state.particles.push({ x: state.player.x, y: state.player.y - 40, vx: 0, vy: -20, life: 0.7, maxLife: 0.7, alpha: 1, size: 0, color: color, text: text });
  }

  function updateHud() {
    hpText.textContent = String(Math.max(0, Math.round(state.player.hp)));
    scoreText.textContent = String(state.score);
    weaponText.textContent = currentWeapon().name;
  }

  function updateBossHpUi() {
    if (!state.boss) return;
    const totalNow = Math.max(0, state.boss.hp) + Math.max(0, state.boss.shield || 0);
    const totalMax = Math.max(1, state.boss.maxHp + (state.boss.maxShield || 0));
    const ratio = clamp(totalNow / totalMax, 0, 1);
    bossHpFill.style.width = Math.round(ratio * 100) + "%";
    bossHpFill.style.background = state.boss.shield > 0
      ? "linear-gradient(90deg,#7ab6ff,#a2d9ff)"
      : "linear-gradient(90deg,#ff5a8c,#ff924f)";
  }

  function updateSkillUi() {
    const w = currentWeapon();
    const max = w.skillCooldown;
    const pct = Math.round((1 - state.skillTimer / max) * 100);
    skillBtn.style.setProperty("--cd", clamp(pct, 0, 100) + "%");
    if (state.skillTimer <= 0) { skillCdText.textContent = "READY"; skillBtn.classList.remove("cooldown"); }
    else { skillCdText.textContent = state.skillTimer.toFixed(1) + "s"; skillBtn.classList.add("cooldown"); }
  }
  function draw() {
    ctx.save();
    ctx.translate(state.shakeX + state.camX, state.shakeY + state.camY);
    drawBackground();
    drawRoad();
    drawStatGates();
    drawEnemies();
    drawBoss();
    drawBullets();
    drawPlayer();
    drawParticles();
    drawShieldShockwave();
    ctx.restore();
    drawEdgeGlow();
  }

  function drawBackground() {
    ctx.clearRect(-32, -32, state.width + 64, state.height + 64);
    const g = ctx.createLinearGradient(0, 0, 0, state.height);
    g.addColorStop(0, "#122a4f");
    g.addColorStop(0.46, "#0a1730");
    g.addColorStop(1, "#03070f");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, state.width, state.height);
    ctx.fillStyle = "rgba(162, 223, 255, 0.75)";
    for (const s of state.stars) { ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill(); }
  }

  function drawRoad() {
    const leftTop = laneLeftAtY(0);
    const rightTop = laneRightAtY(0);
    const leftBottom = laneLeftAtY(state.height);
    const rightBottom = laneRightAtY(state.height);

    const roadGrad = ctx.createLinearGradient(0, 0, 0, state.height);
    roadGrad.addColorStop(0, "rgba(70, 112, 165, 0.95)");
    roadGrad.addColorStop(0.52, "rgba(46, 67, 106, 0.98)");
    roadGrad.addColorStop(1, "rgba(30, 40, 66, 0.98)");

    ctx.beginPath();
    ctx.moveTo(leftTop, 0);
    ctx.lineTo(rightTop, 0);
    ctx.lineTo(rightBottom, state.height);
    ctx.lineTo(leftBottom, state.height);
    ctx.closePath();
    ctx.fillStyle = roadGrad;
    ctx.fill();

    ctx.strokeStyle = "rgba(127, 214, 255, 0.58)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(leftTop, 0);
    ctx.lineTo(leftBottom, state.height);
    ctx.moveTo(rightTop, 0);
    ctx.lineTo(rightBottom, state.height);
    ctx.stroke();

    const stripeGap = 98;
    const offset = state.roadOffset % stripeGap;
    for (let y = -offset; y < state.height + stripeGap; y += stripeGap) {
      const t = y / state.height;
      const cx = state.width * 0.5;
      const w = 10 + t * 24;
      const h = 24 + t * 34;
      ctx.fillStyle = "rgba(206, 242, 255, 0.35)";
      ctx.fillRect(cx - w * 0.5, y, w, h);
    }
  }

  function drawStatGates() {
    for (const g of state.statGates) {
      const laneL = laneLeftAtY(g.y + 24);
      const laneR = laneRightAtY(g.y + 24);
      const mid = (laneL + laneR) * 0.5;
      const lx = (laneL + mid) * 0.5;
      const rx = (laneR + mid) * 0.5;
      drawGateCard(lx, g.y, g.left.label, g.left.text, "#5ef3ba");
      drawGateCard(rx, g.y, g.right.label, g.right.text, "#8dc9ff");
    }
  }

  function drawGateCard(x, y, title, desc, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = "rgba(7, 26, 41, 0.88)";
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    roundRect(ctx, -54, -30, 108, 60, 10);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.font = "bold 12px Segoe UI";
    ctx.textAlign = "center";
    ctx.fillText(title, 0, -7);
    ctx.fillStyle = "#d6efff";
    ctx.font = "11px Segoe UI";
    ctx.fillText(desc, 0, 12);
    ctx.restore();
  }

  function drawPlayer() {
    const p = state.player;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.fillStyle = "rgba(99, 235, 255, 0.2)";
    ctx.beginPath();
    ctx.ellipse(0, 16, 34, 16, 0, 0, Math.PI * 2);
    ctx.fill();

    // Main mecha torso
    const armor = ctx.createLinearGradient(-24, -24, 24, 24);
    armor.addColorStop(0, "#f0f8ff");
    armor.addColorStop(0.45, "#9cd0ff");
    armor.addColorStop(1, "#2f5e9e");
    ctx.fillStyle = armor;
    ctx.beginPath();
    ctx.moveTo(0, -34);
    ctx.lineTo(20, -4);
    ctx.lineTo(15, 18);
    ctx.lineTo(0, 28);
    ctx.lineTo(-15, 18);
    ctx.lineTo(-20, -4);
    ctx.closePath();
    ctx.fill();

    // Shoulder armor
    ctx.fillStyle = "#d4ebff";
    ctx.fillRect(-25, -16, 10, 22);
    ctx.fillRect(15, -16, 10, 22);
    // Leg armor
    ctx.fillRect(-12, 20, 8, 14);
    ctx.fillRect(4, 20, 8, 14);

    // Core neon line
    ctx.strokeStyle = "#55f0ff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -24);
    ctx.lineTo(0, 18);
    ctx.stroke();

    // V-fin / head
    ctx.fillStyle = "#ff6b8d";
    ctx.beginPath();
    ctx.moveTo(0, -44);
    ctx.lineTo(6, -28);
    ctx.lineTo(-6, -28);
    ctx.closePath();
    ctx.fill();

    // Wing-like backpack
    ctx.fillStyle = "rgba(140, 219, 255, 0.75)";
    ctx.beginPath();
    ctx.moveTo(-18, -10);
    ctx.lineTo(-34, 6);
    ctx.lineTo(-18, 8);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(18, -10);
    ctx.lineTo(34, 6);
    ctx.lineTo(18, 8);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawEnemies() {
    for (const e of state.enemies) {
      ctx.save();
      ctx.translate(e.x, e.y);
      const g = ctx.createLinearGradient(-22, -22, 22, 22);
      if (e.elite) {
        g.addColorStop(0, "#f6ddff");
        g.addColorStop(1, "#7a4ca8");
      } else {
        g.addColorStop(0, "#cfd6e2");
        g.addColorStop(1, "#5e6f83");
      }
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(0, e.elite ? 24 : 18);
      ctx.lineTo(e.elite ? 18 : 14, e.elite ? 10 : 8);
      ctx.lineTo(e.elite ? 20 : 16, e.elite ? -12 : -10);
      ctx.lineTo(0, e.elite ? -22 : -18);
      ctx.lineTo(e.elite ? -20 : -16, e.elite ? -12 : -10);
      ctx.lineTo(e.elite ? -18 : -14, e.elite ? 10 : 8);
      ctx.closePath();
      ctx.fill();

      // Enemy mecha visor/core
      ctx.fillStyle = e.elite ? "#ffd777" : "#ff6d8f";
      ctx.fillRect(-5, -8, 10, 5);
      ctx.fillStyle = e.elite ? "#b58ad9" : "#8aa5bf";
      ctx.fillRect(-10, 10, 7, 6);
      ctx.fillRect(3, 10, 7, 6);
      if (e.elite) {
        ctx.strokeStyle = "rgba(246, 199, 255, 0.9)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 28 + Math.sin(performance.now() * 0.02) * 2, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  function drawBoss() {
    if (!state.boss) return;
    const b = state.boss;
    ctx.save();
    ctx.translate(b.x, b.y);
    if (b.ultimateEnraged) {
      ctx.fillStyle = "rgba(255, 210, 90, 0.32)";
      ctx.beginPath();
      ctx.arc(0, 0, 96 + Math.sin(performance.now() * 0.028) * 6, 0, Math.PI * 2);
      ctx.fill();
    }
    if (b.enraged) {
      ctx.fillStyle = "rgba(255, 99, 84, 0.26)";
      ctx.beginPath();
      ctx.arc(0, 0, 84 + Math.sin(performance.now() * 0.02) * 4, 0, Math.PI * 2);
      ctx.fill();
    }
    const g = ctx.createRadialGradient(0, -10, 8, 0, 0, 80);
    g.addColorStop(0, b.ultimateEnraged ? "#ffe9be" : b.enraged ? "#ffb9c5" : "#d8e3f3");
    g.addColorStop(0.5, b.ultimateEnraged ? "#ff9f35" : b.enraged ? "#ff4f6d" : "#72839a");
    g.addColorStop(1, "#223042");
    ctx.fillStyle = g;

    // Heavy mecha body silhouette
    ctx.beginPath();
    ctx.moveTo(0, -70);
    ctx.lineTo(54, -36);
    ctx.lineTo(64, 4);
    ctx.lineTo(48, 50);
    ctx.lineTo(16, 66);
    ctx.lineTo(-16, 66);
    ctx.lineTo(-48, 50);
    ctx.lineTo(-64, 4);
    ctx.lineTo(-54, -36);
    ctx.closePath();
    ctx.fill();

    // Arm cannons
    ctx.fillStyle = "#90a3ba";
    ctx.fillRect(-74, -8, 16, 32);
    ctx.fillRect(58, -8, 16, 32);
    ctx.fillStyle = "#394a60";
    ctx.fillRect(-71, 20, 10, 10);
    ctx.fillRect(61, 20, 10, 10);

    // Core and head
    ctx.fillStyle = b.ultimateEnraged ? "#ffe08b" : "#78e6ff";
    ctx.fillRect(-10, -16, 20, 14);
    ctx.fillStyle = "#ff6d8f";
    ctx.fillRect(-6, -34, 12, 8);

    // Leg chunks
    ctx.fillStyle = "#6b7e94";
    ctx.fillRect(-26, 56, 14, 14);
    ctx.fillRect(12, 56, 14, 14);
    ctx.restore();
  }

  function drawBullets() {
    if (state.laserBeamTime > 0 && currentWeapon().id === "laser") {
      const alpha = clamp(state.laserBeamTime / 0.13, 0, 1);
      const beamW = 14 + Math.sin(performance.now() * 0.05) * 2;
      const grad = ctx.createLinearGradient(state.player.x, state.player.y - 20, state.player.x, -20);
      grad.addColorStop(0, "rgba(255,230,165," + (0.55 * alpha) + ")");
      grad.addColorStop(1, "rgba(255,245,210," + (0.9 * alpha) + ")");
      ctx.fillStyle = grad;
      ctx.fillRect(state.player.x - beamW * 0.5, -20, beamW, state.player.y + 20);
      ctx.strokeStyle = "rgba(255,255,240," + (0.9 * alpha) + ")";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(state.player.x, state.player.y - 18);
      ctx.lineTo(state.player.x, -20);
      ctx.stroke();
    }

    for (const b of state.bullets) {
      if (b.weapon === "mg") {
        ctx.strokeStyle = "rgba(146,255,220,0.55)";
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(b.prevX, b.prevY);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
      ctx.fillStyle = b.weapon === "ray" ? "#c3b4ff" : b.weapon === "mg" ? "#7ef7e1" : "#ffd78f";
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const c of state.rayChains) {
      const a = clamp(c.life / c.maxLife, 0, 1);
      ctx.strokeStyle = "rgba(190,170,255," + a + ")";
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(c.x1, c.y1);
      ctx.lineTo(c.x2, c.y2);
      ctx.stroke();
    }

    for (const l of state.enemyLasers) {
      if (l.warn > 0) {
        const a = 0.2 + 0.45 * (1 - l.warn / 0.75);
        ctx.strokeStyle = "rgba(255,155,155," + a + ")";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(l.x, 0);
        ctx.lineTo(l.x, state.height);
        ctx.stroke();
      } else if (l.active > 0) {
        const a = clamp(l.active / 0.35, 0, 1) * 0.75;
        ctx.fillStyle = "rgba(255,110,110," + a + ")";
        ctx.fillRect(l.x - l.width * 0.5, 0, l.width, state.height);
        ctx.strokeStyle = "rgba(255,210,210," + a + ")";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(l.x, 0);
        ctx.lineTo(l.x, state.height);
        ctx.stroke();
      }
    }

    for (const b of state.enemyBullets) {
      ctx.fillStyle = b.type === "homing" ? "#ffb17f" : "#ff6f8f";
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawParticles() {
    for (const p of state.particles) {
      if (p.text) {
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.font = "bold 14px Segoe UI";
        ctx.textAlign = "center";
        ctx.fillText(p.text, p.x, p.y);
        ctx.globalAlpha = 1;
        continue;
      }
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  function drawShieldShockwave() {
    if (state.shieldTimer > 0) {
      const a = 0.18 + 0.12 * Math.sin(performance.now() * 0.02);
      ctx.fillStyle = "rgba(130,220,255," + a + ")";
      ctx.beginPath();
      ctx.arc(state.player.x, state.player.y, 44, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(170,240,255,0.65)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(state.player.x, state.player.y, 44, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (state.shockwaveActive) {
      const alpha = clamp(1 - state.shockwaveRadius / (Math.max(state.width, state.height) * 1.1), 0, 1);
      ctx.strokeStyle = "rgba(255,214,122," + (0.75 * alpha) + ")";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(state.player.x, state.player.y, state.shockwaveRadius, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawEdgeGlow() {
    if (state.edgeGlow <= 0.001) return;
    const g = ctx.createRadialGradient(
      state.width * 0.5,
      state.height * 0.5,
      Math.min(state.width, state.height) * 0.28,
      state.width * 0.5,
      state.height * 0.5,
      Math.max(state.width, state.height) * 0.75
    );
    g.addColorStop(0, "rgba(0,0,0,0)");
    const c = state.edgeColor || "#8fd8ff";
    const a = clamp(state.edgeGlow, 0, 1) * 0.45;
    // simple rgb parsing fallback
    let rgba = "rgba(140,190,255," + a + ")";
    if (c[0] === "#" && c.length === 7) {
      const r = parseInt(c.slice(1, 3), 16);
      const gch = parseInt(c.slice(3, 5), 16);
      const b = parseInt(c.slice(5, 7), 16);
      rgba = "rgba(" + r + "," + gch + "," + b + "," + a + ")";
    }
    g.addColorStop(1, rgba);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, state.width, state.height);
  }

  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  function spawnSpark(x, y, color) {
    for (let i = 0; i < 8; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 45 + Math.random() * 130;
      state.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.24 + Math.random() * 0.2, maxLife: 0.44, alpha: 1, size: 1.6 + Math.random() * 2.8, color });
    }
  }

  function explode(x, y, color) {
    for (let i = 0; i < 20; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 80 + Math.random() * 210;
      state.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.46 + Math.random() * 0.26, maxLife: 0.72, alpha: 1, size: 2 + Math.random() * 4, color });
    }
  }
  function loop(ts) {
    if (!state.running) return;
    const dtRaw = Math.min(0.034, (ts - state.lastTs) / 1000);
    if (state.slowMoTimer > 0) {
      state.slowMoTimer = Math.max(0, state.slowMoTimer - dtRaw);
      state.timeScale = 0.42;
      if (state.slowMoTimer <= 0) state.timeScale = 1;
    }
    const dt = dtRaw * state.timeScale;
    state.lastTs = ts;
    update(dt);
    draw();
    if (state.running) requestAnimationFrame(loop);
  }

  function randomRange(min, max) { return min + Math.random() * (max - min); }
  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
  function circleHit(a, b) { return Math.hypot(a.x - b.x, a.y - b.y) <= a.radius + b.radius; }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = arr[i];
      arr[i] = arr[j];
      arr[j] = t;
    }
    return arr;
  }

  function triggerShake(amount) { state.shake = Math.max(state.shake, amount); }

  function unlockAudio() {
    if (state.sfx.unlocked) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    state.sfx.ctx = new AC();
    if (state.sfx.ctx.state === "suspended") state.sfx.ctx.resume();
    state.sfx.unlocked = true;
  }

  function beep(opts) {
    if (!state.sfx.ctx) return;
    const now = state.sfx.ctx.currentTime;
    const osc = state.sfx.ctx.createOscillator();
    const gain = state.sfx.ctx.createGain();
    osc.type = opts.type || "sine";
    osc.frequency.setValueAtTime(opts.freq || 220, now);
    if (opts.toFreq) osc.frequency.exponentialRampToValueAtTime(opts.toFreq, now + (opts.dur || 0.1));
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(opts.vol || 0.07, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + (opts.dur || 0.1));
    osc.connect(gain);
    gain.connect(state.sfx.ctx.destination);
    osc.start(now);
    osc.stop(now + (opts.dur || 0.1));
  }

  function sfxShoot() { beep({ type: "triangle", freq: 680, toFreq: 420, dur: 0.05, vol: 0.03 }); }
  function sfxHit() { beep({ type: "square", freq: 220, toFreq: 120, dur: 0.035, vol: 0.022 }); }
  function sfxExplode() { beep({ type: "sawtooth", freq: 140, toFreq: 55, dur: 0.19, vol: 0.06 }); }
  function sfxDamage() { beep({ type: "triangle", freq: 170, toFreq: 80, dur: 0.11, vol: 0.06 }); }
  function sfxSkill() { beep({ type: "sine", freq: 320, toFreq: 920, dur: 0.2, vol: 0.08 }); }
  function sfxUpgradeOpen() { beep({ type: "triangle", freq: 420, toFreq: 560, dur: 0.13, vol: 0.05 }); }
  function sfxUpgradePick() { beep({ type: "sine", freq: 620, toFreq: 820, dur: 0.16, vol: 0.06 }); }
  function sfxStart() { beep({ type: "triangle", freq: 500, toFreq: 780, dur: 0.14, vol: 0.05 }); }
  function sfxLose() { beep({ type: "sawtooth", freq: 220, toFreq: 90, dur: 0.35, vol: 0.08 }); }
  function sfxEnrage() { beep({ type: "sawtooth", freq: 260, toFreq: 460, dur: 0.22, vol: 0.075 }); }
  function sfxUltimate() { beep({ type: "square", freq: 180, toFreq: 860, dur: 0.3, vol: 0.085 }); }
  function sfxLeak() { beep({ type: "sawtooth", freq: 72, toFreq: 46, dur: 0.26, vol: 0.095 }); }

  function onPointerDown(e) {
    e.preventDefault();
    unlockAudio();
    state.touchActive = true;
    if (canvas.setPointerCapture) {
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { }
    }
    updatePointer(e);
  }

  function onPointerMove(e) {
    if (!state.touchActive) return;
    e.preventDefault();
    updatePointer(e);
  }

  function onPointerUp() { state.touchActive = false; }

  function updatePointer(e) {
    const rect = canvas.getBoundingClientRect();
    state.pointerX = e.clientX - rect.left;
    state.pointerY = e.clientY - rect.top;
  }

  canvas.addEventListener("pointerdown", onPointerDown, { passive: false });
  canvas.addEventListener("pointermove", onPointerMove, { passive: false });
  window.addEventListener("pointerup", onPointerUp, { passive: true });
  window.addEventListener("pointercancel", onPointerUp, { passive: true });
  window.addEventListener("resize", resize);

  actionBtn.addEventListener("click", function () {
    startGame();
  });

  skillBtn.addEventListener("click", function () {
    unlockAudio();
    activateSkill();
  });

  choiceButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      unlockAudio();
      applyReward(Number(btn.dataset.choice));
    });
  });

  resize();
  updateHud();
  updateSkillUi();
  draw();
})();

