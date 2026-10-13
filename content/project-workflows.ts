import type { Language } from "./projects";

// Reading detail for the three public workflow steps in projects.ts/catalog.ts.
// These describe scope, not adoption, performance, or unreleased capabilities.
export const projectWorkflowNotes: Record<string, Record<Language, [string, string, string]>> = {
  catmoji: {
    en: ["A hand gesture starts the interaction in the browser.", "The gesture is mapped to an emotion.", "The response combines a cat sticker with a voice."],
    id: ["Gesture tangan memulai interaksi di browser.", "Gesture dipetakan menjadi emosi.", "Respons menggabungkan stiker kucing dan suara."],
  },
  nalira: {
    en: ["Lectures, meetings, and ideas begin as audio.", "Audio becomes structured material that can be revisited.", "Contextual chat continues the learning workflow."],
    id: ["Kuliah, meeting, dan ide bermula dari audio.", "Audio menjadi materi terstruktur yang bisa dipelajari ulang.", "Chat kontekstual melanjutkan alur belajar dari materi tersebut."],
  },
  canox: {
    en: ["Personal context gives everyday work a starting point.", "The AI cockpit connects Henry's tools and workflows.", "The workflow leads from context to a useful next action."],
    id: ["Konteks personal menjadi titik awal pekerjaan sehari-hari.", "Cockpit AI menghubungkan tools dan workflow Henry.", "Alurnya menghubungkan konteks dengan aksi berikutnya yang berguna."],
  },
  hengs: {
    en: ["Messages arrive through WhatsApp or the Discord community.", "Focus assistance and automation shape the response around context.", "Useful handoffs support calmer communication."],
    id: ["Pesan masuk melalui WhatsApp atau komunitas Discord.", "Asisten fokus dan automation menyesuaikan respons dengan konteks.", "Handoff yang berguna mendukung komunikasi yang lebih tenang."],
  },
  polara: {
    en: ["The browser-based photobooth starts with framing a moment.", "The interface is part of the creative experience.", "The experience centers on keeping that moment as a digital memory."],
    id: ["Photobooth berbasis browser dimulai dengan membingkai momen.", "Interface menjadi bagian dari pengalaman kreatifnya.", "Pengalaman ini berpusat pada menyimpan momen sebagai kenangan digital."],
  },
  rental: {
    en: ["A vehicle catalog presents the cars in the rental system.", "Authentication, booking, and a user area support reservations.", "Payment confirmation connects the booking flow with admin operations."],
    id: ["Katalog kendaraan menampilkan mobil dalam sistem rental.", "Autentikasi, pemesanan, dan area pengguna mendukung reservasi.", "Konfirmasi pembayaran menghubungkan pemesanan dengan operasional admin."],
  },
  pos: {
    en: ["Products, suppliers, and purchases form the inventory workflow.", "Customer transactions and returns form the sales workflow.", "Dashboards and reports bring the business flows together."],
    id: ["Produk, pemasok, dan pembelian membentuk alur persediaan.", "Transaksi pelanggan dan retur membentuk alur penjualan.", "Dashboard dan laporan menyatukan alur operasional tersebut."],
  },
  labq: {
    en: ["Patient registration begins the laboratory workflow.", "Patients, laboratory staff, and admins participate in the examination process.", "Test results complete the mobile and web workflow."],
    id: ["Pendaftaran pasien menjadi awal alur laboratorium.", "Pasien, staf laboratorium, dan admin terhubung dalam proses pemeriksaan.", "Hasil pemeriksaan melengkapi alur mobile dan web."],
  },
  yventures: {
    en: ["Researched vendor data provides the basis for discovery.", "Filtering and price sorting support vendor matching for an event.", "Quote calculation completes the vendor-selection path."],
    id: ["Data vendor hasil riset menjadi dasar pencarian.", "Filter dan pengurutan harga mendukung pencocokan vendor untuk event.", "Perhitungan penawaran melengkapi alur pemilihan vendor."],
  },
  soreva: {
    en: ["Grounded discovery supplies material for social content.", "Editorial generation and branded media pass through review.", "Scheduling leads into controlled publishing."],
    id: ["Discovery berbasis sumber menyediakan bahan konten sosial.", "Editorial dan media bermerek melalui tahap review.", "Penjadwalan dilanjutkan dengan publikasi terkontrol."],
  },
};
