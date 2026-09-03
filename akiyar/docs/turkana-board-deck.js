/* Akiyar client deck. Prepared by Brian Lokwawi Napeirot, IT Manager,
   Ekusi Lore campaign, Turkana Senate 2027.

   The ground is the campaign logo's own plate green, #025835, sampled from
   the artwork rather than guessed. Panels sit darker than the page instead
   of lighter, which is what the contrast maths asked for: on #013322 even
   the raw party orange reads at 5.14 to 1, while on a lighter green it drops
   to 2.42 and fails outright. The sage in the logo does the work of a
   secondary text colour at 5.90 to 1 on the page.

   House rule for this deck: no hyphens and no dashes anywhere a reader can
   see them. Ranges are written out. */
const pptx = new (require("pptxgenjs"))();

const PAGE="025835", CARD="01412A", WELL="013322";
const LINE="0A6E45", LINE2="0E8455";
const TXT="F4F2EE", SAGE="D6DAA7", MUTED="B5C9BA";
const ORANGE="F47B20", OR_TXT="FFB066", OR_PALE="FFC98A", OR_DEEP="A85410";
const INK_ON_ORANGE="1B2E12";
const BOARD_URL = "https://claude.ai/code/artifact/f57c9c04-a60d-49e8-b023-0a40c15288c9";
const F = "Arial";
const LOGO = "ekusi-mark-opt.png";
const LOGO_AR = 1.0919;                    // measured from the knocked out mark

pptx.layout = "LAYOUT_WIDE";               // 13.3 x 7.5in, set before any slide
pptx.author = "Brian Lokwawi Napeirot";
pptx.company = "Ekusi Lore, Turkana Senate 2027";
pptx.title = "The Turkana Board";
pptx.subject = "Supporter register and mobilisation brief";

const W = 13.3, H = 7.5, M = 0.62;

function logo(s, x, y, h){
  s.addImage({ path: LOGO, x, y, w: h * LOGO_AR, h });
}
function newSlide(){
  const s = pptx.addSlide();
  s.background = { color: PAGE };
  return s;
}
/* The campaign mark, the kicker and the title. Repeated on every slide so
   the logo is doing the work the diamond placeholder used to do. */
function head(s, kicker, title, opts){
  const o = opts || {};
  logo(s, M, 0.38, 0.62);
  s.addText(kicker, { x:M + 0.62 * LOGO_AR + 0.18, y:0.52, w:8, h:0.34, isTextBox:true,
    margin:0, fontFace:F, fontSize:11, bold:true, color:SAGE, charSpacing:2.4 });
  s.addText(title, { x:M, y:1.12, w: o.tw || 5.7, h: o.th || 0.95, isTextBox:true, margin:0,
    fontFace:F, fontSize: o.ts || 34, bold:true, color:TXT, lineSpacing: o.ls || 36 });
}
function menuDot(s){
  s.addText("MENU", { x: W-M-0.85, y:0.56, w:0.85, h:0.3, isTextBox:true, margin:0,
    fontFace:F, fontSize:9, bold:true, color:MUTED, align:"right", charSpacing:1.6,
    hyperlink:{ slide:2, tooltip:"Back to the agenda" } });
}
function body(s, text, x, y, w, size){
  s.addText(text, { x, y, w, h:1.5, isTextBox:true, margin:0, fontFace:F,
    fontSize: size || 14, color:MUTED, lineSpacing: (size || 14) * 1.5, valign:"top" });
}
function card(s, x, y, w, h, fill){
  s.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius:0.03,
    fill:{ color: fill || CARD }, line:{ color: LINE, width:0.75 } });
}
function pip(s, x, y, size, color){
  s.addShape(pptx.shapes.DIAMOND, { x, y, w:size, h:size,
    fill:{ color: color || SAGE }, line:{ type:"none" } });
}
function stat(s, x, y, w, value, label, color){
  s.addText(value, { x, y, w, h:0.72, isTextBox:true, margin:0, fontFace:F,
    fontSize:38, bold:true, color: color || TXT });
  s.addText(label, { x, y:y+0.72, w, h:0.32, isTextBox:true, margin:0, fontFace:F,
    fontSize:10, bold:true, color:SAGE, charSpacing:1.6 });
}
/* One chart frame, so every chart in the deck sits on the same ground. */
function chartFrame(extra){
  return Object.assign({
    catAxisLabelColor:MUTED, catAxisLabelFontFace:F, catAxisLabelFontSize:11,
    valAxisLabelColor:SAGE, valAxisLabelFontFace:F, valAxisLabelFontSize:10,
    valGridLine:{ color:LINE, size:0.75 }, catGridLine:{ style:"none" },
    valAxisLineColor:LINE, catAxisLineColor:LINE,
    titleColor:TXT, titleFontSize:13, titleFontFace:F, titleAlign:"left", showTitle:true,
    dataLabelColor:TXT, dataLabelFontFace:F,
    chartArea:{ fill:{ color: WELL } }, valAxisMinVal:0
  }, extra);
}

