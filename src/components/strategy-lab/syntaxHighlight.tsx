/** Lightweight TS-MQL5 syntax tokens for editor overlay */
export function highlightMql5Line(line: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const re =
    /(\/\/.*$)|("(?:[^"\\]|\\.)*")|(\b(?:input|int|double|void|bool|if|else|return)\b)|(\b(?:OnTick|iRSI|iMA|iEMA|iATR|SignalBuy|SignalSell|Close|Open|High|Low)\b)|(\b\d+\.?\d*\b)|([{}();=<>!&|+\-*/])/g;

  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;

  while ((m = re.exec(line)) !== null) {
    if (m.index > last) {
      parts.push(
        <span key={key++} className="text-white/75">
          {line.slice(last, m.index)}
        </span>,
      );
    }
    const token = m[0];
    let cls = "text-white/75";
    if (m[1]) cls = "text-white/30 italic";
    else if (m[2]) cls = "text-emerald-400/80";
    else if (m[3]) cls = "text-sky-400/90";
    else if (m[4]) cls = "text-violet-400/90";
    else if (m[5]) cls = "text-amber-400/85";
    else if (m[6]) cls = "text-white/40";

    parts.push(
      <span key={key++} className={cls}>
        {token}
      </span>,
    );
    last = m.index + token.length;
  }

  if (last < line.length) {
    parts.push(
      <span key={key++} className="text-white/75">
        {line.slice(last)}
      </span>,
    );
  }

  return parts.length ? parts : [<span key={0} className="text-white/75">{line || " "}</span>];
}