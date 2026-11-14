# Midtrans Sandbox — NusantaraGift

Dokumen ini menyiapkan konfigurasi untuk integrasi Midtrans Snap Sandbox.
Akun Midtrans Nagala Education tetap terpisah; gunakan kredensial merchant
NusantaraGift yang baru.

## 1. Ambil Sandbox Access Keys

1. Login ke Midtrans Dashboard: https://dashboard.midtrans.com/login
2. Pastikan environment di dashboard sedang **Sandbox** (bukan Production).
3. Buka **Settings → Access Keys**.
4. Salin:
   - **Server Key** — rahasia, hanya untuk backend.
   - **Client Key** — boleh digunakan pada frontend untuk Snap.js.
5. Merchant ID boleh disimpan untuk referensi/support, tetapi belum dibutuhkan oleh konfigurasi aplikasi ini.

Dokumentasi resmi:
- https://docs.midtrans.com/docs/midtrans-account
- https://docs.midtrans.com/docs/api-authorization-headers

## 2. Isi environment lokal

Buat file `.env.local` di root project (jangan membuat atau mengunggahnya ke GitHub):

```env
MIDTRANS_SERVER_KEY=SB-Mid-server-...
NEXT_PUBLIC_MIDTRANS_CLIENT_KEY=SB-Mid-client-...
MIDTRANS_IS_PRODUCTION=false
```

Template aman tersedia di root repository: `.env.example`.

## 3. Isi environment Vercel

1. Buka Vercel Dashboard → project **nusantaragift**.
2. Buka **Settings → Environment Variables**.
3. Tambahkan variabel berikut untuk Development, Preview, dan Production deployment selama tahap pengembangan:
   - `MIDTRANS_SERVER_KEY` = Sandbox Server Key.
   - `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` = Sandbox Client Key.
   - `MIDTRANS_IS_PRODUCTION` = `false`.
4. Simpan lalu lakukan redeploy agar variabel terbaca oleh deployment baru.

Jangan menaruh Server Key di variabel berawalan `NEXT_PUBLIC_`, source code,
chat, screenshot, atau repository. Jangan mengirim Server Key kepada siapa pun.

## 4. Yang sudah disiapkan di repository

- `src/lib/midtrans/config.ts`: pemilihan endpoint Sandbox/Production dan validasi key.
- `createSnapTransaction()`: helper backend untuk membuat Snap transaction.
- `.env.example`: daftar nama environment variables tanpa kredensial asli.

## 5. Yang belum diaktifkan

Helper ini belum dipanggil oleh checkout. Sebelum pembayaran diaktifkan, alur
aplikasi perlu dihubungkan dengan:

1. Pembuatan order dan perhitungan ulang harga dari database.
2. Pembuatan Snap transaction dari backend dengan order ID internal yang unik.
3. Penyimpanan Snap token / redirect URL pada order.
4. Endpoint Payment Notification (webhook) dengan verifikasi signature/status.
5. Pemrosesan notifikasi yang idempotent.
6. Penerbitan QR akses Cerita hanya setelah status pembayaran terverifikasi.

Jangan mengubah status order menjadi PAID hanya berdasarkan redirect browser atau
respons frontend. Status final harus berasal dari notifikasi Midtrans yang
diverifikasi atau pemeriksaan status transaksi ke Midtrans.

**Webhook URL belum perlu dimasukkan ke dashboard Midtrans** sampai endpoint
webhook NusantaraGift selesai dibuat dan dideploy.

## 6. Checklist sebelum tes

- [ ] Dashboard Midtrans berada di Sandbox.
- [ ] Sandbox Server Key NusantaraGift sudah di Vercel.
- [ ] Sandbox Client Key NusantaraGift sudah di Vercel.
- [ ] `MIDTRANS_IS_PRODUCTION=false`.
- [ ] Tidak ada kredensial asli di GitHub.
- [ ] Checkout dan webhook sudah selesai diintegrasikan sebelum tes end-to-end.
