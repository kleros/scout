import React from "react";
import styled from "styled-components";
import { Outlet } from "react-router-dom";
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

const OutletContainer = styled.div`
  flex: 1;
  background-color: #08020E;
`;

const Layout: React.FC = () => {
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
