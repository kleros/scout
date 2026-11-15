import React, { useLayoutEffect, useRef } from "react";
import styled from "styled-components";
import { Outlet, useLocation } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import Header from "./Header";
import Footer from "./Footer";

const Container = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  width: 100%;
  overflow-x: hidden;
`;

const StyledToastContainer = styled(ToastContainer)`
  padding: 16px;
  padding-top: 70px;
`;

const OutletContainer = styled.main`
  flex: 1;
  background-color: #08020E;
`;

// Client-side navigation keeps the previous page's scroll position; a new page should open at its top.
const useScrollToTopOnNavigation = () => {
  const { pathname } = useLocation();
  const previousPathname = useRef(pathname);

  useLayoutEffect(() => {
    if (previousPathname.current === pathname) return;
    previousPathname.current = pathname;
    window.scrollTo(0, 0);
  }, [pathname]);
};

const Layout: React.FC = () => {
  useScrollToTopOnNavigation();

  return (
    <Container>
      <Header />
      <StyledToastContainer />
      <OutletContainer>
        <Outlet />
      </OutletContainer>
      <Footer />
    </Container>
  );
};

export default Layout;
