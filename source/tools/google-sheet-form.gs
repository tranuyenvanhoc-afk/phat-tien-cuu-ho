// Nhận thông tin từ form "Nhận Tư Vấn Gói Cứu hộ 24/7" và ghi vào Google Sheet.
// Dán vào Google Sheet: Tiện ích mở rộng > Apps Script, rồi triển khai thành Ứng dụng web.
const SHEET_ID = '1sfeU-DjQkQtOBPlJPW-nO_uXv1_qXOmDgVR6aON7ph0';
const HEADERS = ['Thời gian', 'Họ và tên', 'Số điện thoại', 'Loại xe', 'Ghi chú', 'Nguồn'];

function reply(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

// Giữ nguyên số 0 đầu số điện thoại, và không để nội dung khách nhập chạy thành công thức.
function clean(value, max) {
  const text = String(value || '').trim().slice(0, max);
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function doPost(e) {
  const p = (e && e.parameter) || {};
  const name = clean(p.name, 120);
  const phone = String(p.phone || '').replace(/[\s.\-]/g, '');
  // Ô ẩn "website" chỉ máy dò mới điền: báo thành công nhưng không ghi.
  if (p.website) return reply({ ok: true });
  if (!name || !/^0\d{9,10}$/.test(phone)) return reply({ ok: false, error: 'invalid' });

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheets()[0];
    if (sheet.getLastRow() === 0 || sheet.getRange(1, 1).getValue() !== HEADERS[0]) {
      sheet.insertRowBefore(1);
      sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold');
    }
    sheet.appendRow([
      Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy HH:mm:ss'),
      name,
      "'" + phone,
      clean(p.car, 120),
      clean(p.note, 1000),
      clean(p.source, 120)
    ]);
  } finally {
    lock.releaseLock();
  }
  return reply({ ok: true });
}
