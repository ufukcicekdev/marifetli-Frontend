import type { KidsSubmissionRecord } from '@/src/lib/kids-api';

/**
 * Öğrenci challenge sayfası: API `review_hint` metinleri backend'de Türkçe sabit;
 * dil seçimine göre başlık/gövde burada çözülür. Öğretmen notu varsa gövdede önceliklidir.
 */
export function kidsSubmissionReviewHintLines(
  sub: KidsSubmissionRecord,
  t: (key: string) => string,
): { title: string; body: string } {
  const hint = sub.review_hint;
  const note = (sub.teacher_note_to_student || '').trim();

  if (hint.code === 'pending' && !sub.teacher_reviewed_at) {
    return {
      title: t('projectDetail.reviewHintPendingTitle'),
      body: t('projectDetail.reviewHintPendingBody'),
    };
  }
  if (hint.code === 'pending' && sub.teacher_reviewed_at && sub.teacher_review_valid == null) {
    return {
      title: t('projectDetail.reviewHintEvaluatingTitle'),
      body: t('projectDetail.reviewHintEvaluatingBody'),
    };
  }

  if (hint.code === 'shine') {
    return {
      title: t('projectDetail.reviewHintShineTitle'),
      body: note || t('projectDetail.reviewHintShineBodyFallback'),
    };
  }
  if (hint.code === 'grow') {
    return {
      title: t('projectDetail.reviewHintGrowTitle'),
      body: note || t('projectDetail.reviewHintGrowBodyFallback'),
    };
  }
  if (hint.code === 'participate') {
    return {
      title: t('projectDetail.reviewHintParticipateTitle'),
      body: note || t('projectDetail.reviewHintParticipateBodyFallback'),
    };
  }

  return { title: hint.title, body: hint.body };
}
