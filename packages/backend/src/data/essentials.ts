/**
 * Static "survival" tables. Emergency numbers per ISO-3166 alpha-2 country;
 * 112 works across the EU and in many other countries as a universal number.
 */
export const DEFAULT_EMERGENCY = { police: '112', ambulance: '112', fire: '112', general: '112' };

export const EMERGENCY_NUMBERS: Record<string, { police: string; ambulance: string; fire: string; general?: string }> = {
  // Europe
  IT: { police: '113', ambulance: '118', fire: '115', general: '112' },
  FR: { police: '17', ambulance: '15', fire: '18', general: '112' },
  ES: { police: '091', ambulance: '061', fire: '080', general: '112' },
  DE: { police: '110', ambulance: '112', fire: '112', general: '112' },
  GB: { police: '999', ambulance: '999', fire: '999', general: '112' },
  IE: { police: '999', ambulance: '999', fire: '999', general: '112' },
  NL: { police: '112', ambulance: '112', fire: '112', general: '112' },
  BE: { police: '101', ambulance: '100', fire: '100', general: '112' },
  PT: { police: '112', ambulance: '112', fire: '112', general: '112' },
  GR: { police: '100', ambulance: '166', fire: '199', general: '112' },
  AT: { police: '133', ambulance: '144', fire: '122', general: '112' },
  CH: { police: '117', ambulance: '144', fire: '118', general: '112' },
  CZ: { police: '158', ambulance: '155', fire: '150', general: '112' },
  PL: { police: '997', ambulance: '999', fire: '998', general: '112' },
  HU: { police: '107', ambulance: '104', fire: '105', general: '112' },
  HR: { police: '192', ambulance: '194', fire: '193', general: '112' },
  SE: { police: '112', ambulance: '112', fire: '112', general: '112' },
  NO: { police: '112', ambulance: '113', fire: '110', general: '112' },
  DK: { police: '112', ambulance: '112', fire: '112', general: '112' },
  FI: { police: '112', ambulance: '112', fire: '112', general: '112' },
  TR: { police: '155', ambulance: '112', fire: '110', general: '112' },
  // Americas
  US: { police: '911', ambulance: '911', fire: '911', general: '911' },
  CA: { police: '911', ambulance: '911', fire: '911', general: '911' },
  MX: { police: '911', ambulance: '911', fire: '911', general: '911' },
  BR: { police: '190', ambulance: '192', fire: '193' },
  AR: { police: '911', ambulance: '107', fire: '100', general: '911' },
  // Asia-Pacific
  IN: { police: '100', ambulance: '102', fire: '101', general: '112' },
  JP: { police: '110', ambulance: '119', fire: '119' },
  KR: { police: '112', ambulance: '119', fire: '119' },
  CN: { police: '110', ambulance: '120', fire: '119' },
  TH: { police: '191', ambulance: '1669', fire: '199' },
  VN: { police: '113', ambulance: '115', fire: '114' },
  ID: { police: '110', ambulance: '118', fire: '113', general: '112' },
  SG: { police: '999', ambulance: '995', fire: '995' },
  MY: { police: '999', ambulance: '999', fire: '994' },
  PH: { police: '911', ambulance: '911', fire: '911', general: '911' },
  AU: { police: '000', ambulance: '000', fire: '000', general: '112' },
  NZ: { police: '111', ambulance: '111', fire: '111' },
  AE: { police: '999', ambulance: '998', fire: '997', general: '112' },
  // Africa
  ZA: { police: '10111', ambulance: '10177', fire: '10177', general: '112' },
  EG: { police: '122', ambulance: '123', fire: '180' },
  MA: { police: '19', ambulance: '15', fire: '15' },
  KE: { police: '999', ambulance: '999', fire: '999', general: '112' }
};

export const PLUG_TYPES: Record<string, { types: string[]; voltage: string; frequency: string }> = {
  IT: { types: ['C', 'F', 'L'], voltage: '230V', frequency: '50Hz' },
  FR: { types: ['C', 'E'], voltage: '230V', frequency: '50Hz' },
  ES: { types: ['C', 'F'], voltage: '230V', frequency: '50Hz' },
  DE: { types: ['C', 'F'], voltage: '230V', frequency: '50Hz' },
  GB: { types: ['G'], voltage: '230V', frequency: '50Hz' },
  IE: { types: ['G'], voltage: '230V', frequency: '50Hz' },
  CH: { types: ['C', 'J'], voltage: '230V', frequency: '50Hz' },
  DK: { types: ['C', 'E', 'F', 'K'], voltage: '230V', frequency: '50Hz' },
  US: { types: ['A', 'B'], voltage: '120V', frequency: '60Hz' },
  CA: { types: ['A', 'B'], voltage: '120V', frequency: '60Hz' },
  MX: { types: ['A', 'B'], voltage: '127V', frequency: '60Hz' },
  BR: { types: ['C', 'N'], voltage: '127/220V', frequency: '60Hz' },
  JP: { types: ['A', 'B'], voltage: '100V', frequency: '50/60Hz' },
  KR: { types: ['C', 'F'], voltage: '220V', frequency: '60Hz' },
  CN: { types: ['A', 'C', 'I'], voltage: '220V', frequency: '50Hz' },
  IN: { types: ['C', 'D', 'M'], voltage: '230V', frequency: '50Hz' },
  TH: { types: ['A', 'B', 'C', 'O'], voltage: '230V', frequency: '50Hz' },
  AU: { types: ['I'], voltage: '230V', frequency: '50Hz' },
  NZ: { types: ['I'], voltage: '230V', frequency: '50Hz' },
  ZA: { types: ['C', 'M', 'N'], voltage: '230V', frequency: '50Hz' },
  AE: { types: ['G'], voltage: '230V', frequency: '50Hz' },
  SG: { types: ['G'], voltage: '230V', frequency: '50Hz' },
  MY: { types: ['G'], voltage: '240V', frequency: '50Hz' }
};

