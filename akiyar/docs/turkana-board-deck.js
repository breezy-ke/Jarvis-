/* Akiyar — client deck for Hon. Ekusi Lore, Turkana Senate 2027.
   Palette is the campaign's own dark world (src/app/globals.css): on this
   ground the raw ODM orange measures 7.43:1 and carries text itself. */
const pptx = new (require("pptxgenjs"))();

const BG="05060A", SURF="11141C", SURF2="0A0C12", LINE="232833", LINE2="2E3543";
const ORANGE="F47B20", ORANGE_BR="FF9445", ORANGE_DP="C3621A";
const GREEN="35C46F", TXT="F4F2EE", MID="B2B8C4", LOW="868D9C";
const BOARD_URL = "https://claude.ai/code/artifact/f57c9c04-a60d-49e8-b023-0a40c15288c9";
const F = "Arial";

pptx.layout = "LAYOUT_WIDE";              // 13.3 x 7.5in — set before any slide
pptx.author = "Akiyar";
pptx.company = "Ekusi Lore — Turkana Senate 2027";
pptx.title = "The Turkana Board";

const W = 13.3, H = 7.5, M = 0.62;

/* ---------- the motif: a small orange diamond, from the campaign mark ----- */
function diamond(s, x, y, size, color){
  s.addShape(pptx.shapes.DIAMOND, { x, y, w:size, h:size, fill:{ color: color||ORANGE }, line:{ type:"none" } });
}
function newSlide(dark){
  const s = pptx.addSlide();
  s.background = { color: dark === false ? SURF2 : BG };
  return s;
}
/* Section marker + kicker + title, repeated on every content slide. */
function head(s, kicker, title, opts){
  const o = opts || {};
  diamond(s, M, 0.62, 0.15);
  s.addText(kicker, { x:M+0.28, y:0.5, w:8, h:0.34, isTextBox:true, margin:0,
    fontFace:F, fontSize:11, bold:true, color:ORANGE, charSpacing:2.4 });
  s.addText(title, { x:M, y:0.98, w: o.tw || 8.6, h: o.th || 0.95, isTextBox:true, margin:0,
    fontFace:F, fontSize: o.ts || 34, bold:true, color:TXT, lineSpacing: o.ls || 36 });
}
/* Back to the agenda — every content slide is one click from the menu. */
function menuDot(s){
  s.addText("MENU", { x: W-M-0.85, y:0.56, w:0.85, h:0.3, isTextBox:true, margin:0,
    fontFace:F, fontSize:9, bold:true, color:LOW, align:"right", charSpacing:1.6,
    hyperlink:{ slide:2, tooltip:"Back to the agenda" } });
}
function body(s, text, x, y, w, size){
  s.addText(text, { x, y, w, h:1.5, isTextBox:true, margin:0, fontFace:F,
    fontSize: size || 14, color:MID, lineSpacing: (size || 14) * 1.5, valign:"top" });
}
function card(s, x, y, w, h, fill){
  s.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius:0.03,
    fill:{ color: fill || SURF }, line:{ color: LINE, width:0.75 } });
}
function stat(s, x, y, w, value, label, color){
  s.addText(value, { x, y, w, h:0.72, isTextBox:true, margin:0, fontFace:F,
    fontSize:38, bold:true, color: color || TXT });
  s.addText(label, { x, y:y+0.72, w, h:0.32, isTextBox:true, margin:0, fontFace:F,
    fontSize:10, bold:true, color:LOW, charSpacing:1.6 });
}

/* ======================================================================= 1 */
{
  const s = newSlide();
  s.addShape(pptx.shapes.DIAMOND, { x:9.55, y:1.15, w:3.1, h:3.1,
    fill:{ color:ORANGE, transparency:88 }, line:{ color:ORANGE, width:1 } });
  s.addShape(pptx.shapes.DIAMOND, { x:10.35, y:1.95, w:1.5, h:1.5,
    fill:{ color:ORANGE }, line:{ type:"none" } });

  diamond(s, M, 0.72, 0.19);
  s.addText("EKUSI LORE   ·   TURKANA COUNTY   ·   SENATE 2027",
    { x:M+0.33, y:0.6, w:8.4, h:0.36, isTextBox:true, margin:0, fontFace:F,
      fontSize:11.5, bold:true, color:ORANGE, charSpacing:2.6 });

  s.addText("We don't guess\nwho is with us.\nWe can name them.",
    { x:M, y:2.05, w:8.6, h:2.9, isTextBox:true, margin:0, fontFace:F,
      fontSize:47, bold:true, color:TXT, lineSpacing:53 });

  s.addText("A supporter register for Turkana — built so every number on it can survive being questioned.",
    { x:M, y:5.15, w:7.9, h:0.7, isTextBox:true, margin:0, fontFace:F,
      fontSize:15.5, color:MID, lineSpacing:23 });

  s.addShape(pptx.shapes.LINE, { x:M, y:6.22, w:12.06, h:0, line:{ color:LINE2, width:1 } });
  s.addText("AKIYAR   ·   COMMAND BRIEF", { x:M, y:6.38, w:6, h:0.32, isTextBox:true,
    margin:0, fontFace:F, fontSize:10, bold:true, color:LOW, charSpacing:2 });
  s.addText("Prepared for Hon. Ekusi Lore   ·   Internal", { x:W-M-6, y:6.38, w:6, h:0.32,
    isTextBox:true, margin:0, fontFace:F, fontSize:10, color:LOW, align:"right" });

  s.addNotes("Open with the question this whole system answers: how many supporters do we actually have, and where exactly do they vote? Everything after this slide is that one question.");
}

