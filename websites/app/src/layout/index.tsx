import React, { useRef } from "react";
import styled from "styled-components";
import "overlayscrollbars/styles/overlayscrollbars.css";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import { Outlet } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import { OverlayScrollContext } from "context/OverlayScrollContext";
import Footer from "./Footer";
import Header from "./Header";

const StyledOverlayScrollbarsComponent = styled(OverlayScrollbarsComponent)`
  height: 100vh;
  width: 100vw;
  background-color: ${({ theme }) => theme.lightGrey};

`;

const Container = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100%;
  width: 100%;
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

  .Toastify__toast {
    pointer-events: auto;
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

const Layout: React.FC = () => {
  const containerRef = useRef(null);

  return (
    <OverlayScrollContext.Provider value={containerRef}>
      <StyledOverlayScrollbarsComponent ref={containerRef} options={{ showNativeOverlaidScrollbars: true }}>
        <Container>
          <Header />
          <Notifications />
          <ContentArea>
            <Outlet />
          </ContentArea>
          <Footer />
        </Container>
      </StyledOverlayScrollbarsComponent>
    </OverlayScrollContext.Provider>
  );
};

export default Layout;
