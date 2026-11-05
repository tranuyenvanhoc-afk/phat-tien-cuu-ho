// Dựng landing.html ở thư mục gốc của kho từ source/design/.
// Chạy: node source/tools/build-site.js
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DESIGN = path.join(ROOT, 'design');
const SITE = path.join(ROOT, '..');
// Ảnh lưu ở assets/<id ảnh>.<đuôi>.
const ASSETS = path.join(SITE, 'assets');
const blobMap = Object.fromEntries(
  fs.readdirSync(ASSETS).map((f) => [path.parse(f).name, path.join(ASSETS, f)])
);

const PAGES = [
  { name: 'PTLanding', file: 'landing.html', title: 'Cứu hộ 24/7 Phát Tiến – Một đầu mối khi xe gặp sự cố' }
];
const COMPONENTS = ['PTKmCalc'];

function load(name) {
  const s = fs.readFileSync(path.join(DESIGN, name + '.dc.html'), 'utf8');
  const a = s.indexOf('<x-dc>') + '<x-dc>'.length;
  const b = s.lastIndexOf('</x-dc>');
  const script = (s.match(/data-dc-script[^>]*>([\s\S]*?)<\/script>/) || [])[1]
    || 'class Component extends DCLogic { renderVals() { return {}; } }';
  // Giá trị mặc định của các ô chỉnh sửa (data-props), VD: link YouTube.
  const props = {};
  const raw = (s.match(/data-props='([^']*)'/) || [])[1];
  if (raw) for (const [k, v] of Object.entries(JSON.parse(raw))) if (v && typeof v === 'object' && 'default' in v) props[k] = v.default;
  return { tpl: s.slice(a, b), script, props };
}

fs.mkdirSync(path.join(SITE, 'assets'), { recursive: true });

// Ảnh đã nằm sẵn trong assets/, chỉ cần lập bảng tên.
const blobs = {};
const missing = [];
for (const [id, src] of Object.entries(blobMap)) {
  if (!fs.existsSync(src)) { missing.push(id); continue; }
  const name = id + path.extname(src).toLowerCase();
  blobs[id] = 'assets/' + name;
}

const defs = {};
for (const n of [...PAGES.map((p) => p.name), ...COMPONENTS]) defs[n] = load(n);
const links = Object.fromEntries(PAGES.map((p) => [p.name, p.file]));

// Báo ảnh nào trong thiết kế chưa có file trên máy.
const used = new Set();
for (const d of Object.values(defs)) for (const m of d.tpl.matchAll(/\/_blob\/([0-9a-f]{32})/g)) used.add(m[1]);
const unmapped = [...used].filter((id) => !blobs[id]);

fs.copyFileSync(path.join(__dirname, 'runtime.js'), path.join(SITE, 'runtime.js'));
// Biểu tượng tab trình duyệt và màn hình chính iPhone/Android.
fs.copyFileSync(path.join(__dirname, 'icon.png'), path.join(SITE, 'icon.png'));
// Đổi tên phiên bản mỗi khi runtime.js thay đổi để điện thoại không dùng bản cũ trong bộ nhớ đệm.
const runtimeVer = require('crypto').createHash('md5').update(fs.readFileSync(path.join(__dirname, 'runtime.js'))).digest('hex').slice(0, 8);
const safe = (o) => JSON.stringify(o).replace(/</g, '\\u003c');
for (const p of PAGES) {
  const pageDefs = { [p.name]: defs[p.name] };
  for (const c of COMPONENTS) pageDefs[c] = defs[c];
  const html = `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#ffffff">
<meta name="format-detection" content="telephone=no">
<link rel="icon" type="image/png" href="icon.png">
<link rel="apple-touch-icon" href="icon.png">
<title>${p.title}</title>
</head>
<body style="margin:0">
<div id="app"></div>
<script>window.SITE = ${safe({ links, blobs })}; window.DEFS = ${safe(pageDefs)};</script>
<script src="runtime.js?v=${runtimeVer}"></script>
<script>bootPage(${JSON.stringify(p.name)});</script>
</body>
</html>
`;
  fs.writeFileSync(path.join(SITE, p.file), html);
}

console.log('Đã xuất', PAGES.length, 'trang vào', SITE);
if (missing.length) console.log('Thiếu file nguồn cho ảnh:', missing.join(', '));
if (unmapped.length) console.log('Ảnh trong thiết kế chưa có trên máy:', unmapped.join(', '));
