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
  className?: string;
}

const RewardCardContent: React.FC<RewardCardContentProps> = ({ title, description, registryKey, deadline, className }) => (
  <RewardCard to={`/${registryKey}`} className={className}>
    <RewardCardTopSection>
      <RewardCardNewBadge>NEW</RewardCardNewBadge>
      <RewardCardTitle>{title}</RewardCardTitle>
      <RewardCardDescription>{description}</RewardCardDescription>
    </RewardCardTopSection>
    <RewardCardBottomSection>
      <RewardCardDetailRow>
        <CalendarIcon />
        <span>Deadline:</span>
        <RewardCardCalendarValue>{deadline}</RewardCardCalendarValue>
      </RewardCardDetailRow>
      <RewardCardDivider />
      <RewardCardDetailRow>
        <CoinIcon />
        <span>Submissions:</span>
        <RewardCardRewardValue>{SUBMISSION_REWARD}</RewardCardRewardValue>
      </RewardCardDetailRow>
      <RewardCardDetailRow>
        <CoinIcon />
        <span>Removals:</span>
        <RewardCardRewardValue>{REMOVAL_REWARD}</RewardCardRewardValue>
      </RewardCardDetailRow>
    </RewardCardBottomSection>
  </RewardCard>
);

export default RewardCardContent;