/* ======================================================================= 2 */
{
  const s = newSlide();
  head(s, "AGENDA", "Ten minutes.\nSix things.", { tw:6 });
  s.addText("Click any line to jump straight to it.", { x:M, y:2.42, w:5.4, h:0.4,
    isTextBox:true, margin:0, fontFace:F, fontSize:12, color:LOW, italic:true });

  s.addShape(pptx.shapes.LINE, { x:M, y:3.16, w:5.3, h:0, line:{ color:LINE2, width:1 } });
  s.addText("WHAT WE ARE PLAYING FOR", { x:M, y:3.34, w:5.3, h:0.3, isTextBox:true,
    margin:0, fontFace:F, fontSize:10, bold:true, color:LOW, charSpacing:1.8 });
  [["238,528","registered voters in Turkana"],
   ["30","wards, each with its own real total"],
   ["559","polling stations where it is counted"]
  ].forEach((t, i) => {
    const y = 3.86 + i * 0.92;
    s.addText(t[0], { x:M, y, w:2.1, h:0.5, isTextBox:true, margin:0, fontFace:F,
      fontSize:26, bold:true, color: i ? TXT : ORANGE });
    s.addText(t[1], { x:M+2.25, y:y+0.12, w:3.1, h:0.4, isTextBox:true, margin:0,
      fontFace:F, fontSize:11.5, color:LOW });
  });

  const items = [
    ["01","The problem","Everyone in this race is guessing", 3],
    ["02","What we collect","One supporter, five facts", 4],
    ["03","Why saturation wins","Headcount lies. Share doesn't", 5],
    ["04","Where to go next","The board picks the route", 6],
    ["05","Reaching all of Turkana","Two levers, honestly costed", 8],
    ["06","The first 90 days","And what we need from you", 12]
  ];
  const x0 = 6.5, y0 = 1.02, rh = 0.9;
  items.forEach((it, i) => {
    const y = y0 + i * rh;
    s.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x:x0, y, w:6.18, h:0.76, rectRadius:0.03,
      fill:{ color: SURF }, line:{ color: LINE, width:0.75 } });
    s.addText(it[0], { x:x0+0.24, y:y+0.2, w:0.5, h:0.36, isTextBox:true, margin:0,
      fontFace:F, fontSize:12, bold:true, color:ORANGE, charSpacing:1 });
    s.addText(it[1], { x:x0+0.82, y:y+0.11, w:3.1, h:0.32, isTextBox:true, margin:0,
      fontFace:F, fontSize:14.5, bold:true, color:TXT,
      hyperlink:{ slide: it[3], tooltip: it[1] } });
    s.addText(it[2], { x:x0+0.82, y:y+0.42, w:5.1, h:0.28, isTextBox:true, margin:0,
      fontFace:F, fontSize:10.5, color:LOW });
    diamond(s, x0+5.78, y+0.33, 0.11, LOW);
  });
  s.addNotes("Say: I'll keep this to ten minutes and then show you the live version, which you can click yourself.");
}

/* ======================================================================= 3 */
{
  const s = newSlide(); menuDot(s);
  head(s, "01  ·  THE PROBLEM", "Everyone in this race\nis guessing.");

  body(s, "Turkana has 238,528 registered voters. Right now every campaign here — ours included — is working off crowd sizes, page likes and what the mobilisers say. None of that can be checked. On election eve you get a number somebody made up, defended loudly.",
    M, 2.55, 6.05, 14.5);

  const bx = 7.15, bw = 5.53;
  card(s, bx, 1.05, bw, 5.35, SURF);
  s.addText("WHAT A RIVAL WILL HAVE", { x:bx+0.42, y:1.42, w:4.7, h:0.3, isTextBox:true,
    margin:0, fontFace:F, fontSize:10, bold:true, color:LOW, charSpacing:1.8 });

  const rows = [
    ["Crowd at the last rally", "counted by eye"],
    ["42,000 page likes", "half from outside Turkana"],
    ["A paper list of names", "no phone, no ward"],
    ["\"We are strong in the north\"", "nobody has measured it"]
  ];
  rows.forEach((r, i) => {
    const y = 2.05 + i * 0.98;
    diamond(s, bx+0.42, y+0.13, 0.12, LOW);
    s.addText(r[0], { x:bx+0.72, y, w:4.5, h:0.34, isTextBox:true, margin:0,
      fontFace:F, fontSize:14, bold:true, color:TXT });
    s.addText(r[1], { x:bx+0.72, y:y+0.33, w:4.5, h:0.3, isTextBox:true, margin:0,
      fontFace:F, fontSize:11.5, color:LOW, italic:true });
  });
  s.addShape(pptx.shapes.LINE, { x:bx+0.42, y:5.72, w:4.7, h:0, line:{ color:LINE2, width:1 } });
  s.addText("None of it survives one hard question.", { x:bx+0.42, y:5.86, w:4.7, h:0.32,
    isTextBox:true, margin:0, fontFace:F, fontSize:12.5, bold:true, color:ORANGE });

  s.addNotes("The point isn't that rivals are lazy. It's that nobody in Kenyan county politics has the numbers, so the first campaign that does has an unfair advantage.");
}

