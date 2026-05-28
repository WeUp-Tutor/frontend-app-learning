import React from 'react';
import { useModel } from '../../../generic/model-store';
import { useContextId } from '../../../data/hooks';
import './custom.scss';

type Section = {
  displayName?: string;
  title?: string;
  name?: string;
  complete?: boolean;
  sequenceIds?: string[];
};

type Sequence = {
  displayName?: string;
  title?: string;
  name?: string;
  complete?: boolean;
};

interface Props {
  expandAll?: boolean;
  sectionIds: string[];
  sections: Record<string, Section>;
}

const CourseHomeSectionProgressSlot: React.FC<Props> = ({
  expandAll = false,
  sectionIds,
  sections,
}) => {
  const courseId = useContextId();
  const {
    courseBlocks: { sequences },
  } = useModel('outline', courseId) as {
    courseBlocks: { sequences: Record<string, Sequence> };
  };

  if (!Array.isArray(sectionIds) || !sections || !sequences) {
    console.warn('[CourseHomeSectionProgressSlot] Données invalides', {
      sectionIds,
      sections,
      sequences,
    });
    return null;
  }

  console.log('[CourseHomeSectionProgressSlot] render', {
    expandAll,
    sectionIds,
    sectionsKeys: Object.keys(sections),
    sequencesKeys: Object.keys(sequences),
  });

  return (
    <div className="course-home-section-progress-slot">
      {sectionIds.map((sectionId) => {
        console.group(`[Section] ${sectionId}`);

        const section = sections[sectionId];
        if (!section) {
          console.warn('[Section] Section introuvable pour sectionId', sectionId);
          console.groupEnd();
          return null;
        }

        const sequenceIds = section.sequenceIds ?? [];
        console.log('[Section] section data', section);
        console.log('[Section] sequenceIds', sequenceIds);

        let sumSeq = 0;
        let sumCompleteSeq = 0;

        sequenceIds.forEach((seqId) => {
          console.group(`[Sequence] ${seqId}`);

          const seq = sequences[seqId];
          console.log('[Sequence] seq brut', seq);

          const seqTitle = seq
            ? seq.displayName || seq.title || seq.name
            : 'Sequence non trouvée';
          console.log('[Sequence] titre', seqTitle);

          if (!seq) {
            console.warn('[Sequence] Séquence introuvable dans courseBlocks.sequences pour seqId', seqId);
            console.groupEnd();
            return;
          }

          sumSeq += 1;
          if (seq.complete) {
            sumCompleteSeq += 1;
          }
          console.log('[Sequence] complete ?', seq.complete);
          console.groupEnd();
        });

        console.log('[Section] sumSeq / sumCompleteSeq', { sumSeq, sumCompleteSeq });

        const progress =
          sumSeq > 0 ? Math.round((sumCompleteSeq / sumSeq) * 100) : 0;

        const title =
          section.displayName || section.title || section.name || 'Section';
        const isDone = progress === 100;

        console.log('[Section] progress calculé', { title, progress, isDone });

        console.groupEnd();

        return (
          <div key={sectionId} className="section-progress-card mb-3">
            <div className="d-flex justify-content-between align-items-start gap-3 mb-2">
              <div>
                <div className="section-progress-title">{title}</div>
                {!expandAll && (
                  <div className="section-progress-status">
                    {isDone ? 'Section terminée' : 'En cours'}
                  </div>
                )}
              </div>

              <div className="section-progress-badge">
                {progress}%
              </div>
            </div>

            <div
              className="progress section-progress-bar"
              aria-label={`Progression de la section ${title}`}
            >
              <div
                className={`progress-bar ${isDone ? 'bg-success' : ''}`}
                role="progressbar"
                style={{ width: `${progress}%` }}
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CourseHomeSectionProgressSlot;

