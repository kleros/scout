import React from 'react';
import FilterModal from 'components/FilterModal';

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  chainFilters: string[];
  onChainFiltersChange: (chains: string[]) => void;
}

const ProfileFilterModal: React.FC<FilterModalProps> = (props) => {
  return <FilterModal {...props} scope="profile" />;
};

export default ProfileFilterModal;
