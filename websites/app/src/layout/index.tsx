import React, { Suspense } from "react";
import styled from "styled-components";
import { Outlet } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import Footer from "./Footer";
import Header from "./Header";
import LoadingGif from "gifs/loading-icosahedron.gif";

const Container = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  width: 100%;
  background-color: ${({ theme }) => theme.lightGrey};
  overflow-x: hidden;
`;

const ContentArea = styled.div`
  display: flex;
  flex: 1;
  background-color: ${({ theme }) => theme.lightBackground};
  width: 100%;
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

const Layout: React.FC = () => {
  return (
    <>
      <Notifications />
      <Container>
        <Header />
        <ContentArea>
          <Suspense fallback={<LoadingContainer><LoadingImage src={LoadingGif} /></LoadingContainer>}>
            <Outlet />
          </Suspense>
        </ContentArea>
        <Footer />
      </Container>
    </>
  );
};

export default Layout;