/* ======================================================================= 4 */
{
  const s = newSlide(); menuDot(s);
  head(s, "02  ·  WHAT WE COLLECT", "One supporter.\nFive facts.");

  body(s, "Somebody signs up in ninety seconds, then gets a code by SMS. Until they type that code back, they are not on the register. That single rule is what makes every number we publish defensible.",
    M, 2.45, 5.55, 14.5);

  const fx = 6.5, fw = 6.18;
  const fields = [
    ["Their name", "So a coordinator greets a real person"],
    ["Their phone, confirmed", "One person, one number. The proof."],
    ["Their ward", "Turns a headcount into a percentage"],
    ["Their polling station", "Where their vote is actually counted"],
    ["Their chief's area", "How you call a baraza that they attend"]
  ];
  fields.forEach((f, i) => {
    const y = 1.02 + i * 1.06;
    card(s, fx, y, fw, 0.92, SURF);
    diamond(s, fx+0.3, y+0.4, 0.13, ORANGE);
    s.addText(f[0], { x:fx+0.62, y:y+0.16, w:5.3, h:0.32, isTextBox:true, margin:0,
      fontFace:F, fontSize:14.5, bold:true, color:TXT });
    s.addText(f[1], { x:fx+0.62, y:y+0.48, w:5.3, h:0.3, isTextBox:true, margin:0,
      fontFace:F, fontSize:11, color:LOW });
  });

  s.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x:M, y:5.05, w:5.55, h:1.35, rectRadius:0.03,
    fill:{ color:SURF2 }, line:{ color:ORANGE_DP, width:1 } });
  s.addText("No SMS, no supporter.", { x:M+0.34, y:5.24, w:4.9, h:0.36, isTextBox:true,
    margin:0, fontFace:F, fontSize:16, bold:true, color:ORANGE });
  s.addText("A signature, a shout at a rally or a follow online never enters a published figure.",
    { x:M+0.34, y:5.6, w:4.9, h:0.62, isTextBox:true, margin:0, fontFace:F,
      fontSize:11.5, color:MID, lineSpacing:16 });

  s.addNotes("Ninety seconds is the design target. Every extra field costs sign-ups, so nothing is asked for unless it does work later.");
}

