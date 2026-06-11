const testimonials = [
  {
    name: "Alvino",
    content:
      "Mulai dari rules trade & Outlook market secara garis besarnya, jadi selain bisa plan next dan bisa manage psychology, risk reward jd gak greedy dan punya reason 3-5 buat entry.",
    color: "from-blue-600/80 to-indigo-700/80",
  },
  {
    name: "Melli",
    content:
      "Selama ini ada ilmu yang didapat, terutama dalam melakukan analisa dan management keuangan karena saya agak agresif. Tapi sekarang data bantuan carikan didapat dari segi keamanan dan lebih terkonfirmasi.",
    color: "from-blue-500/80 to-purple-600/80",
  },
  {
    name: "Amirudin",
    content:
      "Ok banget grupnya, sayang aja yang terlalu sibuk ini jadi kurang banyak menyimak discord. Paling asik sama dibagian live session yang diadakan.",
    color: "from-indigo-600/80 to-blue-700/80",
  },
  {
    name: "Kape",
    content:
      "Seminggu ini saya lagi win streak hanya loss 1x. Jujur greed saya lagi tinggi dan pede-pedenya. Gw sangat bersyukur banget ketika terjun ke dunia trading langsung dapet mentor kaya Ko Kevin, makasih banyak ko kev.",
    color: "from-violet-600/80 to-indigo-700/80",
  },
  {
    name: "I Putu Rian",
    content:
      "Perubahan dari awal dan sekarang banyak sekali kak, dari ga paham apa-apa sekarang sudah lebih paham tentang trading baik psikologi ataupun teknikal itu sangat luar biasa.",
    color: "from-blue-600/80 to-violet-700/80",
  },
  {
    name: "Nigga",
    content:
      "Aku sangat puas dengan konten di Discord. Semuanya bermanfaat dan mendalam soal trading. Aku belajar banyak dari Ko Kevin, dari analisa mandiri hingga disiplin trading. Sekarang bisa konsisten profit.",
    color: "from-purple-600/80 to-blue-700/80",
  },
  {
    name: "Lucky",
    content:
      "TS udah paling the best buat nyari ilmu kalo mau nyari ilmu nya jangan di TS, tapi kalo mau nyari ilmu buat berkembang di dunia trading TS tempatnya.",
    color: "from-indigo-500/80 to-purple-600/80",
  },
  {
    name: "Tirta Wiguna",
    content:
      "Thank you buat komunitas selama hampir 7 bulan ini. Komunitas yang sangat membangun dan banyak hal baru yang bisa dipelajari, buat teman-teman yang baru, buka pikiran dan saling motivasi.",
    color: "from-blue-500/80 to-indigo-600/80",
  },
  {
    name: "Noel",
    content:
      "Suatu kehormatan bisa mengenal dan bergabung di komunitas TS. Pelayanan dan cara penyampaiannya mudah dimengerti, bahkan untuk pemula seperti saya. Saya belajar banyak, mulai dari evaluasi posisi trade hingga mindset trading yang lebih baik.",
    color: "from-violet-500/80 to-blue-600/80",
  },
];

export default function Testimonials() {
  return (
    <section id="testimoni" className="py-24 bg-[#0a0a14]">
      <div className="max-w-[1800px] mx-auto px-4 sm:px-8 lg:px-10">
        {/* Section Header */}
        <div className="text-center max-w-5xl mx-auto mb-16">
          <p className="text-sm font-medium text-accent/70 uppercase tracking-widest mb-4">
            WHAT THEY SAID ABOUT TS
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-bold tracking-tight leading-tight text-white">
            When we asked our members how TS impacts their trading, they said:
          </h2>
        </div>

        {/* Testimonial Grid - 3x3 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className={`rounded-2xl p-6 bg-gradient-to-br ${t.color} border border-white/10`}
            >
              <p className="text-sm text-white/90 leading-relaxed mb-5">
                {t.content}
              </p>
              <p className="text-xs text-white/60 font-medium">
                - {t.name}, Member TS
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
