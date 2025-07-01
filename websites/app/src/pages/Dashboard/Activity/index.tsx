import React from "react";
import styled, { css } from "styled-components";
import { landscapeStyle } from "styles/landscapeStyle";

// import ActivityIcon from "svgs/icons/activity.svg";
// import SubmissionsIcon from "svgs/icons/submissions.svg";

const Container = styled.div`
  color: ${({ theme }) => theme.primaryText};
  min-height: 100vh;
  padding: 32px 32px 64px;
  font-family: "Inter", sans-serif;
  background: ${({ theme }) => theme.lightBackground};

  ${landscapeStyle(
    () => css`
      padding: 80px 0 100px 48px;
    `
  )}
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 32px;

  svg {
    min-width: 64px;
    min-height: 64px;
    width: 64px;
    height: 64px;
    flex-shrink: 0;
  }
`;

const Title = styled.h1`
  font-size: 24px;
  margin: 0;
`;

const Subtitle = styled.p`
  margin: 4px 0 0 0;
  color: ${({ theme }) => theme.secondaryText};
`;

const CardRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 900px;
`;

const StatCard = styled.div`
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 24px;
  border-radius: 12px;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.08) 0%, rgba(153, 153, 153, 0.08) 100%);
  border: 1px solid ${({ theme }) => theme.lightGrey};
  box-shadow: 0px 1px 2px 0px rgba(0, 0, 0, 0.05);

  svg {
    min-width: 64px;
    min-height: 64px;
    width: 64px;
    height: 64px;
    flex-shrink: 0;
  }
`;

const StatInfo = styled.div`
  display: flex;
  flex-direction: column;
`;

const StatLabel = styled.label`
  color: ${({ theme }) => theme.secondaryText};
  font-size: 16px;
`;

const StatValue = styled.span`
  font-size: 32px;
  font-weight: 600;
`;

const Activity: React.FC<{ submissions: number }> = ({ submissions }) => (
  <Container>
    <Header>
      {/* <ActivityIcon /> */}
      <div>
        <Title>My Activity</Title>
        <Subtitle>Follow up your submissions, challenges, and other interactions with Scout.</Subtitle>
      </div>
    </Header>

    <CardRow>
      <StatCard>
        {/* <SubmissionsIcon /> */}
        <StatInfo>
          <StatLabel>Submissions</StatLabel>
          <StatValue>61</StatValue>
        </StatInfo>
      </StatCard>
    </CardRow>
  </Container>
);

export default Activity;