/* ======================================================================= 5 */
{
  const s = newSlide(); menuDot(s);
  head(s, "03  ·  WHY SATURATION WINS", "Headcount lies.\nShare doesn't.");

  body(s, "Lodwar Township has our biggest crowd of supporters. Lokiriama has less than half as many — and is the stronger ward, because it has far fewer voters to win. Judge a ward by its own size and the map tells you where to drive.",
    M, 2.45, 5.5, 14);

  const cx = M, cy = 4.35;
  [["Lodwar Township","614","supporters","3.55%","of 17,273 voters", LOW],
   ["Lokiriama/Lorengippi","254","supporters","5.25%","of 4,835 voters", ORANGE]
  ].forEach((c, i) => {
    const x = cx + i * 2.9;
    card(s, x, cy, 2.65, 2.0, i ? SURF : SURF2);
    s.addText(c[0], { x:x+0.26, y:cy+0.2, w:2.15, h:0.5, isTextBox:true, margin:0,
      fontFace:F, fontSize:11, bold:true, color:MID, lineSpacing:14 });
    s.addText(c[3], { x:x+0.26, y:cy+0.72, w:2.15, h:0.6, isTextBox:true, margin:0,
      fontFace:F, fontSize:30, bold:true, color:c[5] });
    s.addText(c[1] + " " + c[2], { x:x+0.26, y:cy+1.34, w:2.15, h:0.28, isTextBox:true,
      margin:0, fontFace:F, fontSize:11.5, color:TXT });
    s.addText(c[4], { x:x+0.26, y:cy+1.6, w:2.15, h:0.28, isTextBox:true, margin:0,
      fontFace:F, fontSize:10.5, color:LOW });
  });

  s.addChart(pptx.charts.BAR, [{
    name: "Ward saturation",
    labels: ["Katilu","Kotaruk/Lobei","Kang'atotha","Katilia","Lopur","Lokiriama/Lorengippi"],
    values: [3.80, 3.80, 3.88, 4.55, 4.74, 5.25]
  }], {
    x:6.5, y:1.02, w:6.18, h:5.35,
    barDir:"bar", barGapWidthPct:52,
    chartColors:[ORANGE],
    showTitle:true, title:"Our six strongest wards, by share of that ward",
    titleColor:TXT, titleFontSize:13, titleFontFace:F, titleAlign:"left",
    showValue:true, dataLabelPosition:"outEnd", dataLabelColor:TXT,
    dataLabelFontFace:F, dataLabelFontSize:11, dataLabelFormatCode:'0.00"%"',
    catAxisLabelColor:MID, catAxisLabelFontFace:F, catAxisLabelFontSize:11,
    valAxisLabelColor:LOW, valAxisLabelFontFace:F, valAxisLabelFontSize:10,
    valAxisMinVal:0, valAxisMaxVal:6, valGridLine:{ color:LINE, size:0.75 },
    catGridLine:{ style:"none" }, showLegend:false,
    valAxisLineColor:LINE, catAxisLineColor:LINE, chartArea:{ fill:{ color:SURF } }
  });

  s.addNotes("This is the slide that changes how he reads every future report. A raw supporter total is a vanity number; share of a ward is an instruction.");
}

/* ======================================================================= 6 */
{
  const s = newSlide(); menuDot(s);
  head(s, "04  ·  WHERE TO GO NEXT", "The board picks\nthe route.");

  body(s, "Twenty of our thirty wards are still cold — under three per cent. Cold isn't hostile, it's unmeasured. Turkwel alone holds 19,528 voters and has barely been asked. These are the six emptiest boxes on the board, and the next fortnight belongs to them.",
    M, 2.45, 5.5, 14);

  const sy = 4.55;
  [["20","wards still cold",LOW],["4,981","verified today",ORANGE],["2.09%","of the county",TXT]]
    .forEach((t, i) => stat(s, M + i*1.9, sy, 1.8, t[0], t[1], t[2]));

  s.addChart(pptx.charts.BAR, [{
    name: "Ward saturation",
    labels: ["Kalapata","Lapur","Nanaam","Kalokol","Kerio Delta","Loima"],
    values: [0.37, 0.36, 0.36, 0.32, 0.30, 0.23]
  }], {
    x:6.5, y:1.02, w:6.18, h:5.35,
    barDir:"bar", barGapWidthPct:52,
    chartColors:[ORANGE_DP],
    showTitle:true, title:"Coldest six — where the caravan goes next",
    titleColor:TXT, titleFontSize:13, titleFontFace:F, titleAlign:"left",
    showValue:true, dataLabelPosition:"outEnd", dataLabelColor:TXT,
    dataLabelFontFace:F, dataLabelFontSize:11, dataLabelFormatCode:'0.00"%"',
    catAxisLabelColor:MID, catAxisLabelFontFace:F, catAxisLabelFontSize:11,
    valAxisLabelColor:LOW, valAxisLabelFontFace:F, valAxisLabelFontSize:10,
    valAxisMinVal:0, valAxisMaxVal:0.6, valGridLine:{ color:LINE, size:0.75 },
    catGridLine:{ style:"none" }, showLegend:false,
    valAxisLineColor:LINE, catAxisLineColor:LINE, chartArea:{ fill:{ color:SURF } }
  });

  s.addNotes("Offer to open the live board here — he can tap any ward and see its real polling stations.");
}

