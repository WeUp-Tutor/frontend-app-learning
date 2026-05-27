import React from 'react';
import PropTypes from 'prop-types';
import './custom.scss';

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
    <div className="course-home-section-progress-slot">
      {sectionIds.map((sectionId) => {
        const section = sections[sectionId];
        if (!section) return null;

        const progress = getSectionProgress(section);
        const title = section.displayName || section.title || section.name;
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


CourseHomeSectionProgressSlot.propTypes = {
  expandAll: PropTypes.bool,
  sectionIds: PropTypes.arrayOf(PropTypes.string).isRequired,
  sections: PropTypes.object.isRequired,
};

CourseHomeSectionProgressSlot.defaultProps = {
  expandAll: false,
};
