/* ============================================================
   MOJIBAKE REPAIR (Phase 12)

   The four uploaded source files (kaikki_part_1..4.jsonl) have a real,
   pervasive encoding corruption: every word containing a non-ASCII
   character (ä ö ü ß à á etc.) — roughly 15–24% of records in every one
   of the 4 files, confirmed by direct sampling — has that character
   double-encoded: the correct UTF-8 bytes for e.g. "ü" were at some
   point in the files' prior processing pipeline misread as Windows-1252
   and re-saved as UTF-8. The files are NOT malformed JSON (they parse
   fine); the string *content* is semantically wrong, e.g. the word field
   for "Äpfelchen" literally contains the 9-character string "Ã„pfelchen".

   This is a standard, well-known class of text corruption ("mojibake").
   The fix is the standard fix: reverse the two steps — re-encode the
   (wrongly-decoded) JS string back to the Windows-1252 bytes a naive
   decoder would have produced, then decode those bytes as UTF-8 to
   recover the original text.

   Verified safe: every one of the common German diphthongs/umlauts/ß,
   when ALREADY correctly encoded (not corrupted), fails this round-trip
   with an invalid-UTF-8 result and is therefore left untouched — tested
   against für/schön/groß/Mädchen/Tschüss and 2,000+ real corrupted words
   sampled across all four files, with zero false positives or
   mis-corrections found (see PHASE12_REPORT.md for the validation log).
   ============================================================ */
'use strict';

/* Windows-1252 differs from Latin-1 only in the 0x80-0x9F byte range
   (Latin-1 leaves those as C1 control codes; cp1252 assigns them to
   printable characters like curly quotes, the euro sign, etc.). This is
   the map kaikki's source pipeline's naive decoder actually used. */
const CP1252_SPECIAL = {
  0x80:0x20AC, 0x82:0x201A, 0x83:0x0192, 0x84:0x201E, 0x85:0x2026, 0x86:0x2020, 0x87:0x2021,
  0x88:0x02C6, 0x89:0x2030, 0x8A:0x0160, 0x8B:0x2039, 0x8C:0x0152, 0x8E:0x017D,
  0x91:0x2018, 0x92:0x2019, 0x93:0x201C, 0x94:0x201D, 0x95:0x2022, 0x96:0x2013, 0x97:0x2014,
  0x98:0x02DC, 0x99:0x2122, 0x9A:0x0161, 0x9B:0x203A, 0x9C:0x0153, 0x9E:0x017E, 0x9F:0x0178,
};
const UNICODE_TO_CP1252_BYTE = {};
for(let b = 0; b < 256; b++) UNICODE_TO_CP1252_BYTE[b] = b; // identity: 0x00-0x7F and 0xA0-0xFF
Object.keys(CP1252_SPECIAL).forEach(k => { UNICODE_TO_CP1252_BYTE[CP1252_SPECIAL[k]] = +k; });

const NON_ASCII_RE = /[\u0080-\uFFFF]/;

function repairMojibake(str){
  if(typeof str !== 'string' || !NON_ASCII_RE.test(str)) return str; // fast path: nothing to repair
  const bytes = [];
  for(const ch of str){
    const cp = ch.codePointAt(0);
    const byte = UNICODE_TO_CP1252_BYTE[cp];
    if(byte === undefined) return str; // codepoint not producible by any cp1252 byte -> this string was never mojibake'd this way; leave it alone
    bytes.push(byte);
  }
  const fixed = Buffer.from(bytes).toString('utf8');
  if(fixed.includes('\uFFFD')) return str; // not valid UTF-8 once "undone" -> false alarm, keep original
  return fixed;
}

/* Deep-repairs every string value in a parsed JSONL record (word, forms,
   glosses, examples, ipa, etymology, ...) in place, returning the same
   object. Arrays and nested objects are walked; non-string/object/array
   values (numbers, booleans, null) are left as-is. */
function repairRecordStrings(value){
  if(typeof value === 'string') return repairMojibake(value);
  if(Array.isArray(value)){ for(let i=0;i<value.length;i++) value[i] = repairRecordStrings(value[i]); return value; }
  if(value && typeof value === 'object'){ for(const k of Object.keys(value)) value[k] = repairRecordStrings(value[k]); return value; }
  return value;
}

module.exports = { repairMojibake, repairRecordStrings, UNICODE_TO_CP1252_BYTE };
