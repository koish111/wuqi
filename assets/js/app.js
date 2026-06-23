/* ============================================================
   Vue 3 应用入口 — 岁月武库 · 武器图鉴
   使用 Vue.createApp 管理所有渲染状态
============================================================ */
// Three.js 未初始化前的模型请求暂存（供 type="module" 脚本使用）
window.__pendingModel = null;
window.__pendingCamera = null;
window.loadWeaponModel = function(path, cameraConfig) { window.__pendingModel = path; window.__pendingCamera = cameraConfig; };

const { createApp } = Vue;

createApp({
  data() {
    return {
      weapons: [],
      activeId: null,
      stageActive: false,
      railVisible: false,
      hideTimer: null,
    };
  },

  computed: {
    activeWeapon() {
      return this.weapons.find(w => w.id === this.activeId) || null;
    },
    statRows() {
      const w = this.activeWeapon;
      if (!w) return [];
      return [
        { key: 'damage',  labelEn: 'DMG',  labelCn: '攻击伤害',
          html: w.stats.damage
            ? `<span class="num">${w.stats.damage}</span>基础攻击伤害`
            : '<span class="num">—</span>暂无数据' },
        { key: 'speed',   labelEn: 'SPD',  labelCn: '攻击速度',
          html: w.stats.attackSpeed
            ? `<span class="num">${w.stats.attackSpeed}</span>次 / 秒`
            : '<span class="num">—</span>暂无数据' },
        { key: 'active1', labelEn: 'ART',  labelCn: '绝技',
          html: this.skillHtml(w.skills?.active1) },
        { key: 'active2', labelEn: 'SKILL',labelCn: '战技',
          html: this.skillHtml(w.skills?.active2) },
        { key: 'passive1',labelEn: 'PAS·01',labelCn: '被动技能1',
          html: this.skillHtml(w.skills?.passive1) },
        { key: 'passive2',labelEn: 'PAS·02',labelCn: '被动技能2',
          html: this.skillHtml(w.skills?.passive2) },
      ];
    },
  },

  watch: {
    activeWeapon(weapon) {
      if (weapon) this.setTheme(weapon);
    },
  },

  methods: {
    selectWeapon(id) {
      if (id === this.activeId) return;
      const weapon = this.weapons.find(w => w.id === id);
      if (!weapon) return;

      this.activeId = id;
      this.stageActive = false;

      // 加载 3D 模型
      if (weapon.model && window.loadWeaponModel) {
        window.loadWeaponModel(weapon.model, weapon.camera);
      }

      // 延迟一帧重新触发入场动画
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          this.stageActive = true;
        });
      });
    },

    setTheme(weapon) {
      if (!weapon) return;
      const root = document.documentElement;
      root.style.setProperty('--theme-deep', weapon.theme.deep);
      root.style.setProperty('--theme-mid', weapon.theme.mid);
      root.style.setProperty('--theme-accent', weapon.theme.accent);
      root.style.setProperty('--theme-accent-soft',
        this.hexToRgba(weapon.theme.accent, 0.35));
    },

    hexToRgba(hex, alpha) {
      const h = hex.replace('#','');
      const r = parseInt(h.substring(0,2),16);
      const g = parseInt(h.substring(2,4),16);
      const b = parseInt(h.substring(4,6),16);
      return `rgba(${r},${g},${b},${alpha})`;
    },

    placeholderSrc(weapon) {
      const { accent, deep } = weapon.theme;
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="280" height="360" viewBox="0 0 280 360">
          <defs>
            <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="${accent}" stop-opacity="0.9"/>
              <stop offset="1" stop-color="${deep}" stop-opacity="0.9"/>
            </linearGradient>
          </defs>
          <rect x="20" y="20" width="240" height="320" rx="18" fill="none" stroke="${accent}" stroke-opacity="0.5" stroke-width="1.5" stroke-dasharray="6 8"/>
          <path d="M140 50 L160 180 L150 320 L130 320 L120 180 Z" fill="url(#g)" stroke="${accent}" stroke-width="2"/>
          <circle cx="140" cy="60" r="10" fill="${accent}"/>
          <text x="140" y="345" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="11" fill="${accent}" letter-spacing="2">IMAGE PLACEHOLDER</text>
        </svg>`;
      return "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svg)));
    },

    skillHtml(skill) {
      if (!skill) return '<span class="num">—</span>暂无数据';
      const lines = skill.desc.trim().split('\n').map(l => `<p>${l}</p>`).join('');
      return `<span class="skill-name">${skill.name}</span>${lines}`;
    },

    showRail() {
      this.railVisible = true;
      this.clearHideTimer();
      this.hideTimer = setTimeout(() => {
        this.railVisible = false;
      }, 1800);
    },

    clearHideTimer() {
      if (this.hideTimer) {
        clearTimeout(this.hideTimer);
        this.hideTimer = null;
      }
      this.railVisible = true;
    },

    startHideTimer() {
      this.clearHideTimer();
      this.hideTimer = setTimeout(() => {
        this.railVisible = false;
      }, 1800);
    },
  },

  mounted() {
    // 加载武器数据
    fetch('assets/data/weapons.json')
      .then(res => {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(data => {
        this.weapons = data;
        if (data.length) this.selectWeapon(data[0].id);
      })
      .catch(err => {
        console.warn('无法加载 weapons.json:', err);
      });

    // 鼠标移入移出检测，控制左侧按钮显隐
    window.addEventListener('mousemove', () => this.showRail());
    window.addEventListener('touchstart', () => this.showRail(), { passive: true });
  },
}).mount('#app');
