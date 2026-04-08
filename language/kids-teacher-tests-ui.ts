/**
 * Öğretmen test düzenleyici — bu metinler TS modülü olarak tutulur; böylece
 * `tr.json` güncellemelerinde Turbopack/HMR bazen eski paketi tutsa bile
 * arayüzde ham anahtar görünmez.
 */
type KidsLang = 'tr' | 'en' | 'ge';

const tr: Record<string, string> = {
  'tests.teacherMain.questionIllustrationLabel': 'Soru görseli (isteğe bağlı)',
  'tests.teacherMain.pickQuestionIllustration': 'Görsel seç',
  'tests.teacherMain.removeQuestionIllustration': 'Görseli kaldır',
  'tests.teacherMain.questionIllustrationHint':
    'PNG, JPG veya WebP; en fazla 5 MB. Görsel soru metninin üstünde gösterilir.',
  'tests.teacherMain.questionIllustrationTooBig': 'Görsel çok büyük (en fazla 5 MB).',
  'tests.teacherMain.questionFormatLabel': 'Soru türü',
  'tests.teacherMain.formatMc': 'Çoktan seçmeli',
  'tests.teacherMain.formatConstructed': 'Yazılı cevap (şık yok)',
  'tests.teacherMain.addMcChoice': 'Şık ekle (D veya E)',
  'tests.teacherMain.removeLastMcChoice': 'Son şıkkı kaldır',
  'tests.teacherMain.mcChoiceCountHint': 'A–E arası en fazla 5 şık; şimdilik {n} şık.',
};

const en: Record<string, string> = {
  'tests.teacherMain.questionIllustrationLabel': 'Question image (optional)',
  'tests.teacherMain.pickQuestionIllustration': 'Choose image',
  'tests.teacherMain.removeQuestionIllustration': 'Remove image',
  'tests.teacherMain.questionIllustrationHint':
    'PNG, JPG, or WebP; up to 5 MB. Shown above the question text.',
  'tests.teacherMain.questionIllustrationTooBig': 'Image is too large (max 5 MB).',
  'tests.teacherMain.questionFormatLabel': 'Question type',
  'tests.teacherMain.formatMc': 'Multiple choice',
  'tests.teacherMain.formatConstructed': 'Written answer (no options)',
  'tests.teacherMain.addMcChoice': 'Add option (D or E)',
  'tests.teacherMain.removeLastMcChoice': 'Remove last option',
  'tests.teacherMain.mcChoiceCountHint': 'Up to 5 options (A–E); you have {n} now.',
};

const ge: Record<string, string> = {
  'tests.teacherMain.questionIllustrationLabel': 'Fragenbild (optional)',
  'tests.teacherMain.pickQuestionIllustration': 'Bild waehlen',
  'tests.teacherMain.removeQuestionIllustration': 'Bild entfernen',
  'tests.teacherMain.questionIllustrationHint':
    'PNG, JPG oder WebP; max. 5 MB. Wird ueber dem Fragetext angezeigt.',
  'tests.teacherMain.questionIllustrationTooBig': 'Bild zu gross (max. 5 MB).',
  'tests.teacherMain.questionFormatLabel': 'Fragetyp',
  'tests.teacherMain.formatMc': 'Multiple Choice',
  'tests.teacherMain.formatConstructed': 'Freitext (ohne Optionen)',
  'tests.teacherMain.addMcChoice': 'Option hinzufuegen (D oder E)',
  'tests.teacherMain.removeLastMcChoice': 'Letzte Option entfernen',
  'tests.teacherMain.mcChoiceCountHint': 'Bis zu 5 Optionen (A–E); derzeit {n}.',
};

export const kidsTeacherTestsUiByLang: Record<KidsLang, Record<string, string>> = {
  tr,
  en,
  ge,
};