/* ======================================================================= 1 */
{
  const s = newSlide();
  logo(s, 9.05, 1.75, 3.35);

  s.addText("EKUSI LORE   ·   TURKANA COUNTY   ·   SENATE 2027",
    { x:M, y:0.68, w:8.4, h:0.36, isTextBox:true, margin:0,
      fontFace:F, fontSize:11.5, bold:true, color:SAGE, charSpacing:2.6 });

  s.addText("We don't guess\nwho is with us.\nWe can name them.",
    { x:M, y:2.15, w:8.2, h:2.9, isTextBox:true, margin:0, fontFace:F,
      fontSize:46, bold:true, color:TXT, lineSpacing:52 });

  s.addText("A supporter register for Turkana, built so that every number we publish can survive being questioned.",
    { x:M, y:5.2, w:7.7, h:0.7, isTextBox:true, margin:0, fontFace:F,
      fontSize:15.5, color:MUTED, lineSpacing:23 });

  s.addShape(pptx.shapes.LINE, { x:M, y:6.26, w:12.06, h:0, line:{ color:LINE2, width:1 } });
  s.addText("AKIYAR   ·   COMMAND BRIEF", { x:M, y:6.42, w:6, h:0.32, isTextBox:true,
    margin:0, fontFace:F, fontSize:10, bold:true, color:SAGE, charSpacing:2 });
  s.addText("Brian Lokwawi Napeirot   ·   IT Manager", { x:W-M-6, y:6.42, w:6, h:0.32,
    isTextBox:true, margin:0, fontFace:F, fontSize:10, color:MUTED, align:"right" });

  s.addNotes("Open on the question the whole system answers. How many supporters do we actually have, and where exactly do they vote? Everything after this is that one question.");
}

/* ======================================================================= 2 */
{
  const s = newSlide();
  head(s, "AGENDA", "Ten minutes.\nSix things.", { tw:5.7 });
  s.addText("Click any line to jump straight to it.", { x:M, y:2.5, w:5.4, h:0.4,
    isTextBox:true, margin:0, fontFace:F, fontSize:12, color:SAGE, italic:true });

  s.addShape(pptx.shapes.LINE, { x:M, y:3.24, w:5.3, h:0, line:{ color:LINE2, width:1 } });
  s.addText("WHAT WE ARE PLAYING FOR", { x:M, y:3.42, w:5.3, h:0.3, isTextBox:true,
    margin:0, fontFace:F, fontSize:10, bold:true, color:SAGE, charSpacing:1.8 });
  [["238,528","registered voters in Turkana"],
   ["30","wards, each with its own real total"],
   ["559","polling stations where it is counted"]
  ].forEach((t, i) => {
    const y = 3.92 + i * 0.9;
    s.addText(t[0], { x:M, y, w:2.1, h:0.5, isTextBox:true, margin:0, fontFace:F,
      fontSize:26, bold:true, color: i ? TXT : OR_TXT });
    s.addText(t[1], { x:M+2.25, y:y+0.12, w:3.1, h:0.4, isTextBox:true, margin:0,
      fontFace:F, fontSize:11.5, color:MUTED });
  });

  const items = [
    ["01","The problem","Everyone in this race is guessing", 3],
    ["02","What we collect","One supporter, five facts", 4],
    ["03","Why saturation wins","Why share beats headcount", 5],
    ["04","Where to go next","The board picks the route", 6],
    ["05","Reaching all of Turkana","Two levers, costed honestly", 8],
    ["06","The first 90 days","And what I need from you", 12]
  ];
  const x0 = 6.5, y0 = 1.14, rh = 0.9;
  items.forEach((it, i) => {
    const y = y0 + i * rh;
    card(s, x0, y, 6.18, 0.76);
    s.addText(it[0], { x:x0+0.24, y:y+0.2, w:0.5, h:0.36, isTextBox:true, margin:0,
      fontFace:F, fontSize:12, bold:true, color:OR_TXT, charSpacing:1 });
    s.addText(it[1], { x:x0+0.82, y:y+0.11, w:3.4, h:0.32, isTextBox:true, margin:0,
      fontFace:F, fontSize:14.5, bold:true, color:TXT,
      hyperlink:{ slide: it[3], tooltip: it[1] } });
    s.addText(it[2], { x:x0+0.82, y:y+0.42, w:5.1, h:0.28, isTextBox:true, margin:0,
      fontFace:F, fontSize:10.5, color:MUTED });
    pip(s, x0+5.78, y+0.33, 0.11, SAGE);
  });
  s.addNotes("Say that you will keep it to ten minutes, then show him the live version he can click himself.");
}

