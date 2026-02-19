import React, { useMemo } from "react";
import styled from "styled-components";

import DocViewer, { DocViewerRenderers } from "@cyntler/react-doc-viewer";

import "@cyntler/react-doc-viewer/dist/index.css";

import MarkdownRenderer from "./Viewers/MarkdownViewer";

const Wrapper = styled.div`
  background-color: ${({ theme }) => theme.whiteBackground};
  border-radius: 3px;
  box-shadow: ${({ theme }) => theme.cardShadow};
  max-height: 80vh;
  overflow: scroll;
`;

const StyledDocViewer = styled(DocViewer)`
  background-color: ${({ theme }) => theme.whiteBackground} !important;
`;

/**
 * @description this viewer supports loading multiple files, it can load urls, local files, etc
 * @param url The url of the file to be displayed
 * @returns renders the file
 */
const FileViewer: React.FC<{ url: string }> = ({ url }) => {
  const docs = useMemo(() => [{ uri: url }], [url]);
  
  const pluginRenderers = useMemo(() => [...DocViewerRenderers, MarkdownRenderer], []);
  
  const config = useMemo(() => ({
    header: {
      disableHeader: true,
      disableFileName: true,
    },
    pdfZoom: {
      defaultZoom: 0.8,
      zoomJump: 0.1,
    },
    pdfVerticalScrollByDefault: true, // false as default
  }), []);
  
  return (
    <Wrapper className="file-viewer-wrapper">
      <StyledDocViewer
        documents={docs}
        pluginRenderers={pluginRenderers}
        config={config}
      />
    </Wrapper>
  );
};

export default FileViewer;
