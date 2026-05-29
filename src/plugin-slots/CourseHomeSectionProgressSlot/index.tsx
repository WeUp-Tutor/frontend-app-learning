import React from 'react';
import { useModel } from '../../generic/model-store';
import { useContextId } from '../../data/hooks';
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
  sectionIds: string[];
  sections: Record<string, Section>;
}

const CourseHomeSectionProgressSlot: React.FC<Props> = ({
  sectionIds,
  sections,
}) => {
  const courseId = useContextId();
  const {
    courseBlocks: { sequences },
  } = useModel('outline', courseId) as {
    courseBlocks: { sequences: Record<string, Sequence> };
  };

  if (!Array.isArray(sectionIds) || !sections || !sequences) { return null; }


  // Calcul de la progression globale
  let totalSeq = 0;
  let totalCompleteSeq = 0;

  sectionIds.forEach((sectionId) => {
    const section = sections[sectionId];
    if (!section || !section.sequenceIds) {
      return;
    }

    section.sequenceIds.forEach((seqId) => {
      const seq = sequences[seqId];
      if (!seq) {
        return;
      }
      totalSeq += 1;
      if (seq.complete) {
        totalCompleteSeq += 1;
      }
    });
  });

  const overallProgress =
    totalSeq > 0 ? Math.round((totalCompleteSeq / totalSeq) * 100) : 0;


  return (
    <div className="course-home-section-progress-slot">
      <div className="global-section-progress-card">
        <div className="global-progress-title">
          Progression globale
        </div>

        <div className="d-flex justify-content-between align-items-start gap-3 mb-2">
          {/* <div>
            <div className="section-progress-title">
              Progression globale
            </div>

          </div> */}
          <div className="section-progress-badge">
            {overallProgress}%
          </div>
        </div>

        <div
          className="progress section-progress-bar"
          aria-label="Progression globale du cours"
        >
          <div
            className="progress-bar"
            role="progressbar"
            style={{ width: `${overallProgress}%` }}
            aria-valuenow={overallProgress}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      </div>


      {sectionIds.map((sectionId) => {

        const section = sections[sectionId];
        if (!section) { return null; }

        const sequenceIds = section.sequenceIds ?? [];

        let sumSeq = 0;
        let sumCompleteSeq = 0;

        sequenceIds.forEach((seqId) => {

          const seq = sequences[seqId];
          const seqTitle = seq
            ? seq.displayName || seq.title || seq.name
            : 'Sequence non trouvée';

          if (!seq) { return; }

          sumSeq += 1;
          if (seq.complete) {
            sumCompleteSeq += 1;
          }
        });

        const progress = sumSeq > 0 ? Math.round((sumCompleteSeq / sumSeq) * 100) : 0;
        const title = section.displayName || section.title || section.name || 'Section';
        const isDone = progress === 100;


        return (
          <div key={sectionId} className="section-progress-card mb-3">
            <div className="d-flex justify-content-between align-items-start gap-3 mb-2">
              <div>
                <div className="section-progress-title">{title}</div>
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