/* ======================================================================= 7 */
{
  const s = newSlide(); menuDot(s);
  head(s, "THE WHOLE COUNTY", "Thirty wards,\none screen.", { tw:5.4 });

  s.addText("One tile per ward, grouped by constituency and laid out roughly as they sit on the ground — north at the top, the south below. Every tile is the same size on purpose: the northern wards are huge and nearly empty, so drawn to land area they would swamp the map while holding a fraction of the vote.",
    { x:6.5, y:1.02, w:6.18, h:1.4, isTextBox:true, margin:0, fontFace:F, fontSize:12.5,
      color:MID, lineSpacing:18 });

  [["Cold","under 3%",ORANGE_DP],["Working","3–8%",ORANGE],["Holding","over 8%",ORANGE_BR]]
    .forEach((l, i) => {
      const x = 6.5 + i * 2.06;
      s.addShape(pptx.shapes.RECTANGLE, { x, y:2.52, w:0.28, h:0.18,
        fill:{ color:l[2] }, line:{ type:"none" } });
      s.addText(l[0] + "  " + l[1], { x:x+0.38, y:2.44, w:1.68, h:0.32, isTextBox:true,
        margin:0, fontFace:F, fontSize:10.5, color:MID });
    });

  s.addText("Open the live map — tap any ward for its polling stations",
    { x:M, y:2.44, w:5.4, h:0.32, isTextBox:true, margin:0, fontFace:F, fontSize:12,
      bold:true, color:ORANGE, underline:{ style:"sng" },
      hyperlink:{ url: BOARD_URL, tooltip:"Opens the interactive board" } });

  /* 30 native tiles. Geometry is computed from the block's own box, so a block
     can never run into its neighbour the way a hand-placed grid can. */
  const band = v => v < 3 ? ORANGE_DP : v < 8 ? ORANGE : ORANGE_BR;
  const ink  = v => v < 3 ? TXT : "20140A";
  const TH = 0.58, G = 0.07, LBL = 0.24;

  function block(label, wards, bx, by, bw, cols){
    s.addText(label, { x:bx, y:by, w:bw, h:0.2, isTextBox:true, margin:0, fontFace:F,
      fontSize:8.5, bold:true, color:LOW, charSpacing:1.5 });
    const tw = (bw - (cols - 1) * G) / cols;
    wards.forEach((wd, i) => {
      const c = i % cols, r = Math.floor(i / cols);
      const x = bx + c * (tw + G), y = by + LBL + r * (TH + G);
      s.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x, y, w:tw, h:TH, rectRadius:0.05,
        fill:{ color: band(wd[1]) }, line:{ type:"none" } });
      s.addText(wd[1].toFixed(2) + "%", { x:x+0.08, y:y+0.05, w:tw-0.16, h:0.26,
        isTextBox:true, margin:0, fontFace:F, fontSize:11, bold:true, color: ink(wd[1]) });
      s.addText(wd[0], { x:x+0.08, y:y+0.31, w:tw-0.16, h:0.24, isTextBox:true, margin:0,
        fontFace:F, fontSize:7, bold:true, color: ink(wd[1]) });
    });
  }

  const MY = 2.86, FULL = 12.06, HALF = 5.90, THIRD = 3.847, BG2 = 0.26;
  const R1 = LBL + TH;                 // one row of tiles
  const R2 = LBL + TH * 2 + G;         // two rows

  block("TURKANA NORTH",
    [["Kaeris",2.17],["Lake Zone",1.91],["Lapur",0.36],["Kaaleng/Kaikor",1.33],["Kibish",1.71],["Nakalale",1.38]],
    M, MY, FULL, 6);

  const Y2 = MY + R1 + 0.16;
  block("TURKANA WEST",
    [["Kakuma",3.11],["Lopur",4.74],["Letea",3.31],["Songot",0.87],["Kalobeyei",0.98],["Lokichoggio",0.78],["Nanaam",0.36]],
    M, Y2, HALF, 4);
  block("TURKANA CENTRAL",
    [["Kerio Delta",0.30],["Kang'atotha",3.88],["Kalokol",0.32],["Lodwar Twp",3.55],["Kanamkemer",1.20]],
    M + HALF + BG2, Y2, HALF, 3);

  const Y3 = Y2 + R2 + 0.16;
  block("LOIMA",
    [["Kotaruk/Lobei",3.80],["Turkwel",2.09],["Loima",0.23],["Lokiriama",5.25]],
    M, Y3, THIRD, 2);
  block("TURKANA SOUTH",
    [["Kaputir",3.74],["Katilu",3.80],["Lobokat",0.52],["Kalapata",0.37],["Lokichar",0.96]],
    M + THIRD + BG2, Y3, THIRD, 3);
  block("TURKANA EAST",
    [["Kapedo",0.56],["Katilia",4.55],["Lokori",1.38]],
    M + (THIRD + BG2) * 2, Y3, THIRD, 2);

  s.addNotes("Hand him the phone here. The live version lets him tap Kibish and see that six of its ten polling stations are a mobile unit or a water point.");
}

