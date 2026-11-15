import React, { Suspense, useEffect, useRef } from "react";
import styled from "styled-components";
import { Outlet, useLocation, useNavigationType } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import { ErrorBoundary } from "react-error-boundary";
import ErrorFallback from "components/ErrorFallback";
import Footer from "./Footer";
import Header from "./Header";
import LoadingGif from "gifs/loading-icosahedron.gif";

const Container = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  width: 100%;
  background-color: ${({ theme }) => theme.lightGrey};
  /* clip (not hidden) keeps the header sticky: hidden would make this box the sticky scroll container. */
  overflow-x: hidden;
  @supports (overflow-x: clip) {
    overflow-x: clip;
  }
`;

const ContentArea = styled.main`
  display: flex;
  flex: 1;
  background-color: ${({ theme }) => theme.lightBackground};
  width: 100%;

  /* Focused only by the skip link: no ring around the whole page. */
  &:focus {
    outline: none;
  }
`;

const SkipLink = styled.a`
  position: fixed;
  top: 8px;
  left: 8px;
  z-index: 10000;
  padding: 8px 16px;
  border-radius: 9999px;
  background: ${({ theme }) => theme.buttonWhite};
  color: ${({ theme }) => theme.black};
  font-size: 14px;
  font-weight: 600;
  transform: translateY(-200%);

  &:focus {
    transform: none;
  }
`;

const Notifications = styled(ToastContainer)`
  padding: 16px;
  padding-top: 70px;
  pointer-events: none;

  /* Black text on the coloured fills (6.5:1 to 13:1); in-progress toasts are dark. */
  --toastify-font-family: "Manrope", sans-serif;
  --toastify-text-color-info: #000000;
  --toastify-text-color-success: #000000;
  --toastify-text-color-warning: #000000;
  --toastify-text-color-error: #000000;
  --toastify-color-light: ${({ theme }) => theme.backgroundFour};
  --toastify-text-color-light: ${({ theme }) => theme.primaryText};
  --toastify-spinner-color: ${({ theme }) => theme.primaryBlue};
  --toastify-spinner-color-empty-area: ${({ theme }) => theme.whiteLowOpacityStrong};

  .Toastify__toast {
    pointer-events: auto;
    font-family: "Manrope", sans-serif;
  }

  .Toastify__toast--default {
    border: 1px solid ${({ theme }) => theme.stroke};
  }

  .Toastify__toast--info .Toastify__close-button,
  .Toastify__toast--success .Toastify__close-button,
  .Toastify__toast--warning .Toastify__close-button,
  .Toastify__toast--error .Toastify__close-button {
    color: #000000;
    opacity: 0.7;
  }

  .Toastify__toast--info {
    background: ${({ theme }) => theme.secondaryBlue};
  }

  .Toastify__toast--success {
    background: ${({ theme }) => theme.success};
  }

  .Toastify__toast--error {
    background: ${({ theme }) => theme.error};
  }

  .Toastify__toast--warning {
    background: ${({ theme }) => theme.warning};
  }

  .Toastify__progress-bar--info {
    background: ${({ theme }) => theme.primaryBlue};
  }

  .Toastify__progress-bar--success {
    background: ${({ theme }) => theme.successLight};
  }

  .Toastify__progress-bar--error {
    background: ${({ theme }) => theme.errorLight};
  }

  .Toastify__progress-bar--warning {
    background: ${({ theme }) => theme.warningLight};
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 120px;
  min-height: 400px;
  width: 100%;
`;

const LoadingImage = styled.img`
  height: 90px;
`;

const LoadingFallback: React.FC = () => (
  <LoadingContainer role="status">
    <LoadingImage src={LoadingGif} alt="" />
    <span className="visually-hidden">Loading…</span>
  </LoadingContainer>
);

/**
 * A new page opens at the top. Back and Forward keep the position the browser restores, a ?section= link is
 * left to the page's ScrollTop, and the profile tabs count as one page so switching tab does not jump.
 * A passive effect on purpose: it runs after the header menus release their scroll lock (which puts back the
 * position from before the menu opened).
 */
const useScrollToTopOnNavigate = () => {
  const { pathname, search } = useLocation();
  const navigationType = useNavigationType();
  const pageKey = pathname.startsWith("/profile/") ? "/profile" : pathname;
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (navigationType === "POP" || new URLSearchParams(search).has("section")) return;
    window.scrollTo(0, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageKey]);
};

// main is focusable only while the skip link uses it: a permanent tabindex would make every click on page text
// focus it, and the next Tab would then start again from the top of the page.
const skipToContent = (event: React.MouseEvent<HTMLAnchorElement>) => {
  const main = document.getElementById("main");
  if (!main) return;
  event.preventDefault();
  main.setAttribute("tabindex", "-1");
  main.addEventListener("blur", () => main.removeAttribute("tabindex"), { once: true });
  main.focus();
};

const Layout: React.FC = () => {
  const { pathname } = useLocation();
  useScrollToTopOnNavigate();

  return (
    <>
      <SkipLink href="#main" onClick={skipToContent}>
        Skip to content
      </SkipLink>
      <Notifications />
      <Container>
        <Header />
        <ContentArea id="main">
          {/* A page that fails (or whose code no longer loads after a deploy) keeps the header and footer;
              moving to another page clears the error. */}
          <ErrorBoundary FallbackComponent={ErrorFallback} resetKeys={[pathname]}>
            <Suspense fallback={<LoadingFallback />}>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </ContentArea>
        <Footer />
      </Container>
    </>
  );
};

export default Layout;
