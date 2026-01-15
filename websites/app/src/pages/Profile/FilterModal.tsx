import React from 'react';
import FilterModal from 'components/FilterModal';

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  chainFilters: string[];
  onChainFiltersChange: (chains: string[]) => void;
  userAddress: string;
}

const ProfileFilterModal: React.FC<FilterModalProps> = (props) => {
  return <FilterModal {...props} />;
};

export default ProfileFilterModal;