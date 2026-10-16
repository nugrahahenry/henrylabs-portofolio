import type { Language } from "./projects";

type Copy = Record<Language, string>;
export const polaraStory = {
  intro: { en: "A playful browser photobooth. Your photos stay on your device.", id: "Photobooth di browser. Fotomu tetap di perangkatmu." },
  title: { en: "A photo strip, on your terms.", id: "Strip foto, sesuai keinginanmu." },
  problem: {
    en: "A playful photobooth still needs to get the basics right: a photo you like, a frame that fits, and a file you can keep. I built Polara around those three decisions, without an account or photo upload.",
    id: "Photobooth yang playful tetap perlu tiga hal mendasar: foto yang kamu suka, frame yang pas, dan hasil yang bisa disimpan. Aku membangun Polara di sekitar tiga keputusan itu, tanpa akun atau upload foto.",
  },
  decisions: [
    {
      title: { en: "Keep the moment on the device.", id: "Biarkan momen tetap di perangkat." },
      body: { en: "Camera access begins when Camera opens, not on arrival. Photos and edits stay in the browser session; Demo mode offers a way to try the flow without a camera. Reloading clears the session, so saving the result is an explicit final step.", id: "Izin kamera baru diminta saat Camera dibuka, bukan ketika halaman dimuat. Foto dan edit tetap dalam sesi browser; mode Demo bisa dipakai tanpa kamera. Reload menghapus sesi, jadi menyimpan hasil menjadi langkah akhir yang jelas." },
    },
    {
      title: { en: "Change one photo, not the whole strip.", id: "Ganti satu foto, bukan seluruh strip." },
      body: { en: "Review separates each shot. A retake replaces only the selected slot after the new photo succeeds. Each photo also has its own crop and fit, so one awkward frame does not mean starting again.", id: "Review memisahkan setiap jepretan. Retake hanya mengganti slot yang dipilih setelah foto baru berhasil. Crop dan fit juga diatur per foto, jadi satu hasil yang kurang pas tidak perlu mengulang semuanya." },
    },
    {
      title: { en: "Make the saved image match the preview.", id: "Samakan preview dengan hasil simpan." },
      body: { en: "The preview and PNG export share frame geometry, photo crops, masks, and overlays. Save stays available alongside native file sharing, with a download fallback when sharing is unsupported.", id: "Preview dan export PNG memakai geometry frame, crop foto, mask, dan overlay yang sama. Save tetap tersedia bersama fitur berbagi file bawaan perangkat, dengan unduhan sebagai fallback ketika Share tidak didukung." },
    },
  ] satisfies { title: Copy; body: Copy }[],
  captures: [
    { src: "/assets/projects/polara/review.webp", size: [1440, 1000] as [number, number], title: { en: "Review each shot", id: "Periksa tiap foto" }, alt: { en: "Polara Review with three fictional demo photos and individual retake controls", id: "Review Polara dengan tiga foto demo fiktif dan kontrol retake tiap foto" } },
    { src: "/assets/projects/polara/frames.webp", size: [1440, 1000] as [number, number], title: { en: "Choose a frame", id: "Pilih frame" }, alt: { en: "Polara frame picker and strip preview with photo fit controls", id: "Pilihan frame dan preview strip Polara dengan kontrol fit foto" } },
    { src: "/assets/projects/polara/reveal-mobile.webp", size: [390, 844] as [number, number], title: { en: "Keep the result", id: "Simpan hasilnya" }, alt: { en: "Polara Reveal on a narrow screen, showing the demo strip and Save PNG action", id: "Reveal Polara di layar kecil, menampilkan strip demo dan tombol Save PNG" } },
  ],
  result: {
    en: "The live product supports Single and Strip 3, with 26 frame variants across nine families. The output is a 1080 x 1350 or 720 x 1800 PNG. These are working product capabilities, not usage or impact estimates.",
    id: "Produk live mendukung Single dan Strip 3, dengan 26 varian frame dari sembilan keluarga. Hasilnya berupa PNG 1080 x 1350 atau 720 x 1800. Ini kemampuan produk yang sudah berjalan, bukan perkiraan jumlah pengguna atau dampak.",
  },
  limit: {
    en: "Photos are not uploaded to a Polara server. Web assets and fonts still load over the network; this is not a claim of fully offline support. Camera and native sharing behavior still depend on the browser and device.",
    id: "Foto tidak diunggah ke server Polara. Aset web dan font tetap dimuat melalui jaringan; ini bukan klaim dukungan offline penuh. Perilaku kamera dan Share bawaan tetap bergantung pada browser serta perangkat.",
  },
};
