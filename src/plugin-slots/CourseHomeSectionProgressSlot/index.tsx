import React from 'react';
import PropTypes from 'prop-types';

function clamp(value, min = 0, max = 100) {
  return Math.min(Math.max(value, min), max);
}

interface Props {
  expandAll: boolean;
  sections: object;
  sectionIds: string[];
}



function getSectionProgress(section) {

  console.log('in getsectionprogress')
  if (!section) return 0;
  console.log(section)

  if (Array.isArray(section.sequenceIds) && section.sequenceIds.length > 0) {

    console.log('section has sequences')
    console.log(section.sequenceIds)
    
    const sequences = section.sequenceIds
      .map((id) => sequencesById[id])
      .filter(Boolean);

    if (sequences.length === 0) return 0;

    const completed = sequences.filter(
      (item) => item?.complete === true || item?.completed === true
    ).length;

    return clamp(Math.round((completed / sequences.length) * 100));
  }

  return 0;
}

export default function CourseHomeSectionProgressSlot({
  expandAll,
  sectionIds,
  sections,
}) {
  if (!Array.isArray(sectionIds) || !sections) {
    return null;
  }

  return (
    <div className="course-home-section-progress-slot mb-4">
      {sectionIds.map((sectionId) => {
        const section = sections[sectionId];
        if (!section) return null;

        const progress = getSectionProgress(section);

        return (
          <div key={sectionId} className="mb-3">
            <div className="d-flex justify-content-between align-items-center mb-1">
              <span className="small font-weight-bold">
                {section.displayName || section.title || section.name}
              </span>
              <span className="small text-muted">
                {progress}%
              </span>
            </div>

            <div
              className="progress"
              style={{ height: '8px' }}
              aria-label={`Progression de la section ${section.displayName || section.title || section.name}`}
            >
              <div
                className="progress-bar"
                role="progressbar"
                style={{ width: `${progress}%` }}
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>

            {!expandAll && (
              <div className="small text-muted mt-1">
                {progress === 100 ? 'Section terminée' : 'En cours'}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

CourseHomeSectionProgressSlot.propTypes = {
  expandAll: PropTypes.bool,
  sectionIds: PropTypes.arrayOf(PropTypes.string).isRequired,
  sections: PropTypes.object.isRequired,
};

CourseHomeSectionProgressSlot.defaultProps = {
  expandAll: false,
};