/* ======================================================================= 8 */
{
  const s = newSlide(); menuDot(s);
  head(s, "05  ·  REACHING ALL OF TURKANA", "Two levers.\nBe honest about both.");

  body(s, "Reach 60,000 people a month online and 1,056 join. Reach the same 60,000 through barazas, agents and USSD and 5,811 join — five times better, because somebody is standing there. But ground costs fuel and days. Digital is cheap; ground converts. We need both.",
    M, 2.42, 5.5, 13.5);

  s.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x:M, y:4.75, w:5.5, h:1.62, rectRadius:0.03,
    fill:{ color:SURF2 }, line:{ color:ORANGE_DP, width:1 } });
  diamond(s, M+0.32, 5.02, 0.15);
  s.addText("Digital alone never reaches the north.", { x:M+0.62, y:4.93, w:4.6, h:0.34,
    isTextBox:true, margin:0, fontFace:F, fontSize:14.5, bold:true, color:ORANGE });
  s.addText("At 60,000 online-only, all seven of the hardest wards stay cold. Six of Kibish's ten polling stations are a mobile unit or a water point. Those voters need USSD and a person.",
    { x:M+0.62, y:5.3, w:4.55, h:0.95, isTextBox:true, margin:0, fontFace:F,
      fontSize:11.5, color:MID, lineSpacing:16 });

  s.addChart(pptx.charts.BAR, [{
    name: "New verified supporters per month",
    labels: ["Digital only","Half and half","Ground & SMS only"],
    values: [1056, 3434, 5811]
  }], {
    x:6.5, y:1.02, w:6.18, h:3.55,
    barDir:"col", barGapWidthPct:62,
    chartColors:[ORANGE_DP, ORANGE, ORANGE_BR],
    varyColors:true,
    showTitle:true, title:"Same 60,000 people reached each month",
    titleColor:TXT, titleFontSize:13, titleFontFace:F, titleAlign:"left",
    showValue:true, dataLabelPosition:"outEnd", dataLabelColor:TXT,
    dataLabelFontFace:F, dataLabelFontSize:12, dataLabelFormatCode:"#,##0",
    catAxisLabelColor:MID, catAxisLabelFontFace:F, catAxisLabelFontSize:11,
    valAxisLabelColor:LOW, valAxisLabelFontFace:F, valAxisLabelFontSize:10,
    valAxisMinVal:0, valAxisMaxVal:7000, valGridLine:{ color:LINE, size:0.75 },
    catGridLine:{ style:"none" }, showLegend:false,
    valAxisLineColor:LINE, catAxisLineColor:LINE, chartArea:{ fill:{ color:SURF } }
  });

  const hx = 6.5;
  [["7 of 7","hard wards still cold",ORANGE_DP],["6 of 7","still cold",ORANGE],["0 of 7","all reached",ORANGE_BR]]
    .forEach((t, i) => {
      const x = hx + i * 2.09;
      card(s, x, 4.82, 1.95, 1.55, SURF);
      s.addText(t[0], { x:x+0.2, y:5.0, w:1.6, h:0.44, isTextBox:true, margin:0,
        fontFace:F, fontSize:19, bold:true, color:t[2] });
      s.addText(t[1], { x:x+0.2, y:5.46, w:1.6, h:0.7, isTextBox:true, margin:0,
        fontFace:F, fontSize:10, color:LOW, lineSpacing:13 });
    });

  s.addNotes("Do not oversell digital. He knows Turkana. Saying digital wins the county would lose the room; saying digital is cheap reach and ground is conversion is the version he will believe.");
}

/* ======================================================================= 9 */
{
  const s = newSlide(); menuDot(s);
  head(s, "THE NEXT NINETY DAYS", "What both levers\nlook like.", { tw:5.2 });

  s.addText("Same budgeted reach, two different mixes. Online-only adds about 3,200 people by day ninety. Running both adds over 10,000 — and reaches wards the first mix never touches.",
    { x:M, y:2.5, w:4.9, h:1.4, isTextBox:true, margin:0, fontFace:F, fontSize:13.5,
      color:MID, lineSpacing:20 });

  stat(s, M, 4.3, 2.2, "8,150", "DIGITAL ONLY, DAY 90", LOW);
  stat(s, M, 5.42, 2.4, "15,282", "BOTH LEVERS, DAY 90", ORANGE);

  s.addChart(pptx.charts.LINE, [
    { name:"Digital only", labels:["Today","Day 30","Day 60","Day 90"], values:[4981,6037,7094,8150] },
    { name:"Both levers",  labels:["Today","Day 30","Day 60","Day 90"], values:[4981,8415,11848,15282] }
  ], {
    x:6.0, y:1.02, w:6.68, h:5.35,
    chartColors:[LOW, ORANGE], lineDataSymbol:"circle", lineDataSymbolSize:7,
    lineSize:3, lineSmooth:false,
    showTitle:true, title:"Verified supporters on the register",
    titleColor:TXT, titleFontSize:13, titleFontFace:F, titleAlign:"left",
    showValue:true, dataLabelPosition:"t", dataLabelColor:MID,
    dataLabelFontFace:F, dataLabelFontSize:10, dataLabelFormatCode:"#,##0",
    catAxisLabelColor:MID, catAxisLabelFontFace:F, catAxisLabelFontSize:11,
    valAxisLabelColor:LOW, valAxisLabelFontFace:F, valAxisLabelFontSize:10,
    valAxisMaxVal:18000, valAxisMinVal:0,
    valGridLine:{ color:LINE, size:0.75 }, catGridLine:{ style:"none" },
    showLegend:true, legendPos:"b", legendColor:MID, legendFontFace:F, legendFontSize:11,
    valAxisLineColor:LINE, catAxisLineColor:LINE, chartArea:{ fill:{ color:SURF } }
  });

  s.addNotes("These are planning assumptions, not results. Say so out loud — it is the sentence that makes him trust the other numbers.");
}