/* ======================================================================= 3 */
{
  const s = newSlide(); menuDot(s);
  head(s, "01  ·  THE PROBLEM", "Everyone in this race\nis guessing.");

  body(s, "Turkana has 238,528 registered voters. Right now every campaign here, ours included, is working from crowd sizes, page likes and whatever the mobilisers report. None of it can be checked. On election eve you are left holding a number somebody invented, defended loudly.",
    M, 2.62, 6.05, 14.5);

  const bx = 7.15, bw = 5.53;
  card(s, bx, 1.12, bw, 5.3, CARD);
  s.addText("WHAT A RIVAL WILL HAVE", { x:bx+0.42, y:1.48, w:4.7, h:0.3, isTextBox:true,
    margin:0, fontFace:F, fontSize:10, bold:true, color:SAGE, charSpacing:1.8 });

  [["Crowd at the last rally", "counted by eye"],
   ["42,000 page likes", "half from outside Turkana"],
   ["A paper list of names", "no phone and no ward"],
   ["“We are strong in the north”", "nobody has measured it"]
  ].forEach((r, i) => {
    const y = 2.1 + i * 0.96;
    pip(s, bx+0.42, y+0.13, 0.12, SAGE);
    s.addText(r[0], { x:bx+0.72, y, w:4.5, h:0.34, isTextBox:true, margin:0,
      fontFace:F, fontSize:14, bold:true, color:TXT });
    s.addText(r[1], { x:bx+0.72, y:y+0.33, w:4.5, h:0.3, isTextBox:true, margin:0,
      fontFace:F, fontSize:11.5, color:MUTED, italic:true });
  });
  s.addShape(pptx.shapes.LINE, { x:bx+0.42, y:5.72, w:4.7, h:0, line:{ color:LINE2, width:1 } });
  s.addText("None of it survives one hard question.", { x:bx+0.42, y:5.88, w:4.7, h:0.32,
    isTextBox:true, margin:0, fontFace:F, fontSize:12.5, bold:true, color:OR_TXT });

  s.addNotes("The point is not that rivals are lazy. Nobody in county politics has these numbers, so the first campaign that does gets an unfair advantage.");
}

/* ======================================================================= 4 */
{
  const s = newSlide(); menuDot(s);
  head(s, "02  ·  WHAT WE COLLECT", "One supporter.\nFive facts.");

  body(s, "Somebody signs up in ninety seconds, then a code arrives by SMS. Until they type that code back, they are not on the register. That one rule is what lets us defend every figure we publish.",
    M, 2.52, 5.55, 14.5);

  const fx = 6.5, fw = 6.18;
  [["Their name", "So a coordinator greets a real person"],
   ["Their phone, confirmed", "One person, one number. That is the proof."],
   ["Their ward", "Turns a headcount into a percentage"],
   ["Their polling station", "Where their vote is actually counted"],
   ["Their chief's area", "How you call a baraza they will attend"]
  ].forEach((f, i) => {
    const y = 1.14 + i * 1.05;
    card(s, fx, y, fw, 0.9, CARD);
    pip(s, fx+0.3, y+0.39, 0.13, OR_TXT);
    s.addText(f[0], { x:fx+0.62, y:y+0.15, w:5.3, h:0.32, isTextBox:true, margin:0,
      fontFace:F, fontSize:14.5, bold:true, color:TXT });
    s.addText(f[1], { x:fx+0.62, y:y+0.47, w:5.3, h:0.3, isTextBox:true, margin:0,
      fontFace:F, fontSize:11, color:MUTED });
  });

  s.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x:M, y:5.08, w:5.55, h:1.34, rectRadius:0.03,
    fill:{ color:WELL }, line:{ color:ORANGE, width:1 } });
  s.addText("No SMS, no supporter.", { x:M+0.34, y:5.26, w:4.9, h:0.36, isTextBox:true,
    margin:0, fontFace:F, fontSize:16, bold:true, color:OR_TXT });
  s.addText("A signature, a shout at a rally or a follow online never enters a published figure.",
    { x:M+0.34, y:5.62, w:4.9, h:0.62, isTextBox:true, margin:0, fontFace:F,
      fontSize:11.5, color:MUTED, lineSpacing:16 });

  s.addNotes("Ninety seconds is the design target. Every extra question costs sign ups, so nothing is asked unless it does real work later.");
}

