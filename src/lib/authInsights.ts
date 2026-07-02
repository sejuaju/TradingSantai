export interface AuthInsight {
  tag: string;
  title: string;
  body: string;
  footnote?: string;
}

export const LOGIN_INSIGHTS: AuthInsight[] = [
  {
    tag: "Check-in Harian",
    title: "Bagaimana tradingmu hari ini?",
    body:
      "Sebelum membuka chart, luangkan satu menit untuk menilai hari ini dengan jujur. " +
      "Apakah kamu masuk market karena ada rencana yang sudah ditulis, atau hanya ingin " +
      "mengejar kerugian kemarin? Trader yang bertahan dalam jangka panjang selalu mulai " +
      "dari kesadaran diri — bukan dari kecepatan klik. Profit hari ini bukan satu-satunya " +
      "ukuran keberhasilan; yang lebih penting adalah apakah kamu masih mengikuti aturan " +
      "yang sudah kamu buat sendiri.",
    footnote: "Catat satu hal yang berjalan baik dan satu hal yang perlu diperbaiki besok.",
  },
  {
    tag: "Psikologi",
    title: "Bagaimana psikologimu saat ini?",
    body:
      "FOMO, revenge trading, dan overconfidence adalah tiga musuh yang jarang terlihat di " +
      "layar, tapi sering muncul di kepala. Jika kamu merasa gelisah, lelah, marah, atau " +
      "terburu-buru ingin masuk posisi hari ini, pertimbangkan untuk tidak trading sama " +
      "sekali. Tidak trading juga merupakan keputusan trading yang bijak. Market akan tetap " +
      "ada besok; akun yang terjaga hari ini lebih berharga daripada satu entry yang dipaksakan.",
    footnote: "Skala 1–10: seberapa tenang perasaanmu sekarang? Di bawah 6, istirahat dulu.",
  },
  {
    tag: "Disiplin",
    title: "Apakah kamu trading rencana atau trading emosi?",
    body:
      "Rencana trading yang bagus tidak menjamin profit setiap hari, tapi rencana yang konsisten " +
      "dijalankan akan melindungi akunmu dari keputusan impulsif. Tanyakan pada dirimu: apakah " +
      "level SL dan TP sudah jelas sebelum entry? Apakah ukuran lot sesuai risiko harian? " +
      "Jika jawabannya belum, jangan buru-buru login ke chart — rapikan dulu rencanamu. " +
      "Disiplin terasa membosankan di awal, tapi dialah yang membuat trader bisa kembali besok.",
    footnote: "Tulis satu kalimat: alasan masuk, titik invalidasi, dan target keluar.",
  },
  {
    tag: "Mindset",
    title: "Hari ini kamu datang untuk belajar atau untuk membuktikan sesuatu?",
    body:
      "Banyak kerugian bukan karena analisis salah, melainkan karena ego ikut masuk ke dalam " +
      "posisi. Ketika kamu merasa harus membuktikan bahwa kamu benar, kamu cenderung menahan " +
      "posisi rugi terlalu lama atau mengejar market yang sudah berjalan. Datanglah ke sesi " +
      "hari ini dengan niat belajar: apa yang market ajarkan, bukan apa yang market hutang " +
      "kepadamu. Jurnal singkat setelah sesi sering lebih berharga daripada lima entry tanpa refleksi.",
    footnote: "Fokus pada proses yang bisa kamu ulangi, bukan pada satu trade yang kebetulan untung.",
  },
  {
    tag: "Risiko",
    title: "Berapa banyak yang boleh kamu kehilangan hari ini?",
    body:
      "Sebelum melihat sinyal atau indikator, tentukan dulu batas rugi harian yang bisa kamu " +
      "terima tanpa mengganggu tidur malam ini. Risiko bukan angka di belakang layar — risiko " +
      "adalah batas psikologis yang menentukan apakah kamu masih bisa berpikir jernih setelah " +
      "satu loss. Jika batas itu sudah tersentuh, tutup platform dan lanjutkan besok dengan " +
      "kepala dingin. Melindungi modal bukan tanda takut; itu tanda profesional.",
    footnote: "Aturan sederhana: satu loss besar tidak boleh menghapus seminggu disiplin.",
  },
];