/* ====================================================================== 10 */
{
  const s = newSlide(); menuDot(s);
  head(s, "THE PART NOBODY EXPECTS", "What we deliberately\nrefuse to hold.");

  body(s, "Political opinion is sensitive personal data under Kenya's Data Protection Act. Any rival can promise to protect Turkana's data. We can show we never collected it — that is a much harder thing to argue with, and it is already built.",
    M, 2.5, 5.6, 14);

  const rx = 6.5, rw = 6.18;
  [["Full ID numbers","Last four digits only, and even that optional"],
   ["Date of birth","Year only — enough to plan, not to impersonate"],
   ["Raw location data","IP and device values are hashed on the way in"]
  ].forEach((r, i) => {
    const y = 1.15 + i * 1.5;
    card(s, rx, y, rw, 1.28, SURF);
    s.addShape(pptx.shapes.OVAL, { x:rx+0.3, y:y+0.42, w:0.44, h:0.44,
      fill:{ color:SURF2 }, line:{ color:ORANGE, width:1.25 } });
    s.addShape(pptx.shapes.LINE, { x:rx+0.38, y:y+0.64, w:0.28, h:0,
      line:{ color:ORANGE, width:2 } });
    s.addText(r[0], { x:rx+0.94, y:y+0.28, w:5.0, h:0.36, isTextBox:true, margin:0,
      fontFace:F, fontSize:15.5, bold:true, color:TXT });
    s.addText(r[1], { x:rx+0.94, y:y+0.66, w:5.0, h:0.4, isTextBox:true, margin:0,
      fontFace:F, fontSize:11.5, color:LOW });
  });

  s.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x:M, y:4.9, w:5.6, h:1.5, rectRadius:0.03,
    fill:{ color:SURF2 }, line:{ color:LINE2, width:1 } });
  s.addText("When we are accused of harvesting Turkana's ID numbers — and we will be — the answer is a database schema, not a denial.",
    { x:M+0.34, y:5.12, w:4.95, h:1.1, isTextBox:true, margin:0, fontFace:F,
      fontSize:13, color:TXT, italic:true, lineSpacing:19 });

  s.addNotes("This is the strongest defensive slide in the deck. Register with the ODPC in week one — non-registration is itself an offence.");
}

/* ====================================================================== 11 */
{
  const s = newSlide(); menuDot(s);
  head(s, "THE ADVANTAGE", "Come election week,\nonly one of these holds up.", { ts:31, tw:11 });

  const cy = 2.5, cw = 6.02, ch = 3.9;
  [["THEM", "A number somebody made up", [
      "Crowd sizes counted by eye",
      "Likes from outside the county",
      "Mobiliser reports the boss wants to hear",
      "A paper list with no phone, no ward"
    ], SURF, LOW],
   ["US", "A number that survives a journalist", [
      "Every supporter tied to a polling station",
      "Share of each ward, on real IEBC totals",
      "Duplicates flagged before anyone else finds them",
      "A ready call list of people who offered to help"
    ], SURF2, ORANGE]
  ].forEach((col, i) => {
    const x = M + i * (cw + 0.62);
    card(s, x, cy, cw, ch, col[3]);
    s.addText(col[0], { x:x+0.42, y:cy+0.32, w:2, h:0.32, isTextBox:true, margin:0,
      fontFace:F, fontSize:11, bold:true, color:col[4], charSpacing:2.2 });
    s.addText(col[1], { x:x+0.42, y:cy+0.66, w:cw-0.84, h:0.5, isTextBox:true, margin:0,
      fontFace:F, fontSize:16, bold:true, color:TXT });
    col[2].forEach((t, j) => {
      const y = cy + 1.4 + j * 0.62;
      diamond(s, x+0.42, y+0.09, 0.12, col[4]);
      s.addText(t, { x:x+0.74, y, w:cw-1.2, h:0.4, isTextBox:true, margin:0,
        fontFace:F, fontSize:12.5, color:MID });
    });
  });

  s.addNotes("The advantage is not that we are online and they are not — they will be online too. It is that our number can be checked and theirs cannot.");
}

