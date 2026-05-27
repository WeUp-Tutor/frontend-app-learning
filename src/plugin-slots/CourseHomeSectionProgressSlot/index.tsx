// src/plugin-slots/CourseHomeSectionProgressSlot/index.jsx
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

  if (typeof section.completionRatio === 'number') {
    return clamp(Math.round(section.completionRatio * 100));
  }

  if (typeof section.progress === 'number') {
    return clamp(Math.round(section.progress));
  }

  if (
    typeof section.completedUnits === 'number'
    && typeof section.totalUnits === 'number'
    && section.totalUnits > 0
  ) {
    return clamp(Math.round((section.completedUnits / section.totalUnits) * 100));
  }

  if (Array.isArray(section.subsections) && section.subsections.length > 0) {
    const completed = section.subsections.filter(
      (item) => item?.complete === true || item?.completed === true
    ).length;
    return clamp(Math.round((completed / section.subsections.length) * 100));
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
