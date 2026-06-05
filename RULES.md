# Mind Clash — Luật Chơi Hiện Tại

> Tài liệu này mô tả đúng theo code hiện tại. Không có nội dung đề xuất hay cải tiến.

---

## Tổng quan

- 1v1, đồng thời: cả hai bí mật chọn nước đi, tiết lộ cùng lúc
- Thắng khi đối thủ về 0 mạng
- Bắt đầu: **3 mạng**, **0 đạn**

---

## Trước ván: Chọn Augment

- Cả hai nhận cùng một bộ 3 augment random
- Mỗi người chọn 1, không thấy lựa chọn của nhau cho đến khi cả hai đã chọn xong
- Augment được áp dụng ngay khi cả hai đã chọn, trước lượt 1
- Hết 15 giây chưa chọn → tự động chọn ngẫu nhiên

---

## Nước đi

### Hệ Vàng

| Quân | Chi phí | Thắng | Thua | Hòa |
|------|---------|-------|------|-----|
| 🔋 Nạp Đạn | 0 | Mìn | Súng, Móc, Shotgun, Zombie, Magic Hand | Nạp, Kíp, Khiên, Kéo, Siêu Khiên |
| 💣 Mìn | 0 | Zombie, Magic Hand | Nạp, Kíp, Khiên, Súng, Móc, Kéo, Shotgun, Siêu Khiên | Mìn |

### Hệ Xanh

| Quân | Chi phí | Thắng | Thua | Hòa |
|------|---------|-------|------|-----|
| 🛡️ Khiên | 0 | Mìn | Móc, Magic Hand | Nạp, Kíp, Súng, Kéo, Shotgun, Zombie, Siêu Khiên, Khiên |
| 🧨 Kíp | 0 | Súng, Shotgun, Mìn | Zombie, Magic Hand | Nạp, Khiên, Móc, Kéo, Siêu Khiên, Kíp |
| ✂️ Kéo | 1 | Shotgun, Zombie, Mìn | Magic Hand | Nạp, Kíp, Khiên, Súng, Móc, Siêu Khiên, Kéo |

### Hệ Đỏ

| Quân | Chi phí | Thắng | Thua | Hòa |
|------|---------|-------|------|-----|
| 🔫 Súng | 1 | Nạp, Mìn, Móc | Kíp, Shotgun, Zombie, Magic Hand | Khiên, Kéo, Súng, Siêu Khiên |
| 🪝 Móc | 1 | Nạp, Mìn, Khiên | Súng, Shotgun, Zombie, Magic Hand | Kíp, Kéo, Móc, Siêu Khiên |
| 🔥 Shotgun | 2 | Nạp, Mìn, Súng, Móc | Kíp, Kéo, Zombie, Magic Hand | Khiên, Shotgun, Siêu Khiên |
| 🧟 Zombie | 3 | Nạp, Kíp, Súng, Móc, Shotgun | Mìn, Kéo, Magic Hand | Khiên, Zombie, Siêu Khiên |

### Hệ Đặc Biệt

| Quân | Chi phí | Thắng | Thua | Hòa |
|------|---------|-------|------|-----|
| ⚡ Siêu Khiên | 2 | Mìn | — | Tất cả còn lại (kể cả Magic Hand) |
| ✋ Magic Hand | 5 | Nạp, Kíp, Khiên, Súng, Móc, Kéo, Shotgun, Zombie | Mìn | Siêu Khiên, Magic Hand |

### Hòa cùng nước
- Nạp vs Nạp: cả hai +1 đạn
- Hai nước tốn đạn vs nhau (cùng nước): cả hai mất số đạn chi phí của nước đó, không mất mạng
- Các nước 0 đạn vs nhau (cùng nước): không có gì xảy ra

---

## Cơ chế Nạp Đạn

- Lần nạp đầu tiên (hoặc sau khi bị ngắt streak): +1 đạn
- Nạp liên tiếp lần 2 trở đi: +2 đạn mỗi lần
- Sau 2 lần nạp liên tiếp: bị **cooldown** — lượt kế không thể chọn Nạp Đạn
- Cooldown được xóa ngay sau lượt đó (chỉ kéo dài 1 lượt)
- Bất kỳ nước đi nào khác Nạp Đạn sẽ reset streak về 0

