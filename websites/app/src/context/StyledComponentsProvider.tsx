import React from "react";
import { ThemeProvider } from "styled-components";

import { GlobalStyle } from "styles/global-style";
import { darkTheme } from "styles/themes";

const StyledComponentsProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {

  return (
    <ThemeProvider theme={darkTheme}>
      <GlobalStyle />
      {children}
    </ThemeProvider>
  );
};

export default StyledComponentsProvider;
