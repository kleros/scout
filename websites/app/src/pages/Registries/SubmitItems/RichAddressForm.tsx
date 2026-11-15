import React, { SetStateAction, Dispatch } from 'react'
import styled, { css, useTheme } from 'styled-components'
import { landscapeStyle } from 'styles/landscapeStyle'
import Select, { components } from 'react-select'
import { chains } from 'utils/chains'
import { getChainIcon } from 'utils/chainIcons'
import { StyledWholeField, FieldLabel } from './index'

const StyledAddressDiv = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  margin-top: 12px;
  position: relative;
  z-index: 10;
`

const StyledNetworkSelect = styled(Select)`
  font-weight: 400;
  min-width: 200px;
  max-width: 300px;
  position: relative;
  z-index: 100;

  /* Ensure the dropdown menu appears above everything */
  .select__menu {
    z-index: 9999 !important;
  }
`

// No local `outline: none`: the app-wide :focus-visible ring shows when the field has focus.
export const StyledAddressInput = styled.input`
  display: flex;
  width: 100%;
  background: ${({ theme }) => theme.modalInputBackground};
  padding: 12px 16px;
  border: 1px solid ${({ theme }) => theme.stroke};
  color: ${({ theme }) => theme.primaryText};
  border-radius: 0 12px 12px 12px;
  font-size: 16px;
  font-weight: 400;
  transition: all 0.2s ease;

  &:hover {
    background: ${({ theme }) => theme.backgroundFour};
  }

  &:focus {
    background: ${({ theme }) => theme.backgroundFour};
  }

  ::placeholder {
    font-size: 16px;
    font-weight: 400;
    color: ${({ theme }) => theme.secondaryText};
  }

  ${landscapeStyle(
    () => css`
      width: 95%;
      padding-left: 20px;
    `
  )}
`

const OptionIconWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  height: 100%;

  svg {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
  }
`

const networkOptions = chains
  .filter((chain) => !chain.deprecated)
  .map((chain) => ({
    value: `${chain.namespace}:${chain.id}`,
    label: chain.name,
    chainId: chain.id,
  }));

export interface NetworkOption {
  value: string
  label: string
  chainId?: string
}

// Custom Option component with icon
const CustomOption = (props: any) => {
  const ChainIcon = props.data.chainId ? getChainIcon(props.data.chainId) : null
  return (
    <components.Option {...props}>
      <OptionIconWrapper>
        {ChainIcon && <ChainIcon />}
        <span>{props.data.label}</span>
      </OptionIconWrapper>
    </components.Option>
  )
}

// Custom SingleValue component with icon
const CustomSingleValue = (props: any) => {
  // Extract chainId from value (format: "namespace:chainId")
  let chainId = props.data?.chainId
  if (!chainId && props.data?.value) {
    const parts = props.data.value.split(':')
    chainId = parts[1] // Get the chainId part after the namespace
  }

  const ChainIcon = chainId ? getChainIcon(chainId) : null

  return (
    <components.SingleValue {...props}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '100%' }}>
        {ChainIcon && <ChainIcon style={{ width: '18px', height: '18px', flexShrink: 0 }} />}
        <span>{props.data?.label || props.children}</span>
      </div>
    </components.SingleValue>
  )
}

const getCustomSelectStyles = (theme: any) => ({
  menu: (provided: any) => ({
    ...provided,
    zIndex: 9999,
    backgroundColor: theme.modalInputBackground,
    border: `1px solid ${theme.stroke}`,
    borderRadius: '12px',
    marginTop: '4px',
    overflow: 'hidden',
    boxShadow: theme.shadowModal,
  }),
  menuPortal: (provided: any) => ({
    ...provided,
    zIndex: 9999,
  }),
  menuList: (provided: any) => ({
    ...provided,
    padding: '8px',
    backgroundColor: 'transparent',
  }),
  option: (provided: any, state: any) => ({
    ...provided,
    backgroundColor: state.isSelected
      ? theme.lightGrey
      : state.isFocused
      ? theme.backgroundFour
      : 'transparent',
    color: theme.secondaryText,
    padding: '10px 12px',
    cursor: 'pointer',
    borderRadius: '8px',
    transition: 'all 0.2s ease',
    '&:hover': {
      backgroundColor: state.isSelected ? theme.lightGrey : theme.backgroundFour,
    },
  }),
  control: (provided: any, state: any) => ({
    ...provided,
    backgroundColor: state.isFocused ? theme.backgroundFour : theme.modalInputBackground,
    border: `1px solid ${theme.stroke}`,
    borderBottom: 'none',
    borderRadius: '12px 12px 0 0',
    // The search input inside has no outline of its own: ring the control while it has focus,
    // like the app-wide focus ring on the other fields.
    boxShadow: 'none',
    outline: state.isFocused ? `2px solid ${theme.klerosUIComponentsPrimaryBlue}` : 'none',
    outlineOffset: '2px',
    minHeight: '48px',
    height: '48px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    '&:hover': {
      backgroundColor: theme.backgroundFour,
    },
  }),
  singleValue: (provided: any) => ({
    ...provided,
    color: theme.secondaryText,
    margin: 0,
    padding: 0,
  }),
  // What is typed to search the chains (react-select's default is a dark grey).
  input: (provided: any) => ({
    ...provided,
    color: theme.primaryText,
  }),
  valueContainer: (provided: any) => ({
    ...provided,
    padding: '0 16px',
    height: '48px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
  }),
  indicatorSeparator: () => ({
    display: 'none',
  }),
  dropdownIndicator: (provided: any) => ({
    ...provided,
    padding: '8px',
    color: theme.primaryText,
  }),
})

const RichAddressForm: React.FC<{
  networkOption: NetworkOption // entire chain! ; namespace:reference , e.g. eip155:1
  setNetwork: Dispatch<SetStateAction<NetworkOption>>
  address: string
  setAddress: Dispatch<SetStateAction<string>>
  registry: string
  domain?: string // checks for dupe richAddress - domain pairs, in domains.
  tooltip?: string
  /** Id for the address input, so its label (and error message) can point at it. */
  inputId: string
  /** Id of the message that explains what is wrong with the address, when there is one. */
  errorId?: string
}> = (p) => {
  const theme = useTheme()
  // Always show the chain under the name the list uses ("Ethereum Mainnet"), whichever label a
  // saved draft or a ?caip10Address= link carried. Only `value` is submitted.
  const selected =
    networkOptions.find((option) => option.value === p.networkOption.value) ??
    p.networkOption

  return (
    <StyledWholeField>
      <FieldLabel htmlFor={p.inputId} help={p.tooltip}>
        Address
      </FieldLabel>
      <StyledAddressDiv>
        <StyledNetworkSelect
          onChange={p.setNetwork}
          value={selected}
          options={networkOptions}
          menuPortalTarget={document.body}
          styles={getCustomSelectStyles(theme)}
          classNamePrefix="select"
          aria-label="Network"
          components={{
            Option: CustomOption,
            SingleValue: CustomSingleValue,
          }}
        />
        <StyledAddressInput
          id={p.inputId}
          onChange={(e) => p.setAddress(e.target.value)}
          value={p.address}
          placeholder="e.g. 0x93ed3fbe..."
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          aria-invalid={p.errorId ? true : undefined}
          aria-describedby={p.errorId}
        />
      </StyledAddressDiv>
    </StyledWholeField>
  )
}

export default RichAddressForm
