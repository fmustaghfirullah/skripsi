export const examQuestions = [
    {
        text: "Apa tujuan utama penggunaan algoritma Random Forest dalam sistem CBT Anti-Cheating ini?",
        options: ["Optimasi database", "Klasifikasi perilaku (Normal vs Curang)", "Enkripsi soal ujian", "Meningkatkan kecepatan render UI"]
    },
    {
        text: "Event JavaScript manakah yang digunakan untuk mendeteksi saat user berpindah tab?",
        options: ["onClick", "visibilitychange", "onHover", "onKeyPress"]
    },
    {
        text: "Manakah yang bukan merupakan fitur dari NodeJS?",
        options: ["Non-blocking I/O", "Single-threaded", "Multi-threaded native", "Event-driven"]
    },
    {
        text: "Apa fungsi dari `useEffect` dalam React?",
        options: ["Mengelola state lokal", "Menangani side effects", "Membuat context", "Routing halaman"]
    },
    {
        text: "Library apa yang digunakan untuk membuat animasi smooth di React pada proyek ini?",
        options: ["jQuery", "Framer Motion", "Anime.js", "GSAP"]
    },
    {
        text: "Status HTTP 403 Forbidden menandakan apa?",
        options: ["Halaman tidak ditemukan", "Server error", "Akses ditolak", "Request berhasil"]
    },
    {
        text: "Perintah CLI untuk menginisialisasi proyek Node.js baru adalah...",
        options: ["node init", "npm start", "npm init", "npx create"]
    },
    {
        text: "ORM yang digunakan untuk menghubungkan Node.js dengan MySQL di proyek ini adalah...",
        options: ["Mongoose", "Sequelize", "TypeORM", "Prisma"]
    },
    {
        text: "Hook React mana yang digunakan untuk menyimpan nilai mutable yang tidak memicu re-render?",
        options: ["useState", "useEffect", "useRef", "useMemo"]
    },
    {
        text: "Apa kepanjangan dari CBT dalam konteks aplikasi ini?",
        options: ["Computer Based Test", "Center Binary Tech", "Cyber Basic Training", "Code Base Tool"]
    },
    // Generate more generic questions to reach 50
    ...Array.from({ length: 40 }, (_, i) => ({
        text: `Soal Simulasi Nomor ${i + 11}: Apa output dari console.log(typeof ${i % 2 === 0 ? '"text"' : 123})?`,
        options: ["string", "number", "object", "undefined"]
    }))
];
