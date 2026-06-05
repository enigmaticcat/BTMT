# Mind Clash — Đề Xuất Cải Tiến

> Tài liệu này chỉ gồm các cải tiến chưa có trong code. Không mô tả lại luật hiện tại.
> Tham chiếu luật hiện tại: xem RULES.md

---

## 1. Cân bằng augment

### Yếu Đối Thủ (weak_opponent)
**Vấn đề:** Đưa đối thủ về 2 mạng tương đương 1 lượt thắng miễn phí — mạnh hơn hẳn các augment còn lại.

**Đề xuất (chọn 1):**
- A: Giảm còn 2 mạng nhưng thêm downside: bản thân cũng chỉ có 2 mạng (symmetric)
- B: Giữ nguyên 2 mạng nhưng đối thủ nhận +2 đạn bù — tạo trade-off tài nguyên vs mạng
- C: Đổi thành "đối thủ bắt đầu mất 1 mạng khi thua lượt đầu tiên" (delay effect)

### Bền Lâu (long_game)
**Vấn đề:** Ngưỡng lượt 10 quá muộn — ván thường kết thúc trước đó.

**Đề xuất:** Giảm ngưỡng xuống lượt 7, hoặc đổi thành "+1 mạng mỗi 5 lượt sống sót".

---

## 2. Hiệu ứng nội tại từng quân

Hiện tại không có quân nào có hiệu ứng phụ — thắng/thua chỉ ảnh hưởng mạng và đạn chi phí. Đề xuất thêm hiệu ứng nội tại cho từng quân khi thắng:

| Quân | Hiệu ứng khi thắng | Lý do |
|------|--------------------|-------|
| 💣 Mìn | Đối thủ mất 2 mạng thay vì 1 | Xứng với rủi ro đặt bẫy; tăng giá trị thực chiến |
| 🔋 Nạp bị tấn công | Mất mạng nhưng giữ đạn vừa nạp | Giảm "mất trắng", khuyến khích nạp dù bị đọc |
| 🧨 Kíp phản | Đối thủ mất mạng + mất toàn bộ đạn đã bỏ ra | Phản công có ý nghĩa kinh tế rõ ràng |
| 🛡️ Khiên đỡ thành công | +1 đạn lượt sau | Phòng thủ tốt có thưởng, Khiên không còn "vô ích" hoàn toàn |
| 🪝 Móc thắng | Lấy 1 đạn từ đối thủ sang mình | Phân biệt Móc với Súng (cùng 1 đạn nhưng khác vai trò) |
| 🔥 Shotgun thắng | Đối thủ mất thêm 1 đạn | Phá vỡ tích lũy, tăng giá trị so với Súng |
| 🧟 Zombie thắng | Đối thủ bị choáng: lượt sau chỉ dùng được nước 0 đạn | Xứng với chi phí 3 đạn |
| ⚡ Siêu Khiên đỡ đòn ≥ 2 đạn | Hoàn lại 1 đạn | Giảm downside kinh tế khi đỡ được đòn đắt |
| ✋ Magic Hand thắng | Đối thủ không dùng được nước đắt nhất lượt sau | Xứng với chi phí 5 đạn |

**Lưu ý triển khai:** Hiệu ứng choáng của Zombie cần thêm trường `debuff` vào player state. Debuff được kiểm tra đầu lượt kế, tự xóa sau 1 lượt.

---

## 3. Combo Chain — Chuỗi đòn

Thưởng cho việc đọc đúng đối thủ liên tiếp. Cần thêm `winStreak` và `loseStreak` vào player state.

### Streak thắng
| Điều kiện | Phần thưởng |
|-----------|-------------|
| Thắng 2 lượt liên tiếp | Lượt 3 được dùng 1 nước miễn phí (cost = 0 cho lượt đó) |
| Thắng 2 lượt liên tiếp bằng cùng một hệ | Nước đó được buff nhẹ lượt tiếp — chỉ áp dụng hệ Đỏ, không áp dụng Kíp (Kíp đã có hiệu ứng nội tại mạnh) |

### Comeback mechanic
| Điều kiện | Phần thưởng |
|-----------|-------------|
| Thua 2 lượt liên tiếp | +1 đạn miễn phí (giảm khoảng cách, không xoay ngược lợi thế) |

**Lưu ý:** Streak reset về 0 khi thua. Hòa không reset, không tăng streak.

---

## 4. Resource Conversion — Chuyển đổi tài nguyên

Cho phép đổi mạng ↔ đạn. Đề xuất xảy ra **sau khi resolve** (không phải thay thế nước đi) để tránh "bỏ lượt bị đọc hoàn toàn":

> Sau khi kết quả lượt được tiết lộ, người thắng có thể chọn: lấy mạng như bình thường, hoặc lấy đạn thay thế.

| Hành động | Chi phí | Nhận |
|-----------|---------|------|
| Từ chối lấy mạng, lấy đạn thay | Không lấy mạng của đối thủ | +3 đạn cho bản thân |
| Đổi đạn lấy mạng (bất kỳ lúc nào trong lượt chọn) | 3 đạn | +1 mạng |

**Lý do thiết kế:** Nếu Conversion thay thế nước đi (bỏ lượt), đối thủ biết chắc bạn không tấn công — phá vỡ yếu tố bí mật cốt lõi. Xử lý sau resolve giữ được tính đồng thời.

---

## 5. Cấu trúc hệ — làm rõ để UI hỗ trợ onboarding

Hiện tại nhóm màu (`group`) có trong data nhưng chưa được dùng để dạy người chơi. Đề xuất dùng hệ để xây dựng tooltip/hướng dẫn theo logic:

```
Đỏ thắng Vàng → Xanh thắng Đỏ → Vàng (Mìn) thắng Đặc Biệt → Đặc Biệt thắng Xanh/Đỏ
```

Không cần thay đổi MATRIX, chỉ cần UI hiển thị "thắng X, thua Y" khi hover vào từng quân — thay vì để người chơi tự nhớ ma trận 11×11.

---

## 6. Câu hỏi mở — cần quyết định trước khi implement

- [ ] Yếu Đối Thủ: chọn phương án A, B hay C?
- [ ] Debuff choáng của Zombie: nếu đối thủ đang bị choáng mà dùng Resource Conversion thì thoát được debuff không?
- [ ] Combo Chain buff hệ: Súng thắng lần 2 lấy 2 mạng — có quá mạnh khi kết hợp với Kíp phản không?
- [ ] Winstreak reset khi hòa không?
- [ ] Debuff của Magic Hand (khóa nước đắt nhất) và choáng của Zombie có thể stack không?