/* ======================================================================= 5 */
{
  const s = newSlide(); menuDot(s);
  head(s, "03  ·  WHY SATURATION WINS", "Headcount lies.\nShare does not.");

  body(s, "Lodwar Township gives us our biggest crowd of supporters. Lokiriama has less than half as many and is the stronger ward, because it has far fewer voters to win. Judge a ward against its own size and the map starts telling you where to drive.",
    M, 2.52, 5.5, 14);

  const cy = 4.4;
  [["Lodwar Township","614","supporters","3.55%","of 17,273 voters", MUTED],
   ["Lokiriama/Lorengippi","254","supporters","5.25%","of 4,835 voters", OR_TXT]
  ].forEach((c, i) => {
    const x = M + i * 2.9;
    card(s, x, cy, 2.65, 1.98, i ? WELL : CARD);
    s.addText(c[0], { x:x+0.26, y:cy+0.2, w:2.15, h:0.5, isTextBox:true, margin:0,
      fontFace:F, fontSize:11, bold:true, color:SAGE, lineSpacing:14 });
    s.addText(c[3], { x:x+0.26, y:cy+0.72, w:2.15, h:0.6, isTextBox:true, margin:0,
      fontFace:F, fontSize:30, bold:true, color:c[5] });
    s.addText(c[1] + " " + c[2], { x:x+0.26, y:cy+1.32, w:2.15, h:0.28, isTextBox:true,
      margin:0, fontFace:F, fontSize:11.5, color:TXT });
    s.addText(c[4], { x:x+0.26, y:cy+1.58, w:2.15, h:0.28, isTextBox:true, margin:0,
      fontFace:F, fontSize:10.5, color:MUTED });
  });

  s.addChart(pptx.charts.BAR, [{
    name: "Ward saturation",
    labels: ["Katilu","Kotaruk/Lobei","Kang'atotha","Katilia","Lopur","Lokiriama/Lorengippi"],
    values: [3.80, 3.80, 3.88, 4.55, 4.74, 5.25]
  }], chartFrame({
    x:6.5, y:1.14, w:6.18, h:5.24,
    barDir:"bar", barGapWidthPct:52, chartColors:[ORANGE],
    title:"Our six strongest wards, by share of that ward",
    showValue:true, dataLabelPosition:"outEnd", dataLabelFontSize:11,
    dataLabelFormatCode:'0.00"%"', valAxisMaxVal:6, showLegend:false
  }));

  s.addNotes("This is the slide that changes how he reads every report from now on. A raw supporter total is vanity. Share of a ward is an instruction.");
}

/* ======================================================================= 6 */
{
  const s = newSlide(); menuDot(s);
  head(s, "04  ·  WHERE TO GO NEXT", "The board picks\nthe route.");

  body(s, "Twenty of our thirty wards are still cold, under three per cent. Cold does not mean hostile. It means nobody has asked yet. Turkwel alone holds 19,528 voters and has barely been touched. These six are the emptiest boxes on the whole board.",
    M, 2.52, 5.5, 14);

  [["20","wards still cold",MUTED],["4,981","verified today",OR_TXT],["2.09%","of the county",TXT]]
    .forEach((t, i) => stat(s, M + i*1.9, 4.62, 1.8, t[0], t[1], t[2]));

  s.addChart(pptx.charts.BAR, [{
    name: "Ward saturation",
    labels: ["Kalapata","Lapur","Nanaam","Kalokol","Kerio Delta","Loima"],
    values: [0.37, 0.36, 0.36, 0.32, 0.30, 0.23]
  }], chartFrame({
    x:6.5, y:1.14, w:6.18, h:5.24,
    barDir:"bar", barGapWidthPct:52, chartColors:[OR_DEEP],
    title:"Coldest six, where the caravan goes next",
    showValue:true, dataLabelPosition:"outEnd", dataLabelFontSize:11,
    dataLabelFormatCode:'0.00"%"', valAxisMaxVal:0.6, showLegend:false
  }));

  s.addNotes("Offer to open the live board here. He can tap any ward and see its real polling stations.");
}

