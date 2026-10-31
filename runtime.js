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
        if (!kid) { kid = document.createElement('div'); kid.__kid = true; mount(name, kid); ctx.children[name] = kid; }
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
            (el.__ls = el.__ls || []).push([ev, fn]);
          }
          continue;
        }
        const v = fixUrl(a.name, holes(a.value, scope));
        if (a.name === 'value' && ch.localName === 'select') { selectValue = v; continue; }
        if (a.name === 'value' && ch.localName === 'input') el.value = v;
        el.setAttribute(a.name, v);
      }
      render(ch.localName === 'template' ? ch.content : ch, scope, el, ctx);
      if (selectValue !== undefined) { el.value = selectValue; el.__val = selectValue; }
      out.appendChild(el);
    }
  }

  // Cập nhật cây cũ theo cây mới thay vì dựng lại, để ô đang chọn/đang kéo
  // (select, thanh trượt, ô nhập) không bị thay mới giữa chừng trên điện thoại.
  function same(a, b) {
    return a.nodeType === b.nodeType && a.nodeName === b.nodeName &&
      (a.nodeName !== 'INPUT' || a.getAttribute('type') === b.getAttribute('type'));
  }
  function patch(a, b) {
    if (a.nodeType === 3) { if (a.textContent !== b.textContent) a.textContent = b.textContent; return; }
    for (const at of [...a.attributes]) if (!b.hasAttribute(at.name)) a.removeAttribute(at.name);
    for (const at of b.attributes) if (a.getAttribute(at.name) !== at.value) a.setAttribute(at.name, at.value);
    for (const [ev, fn] of a.__ls || []) a.removeEventListener(ev, fn);
    for (const [ev, fn] of b.__ls || []) a.addEventListener(ev, fn);
    a.__ls = b.__ls;
    patchChildren(a, b);
    if (a.nodeName === 'INPUT' && b.hasAttribute('value') && a.value !== b.value) a.value = b.value;
    if (a.nodeName === 'SELECT' && b.__val !== undefined && a.value !== b.__val) a.value = b.__val;
  }
  function patchChildren(oldP, newP) {
    const kids = [...newP.childNodes];
    kids.forEach((n, i) => {
      const o = oldP.childNodes[i];
      if (n.__kid) { if (o !== n) oldP.insertBefore(n, o || null); return; }
      if (!o) oldP.appendChild(n);
      else if (same(o, n)) patch(o, n);
      else oldP.replaceChild(n, o);
    });
    while (oldP.childNodes.length > kids.length) oldP.removeChild(oldP.lastChild);
  }

  function mount(name, container) {
    const def = window.DEFS[name];
    const C = new Function('DCLogic', def.script + '\n;return Component;')(DCLogic);
    const inst = new C(Object.assign({}, def.props));
    const tpl = document.createElement('template');
    tpl.innerHTML = def.tpl;
    const ctx = { name, children: {} };
    inst.__draw = () => {
      const next = document.createElement('div');
      render(tpl.content, inst.renderVals(), next, ctx);
      patchChildren(container, next);
    };
    inst.__draw();
    if (inst.componentDidMount) inst.componentDidMount();
  }

  window.bootPage = function (name) {
    mount(name, document.getElementById('app'));
    if (location.hash) { const t = document.getElementById(location.hash.slice(1)); if (t) t.scrollIntoView(); }
  };
})();
