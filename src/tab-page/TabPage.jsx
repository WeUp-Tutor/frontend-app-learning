import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from '@edx/frontend-platform/i18n';
import { useDispatch, useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';

import { Toast } from '@openedx/paragon';
//import { FooterSlot } from '@edx/frontend-component-footer';
import HeaderSlot from '../plugin-slots/HeaderSlot';
import PageLoading from '../generic/PageLoading';
import { getAccessDeniedRedirectUrl } from '../shared/access';
import { useModel } from '../generic/model-store';

import genericMessages from '../generic/messages';
import messages from './messages';
import LoadedTabPage from './LoadedTabPage';
import { setCallToActionToast } from '../course-home/data/slice';
import LaunchCourseHomeTourButton from '../product-tours/newUserCourseHomeTour/LaunchCourseHomeTourButton';

const TabPage = (props) => {
  const intl = useIntl();
  const {
    activeTabSlug,
    courseId,
    courseStatus,
    metadataModel,
  } = props;
  const {
    toastBodyLink,
    toastBodyText,
    toastHeader,
    errorMessage: courseHomeErrorMessage,
  } = useSelector(state => state.courseHome);
  const {
    errorMessage: coursewareErrorMessage,
  } = useSelector(state => state.courseware);
  const errorMessage = courseHomeErrorMessage || coursewareErrorMessage;
  const dispatch = useDispatch();
  const {
    courseAccess,
    number,
    org,
    start,
    title,
  } = useModel('courseHomeMeta', courseId);

  if (courseStatus === 'denied') {
    const redirectUrl = getAccessDeniedRedirectUrl(courseId, activeTabSlug, courseAccess, start);
    if (redirectUrl) {
      return (<Navigate to={redirectUrl} replace />);
    }
  }


  const footerCss = `
          .wrapper-footer {
            background-color: #283940 !important;
            color: #ffffff !important;
            padding: 40px 24px 36px;
            font-family: "Open Sans", "Helvetica Neue", Helvetica, Arial, sans-serif;
          }

          #footer * {
            color: #ffffff !important;
            font-family: "Open Sans", "Helvetica Neue", Helvetica, Arial, sans-serif !important;
          }

          .footer__inner {
            max-width: 1130px;
            margin: 0 auto;
          }

          .footer__logos {
            display: flex;
            justify-content: flex-end;
            align-items: center;
            gap: 32px;
            margin-bottom: 38px;
          }

          .footer__logo {
            display: block;
            height: auto;
            object-fit: contain;
          }

          .footer__logo--hexafret {
            width: 170px;
          }

          .footer__logo--rle {
            width: 110px;
          }

          .footer__separator {
            width: 100%;
            height: 1px;
            background: rgba(255, 255, 255, 0.9) !important;
            margin-bottom: 22px;
          }

          .footer__nav {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 120px;
          }

          .footer__link {
            color: #ffffff;
            text-decoration: none;
            font-size: 18px;
            line-height: 1.4;
            font-weight: 400;
          }

          .powered-area *,
          .copyright-site {
            color: #ffffff !important;
          }

          .footer__link:hover,
          .footer__link:focus {
            text-decoration: underline;
          }

          @media (max-width: 768px) {
            .footer {
              padding: 32px 20px;
            }

            .footer__logos {
              justify-content: center;
              gap: 24px;
              margin-bottom: 30px;
            }

            .footer__logo--hexafret {
              width: 145px;
            }

            .footer__logo--rle {
              width: 95px;
            }

            .footer__nav {
              flex-direction: column;
              gap: 14px;
            }

            .footer__link {
              font-size: 16px;
              text-align: center;
            }
          }
`;

  return (
    <>
      {['loaded', 'denied'].includes(courseStatus) && (
        <>
          <Toast
            action={toastBodyText ? {
              label: toastBodyText,
              href: toastBodyLink,
            } : null}
            closeLabel={intl.formatMessage(genericMessages.close)}
            onClose={() => dispatch(setCallToActionToast({ header: '', link: null, link_text: null }))}
            show={!!(toastHeader)}
          >
            {toastHeader}
          </Toast>
          {metadataModel === 'courseHomeMeta' && (<LaunchCourseHomeTourButton srOnly />)}
        </>
      )}

      <HeaderSlot courseOrg={org} courseNumber={number} courseTitle={title} />

      {courseStatus === 'loading' && (
        <PageLoading srMessage={intl.formatMessage(messages.loading)} />
      )}

      {['loaded', 'denied'].includes(courseStatus) && (
        <LoadedTabPage {...props} />
      )}

      {/* courseStatus 'failed' and any other unexpected course status. */}
      {(!['loading', 'loaded', 'denied'].includes(courseStatus)) && (
        <p className="text-center py-5 mx-auto" style={{ maxWidth: '30em' }}>
          {errorMessage || intl.formatMessage(messages.failure)}
        </p>
      )}
      <style>{footerCss}</style>

      <footer className="wrapper-footer">
        <div className="footer__inner">
          <div className="footer__logos">
          <div style={{display: 'flex', flexWrap: 'wrap', flexDirection: 'column', justifyContent: 'center', alignItems: 'center'}}>
              <img src="https://decouverte-metiers.sncf.hexafret.net/static/indigo/images/logo-white.png" alt="Hexafret" className="footer__logo footer__logo--hexafret" />
              <div style={{ fontSize: '12px', display: 'flex', flexWrap: 'nowrap', flexDirection: 'row', alignItems: 'center'}}>
                <p>Une marque de :</p>
                <img src="https://decouverte-metiers.sncf.hexafret.net/static/indigo/images/logo-rl_eu.png" alt="Rail Logistics Europe" className="footer__logo footer__logo--rle" />
              </div>
              <p style={{ textAlign: 'justify', fontSize: '12px', maxWidth: '75%'}}> Rail Logistics Europe est une société du groupe SNCF </p>
          </div>
        </div>
          <div className="footer__separator" />

          <nav className="footer__nav" aria-label="Liens légaux">
            <a
              style={{ color: "#ffffff" }}
              href="https://decouverte-metiers.sncf.hexafret.net/tos"
              className="footer__link"
            >
              Mentions légales
            </a>

            <a
              style={{ color: "#ffffff" }}
              href="https://decouverte-metiers.sncf.hexafret.net/privacy"
              className="footer__link"
            >
              Politique de données personnelles
            </a>
          </nav>
        </div>



        <div className="footer-top">

        </div>

        <span className="copyright-site">
          Copyrights ©2026. All Rights Reserved.
        </span>


      </footer>
    </>
  );
};

TabPage.defaultProps = {
  courseId: null,
  unitId: null,
};

TabPage.propTypes = {
  activeTabSlug: PropTypes.string.isRequired,
  courseId: PropTypes.string,
  courseStatus: PropTypes.string.isRequired,
  metadataModel: PropTypes.string.isRequired,
  unitId: PropTypes.string,
};

export default TabPage;