/* ======================================================================= 7 */
{
  const s = newSlide(); menuDot(s);
  head(s, "THE WHOLE COUNTY", "Thirty wards,\none screen.", { tw:5.4 });

  s.addText("One tile for each ward, grouped by constituency and placed roughly where those wards sit on the ground, north at the top and the south below. Every tile is the same size on purpose. The northern wards are huge and nearly empty, so drawn to land area they would swamp the map while holding a fraction of the vote.",
    { x:6.5, y:1.14, w:6.18, h:1.4, isTextBox:true, margin:0, fontFace:F, fontSize:12.5,
      color:MUTED, lineSpacing:18 });

  [["Cold","under 3%",OR_DEEP],["Working","3 to 8%",ORANGE],["Holding","over 8%",OR_PALE]]
    .forEach((l, i) => {
      const x = 6.5 + i * 2.06;
      s.addShape(pptx.shapes.RECTANGLE, { x, y:2.6, w:0.28, h:0.18,
        fill:{ color:l[2] }, line:{ type:"none" } });
      s.addText(l[0] + "  " + l[1], { x:x+0.38, y:2.52, w:1.68, h:0.32, isTextBox:true,
        margin:0, fontFace:F, fontSize:10.5, color:MUTED });
    });

  s.addText("Open the live map and tap any ward for its polling stations",
    { x:M, y:2.52, w:5.4, h:0.32, isTextBox:true, margin:0, fontFace:F, fontSize:12,
      bold:true, color:OR_TXT, underline:{ style:"sng" },
      hyperlink:{ url: BOARD_URL, tooltip:"Opens the interactive board" } });

  const band = v => v < 3 ? OR_DEEP : v < 8 ? ORANGE : OR_PALE;
  const ink  = v => v < 3 ? TXT : INK_ON_ORANGE;
  const TH = 0.58, G = 0.07, LBL = 0.24;

  function block(label, wards, bx, by, bw, cols){
    s.addText(label, { x:bx, y:by, w:bw, h:0.2, isTextBox:true, margin:0, fontFace:F,
      fontSize:8.5, bold:true, color:SAGE, charSpacing:1.5 });
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

  const MY = 2.94, FULL = 12.06, HALF = 5.90, THIRD = 3.847, BG2 = 0.26;
  const R1 = LBL + TH, R2 = LBL + TH * 2 + G;

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

  body(s, "Reach 60,000 people a month online and 1,056 sign up. Take the same 60,000 through barazas, agents and USSD and 5,811 sign up. That is five times better, because somebody is standing there. Ground work costs fuel and days though. Online is cheap. Ground converts. We need both.",
    M, 2.5, 5.5, 13.5);

  s.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x:M, y:4.82, w:5.5, h:1.6, rectRadius:0.03,
    fill:{ color:WELL }, line:{ color:ORANGE, width:1 } });
  pip(s, M+0.32, 5.08, 0.15, OR_TXT);
  s.addText("Online alone never reaches the north.", { x:M+0.62, y:5.0, w:4.6, h:0.34,
    isTextBox:true, margin:0, fontFace:F, fontSize:14.5, bold:true, color:OR_TXT });
  s.addText("At 60,000 online only, all seven of the hardest wards stay cold. Six of Kibish's ten polling stations are a mobile unit or a water point. Those voters need USSD and a person.",
    { x:M+0.62, y:5.36, w:4.55, h:0.95, isTextBox:true, margin:0, fontFace:F,
      fontSize:11.5, color:MUTED, lineSpacing:16 });

  s.addChart(pptx.charts.BAR, [{
    name: "New verified supporters per month",
    labels: ["Online only","Half and half","Ground and SMS"],
    values: [1056, 3434, 5811]
  }], chartFrame({
    x:6.5, y:1.14, w:6.18, h:3.5,
    barDir:"col", barGapWidthPct:62,
    chartColors:[OR_DEEP, ORANGE, OR_PALE], varyColors:true,
    title:"Same 60,000 people reached each month",
    showValue:true, dataLabelPosition:"outEnd", dataLabelFontSize:12,
    dataLabelFormatCode:"#,##0", valAxisMaxVal:7000, showLegend:false
  }));

  [["7 of 7","hardest wards still cold",OR_DEEP],
   ["6 of 7","still cold",ORANGE],
   ["0 of 7","every one reached",OR_PALE]
  ].forEach((t, i) => {
    const x = 6.5 + i * 2.09;
    card(s, x, 4.86, 1.95, 1.52, CARD);
    s.addText(t[0], { x:x+0.2, y:5.04, w:1.6, h:0.44, isTextBox:true, margin:0,
      fontFace:F, fontSize:19, bold:true, color:t[2] });
    s.addText(t[1], { x:x+0.2, y:5.5, w:1.6, h:0.7, isTextBox:true, margin:0,
      fontFace:F, fontSize:10, color:MUTED, lineSpacing:13 });
  });

  s.addNotes("Do not oversell the online side. He knows Turkana. Saying the internet wins the county would lose the room. Saying online is cheap reach and ground is conversion is the version he will believe.");
}

