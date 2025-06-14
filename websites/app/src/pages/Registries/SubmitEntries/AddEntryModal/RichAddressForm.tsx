import React, { SetStateAction, Dispatch } from 'react'
import styled, { css } from 'styled-components'
import { landscapeStyle } from 'styles/landscapeStyle'
import Select from 'react-select'
import { chains } from 'utils/chains'
import { StyledWholeField } from './index'

const StyledAddressDiv = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  margin-top: 8px;
`

const StyledNetworkSelect = styled(Select)`
  font-weight: bold;
  color: #cd9dff;
  width: 200px;

  > div {
    background: #333333;
    border: none;
    border-radius: 12px 12px 0 0;

    > input {
      color: #fff;
      padding: 12px;
      background: rgba(255, 255, 255, 0.15);
      border-radius: 12px;
    }
  }
  * div {
    color: #fff;
    padding: 5px 11px;
  }
`

export const StyledAddressInput = styled.input`
  display: flex;
  width: 100%;
  background: #333333;
  padding: 8px 12px;
  outline: none;
  border: none;
  color: #fff;
  border-radius: 0 12px 12px 12px;
  font-size: 18px;
  font-weight: 400;
  ::placeholder {
    font-size: 18px;
    font-weight: 400;
    color: #cd9dff;
    opacity: 75%;
  }

  ${landscapeStyle(
    () => css`
      width: 95%;
      padding-left: 24px;
    `
  )}
`

const networkOptions = chains
  .filter((chain) => !chain.deprecated)
  .map((chain) => ({
    value: `${chain.namespace}:${chain.id}`,
    label: chain.name,
  }));

export interface NetworkOption {
  value: string
  label: string
}

const RichAddressForm: React.FC<{
  networkOption: NetworkOption // entire chain! ; namespace:reference , e.g. eip155:1
  setNetwork: Dispatch<SetStateAction<NetworkOption>>
  address: string
  setAddress: Dispatch<SetStateAction<string>>
  registry: string
  domain?: string // checks for dupe richAddress - domain pairs, in domains.
}> = (p) => {
  return (
    <StyledWholeField>
      Address
      <StyledAddressDiv>
        <StyledNetworkSelect
          onChange={p.setNetwork}
          value={p.networkOption}
          options={networkOptions}
        />
        <StyledAddressInput
          onChange={(e) => p.setAddress(e.target.value)}
          value={p.address}
          placeholder="e.g. 0x93ed3fbe..."
        />
      </StyledAddressDiv>
    </StyledWholeField>
  )
}

export default RichAddressForm
