// Chạy các file thiết kế .dc.html như trang web thật: dựng HTML từ template,
// gắn sự kiện (onClick/onChange) và vẽ lại khi setState.
(function () {
  class DCLogic {
    constructor(props) { this.props = props || {}; this.state = {}; }
    setState(o) {
      this.state = Object.assign({}, this.state, typeof o === 'function' ? o(this.state) : o);
      if (this.__draw) this.__draw();
    }
    forceUpdate() { if (this.__draw) this.__draw(); }
  }

  const CFG = window.SITE || { links: {}, blobs: {} };
  const helmetDone = new Set();

  function get(scope, p) {
    p = p.trim();
    if (p === 'true') return true;
    if (p === 'false') return false;
    if (/^-?\d+(\.\d+)?$/.test(p)) return Number(p);
    return p.split('.').reduce((o, k) => (o == null ? undefined : o[k]), scope);
  }
  function holes(str, scope) {
    return str.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (m, p) => {
      const v = get(scope, p);
      return v == null || typeof v === 'function' ? '' : String(v);
    });
  }
  function whole(str, scope) {
    const m = str.match(/^\s*\{\{\s*([^}]+?)\s*\}\}\s*$/);
    return m ? get(scope, m[1]) : undefined;
  }
  function fixUrl(name, v) {
    if (name === 'src') {
      const m = v.match(/^\/_blob\/([0-9a-f]{32})/);
      if (m && CFG.blobs[m[1]]) return CFG.blobs[m[1]];
    }
    if (name === 'href') {
      const m = v.match(/^([A-Za-z0-9_-]+)\.dc\.html(#.*)?$/);
      if (m && CFG.links[m[1]]) return CFG.links[m[1]] + (m[2] || '');
    }
    return v;
  }

  function render(node, scope, out, ctx) {
    for (const ch of [...node.childNodes]) {
      if (ch.nodeType === 3) { out.appendChild(document.createTextNode(holes(ch.textContent, scope))); continue; }
      if (ch.nodeType !== 1) continue;
      const t = ch.localName;
      if (t === 'sc-for') {
        const list = whole(ch.getAttribute('list'), scope) || [];
        const as = ch.getAttribute('as');
        list.forEach((it, i) => render(ch, Object.assign({}, scope, { [as]: it, $index: i }), out, ctx));
        continue;
      }
      if (t === 'sc-if') { if (whole(ch.getAttribute('value'), scope)) render(ch, scope, out, ctx); continue; }
      if (t === 'helmet') {
        if (!helmetDone.has(ctx.name)) {
          helmetDone.add(ctx.name);
          for (const h of [...ch.children]) document.head.appendChild(h.cloneNode(true));
        }
        continue;
      }
      if (t === 'dc-import') {
        const name = ch.getAttribute('name');
        let kid = ctx.children[name];
        if (!kid) { kid = document.createElement('div'); mount(name, kid); ctx.children[name] = kid; }
        out.appendChild(kid);
        continue;
      }
      const el = document.createElementNS(ch.namespaceURI, ch.localName);
      let selectValue;
      for (const a of ch.attributes) {
        if (/^on/i.test(a.name)) {
          const fn = whole(a.value, scope);
          if (typeof fn === 'function') {
            const n = a.name.toLowerCase();
            const ev = n === 'onclick' ? 'click' : n === 'onchange' ? (ch.localName === 'select' ? 'change' : 'input') : n.slice(2);
            el.addEventListener(ev, fn);
          }
          continue;
        }
        const v = fixUrl(a.name, holes(a.value, scope));
        if (a.name === 'value' && ch.localName === 'select') { selectValue = v; continue; }
        if (a.name === 'value' && ch.localName === 'input') el.value = v;
        el.setAttribute(a.name, v);
      }
      render(ch.localName === 'template' ? ch.content : ch, scope, el, ctx);
      if (selectValue !== undefined) el.value = selectValue;
      out.appendChild(el);
    }
  }

  function mount(name, container) {
    const def = window.DEFS[name];
    const C = new Function('DCLogic', def.script + '\n;return Component;')(DCLogic);
    const inst = new C(Object.assign({}, def.props));
    const tpl = document.createElement('template');
    tpl.innerHTML = def.tpl;
    const ctx = { name, children: {} };
    inst.__draw = () => {
      const act = document.activeElement;
      const focusId = act && container.contains(act) ? act.id : null;
      const sel = focusId && 'selectionStart' in act ? [act.selectionStart, act.selectionEnd] : null;
      // Giữ nội dung người dùng đã nhập ở các ô không gắn giá trị từ template.
      const typed = {};
      container.querySelectorAll('input[id], textarea[id], select[id]').forEach((f) => { typed[f.id] = f.value; });
      container.textContent = '';
      render(tpl.content, inst.renderVals(), container, ctx);
      for (const [id, v] of Object.entries(typed)) {
        const f = document.getElementById(id);
        if (f && container.contains(f) && f.getAttribute('value') === null) f.value = v;
      }
      if (focusId) {
        const again = document.getElementById(focusId);
        if (again) { again.focus(); try { if (sel) again.setSelectionRange(sel[0], sel[1]); } catch (e) { /* number input */ } }
      }
    };
    inst.__draw();
    if (inst.componentDidMount) inst.componentDidMount();
  }

  window.bootPage = function (name) {
    mount(name, document.getElementById('app'));
    if (location.hash) { const t = document.getElementById(location.hash.slice(1)); if (t) t.scrollIntoView(); }
  };
})();
