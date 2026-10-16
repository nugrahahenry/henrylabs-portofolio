import type { Language } from "./projects";

type Copy = Record<Language, string>;

export const posStory = {
  intro: {
    en: "A desktop point of sale that connects shoe sizes, sales and returns. Built for a semester-three business systems course.",
    id: "Point of sale desktop yang menghubungkan ukuran sepatu, penjualan, dan retur. Dibangun untuk mata kuliah sistem bisnis semester tiga.",
  },
  title: { en: "A sale is only part of the system.", id: "Penjualan hanya satu bagian dari sistem." },
  problem: {
    en: "A shoe store needs to know more than what sold: which size is available, where stock came from, and what happens when an item is returned. POS Z Shoes brings those operations into a C# WinForms application.",
    id: "Toko sepatu perlu tahu lebih dari barang yang terjual: ukuran mana yang tersedia, dari mana stok masuk, dan apa yang terjadi ketika barang dikembalikan. POS Z Shoes menghubungkan operasi tersebut dalam aplikasi C# WinForms.",
  },
  captureNote: {
    en: "Archived desktop screenshots from the course report. Simulated data, not actual sales or a live application session.",
    id: "Screenshot desktop dari laporan kuliah. Data simulasi, bukan penjualan nyata atau sesi aplikasi yang sedang berjalan.",
  },
  captures: [
    {
      src: "/assets/projects/pos-z-shoes/products.webp", size: [1443, 1027] as [number, number],
      tab: { en: "Stock", id: "Stok" },
      title: { en: "Products / sizes and stock", id: "Produk / ukuran dan stok" },
      alt: { en: "POS Z Shoes product catalog with size, price, stock and sorting controls; the archived build uses placeholder product photos", id: "Katalog POS Z Shoes dengan ukuran, harga, stok, dan pengurutan; build arsip masih memakai placeholder foto produk" },
      heading: { en: "One model, several sizes.", id: "Satu model, beberapa ukuran." },
      body: { en: "Products carry a SKU, size, price and stock count. The sales form looks up the chosen product and size, then checks the requested quantity together with the quantity already in the cart.", id: "Produk memiliki SKU, ukuran, harga, dan jumlah stok. Form penjualan mencari kombinasi produk dan ukuran, lalu memeriksa jumlah yang diminta bersama jumlah yang sudah ada di keranjang." },
    },
    {
      src: "/assets/projects/pos-z-shoes/transactions.webp", size: [1442, 1026] as [number, number],
      tab: { en: "Sales", id: "Penjualan" },
      title: { en: "Transactions / sales history", id: "Transaksi / riwayat penjualan" },
      alt: { en: "POS Z Shoes desktop transaction table with cashier, date, product, size, quantity, payment and status columns", id: "Tabel transaksi desktop POS Z Shoes dengan kolom kasir, tanggal, produk, ukuran, jumlah, pembayaran, dan status" },
      heading: { en: "Keep the transaction traceable.", id: "Transaksi yang bisa ditelusuri." },
      body: { en: "The cart groups product selections before checkout. A transaction record keeps its payment method and status; a customer return starts from the original transaction and a returnable item, rather than an unrelated stock edit.", id: "Keranjang menampung pilihan produk sebelum checkout. Catatan transaksi menyimpan metode pembayaran dan statusnya; retur pelanggan dimulai dari transaksi asal dan barang yang bisa diretur, bukan perubahan stok yang terpisah." },
    },
    {
      src: "/assets/projects/pos-z-shoes/reports.webp", size: [1444, 1026] as [number, number],
      tab: { en: "Reports", id: "Laporan" },
      title: { en: "Reports / period comparison", id: "Laporan / perbandingan periode" },
      alt: { en: "POS Z Shoes Reports Area with sales trends and previous-period comparison charts", id: "Reports Area POS Z Shoes dengan grafik tren penjualan dan perbandingan periode sebelumnya" },
      heading: { en: "Read beyond a single receipt.", id: "Baca lebih dari satu struk." },
      body: { en: "The report screen brings together revenue, average transaction value and items sold. Period and chart controls provide a different view of the records, with a PDF export path in the application source.", id: "Halaman laporan menyatukan pendapatan, rata-rata nilai transaksi, dan barang terjual. Pilihan periode serta grafik memberikan sudut pandang lain atas catatan transaksi, dengan alur ekspor PDF di source aplikasi." },
    },
  ],
  decisions: [
    { title: { en: "Check the size, not just the shoe.", id: "Periksa ukurannya, bukan hanya sepatunya." }, body: { en: "The same shoe can have different availability in each size. The cart checks stock against the selected SKU and includes items already added, so a repeated selection cannot bypass that form-level check.", id: "Sepatu yang sama bisa memiliki ketersediaan berbeda untuk tiap ukuran. Keranjang memeriksa stok terhadap SKU terpilih dan menghitung barang yang sudah ditambahkan, sehingga pemilihan berulang tidak melewati pemeriksaan di form tersebut." } },
    { title: { en: "Separate a refund from an exchange.", id: "Bedakan refund dan penukaran." }, body: { en: "The customer-return form changes with the selected resolution: refund amount for Refund, replacement product and size for Exchange. Both start from an original transaction item and a reason for return.", id: "Form retur pelanggan berubah mengikuti solusi yang dipilih: nilai pengembalian untuk Refund, produk dan ukuran pengganti untuk Exchange. Keduanya dimulai dari barang di transaksi asal dan alasan retur." } },
    { title: { en: "Give each role a relevant workspace.", id: "Ruang kerja sesuai peran." }, body: { en: "Owner, Admin and Staff have separate dashboard and navigation paths in the source. That is a course-level workflow distinction, not a claim of independently audited access control.", id: "Owner, Admin, dan Staff memiliki jalur dashboard serta navigasi terpisah di source. Ini pemisahan alur kerja untuk proyek kuliah, bukan klaim kontrol akses yang telah diaudit secara independen." } },
  ] satisfies { title: Copy; body: Copy }[],
  result: {
    en: "I built the application independently; classmates helped prepare the sample data. The build connects product management, supplier purchases, customer sales, returns, dashboards and reports, beyond a collection of CRUD screens.",
    id: "Aku membangun aplikasinya sendiri; teman sekelompok membantu menyiapkan data simulasi. Build ini menghubungkan pengelolaan produk, pembelian supplier, penjualan pelanggan, retur, dashboard, dan laporan, bukan sekadar kumpulan layar CRUD.",
  },
  limit: {
    en: "This is an academic Windows desktop build, not a hosted web demo or a claim of commercial deployment. The archived screens still contain placeholder product photos. This portfolio pass reviews the source and report; it does not rerun the POS database, validate sales figures, or certify production readiness.",
    id: "Ini build desktop Windows untuk kuliah, bukan demo web atau klaim sudah dipakai secara komersial. Screenshot arsip masih memiliki placeholder foto produk. Pengembangan portfolio ini meninjau source dan laporan; bukan menjalankan ulang database POS, memvalidasi angka penjualan, atau menjamin kesiapan produksi.",
  },
};
