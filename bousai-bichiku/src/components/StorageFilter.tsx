import './StorageFilter.css';

interface StorageFilterProps {
  storageLocations: string[];
  selectedLocations: string[];
  onSelectionChange: (locations: string[]) => void;
}

export function StorageFilter({
  storageLocations,
  selectedLocations,
  onSelectionChange,
}: StorageFilterProps) {
  const handleToggle = (location: string) => {
    if (selectedLocations.includes(location)) {
      onSelectionChange(selectedLocations.filter(l => l !== location));
    } else {
      onSelectionChange([...selectedLocations, location]);
    }
  };

  const handleSelectAll = () => {
    onSelectionChange([]);
  };

  if (storageLocations.length === 0) return null;

  return (
    <div className="storage-filter">
      <span className="storage-filter-label">📍 保管場所:</span>
      <div className="storage-chips">
        <button
          className={`storage-chip ${selectedLocations.length === 0 ? 'active' : ''}`}
          onClick={handleSelectAll}
        >
          すべて
        </button>
        {storageLocations.map(location => (
          <button
            key={location}
            className={`storage-chip ${selectedLocations.includes(location) ? 'active' : ''}`}
            onClick={() => handleToggle(location)}
          >
            {location}
          </button>
        ))}
      </div>
    </div>
  );
}
