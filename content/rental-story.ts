import type { Language } from "./projects";

type Copy = Record<Language, string>;

export const rentalStory = {
  intro: {
    en: "A PHP rental application connecting car selection, booking dates and manual payment confirmation. Built in semester two.",
    id: "Aplikasi rental PHP yang menghubungkan pilihan mobil, tanggal sewa, dan konfirmasi pembayaran manual. Dibangun pada semester dua.",
  },
  title: { en: "A booking needs a next step.", id: "Pemesanan perlu alur yang jelas." },
  problem: {
    en: "Choosing a car is just the beginning. The renter needs dates, a cost and a way to track the request; the administrator needs to review payment and manage the rental. RentalMobil.SG explores both sides in one PHP and MySQL coursework build.",
    id: "Memilih mobil baru permulaan. Penyewa perlu menentukan tanggal, mengetahui biaya, dan memantau permintaan; admin perlu meninjau pembayaran serta mengelola sewa. RentalMobil.SG menghubungkan kedua sisi dalam proyek kuliah berbasis PHP dan MySQL.",
  },
  captureNote: {
    en: "Original screenshots from the course report. Simulated coursework data, not real bookings. The archived images show only the portions captured at the time.",
    id: "Screenshot asli dari laporan kuliah. Data simulasi tugas, bukan pemesanan nyata. Gambar arsip hanya menampilkan bagian yang direkam saat itu.",
  },
  captures: [
    {
      src: "/assets/projects/rentalmobil-sg/catalog.webp", size: [977, 605] as [number, number],
      tab: { en: "Cars", id: "Mobil" },
      title: { en: "Catalog / vehicle selection", id: "Katalog / pilihan mobil" },
      alt: { en: "RentalMobil.SG car catalog with brand, type, price and availability filters", id: "Katalog RentalMobil.SG dengan filter merek, tipe, harga, dan ketersediaan" },
      heading: { en: "Find a car before choosing dates.", id: "Pilih mobil, lalu tentukan tanggal." },
      body: { en: "The catalog puts daily prices, vehicle details and availability together. After choosing a car, the booking form checks the date range and calculates a total using the daily rate and the inclusive number of rental days.", id: "Katalog menyatukan harga per hari, detail kendaraan, dan ketersediaan. Setelah mobil dipilih, form pemesanan memeriksa rentang tanggal dan menghitung total dari tarif harian serta jumlah hari sewa, termasuk tanggal awal dan akhir." },
    },
    {
      src: "/assets/projects/rentalmobil-sg/rentals.webp", size: [1340, 608] as [number, number],
      tab: { en: "Rentals", id: "Sewa" },
      title: { en: "My rentals / request history", id: "Sewa saya / riwayat permintaan" },
      alt: { en: "RentalMobil.SG rental history with status filters, a vehicle, dates and a simulated rental total", id: "Riwayat sewa RentalMobil.SG dengan filter status, kendaraan, tanggal, dan total sewa simulasi" },
      heading: { en: "The request stays visible.", id: "Status sewa bisa diikuti." },
      body: { en: "The renter's area brings together booking records, dates and costs. The payment flow records a selected method and accepts an uploaded receipt for manual review, rather than claiming an automatic payment-gateway integration.", id: "Area penyewa menyatukan catatan pemesanan, tanggal, dan biaya. Alur pembayaran menyimpan metode yang dipilih dan menerima unggahan bukti untuk ditinjau manual, bukan integrasi payment gateway otomatis." },
    },
    {
      src: "/assets/projects/rentalmobil-sg/admin.webp", size: [1349, 581] as [number, number],
      tab: { en: "Admin", id: "Admin" },
      title: { en: "Admin / rental overview", id: "Admin / ringkasan rental" },
      alt: { en: "RentalMobil.SG administrator dashboard showing user, vehicle, active-rental and revenue summaries from coursework data", id: "Dashboard admin RentalMobil.SG menampilkan ringkasan pengguna, mobil, sewa aktif, dan pendapatan dari data tugas" },
      heading: { en: "One request, another perspective.", id: "Sewa yang sama, sisi pengelola." },
      body: { en: "The dashboard summarizes the rental records. Separate management pages handle cars, users and transactions; the transaction actions include confirming, rejecting and completing a rental, with corresponding vehicle-status updates in the source.", id: "Dashboard merangkum catatan rental. Halaman pengelolaan terpisah menangani mobil, pengguna, dan transaksi; tindakannya mencakup konfirmasi, penolakan, dan penyelesaian sewa, disertai perubahan status kendaraan di source." },
    },
  ],
  decisions: [
    { title: { en: "Make dates part of the booking.", id: "Tanggal menentukan pemesanan." }, body: { en: "The form requires a start date from tomorrow onward and an end date after it. It calculates the duration and price before creating the rental, instead of treating those values as unrelated text fields.", id: "Form meminta tanggal mulai paling cepat besok dan tanggal akhir setelahnya. Durasi serta harga dihitung sebelum sewa dibuat, bukan diperlakukan sebagai isian teks yang terpisah." } },
    { title: { en: "Keep payment review explicit.", id: "Konfirmasi pembayaran tetap jelas." }, body: { en: "Submitting a payment method or receipt moves the request into a waiting state. The administrator has a separate confirmation step. This is a manual coursework flow, not proof of a settled bank transaction.", id: "Pengiriman metode atau bukti pembayaran menempatkan permintaan dalam status menunggu. Admin memiliki langkah konfirmasi tersendiri. Ini alur manual proyek kuliah, bukan bukti penyelesaian transaksi bank." } },
    { title: { en: "Connect the rental to the vehicle.", id: "Hubungkan sewa dengan kendaraan." }, body: { en: "Creating a booking also marks the car as booked. Admin completion or rejection restores availability. Reviewing the older build also shows why consistent status names and concurrent-booking checks would matter before any real deployment.", id: "Pembuatan sewa juga menandai mobil sebagai dipesan. Penyelesaian atau penolakan oleh admin mengembalikan ketersediaannya. Review build lama ini juga menunjukkan pentingnya konsistensi nama status dan pemeriksaan pemesanan bersamaan sebelum dipakai secara nyata." } },
  ] satisfies { title: Copy; body: Copy }[],
  result: {
    en: "I built the application independently, connecting the customer journey to the admin workflow: catalog, authentication, booking, payment submission, rental history and vehicle management. It became an early exercise in turning a business process into a working web application.",
    id: "Aku membangun aplikasinya sendiri, menghubungkan perjalanan penyewa dengan alur admin: katalog, autentikasi, pemesanan, pengiriman pembayaran, riwayat sewa, dan pengelolaan mobil. Ini latihan awal menerjemahkan proses bisnis menjadi aplikasi web.",
  },
  limit: {
    en: "An archived academic build, not a commercial rental service. This case study reviews the PHP source and course report; the original application and database were not rerun. Payment verification, concurrent bookings and access control have not been production-audited. No public demo or source download is offered here.",
    id: "Build arsip untuk kuliah, bukan layanan rental komersial. Studi kasus ini meninjau source PHP dan laporan; aplikasi serta database asli tidak dijalankan ulang. Verifikasi pembayaran, pemesanan bersamaan, dan kontrol akses belum diaudit untuk produksi. Tidak ada demo publik atau unduhan source di halaman ini.",
  },
};