/* ======================================================================= 9 */
{
  const s = newSlide(); menuDot(s);
  head(s, "THE NEXT NINETY DAYS", "What both levers\nlook like.", { tw:5.2 });

  s.addText("Same budgeted reach, two different mixes. Online on its own adds about 3,200 people by day ninety. Running both adds over 10,000 and reaches wards the first mix never touches.",
    { x:M, y:2.56, w:4.9, h:1.4, isTextBox:true, margin:0, fontFace:F, fontSize:13.5,
      color:MUTED, lineSpacing:20 });

  stat(s, M, 4.36, 2.4, "8,150", "ONLINE ONLY, BY DAY 90", MUTED);
  stat(s, M, 5.48, 2.5, "15,282", "BOTH LEVERS, BY DAY 90", OR_TXT);

  s.addChart(pptx.charts.LINE, [
    { name:"Online only", labels:["Today","Day 30","Day 60","Day 90"], values:[4981,6037,7094,8150] },
    { name:"Both levers", labels:["Today","Day 30","Day 60","Day 90"], values:[4981,8415,11848,15282] }
  ], chartFrame({
    x:6.0, y:1.14, w:6.68, h:5.24,
    chartColors:[SAGE, ORANGE], lineDataSymbol:"circle", lineDataSymbolSize:7,
    lineSize:3, lineSmooth:false,
    title:"Verified supporters on the register",
    showValue:true, dataLabelPosition:"t", dataLabelColor:MUTED, dataLabelFontSize:10,
    dataLabelFormatCode:"#,##0", valAxisMaxVal:18000,
    showLegend:true, legendPos:"b", legendColor:MUTED, legendFontFace:F, legendFontSize:11
  }));

  s.addNotes("These are planning assumptions rather than results. Say that out loud. It is the sentence that makes him trust the other numbers.");
}