/** Short phrase kit per language tag (BCP-47 primary) for the guide page. */
export const PHRASES: Record<string, { hello: string; thanks: string; please: string; help: string; bill: string; where: string }> = {
  it: { hello: 'Ciao / Buongiorno', thanks: 'Grazie', please: 'Per favore', help: 'Aiuto!', bill: 'Il conto, per favore', where: 'Dove è…?' },
  fr: { hello: 'Bonjour', thanks: 'Merci', please: "S'il vous plaît", help: 'Au secours !', bill: "L'addition, s'il vous plaît", where: 'Où est… ?' },
  es: { hello: 'Hola', thanks: 'Gracias', please: 'Por favor', help: '¡Ayuda!', bill: 'La cuenta, por favor', where: '¿Dónde está…?' },
  de: { hello: 'Hallo / Guten Tag', thanks: 'Danke', please: 'Bitte', help: 'Hilfe!', bill: 'Die Rechnung, bitte', where: 'Wo ist…?' },
  pt: { hello: 'Olá', thanks: 'Obrigado/a', please: 'Por favor', help: 'Socorro!', bill: 'A conta, por favor', where: 'Onde fica…?' },
  nl: { hello: 'Hallo', thanks: 'Dank u', please: 'Alstublieft', help: 'Help!', bill: 'De rekening, graag', where: 'Waar is…?' },
  el: { hello: 'Γειά σας (Yia sas)', thanks: 'Ευχαριστώ (Efharistó)', please: 'Παρακαλώ (Parakaló)', help: 'Βοήθεια! (Voítheia)', bill: 'Τον λογαριασμό (Ton logariasmó)', where: 'Πού είναι…? (Pou íne)' },
  ja: { hello: 'こんにちは (Konnichiwa)', thanks: 'ありがとう (Arigatō)', please: 'お願いします (Onegaishimasu)', help: '助けて! (Tasukete)', bill: 'お会計お願いします (Okaikei onegaishimasu)', where: '…はどこですか? (…wa doko desu ka)' },
  zh: { hello: '你好 (Nǐ hǎo)', thanks: '谢谢 (Xièxie)', please: '请 (Qǐng)', help: '救命! (Jiùmìng)', bill: '买单 (Mǎidān)', where: '…在哪里? (…zài nǎlǐ)' },
  tr: { hello: 'Merhaba', thanks: 'Teşekkürler', please: 'Lütfen', help: 'İmdat!', bill: 'Hesap, lütfen', where: '…nerede?' },
  cs: { hello: 'Dobrý den', thanks: 'Děkuji', please: 'Prosím', help: 'Pomoc!', bill: 'Účet, prosím', where: 'Kde je…?' },
  pl: { hello: 'Dzień dobry', thanks: 'Dziękuję', please: 'Proszę', help: 'Pomocy!', bill: 'Rachunek, proszę', where: 'Gdzie jest…?' },
  hi: { hello: 'नमस्ते (Namaste)', thanks: 'धन्यवाद (Dhanyavaad)', please: 'कृपया (Kripya)', help: 'मदद! (Madad)', bill: 'बिल दीजिए (Bill dijiye)', where: '…कहाँ है? (…kahan hai)' },
  th: { hello: 'สวัสดี (Sawatdee)', thanks: 'ขอบคุณ (Khop khun)', please: 'กรุณา (Karuna)', help: 'ช่วยด้วย! (Chuay duay)', bill: 'เช็คบิล (Check bin)', where: '…อยู่ที่ไหน? (…yu thi nai)' },
  ar: { hello: 'مرحبا (Marhaba)', thanks: 'شكرا (Shukran)', please: 'من فضلك (Min fadlik)', help: 'النجدة! (Al-najda)', bill: 'الحساب (Al-hisab)', where: 'أين…؟ (Ayna)' }
};

export const LANGUAGE_TAGS: Record<string, string> = {
  Italian: 'it', French: 'fr', Spanish: 'es', German: 'de', Portuguese: 'pt', Dutch: 'nl', Greek: 'el',
  Japanese: 'ja', Chinese: 'zh', Turkish: 'tr', Czech: 'cs', Polish: 'pl', Hindi: 'hi', Thai: 'th', Arabic: 'ar'
};
