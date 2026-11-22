/**
 * Small PDFs the end-to-end suite writes into a project's paper/ folder, built
 * here byte by byte so a reviewer can read every one. Each is a valid PDF 1.7
 * file with a cross-reference table (offsets computed), except where the point
 * is that it is not.
 */

/** A PDF whose objects 1..n have these bodies (object 1 the catalog); `trailer` adds to the trailer dictionary. */
export function pdfFile(objects: readonly (string | { dict: string; stream: string })[], trailer = ""): Buffer {
  const parts: string[] = ["%PDF-1.7\n%âãÏÓ\n"];
  const offsets: number[] = [];
  let length = Buffer.byteLength(parts[0]!, "latin1");
  objects.forEach((body, i) => {
    const text =
      typeof body === "string"
        ? `${i + 1} 0 obj\n${body}\nendobj\n`
        : `${i + 1} 0 obj\n${body.dict.replace(/>>\s*$/, ` /Length ${Buffer.byteLength(body.stream, "latin1")} >>`)}\nstream\n${body.stream}\nendstream\nendobj\n`;
    offsets.push(length);
    parts.push(text);
    length += Buffer.byteLength(text, "latin1");
  });
  const xref = [`xref\n0 ${objects.length + 1}\n`, "0000000000 65535 f \n", ...offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`)].join("");
  parts.push(xref, `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R ${trailer}>>\nstartxref\n${length}\n%%EOF\n`);
  return Buffer.from(parts.join(""), "latin1");
}

/** One US-letter page showing `lines` of Helvetica text, top down from 700 pt. */
function page(lines: readonly { size: number; text: string }[]): string {
  let y = 700;
  return lines
    .map(({ size, text }) => {
      const line = `BT /F1 ${size} Tf 72 ${y} Td (${text}) Tj ET`;
      y -= size * 2.5;
      return line;
    })
    .join("\n");
}

/** An outline title that would run script if it reached the DOM as markup. */
export const HOSTILE_TITLE = "<img src=x onerror=window.top.__pwned=7><script>window.top.__pwned=8</script>";
/** The URI the fixture's link annotation points at. */
export const HOSTILE_URI = "https://example.invalid/clicked-a-pdf-link";

/**
 * A PDF that tries to act: JavaScript run on opening (the catalog's
 * /OpenAction, the page's /AA open action, and a document-level JavaScript
 * name tree), a link annotation to a web URI over the second line of text,
 * and an outline entry whose title is markup.
 */
export function hostilePdf(): Buffer {
  const js = "window.top.__pwned=9; app.alert\\(1\\);";
  return pdfFile([
    "<< /Type /Catalog /Pages 2 0 R /Outlines 6 0 R /PageMode /UseOutlines /OpenAction 8 0 R /Names << /JavaScript 9 0 R >> >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R /Annots [10 0 R] /AA << /O 8 0 R >> >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    {
      dict: "<< >>",
      stream: page([
        { size: 24, text: "Hostile fixture title" },
        { size: 14, text: "Click this line: it is a link to example.invalid" },
        { size: 12, text: "Opening this file asks to run JavaScript." },
      ]),
    },
    "<< /Type /Outlines /First 7 0 R /Last 7 0 R /Count 1 >>",
    `<< /Title (${HOSTILE_TITLE}) /Parent 6 0 R /Dest [3 0 R /XYZ 0 740 null] >>`,
    `<< /Type /Action /S /JavaScript /JS (${js}) >>`,
    "<< /Names [(boot) 8 0 R] >>",
    `<< /Type /Annot /Subtype /Link /Rect [60 630 560 660] /Border [0 0 2] /A << /S /URI /URI (${HOSTILE_URI}) >> >>`,
  ]);
}

/** A PDF whose page tree has no pages. */
export function noPagesPdf(): Buffer {
  return pdfFile(["<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Kids [] /Count 0 >>"]);
}

/**
 * A PDF encrypted with the standard security handler (RC4, 40-bit) and a user
 * password: its /O and /U values match no empty password, so PDF.js asks for
 * one (PasswordException). The content is never decrypted, so it need not be.
 */
export function passwordPdf(): Buffer {
  const hex = (byte: number) => byte.toString(16).padStart(2, "0").repeat(32);
  return pdfFile(
    [
      "<< /Type /Catalog /Pages 2 0 R >>",
      "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>",
      `<< /Filter /Standard /V 1 /R 2 /O <${hex(0x41)}> /U <${hex(0x42)}> /P -44 >>`,
    ],
    "/Encrypt 4 0 R /ID [<00112233445566778899aabbccddeeff> <00112233445566778899aabbccddeeff>] ",
  );
}

/** Bytes that are not a PDF at all. */
export function notAPdf(): Buffer {
  return Buffer.from("This is not a PDF. An agent wrote a Markdown note here by mistake.\n", "utf8");
}
