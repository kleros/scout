import React from 'react'
import {
  AddHeader,
  AddSubtitle,
  AddTitle,
  StyledGoogleFormAnchor,
  Divider,
} from './index'

interface Props {
  title: string
  googleFormUrl?: string
}

const FormHeader: React.FC<Props> = ({ title, googleFormUrl }) => (
  <>
    <AddHeader>
      <AddTitle>{title}</AddTitle>
      {googleFormUrl && (
        <AddSubtitle>
          Want to suggest an item without any deposit?{' '}
          <StyledGoogleFormAnchor
            href={googleFormUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Click here
          </StyledGoogleFormAnchor>
        </AddSubtitle>
      )}
    </AddHeader>
    <Divider />
  </>
)

export default FormHeader