/* ====================================================================== 12 */
{
  const s = newSlide(); menuDot(s);
  head(s, "06  ·  THE FIRST 90 DAYS", "Six steps, in this order.", { ts:32, tw:11 });

  s.addText("Two of these have long waits we do not control, so they start on day one.",
    { x:M, y:2.02, w:8, h:0.34, isTextBox:true, margin:0, fontFace:F, fontSize:13, color:LOW });

  const steps = [
    ["01","Shortcode paperwork","Week 1","Africa's Talking and CA approval. The longest wait — nothing speeds it up later."],
    ["02","Register with the ODPC","Week 1–2","As a Data Controller. Not registering is itself an offence."],
    ["03","Sign off the promises","Week 2","Everything on the site has to sit inside what a senator can deliver."],
    ["04","Launch three wards","Week 3–5","Lodwar, Kanamkemer, Kakuma. Real numbers replace our assumptions."],
    ["05","Recruit ward agents","Week 4–9","From people who already volunteered, in the ward they live in."],
    ["06","Open the north","Week 6–13","Kibish, Lapur, Nanaam, Loima — by USSD and baraza, not by advert."]
  ];
  const sw = 3.92, sh = 1.72;
  steps.forEach((st, i) => {
    const c = i % 3, r = Math.floor(i / 3);
    const x = M + c * (sw + 0.24), y = 2.62 + r * (sh + 0.26);
    card(s, x, y, sw, sh, r === 0 ? SURF2 : SURF);
    s.addText(st[0], { x:x+0.3, y:y+0.22, w:0.5, h:0.3, isTextBox:true, margin:0,
      fontFace:F, fontSize:11.5, bold:true, color:ORANGE, charSpacing:1 });
    s.addText(st[2], { x:x+sw-1.5, y:y+0.22, w:1.2, h:0.3, isTextBox:true, margin:0,
      fontFace:F, fontSize:10, bold:true, color:LOW, align:"right", charSpacing:1 });
    s.addText(st[1], { x:x+0.3, y:y+0.56, w:sw-0.6, h:0.34, isTextBox:true, margin:0,
      fontFace:F, fontSize:14.5, bold:true, color:TXT });
    s.addText(st[3], { x:x+0.3, y:y+0.92, w:sw-0.6, h:0.66, isTextBox:true, margin:0,
      fontFace:F, fontSize:10.5, color:LOW, lineSpacing:14 });
  });

  s.addNotes("If he only agrees to two things today, make them the shortcode paperwork and the ODPC registration. Everything else waits on those.");
}

/* ====================================================================== 13 */
{
  const s = newSlide();
  s.addShape(pptx.shapes.DIAMOND, { x:9.9, y:2.5, w:2.6, h:2.6,
    fill:{ color:ORANGE, transparency:88 }, line:{ color:ORANGE, width:1 } });
  s.addShape(pptx.shapes.DIAMOND, { x:10.55, y:3.15, w:1.3, h:1.3,
    fill:{ color:ORANGE }, line:{ type:"none" } });

  diamond(s, M, 0.72, 0.19);
  s.addText("WHAT WE ASK TODAY", { x:M+0.33, y:0.6, w:8, h:0.36, isTextBox:true, margin:0,
    fontFace:F, fontSize:11.5, bold:true, color:ORANGE, charSpacing:2.6 });

  s.addText("By day 90,\nno ward at zero.", { x:M, y:1.9, w:8.4, h:1.8, isTextBox:true,
    margin:0, fontFace:F, fontSize:42, bold:true, color:TXT, lineSpacing:50 });

  s.addText("Not every ward warm — that takes two years. Every ward measured. From that day on, every shilling this campaign spends is aimed at a number instead of a hunch.",
    { x:M, y:3.95, w:7.8, h:1.1, isTextBox:true, margin:0, fontFace:F, fontSize:15,
      color:MID, lineSpacing:23 });

  s.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x:M, y:5.3, w:4.3, h:0.72, rectRadius:0.04,
    fill:{ color:ORANGE }, line:{ type:"none" },
    hyperlink:{ url: BOARD_URL, tooltip:"Opens the live interactive board" } });
  s.addText("Open the live board", { x:M, y:5.3, w:4.3, h:0.72, isTextBox:true, margin:0,
    fontFace:F, fontSize:15, bold:true, color:"20140A", align:"center", valign:"middle",
    underline:{ style:"none" },
    hyperlink:{ url: BOARD_URL, tooltip:"Opens the live interactive board" } });
  s.addText("Tap any ward. Move the dials. Sign yourself up.",
    { x:M+4.55, y:5.48, w:4.4, h:0.4, isTextBox:true, margin:0, fontFace:F,
      fontSize:12, color:LOW, italic:true });

  s.addShape(pptx.shapes.LINE, { x:M, y:6.5, w:12.06, h:0, line:{ color:LINE2, width:1 } });
  s.addText("Ward, constituency and polling-station figures are the real IEBC register for Turkana. Supporter counts are an illustrative scenario, not real people. Conversion rates are planning assumptions.",
    { x:M, y:6.64, w:12.06, h:0.5, isTextBox:true, margin:0, fontFace:F, fontSize:9,
      color:LOW, lineSpacing:12 });

  s.addNotes("Close by handing over the phone. The live board does more in thirty seconds than another slide would.");
}

pptx.writeFile({ fileName: process.argv[2] || "turkana-board-deck.pptx" })
  .then(f => console.log("wrote", f));
