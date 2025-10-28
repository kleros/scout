import React from 'react';
import FilterModal from 'components/FilterModal';

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  chainFilters: string[];
  onChainFiltersChange: (chains: string[]) => void;
}

const RegistriesFilterModal: React.FC<FilterModalProps> = (props) => {
  return <FilterModal {...props} />;
};

export default RegistriesFilterModal;