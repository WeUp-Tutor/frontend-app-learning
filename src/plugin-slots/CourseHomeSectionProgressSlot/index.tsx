import React from 'react';
import './custom.scss';


type Section = {
  displayName?: string;
  title?: string;
  name?: string;
  complete?: boolean;
  sequenceIds?: string[];
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
  if (!Array.isArray(sectionIds) || !sections) {
    return null;
  }

  return (
    <div className="course-home-section-progress-slot">
      {sectionIds.map((sectionId) => {
        const section = sections[sectionId];
        
        console.log(sectionId);
        console.log(section);

        const sequenceIds = section.sequenceIds ?? [];
        if (!section) return null;

        let sumSeq = 0
        let sumCompleteSeq = 0

        sequenceIds.forEach((seqId) => {
          const seq = sections[seqId];
          console.log(seq);
          console.log(`  - ${seqId}: ${seq ? seq.displayName || seq.title || seq.name : 'Section non trouvée'}`);

          if (!seq) return;
          
          sumSeq += 1
          if (seq.complete) {
            sumCompleteSeq += 1
          }
        });

        const progress = sumSeq > 0
          ? Math.round((sumCompleteSeq / sumSeq) * 100)
          : 0;

        const title = section.displayName || section.title || section.name || 'Section';
        const isDone = progress === 100;

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
}


export default CourseHomeSectionProgressSlot;
