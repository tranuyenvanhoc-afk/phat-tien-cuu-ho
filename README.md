# Landing page Cứu hộ 24/7 – Phát Tiến Holding

Một trang duy nhất, dùng chung cho máy tính và điện thoại (tự đổi bố cục khi màn hình từ 760px trở xuống).

- Xem trực tiếp: https://tranuyenvanhoc-afk.github.io/phat-tien-cuu-ho/landing.html

## Lấy dự án về máy

Cần cài [Git](https://git-scm.com/downloads) và [Node.js](https://nodejs.org) (bản 18 trở lên). Không cần cài thêm thư viện nào.

```bash
git clone https://github.com/tranuyenvanhoc-afk/phat-tien-cuu-ho.git
cd phat-tien-cuu-ho
```

Không dùng Git thì bấm **Code → Download ZIP** trên trang GitHub của dự án, rồi giải nén.

## Chạy thử trên máy

```bash
node source/tools/serve.js
```

Mở http://localhost:5180/landing.html

Muốn xem bản điện thoại trên máy tính: trong Chrome nhấn `F12`, rồi `Ctrl+Shift+M` và chọn khổ điện thoại.

## Sửa nội dung

| Muốn sửa | Mở file |
|---|---|
| Nội dung và giao diện landing | `source/design/PTLanding.dc.html` |
| Công cụ ước tính chi phí | `source/design/PTKmCalc.dc.html` |
| Link clip YouTube | `videoUrl` trong `source/design/PTLanding.dc.html` |
| Link gửi form về Google Sheet | `SHEET_URL` trong `source/design/PTLanding.dc.html` |
| Script nhận form trên Google Sheet | `source/tools/google-sheet-form.gs` |

Ảnh nằm trong `assets/`, tên file là mã ảnh. Trong thiết kế, ảnh được ghi dạng `/_blob/<mã ảnh>`.

Giao diện điện thoại nằm trong các khối `@media (max-width:760px)` ở đầu `PTLanding.dc.html`. Các khối viết sau sẽ đè lên khối viết trước.

Sửa xong thì dựng lại `landing.html` rồi tải lại trang:

```bash
node source/tools/build-site.js
```

Đừng sửa trực tiếp `landing.html`, vì file này được tạo ra từ thiết kế và sẽ bị ghi đè khi dựng lại.

## Đưa bản mới lên web

Trang được GitHub Pages phục vụ từ nhánh `main`. Người có quyền ghi vào kho chỉ cần:

```bash
git add landing.html runtime.js source
git commit -m "Mô tả thay đổi"
git push
```

Khoảng 1 phút sau trang web tự cập nhật. Chưa có quyền ghi thì nhờ chủ kho thêm vào mục Collaborators, hoặc tạo fork rồi gửi pull request.

## Form đăng ký

Form đang gửi về Google Sheet của chủ dự án qua link `SHEET_URL`. Khi chạy thử trên máy, form vẫn ghi vào Sheet thật, nên đừng gửi thử bằng số điện thoại của khách.

Muốn đổi sang Sheet khác:

1. Trong Google Sheet mới, vào **Tiện ích mở rộng → Apps Script**, xóa hết code cũ và dán nội dung `source/tools/google-sheet-form.gs`. Đổi `SHEET_ID` thành mã của Sheet đó.
2. Vào **Triển khai → Tùy chọn triển khai mới → Ứng dụng web**, chọn **Thực thi với tư cách: Tôi** và **Người có quyền truy cập: Bất kỳ ai**.
3. Dán link kết thúc bằng `/exec` vào `SHEET_URL`, dựng lại và đưa lên web.

Sheet chứa số điện thoại khách hàng, nên để ở chế độ **Bị hạn chế**, không chia sẻ công khai. Form vẫn ghi được vì script chạy bằng tài khoản của chủ Sheet.

## Các file khác trong kho

`index.html`, `dai-ly.html`, `gioi-thieu.html`, `hinh-anh.html` và `bang-gia.html` thuộc web 5 trang, không nằm trong phần dựng của landing. Mã nguồn thiết kế của chúng không có trong kho này.
