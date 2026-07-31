import React from 'react';
import { PluginSlot } from '@openedx/frontend-plugin-framework';
import Section from '@src/course-home/outline-tab/section-outline/Section';
import { useModel } from '../../generic/model-store';
import { useContextId } from '../../data/hooks';
import './custom.css';


interface SectionData {
  sequenceIds: string[];
  resumeBlock?: boolean;
  complete: boolean;
  title: string;
  hideFromTOC: boolean;
}

interface SequenceData {
  complete: boolean;
}

interface Props {
  expandAll: boolean;
  sections: Record<string, SectionData>;
  sectionIds: string[];
}

const CourseHomeSectionOutlineSlot: React.FC<Props> = ({
  expandAll, sections, sectionIds,
}) => {
  const courseId = useContextId();
  const {
    courseBlocks: { sequences },
  } = useModel('outline', courseId) as { courseBlocks: { sequences: Record<string, SequenceData> } };

  // Calcul de la progression, section par section
  const sectionProgressById: Record<string, number> = {};

  sectionIds.forEach((sectionId) => {
    const section = sections[sectionId];
    if (!section || !section.sequenceIds) {
      sectionProgressById[sectionId] = 0;
      return;
    }

    let totalSeq = 0;
    let totalCompleteSeq = 0;

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

    sectionProgressById[sectionId] = totalSeq > 0
      ? Math.round((totalCompleteSeq / totalSeq) * 100)
      : 0;
  });

  return (
    <PluginSlot
      id="org.openedx.frontend.learning.course_home_section_outline.v1"
      idAliases={['course_home_section_outline_slot']}
      pluginProps={{ expandAll, sectionIds, sections, sectionProgressById }}
    >
      <ol id="courseHome-outline" className="list-unstyled">
        {sectionIds.map((sectionId) => {
          const section = sections[sectionId];
          if (!section) {
            return null;
          }
          return (
            <Section
              key={sectionId}
              defaultOpen={section.resumeBlock}
              expand={expandAll}
              section={section}
              overallProgress={sectionProgressById[sectionId]}
            />
          );
        })}
      </ol>
    </PluginSlot>
  );
};

export default CourseHomeSectionOutlineSlot;