/* ====================================================================== 10 */
{
  const s = newSlide(); menuDot(s);
  head(s, "THE PART NOBODY EXPECTS", "What we deliberately\nrefuse to hold.");

  body(s, "Political opinion counts as sensitive personal data under Kenya's Data Protection Act. Any rival can promise to protect Turkana's data. We can show that we never collected it. That is a far harder thing to argue with, and it is already built.",
    M, 2.58, 5.6, 14);

  const rx = 6.5, rw = 6.18;
  [["Full ID numbers","Last four digits only, and even that is optional"],
   ["Date of birth","Year only, enough to plan and not enough to impersonate"],
   ["Raw location data","IP and device values are hashed on the way in"]
  ].forEach((r, i) => {
    const y = 1.24 + i * 1.48;
    card(s, rx, y, rw, 1.26, CARD);
    s.addShape(pptx.shapes.OVAL, { x:rx+0.3, y:y+0.41, w:0.44, h:0.44,
      fill:{ color:WELL }, line:{ color:OR_TXT, width:1.25 } });
    s.addShape(pptx.shapes.LINE, { x:rx+0.38, y:y+0.63, w:0.28, h:0,
      line:{ color:OR_TXT, width:2 } });
    s.addText(r[0], { x:rx+0.94, y:y+0.27, w:5.0, h:0.36, isTextBox:true, margin:0,
      fontFace:F, fontSize:15.5, bold:true, color:TXT });
    s.addText(r[1], { x:rx+0.94, y:y+0.65, w:5.0, h:0.4, isTextBox:true, margin:0,
      fontFace:F, fontSize:11.5, color:MUTED });
  });

  s.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x:M, y:4.96, w:5.6, h:1.46, rectRadius:0.03,
    fill:{ color:WELL }, line:{ color:LINE2, width:1 } });
  s.addText("When we are accused of harvesting Turkana's ID numbers, and we will be, the answer is a database schema rather than a denial.",
    { x:M+0.34, y:5.18, w:4.95, h:1.1, isTextBox:true, margin:0, fontFace:F,
      fontSize:13, color:TXT, italic:true, lineSpacing:19 });

  s.addNotes("This is the strongest defensive slide in the deck. Register with the ODPC in week one. Not registering is itself an offence.");
}

/* ====================================================================== 11 */
{
  const s = newSlide(); menuDot(s);
  head(s, "THE ADVANTAGE", "Come election week,\nonly one of these holds up.", { ts:31, tw:11 });

  /* Two cards plus the gap must equal the 12.06in between the margins, or the
     right hand card walks off the slide. 5.83 x 2 + 0.40 = 12.06. */
  const cy = 2.58, cw = 5.83, cgap = 0.40, ch = 3.86;
  [["THEM", "A number somebody invented", [
      "Crowd sizes counted by eye",
      "Likes from outside the county",
      "Mobiliser reports the boss wants to hear",
      "A paper list with no phone and no ward"
    ], CARD, SAGE],
   ["US", "A number that survives a journalist", [
      "Every supporter tied to a polling station",
      "Share of each ward against real IEBC totals",
      "Duplicates flagged before anyone else finds them",
      "A ready call list of people who offered to help"
    ], WELL, OR_TXT]
  ].forEach((col, i) => {
    const x = M + i * (cw + cgap);
    card(s, x, cy, cw, ch, col[3]);
    s.addText(col[0], { x:x+0.42, y:cy+0.3, w:2, h:0.32, isTextBox:true, margin:0,
      fontFace:F, fontSize:11, bold:true, color:col[4], charSpacing:2.2 });
    s.addText(col[1], { x:x+0.42, y:cy+0.64, w:cw-0.84, h:0.5, isTextBox:true, margin:0,
      fontFace:F, fontSize:16, bold:true, color:TXT });
    col[2].forEach((t, j) => {
      const y = cy + 1.36 + j * 0.62;
      pip(s, x+0.42, y+0.09, 0.12, col[4]);
      s.addText(t, { x:x+0.74, y, w:cw-1.2, h:0.4, isTextBox:true, margin:0,
        fontFace:F, fontSize:12.5, color:MUTED });
    });
  });

  s.addNotes("The advantage is not that we are online and they are not. They will be online too. It is that our number can be checked and theirs cannot.");
}

