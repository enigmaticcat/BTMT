# Mind Clash — Đề Xuất Cải Tiến

> Tài liệu này chỉ gồm các cải tiến so với code hiện tại. Không mô tả lại luật hiện tại.
> Tham chiếu luật hiện tại: xem RULES.md
> Tham chiếu thiết kế đầy đủ: xem GAMEPLAY.md

---

## 1. Thay hệ mạng rời rạc bằng HP liên tục

**Thay đổi lớn nhất.** Hiện tại mỗi lượt thua = mất 1 mạng cố định. Đề xuất chuyển sang HP liên tục với damage khác nhau theo vũ khí.

| Thông số | Giá trị cũ | Giá trị mới |
|----------|-----------|------------|
| Đơn vị sức khỏe | 3 mạng | 100 HP |
| Súng | −1 mạng | −20 HP |
| Móc | −1 mạng | −15 HP + cướp 1 đạn |
| Kéo | −1 mạng | −10 HP |
| Shotgun | −1 mạng | −35 HP + đối thủ mất 1 đạn |
| Zombie | −1 mạng | −50 HP + choáng 1 lượt |
| Magic Hand | −1 mạng | −70 HP + khóa nước đắt nhất |
| Mìn trúng | −1 mạng đối thủ | −60 HP đối thủ |
| Mìn tự nổ | −1 mạng bản thân | −25 HP bản thân |
| Timeout | −1 mạng | −20 HP |

**Lý do:** Tạo ra sự khác biệt rõ ràng giữa các vũ khí; ván đấu có cảm giác dồn dập hơn khi HP thấp dần thay vì mất từng mạng cứng nhắc.

---

## 2. Hệ thống phòng thủ mới (damage reduction)

Hiện tại Khiên chặn hoàn toàn (hòa = 0 damage). Với hệ HP liên tục, cần cơ chế mới.

| Vũ khí | Cơ chế mới |
|--------|-----------|
| 🛡️ Khiên | Giảm 60% damage từ hệ Đỏ (trừ Móc); vẫn thua Móc và Magic Hand |
| ⚡ Siêu Khiên | Giảm 100% damage từ mọi nguồn; thua Mìn |

**Hiệu ứng thêm:**
- Khiên đỡ thành công → +1 đạn lượt sau
- Siêu Khiên đỡ đòn tốn ≥ 2 đạn → hoàn lại 1 đạn

---

## 3. Kíp — cơ chế phản đòn với damage

Hiện tại Kíp thắng = đối thủ mất 1 mạng. Đề xuất: phản lại **80% damage gốc** của đòn bị phản, đồng thời đối thủ mất toàn bộ đạn đã bỏ ra.

| Đòn bị phản | Damage gốc | Damage phản lại | Đạn mất |
|-------------|-----------|----------------|---------|
| Súng | 20 | 16 | 1 |
| Shotgun | 35 | 28 | 2 |

**Lý do 80% thay vì 100%:** Kíp miễn phí — nếu phản nguyên thì quá mạnh.

---

## 4. Hiệu ứng nội tại từng quân

Thêm vào từng quân một hiệu ứng phụ xảy ra khi thắng, ảnh hưởng trạng thái game:

| Quân | Hiệu ứng khi thắng |
|------|--------------------|
| 🪝 Móc | Cướp 1 đạn từ đối thủ |
| 🔥 Shotgun | Đối thủ mất thêm 1 đạn |
| 🧟 Zombie | Đối thủ bị choáng: lượt sau chỉ dùng được nước 0 đạn |
| ✋ Magic Hand | Đối thủ không dùng được nước đắt nhất lượt sau |
| 🛡️ Khiên (đỡ thành công) | +1 đạn lượt sau |
| ⚡ Siêu Khiên (đỡ đòn ≥2đ) | Hoàn lại 1 đạn |
| 🔋 Nạp bị tấn công | Nhận damage nhưng giữ đạn vừa nạp |

**Cần thêm vào player state:** trường `debuff: 'stun' | 'lock' | null` — kiểm tra đầu lượt, tự xóa sau 1 lượt.

---

## 5. Augments — điều chỉnh sang hệ HP

Augment hiện tại dùng khái niệm "mạng" cần đổi sang HP:

| Augment | Cũ | Mới |
|---------|-----|-----|
| ❤️ Thêm Mạng | +1 mạng (4 mạng) | Bắt đầu 130 HP |
| 💔 Yếu Đối Thủ | Đối thủ 2 mạng | Đối thủ bắt đầu 70 HP |
| 💣 Đạn Ngay | +1đ, −1 mạng | +1đ, bắt đầu 80 HP; lượt 3 +3đ |
| 🏆 Bền Lâu | Lượt 10: +2 mạng | Lượt 7: +30 HP |

**Vấn đề cần quyết định:** Yếu Đối Thủ (70 HP) vẫn có thể quá mạnh — cân nhắc thêm downside cho người chọn (ví dụ: bản thân cũng chỉ 80 HP).

---

## 6. Combo Chain — Chuỗi đòn

Cần thêm `winStreak` và `loseStreak` vào player state.

| Điều kiện | Phần thưởng |
|-----------|-------------|
| Thắng 2 lượt liên tiếp | Lượt 3: 1 nước miễn phí (cost = 0) |
| Thắng 2 lượt liên tiếp cùng hệ Đỏ | Damage nước đó +10 lượt tiếp |
| Thua 2 lượt liên tiếp | +1 đạn miễn phí (comeback) |

Streak reset khi thua. Hòa không reset, không tăng.

---

## 7. Resource Conversion — Chuyển đổi tài nguyên

Xảy ra sau khi resolve lượt (không thay thế nước đi — giữ tính đồng thời).

| Hành động | Chi phí | Nhận |
|-----------|---------|------|
| HP → Đạn | −20 HP | +3 đạn |
| Đạn → HP | −3 đạn | +20 HP |

---

## 8. Thứ tự xử lý lượt mới (so với hiện tại)

Cần thay đổi `resolveTurn()` trong `server/core/gameLogic.js`:

```
Hiện tại:
  1. Trừ đạn chi phí
  2. Tra MATRIX → thắng/thua/hòa
  3. Trừ mạng nếu thua
  4. Cộng đạn nếu nạp
  5. Cập nhật cooldown/streak nạp
  6. Kiểm tra augment (long_game, bullet_start)

Cần thêm/sửa:
  2b. Kiểm tra debuff trước khi cho phép nước đi
  3.  Thay "trừ mạng" bằng "trừ HP theo damage + hệ số phòng thủ"
  3b. Áp dụng hiệu ứng nội tại (cướp đạn, choáng, khóa nước, hoàn đạn)
  3c. Áp dụng Combo Chain
  3d. Xử lý Resource Conversion nếu có
  5b. Xóa debuff đã hết hạn
```

---

## 9. Câu hỏi mở — cần quyết định trước khi implement

- [ ] **Yếu Đối Thủ:** 70 HP có đủ không, hay thêm downside cho người chọn?
- [ ] **Mìn tự nổ:** 25 HP có đủ deterrent không?
- [ ] **Debuff stack:** choáng (Zombie) và lock (Magic Hand) có thể cùng tồn tại không?
- [ ] **Combo Chain +10 damage:** có quá mạnh với Shotgun (35→45) không?
- [ ] **Resource Conversion:** cho phép dùng nhiều lần trong 1 lượt không?
- [ ] **Timeout:** 20 HP damage có phù hợp không?
