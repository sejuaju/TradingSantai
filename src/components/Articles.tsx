import Image from "next/image";

const articles = [
  {
    image: "https://c8fe2ece0f06a9c24f9352bf4d89a60a.cdn.bubble.io/cdn-cgi/image/w=,h=,f=auto,dpr=1,fit=contain/f1763281744466x745037241860446300/2149102137.jpg",
    tag: null,
    title: "Perbedaan Day Trading, Swing Trading, & HODL: Strategi Investasi Crypto yang Harus Dipahami",
    excerpt:
      "Di dunia crypto yang sangat volatil, strategi adalah fondasi utama yang menentukan hasil investasi seseorang. Tanpa strategi, keputusan sering kali dipengaruhi emosi, rumor, atau fluktuasi harga sesaat. Tiga strategi paling populer yang digunakan investor dan trader adalah day trading, swing trading, dan HODL.",
    date: "Nov 2025",
    href: "https://saillythub.id/article/perbedaan-day-trading-swing-trading--hodl-strategi-investasi-crypto-yang-harus-dipahami",
  },
  {
    image: "https://c8fe2ece0f06a9c24f9352bf4d89a60a.cdn.bubble.io/cdn-cgi/image/w=,h=,f=auto,dpr=1,fit=contain/f1763280723141x627323065642192400/2149102102.jpg",
    tag: null,
    title: "Apa Itu Volume Trading dan Kenapa Penting: Penjelasan Terlengkap untuk Investor dan Trader",
    excerpt:
      "Volume trading adalah salah satu indikator paling fundamental dalam analisis pasar keuangan, baik dalam saham, forex, maupun kripto. Namun, meskipun begitu penting.",
    date: "Nov 2025",
    href: "https://saillythub.id/article/apa-itu-volume-trading",
  },
  {
    image: "https://c8fe2ece0f06a9c24f9352bf4d89a60a.cdn.bubble.io/cdn-cgi/image/w=,h=,f=auto,dpr=1,fit=contain/f1763278387165x755816646241004500/2149102138.jpg",
    tag: "Kripto",
    title: "Perbedaan DEX dan CEX: Analisis Lengkap Dua Model Bursa Crypto",
    excerpt:
      "Dunia kripto telah berkembang sangat cepat, dan salah satu pilar terpenting dalam ekosistemnya adalah platform pertukaran atau exchange. Pengguna memerlukan exchange untuk membeli, menjual, menukar, hingga melakukan berbagai aktivitas lanjutan seperti trading spot, futures, staking, hingga investasi pada aset tertentu.",
    date: "Nov 2025",
    href: "https://saillythub.id/article/evolusi-exchange-crypto-dari-cex-ke-dex",
  },
];

export default function Articles() {
  return (
    <section className="py-24 bg-[#0a0a0a]">
      <div className="max-w-[1800px] mx-auto px-4 sm:px-8 lg:px-10">
        {/* Header */}
        <div className="flex items-center gap-4 mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">
            Latest articles
          </h2>
          <span className="bg-accent text-black text-xs font-semibold px-3 py-1 rounded-full">
            Blog by Trading Santai Hub
          </span>
        </div>

        {/* Article Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {articles.map((article, index) => (
            <a
              key={index}
              href={article.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group block rounded-2xl bg-[#161627] border border-white/8 p-4"
            >
              {/* Image */}
              <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden">
                <Image
                  src={article.image}
                  alt={article.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>

              {/* Content */}
              <div className="p-5">
                {/* Tag */}
                {article.tag && (
                  <span className="text-xs font-semibold text-accent mb-2 inline-block">
                    {article.tag}
                  </span>
                )}

                {/* Title */}
                <h3 className="text-base font-bold text-white mb-3 leading-snug group-hover:text-accent transition-colors">
                  {article.title}
                </h3>

                {/* Excerpt */}
                <p className="text-xs text-white/40 leading-relaxed mb-4 line-clamp-4">
                  {article.excerpt}
                </p>

                {/* Date */}
                <p className="text-xs text-accent/70">{article.date}</p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