/* ====================================================================== 12 */
{
  const s = newSlide(); menuDot(s);
  head(s, "06  ·  THE FIRST 90 DAYS", "Six steps, in this order.", { ts:32, tw:11 });

  s.addText("Two of these have long waits we do not control, so they start on day one.",
    { x:M, y:2.1, w:8, h:0.34, isTextBox:true, margin:0, fontFace:F, fontSize:13, color:SAGE });

  const steps = [
    ["01","Shortcode paperwork","Week 1","Africa's Talking, then Communications Authority approval. The longest wait of the lot, and nothing speeds it up later."],
    ["02","Register as a controller","Week 1 to 2","With the Office of the Data Protection Commissioner. Not registering is itself an offence."],
    ["03","Sign off the promises","Week 2","Everything on the site has to sit inside what a senator can actually deliver."],
    ["04","Launch three wards","Week 3 to 5","Lodwar, Kanamkemer and Kakuma. Real numbers replace our assumptions."],
    ["05","Recruit ward agents","Week 4 to 9","From people who already volunteered, in the ward they live in."],
    ["06","Open the north","Week 6 to 13","Kibish, Lapur, Nanaam and Loima, by USSD and baraza rather than by advert."]
  ];
  const sw = 3.92, sh = 1.72;
  steps.forEach((st, i) => {
    const c = i % 3, r = Math.floor(i / 3);
    const x = M + c * (sw + 0.24), y = 2.7 + r * (sh + 0.26);
    card(s, x, y, sw, sh, r === 0 ? WELL : CARD);
    s.addText(st[0], { x:x+0.3, y:y+0.22, w:0.5, h:0.3, isTextBox:true, margin:0,
      fontFace:F, fontSize:11.5, bold:true, color:OR_TXT, charSpacing:1 });
    s.addText(st[2], { x:x+sw-1.6, y:y+0.22, w:1.3, h:0.3, isTextBox:true, margin:0,
      fontFace:F, fontSize:10, bold:true, color:SAGE, align:"right", charSpacing:1 });
    s.addText(st[1], { x:x+0.3, y:y+0.56, w:sw-0.6, h:0.34, isTextBox:true, margin:0,
      fontFace:F, fontSize:14.5, bold:true, color:TXT });
    s.addText(st[3], { x:x+0.3, y:y+0.92, w:sw-0.6, h:0.66, isTextBox:true, margin:0,
      fontFace:F, fontSize:10.5, color:MUTED, lineSpacing:14 });
  });

  s.addNotes("If he agrees to only two things today, make them the shortcode paperwork and the ODPC registration. Everything else waits on those.");
}

/* ====================================================================== 13 */
{
  const s = newSlide();
  logo(s, 9.55, 2.35, 2.7);

  s.addText("WHAT I AM ASKING FOR TODAY", { x:M, y:0.68, w:8, h:0.36,
    isTextBox:true, margin:0, fontFace:F, fontSize:11.5, bold:true, color:SAGE, charSpacing:2.6 });

  s.addText("By day 90,\nno ward at zero.", { x:M, y:2.0, w:8.4, h:1.8, isTextBox:true,
    margin:0, fontFace:F, fontSize:42, bold:true, color:TXT, lineSpacing:50 });

  s.addText("Not every ward warm. That takes two years. Every ward measured. From that day on, every shilling this campaign spends is aimed at a number instead of a hunch.",
    { x:M, y:4.05, w:7.8, h:1.1, isTextBox:true, margin:0, fontFace:F, fontSize:15,
      color:MUTED, lineSpacing:23 });

  s.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x:M, y:5.34, w:4.3, h:0.72, rectRadius:0.04,
    fill:{ color:ORANGE }, line:{ type:"none" },
    hyperlink:{ url: BOARD_URL, tooltip:"Opens the live interactive board" } });
  s.addText("Open the live board", { x:M, y:5.34, w:4.3, h:0.72, isTextBox:true, margin:0,
    fontFace:F, fontSize:15, bold:true, color:INK_ON_ORANGE, align:"center", valign:"middle",
    underline:{ style:"none" },
    hyperlink:{ url: BOARD_URL, tooltip:"Opens the live interactive board" } });
  s.addText("Tap any ward. Move the dials. Sign yourself up.",
    { x:M+4.55, y:5.52, w:4.4, h:0.4, isTextBox:true, margin:0, fontFace:F,
      fontSize:12, color:SAGE, italic:true });

  s.addShape(pptx.shapes.LINE, { x:M, y:6.44, w:12.06, h:0, line:{ color:LINE2, width:1 } });
  s.addText("Ward, constituency and polling station figures come from the real IEBC register for Turkana. Supporter counts are an illustrative scenario and are not real people. Conversion rates are planning assumptions.",
    { x:M, y:6.58, w:7.05, h:0.62, isTextBox:true, margin:0, fontFace:F, fontSize:9,
      color:MUTED, lineSpacing:12 });
  s.addText("Brian Lokwawi Napeirot   ·   IT Manager   ·   Ekusi Lore campaign",
    { x:W-M-4.6, y:6.62, w:4.6, h:0.32, isTextBox:true, margin:0, fontFace:F,
      fontSize:9.5, bold:true, color:SAGE, align:"right" });

  s.addNotes("Close by handing over the phone. The live board does more in thirty seconds than another slide would.");
}

pptx.writeFile({ fileName: process.argv[2] || "turkana-board-deck.pptx" })
  .then(f => console.log("wrote", f));