---

## Time Bank

- Mỗi người có **15 giây** tích lũy cho toàn bộ ván (không phải per-lượt)
- Khi submit nước đi: thời gian đã trôi qua kể từ đầu lượt bị trừ khỏi bank
- Người submit **trước** trong lượt: +1.0s hoàn lại vào bank
- Người submit **sau** trong lượt: +0.5s hoàn lại vào bank
- Server kiểm tra timeout mỗi 100ms: nếu `timeBank - elapsed ≤ 0` → timeout
- Khi timeout: người đó mất 1 mạng, lượt đó bị bỏ qua (không có nước đi nào được tính), bank của cả hai reset về 15.0s

---

## Augments

Áp dụng ngay trước lượt 1. Cả hai thấy augment của nhau sau khi đã chọn xong.

| Augment | Hiệu ứng chính xác |
|---------|-------------------|
| ⚡ Tăng Tốc | Đối thủ bắt đầu với 7.5s bank (thay vì 15s) |
| 🐢 Giảm Tốc | Bản thân bắt đầu với 22.5s bank (thay vì 15s) |
| ❤️ Thêm Mạng | Bản thân bắt đầu với 4 mạng |
| 💔 Yếu Đối Thủ | Đối thủ bắt đầu với 2 mạng (nếu đã có ít hơn 2 thì giữ nguyên) |
| 💣 Đạn Ngay | Bản thân: +1 đạn ngay, −1 mạng (còn 2 mạng); đến lượt `(lượt chọn augment + 3)`: +3 đạn tự động |
| 🏆 Bền Lâu | Đúng lượt 10: +2 mạng cho bản thân |

**Lưu ý về tương tác augment:**
- Nếu cả hai cùng chọn augment ảnh hưởng đến cùng một chỉ số (ví dụ: một người chọn Tăng Tốc, người kia chọn Giảm Tốc), cả hai đều được áp dụng độc lập — không triệt tiêu nhau
- Bullet_start bị ghi đè: lives được set thành `lives - 1`, không phải set cứng về 2 (nên nếu Yếu Đối Thủ đã làm đối thủ còn 2 mạng, Bullet Start sẽ còn 1 mạng)

---

## Kết thúc ván

- Kiểm tra game over sau mỗi lượt resolve: nếu `lives ≤ 0` → game over
- Nếu cả hai về 0 cùng lúc: hòa (`winner: null`)
- Timeout cũng có thể gây game over nếu mạng về 0
- Sau game over: có thể chọn Đấu lại (cần cả hai đồng ý) hoặc Về sảnh

---

## Ma trận đầy đủ

Đọc theo hàng: hàng = nước của bạn, cột = nước của đối thủ.

|  | nap | min | kip | khien | sung | moc | keo | shotgun | zombie | sieu_khien | magic_hand |
|--|-----|-----|-----|-------|------|-----|-----|---------|--------|------------|------------|
| **nap** | draw | win | draw | draw | lose | lose | draw | lose | lose | draw | lose |
| **min** | lose | draw | lose | lose | lose | lose | lose | lose | win | lose | win |
| **kip** | draw | win | draw | draw | win | draw | draw | win | lose | draw | lose |
| **khien** | draw | win | draw | draw | draw | lose | draw | draw | draw | draw | lose |
| **sung** | win | win | lose | draw | draw | win | draw | lose | lose | draw | lose |
| **moc** | win | win | draw | win | lose | draw | draw | lose | lose | draw | lose |
| **keo** | draw | win | draw | draw | draw | draw | draw | win | win | draw | lose |
| **shotgun** | win | win | lose | draw | win | win | lose | draw | lose | draw | lose |
| **zombie** | win | lose | win | draw | win | win | lose | win | draw | draw | lose |
| **sieu_khien** | draw | win | draw | draw | draw | draw | draw | draw | draw | draw | draw |
| **magic_hand** | win | lose | win | win | win | win | win | win | win | draw | draw |
