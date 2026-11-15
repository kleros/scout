import React from "react";
import CalendarIcon from "svgs/icons/calendar.svg";
import CoinIcon from "svgs/icons/coins.svg";
import {
  RewardCard,
  RewardCardNewBadge,
  RewardCardTitle,
  RewardCardDescription,
  RewardCardDetailRow,
  RewardCardTopSection,
  RewardCardBottomSection,
  RewardCardDivider,
  RewardCardCalendarValue,
  RewardCardRewardValue,
} from "./RewardCard";
import { SUBMISSION_REWARD, REMOVAL_REWARD } from "./rewardsConfig";

interface RewardCardContentProps {
  title: string;
  description: string;
  registryKey: string;
  deadline: string;
  /** Heading level of the card title: h2 under a page title (/rewards), h3 under a section title (home). */
  titleAs?: "h2" | "h3";
  className?: string;
}

const RewardCardContent: React.FC<RewardCardContentProps> = ({ title, description, registryKey, deadline, titleAs = "h2", className }) => (
  <RewardCard to={`/${registryKey}`} className={className}>
    <RewardCardTopSection>
      <RewardCardNewBadge>NEW</RewardCardNewBadge>
      <RewardCardTitle as={titleAs}>{title}</RewardCardTitle>
      <RewardCardDescription>{description}</RewardCardDescription>
    </RewardCardTopSection>
    <RewardCardBottomSection>
      <RewardCardDetailRow>
        <CalendarIcon aria-hidden="true" />
        <span>Deadline:</span>
        <RewardCardCalendarValue>{deadline}</RewardCardCalendarValue>
      </RewardCardDetailRow>
      <RewardCardDivider />
      <RewardCardDetailRow>
        <CoinIcon aria-hidden="true" />
        <span>Submissions:</span>
        <RewardCardRewardValue>{SUBMISSION_REWARD}</RewardCardRewardValue>
      </RewardCardDetailRow>
      <RewardCardDetailRow>
        <CoinIcon aria-hidden="true" />
        <span>Removals:</span>
        <RewardCardRewardValue>{REMOVAL_REWARD}</RewardCardRewardValue>
      </RewardCardDetailRow>
    </RewardCardBottomSection>
  </RewardCard>
);

export default RewardCardContent;