export const SIGNUP_INSIGHTS: AuthInsight[] = [
  {
    tag: "Selamat Datang",
    title: "Trading itu marathon, bukan sprint.",
    body:
      "Bergabung di Trading Santai berarti kamu memilih belajar bertahap — bukan mengejar " +
      "profit instan. Platform ini dirancang untuk membantumu melihat market dengan lebih " +
      "tenang: chart, sinyal, dan eksekusi manual yang terukur. Akun member memungkinkan " +
      "posisimu tersimpan, profilmu terhubung ke monitor, dan kamu bisa kembali melanjutkan " +
      "analisis tanpa kehilangan konteks. Mulai dari fondasi yang benar lebih penting " +
      "daripada sering masuk market tanpa arah.",
    footnote: "Gratis untuk chart & sinyal — fokuskan energi pada proses, bukan pada hasil satu hari.",
  },
  {
    tag: "Komunitas",
    title: "Kamu tidak trading sendirian.",
    body:
      "Banyak trader gagal bukan karena kurang indikator, tapi karena kurang lingkungan yang " +
      "menjaga mindset. Di sini kamu bisa mengamati bagaimana trader lain mendisiplinkan entry, " +
      "menghormati SL, dan menerima hari tanpa setup. Akun member adalah pintu masuk ke " +
      "pengalaman yang lebih terorganisir — bukan janji profit, melainkan akses ke alat " +
      "yang membantu kamu trading dengan lebih sadar dan konsisten dari hari ke hari.",
    footnote: "Komunitas yang sehat mengingatkanmu untuk berhenti, bukan hanya untuk masuk.",
  },
  {
    tag: "Edukasi",
    title: "Mulai dengan niat belajar, bukan membuktikan.",
    body:
      "Saat membuat akun, tanyakan: apa yang ingin kamu perbaiki dari minggu lalu? Apakah " +
      "masalahnya di analisis, di psikologi, atau di manajemen risiko? Trading Santai " +
      "menyediakan lingkungan untuk berlatih mengambil keputusan — dengan sinyal, timeframe, " +
      "dan posisi yang tercatat. Catatan kecil tentang emosi sebelum entry sering lebih " +
      "bermanfaat daripada menambah satu indikator lagi di chart.",
    footnote: "Tulis satu tujuan minggu ini: misalnya 'tidak revenge trade' atau 'maksimal 2 entry per hari'.",
  },
  {
    tag: "Disiplin",
    title: "Akun member = komitmen pada proses.",
    body:
      "Dengan mendaftar, kamu menyimpan identitas trading — nama, UID, dan riwayat posisi — " +
      "agar setiap sesi punya kontinuitas. Ini membantu kamu mengevaluasi performa secara jujur " +
      "tanpa mengandalkan ingatan yang sering bias. Manual Execution hanya aktif setelah login " +
      "karena kami ingin setiap klik BUY/SELL datang dari keputusan sadar, bukan impuls " +
      "anonymous. Itu bukan hambatan; itu filter untuk melindungi akunmu.",
    footnote: "Profil dan posisi tersimpan — lanjutkan analisis kapan saja tanpa mulai dari nol.",
  },
  {
    tag: "Mindset",
    title: "Siapkah kamu trading dengan rencana?",
    body:
      "Sebelum mengisi form di sebelah kanan, bayangkan satu skenario: harga bergerak melawan " +
      "posisimu selama 10 menit. Apa yang akan kamu lakukan? Jika jawabannya belum jelas, " +
      "gunakan akun ini untuk membangun kebiasaan menulis rencana dulu. Market tidak peduli " +
      "siapa kamu; yang peduli adalah apakah kamu punya aturan saat tekanan muncul. Trading " +
      "Santai hadir untuk mendukung kebiasaan itu — bukan menggantikan tanggung jawab pribadimu.",
    footnote: "Setelah daftar, luangkan 5 menit menulis aturan personal sebelum buka chart.",
  },
];

export type AuthMode = "login" | "signup";

export function pickAuthInsight(mode: AuthMode): AuthInsight {
  const pool = mode === "login" ? LOGIN_INSIGHTS : SIGNUP_INSIGHTS;
  return pool[Math.floor(Math.random() * pool.length)];
}