import React, { useRef } from "react";
import styled, { css } from "styled-components";
import { landscapeStyle } from "styles/landscapeStyle";

import { useClickAway } from "react-use";

import Guide from "svgs/icons/book.svg";
import Bug from "svgs/icons/bug.svg";
import Chat from "svgs/icons/chat.svg"
import ETH from "svgs/icons/eth.svg";
import Faq from "svgs/menu-icons/help.svg";
import Telegram from "svgs/socialmedia/telegram.svg";

import { IHelp } from "../index";

const Container = styled.div`
  display: flex;
  flex-direction: column;
  position: absolute;
  max-height: 80vh;
  overflow-y: auto;
  width: 86vw;
  max-width: 444px;
  top: 5%;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1;
  padding: 12px 12px 24px 12px;
  border: 0.1px solid ${({ theme }) => theme.stroke};
  background-color: ${({ theme }) => theme.lightBackground};
  border-radius: 12px;
  box-shadow: ${({ theme }) => theme.cardShadow};

  ${landscapeStyle(
    () => css`
      margin-top: 64px;
      width: 260px;
      top: 0;
      right: 0;
      left: auto;
      transform: none;
    `
  )}
`;

const ListItem = styled.a`
  display: flex;
  gap: 8px;
  padding: 12px 8px;
  cursor: pointer;
  transition: transform 0.2s;

  small {
    font-size: 16px;
    font-weight: 400;
    color: ${({ theme }) => theme.secondaryText};
  }

  :hover {
    transform: scale(1.02);
  }

  :hover small {
    transition: color 0.1s;
    color: ${({ theme }) => theme.white};
  }

  :hover svg {
    transition: color 0.1s;
    fill: ${({ theme }) => theme.white};
  }
`;

const Icon = styled.svg`
  display: inline-block;
  width: 16px;
  height: 16px;
  fill: ${({ theme }) => theme.secondaryText};
`;

const ITEMS = [
  {
    text: "Get Help",
    Icon: Telegram,
    url: "https://t.me/KlerosCurate",
  },
  {
    text: "Report a Bug",
    Icon: Bug,
    url: "https://github.com/kleros/scout/issues",
  },
  {
    text: "Give Feedback",
    Icon: Chat,
    url: "https://forms.gle/Qnr9QwqRjaYMyB3t6",
  },
  {
    text: "App Guide",
    Icon: Guide,
    url: "https://docs.kleros.io/products/curate/kleros-scout",
  },
  {
    text: "Crypto Beginner's Guide",
    Icon: ETH,
    url: "https://ethereum.org/en/wallets/",
  },
  {
    text: "FAQ",
    Icon: Faq,
    url: "https://docs.kleros.io/products/curate/kleros-scout/faqs",
  },
];

const Help: React.FC<IHelp> = ({ toggleIsHelpOpen }) => {
  const containerRef = useRef(null);
  useClickAway(containerRef, () => {
    toggleIsHelpOpen();
  });

  return (
    <>
      <Container ref={containerRef}>
        {ITEMS.map((item) => (
          <ListItem
            href={item.url}
            key={item.text}
            target="_blank"
          >
            <Icon as={item.Icon} />
            <small>{item.text}</small>
          </ListItem>
        ))}
      </Container>
    </>
  );
};
export default Help;
