import { useState, useEffect, useRef } from 'react'

const CustomDropdown = ({ value, onChange, options }) => {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)
  
  const selectedOption = options.find(opt => opt.value === value)
  
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])
  
  return (
    <div className="custom-dropdown-container" ref={dropdownRef}>
      <button 
        className="dropdown-button" 
        onClick={() => setIsOpen(!isOpen)}
        type="button"
      >
        {selectedOption?.label}
        <span className={`dropdown-arrow ${isOpen ? 'open' : ''}`}>▼</span>
      </button>
      {isOpen && (
        <div className="dropdown-options-list">
          {options.map(option => (
            <div 
              key={option.value}
              className={`dropdown-option-item ${value === option.value ? 'selected' : ''}`}
              onClick={() => {
                onChange(option.value)
                setIsOpen(false)
              }}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const PackOwnershipModal = ({ 
  isOpen, 
  onClose, 
  packData, 
  packOwnership, 
  setPackOwnership,
  memoryArchiveOwnership,
  setMemoryArchiveOwnership 
}) => {
  if (!isOpen || !packData) return null

  const handlePackToggle = (packId) => {
    setPackOwnership(prev => ({
      ...prev,
      [packId]: !prev[packId]
    }))
  }

  const handleMemoryToggle = (songTitle) => {
    setMemoryArchiveOwnership(prev => ({
      ...prev,
      [songTitle]: !prev[songTitle]
    }))
  }
  const handleSelectAllMemory = () => {
    const allMemorySongs = packData.memory_archive.songs
    const newOwnership = {}
    allMemorySongs.forEach(song => {
      newOwnership[song] = true
    })
    setMemoryArchiveOwnership(newOwnership)
  }

  const handleSelectNoneMemory = () => {
    setMemoryArchiveOwnership({})
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Pack Ownership</h3>
          <button className="close-button" onClick={onClose}>&times;</button>
        </div>
        
        <div className="modal-body">
          <div className="pack-category">
            <h4>Free Content</h4>
            <div className="pack-item">
              <label>
                <input
                  type="checkbox"
                  checked={packOwnership.main || false}
                  onChange={() => handlePackToggle('main')}
                />
                Arcaea (Main Pack)
              </label>
            </div>
          </div>          <div className="pack-category">
            <h4>World Extend</h4>
            <div className="pack-item">
              <label>
                <input
                  type="checkbox"
                  checked={packOwnership.world_extend_3 || false}
                  onChange={() => handlePackToggle('world_extend_3')}
                />
                World Extend 3: Illusions
              </label>
            </div>
          </div>

          <div className="pack-category">
            <h4>Extend Archives</h4>
            <div className="pack-item">
              <label>
                <input
                  type="checkbox"
                  checked={packOwnership.extend_archive_1 || false}
                  onChange={() => handlePackToggle('extend_archive_1')}
                />
                Extend Archive 1: Visions
              </label>
            </div>
            <div className="pack-item">
              <label>
                <input
                  type="checkbox"
                  checked={packOwnership.extend_archive_2 || false}
                  onChange={() => handlePackToggle('extend_archive_2')}
                />
                Extend Archive 2: Chronicles
              </label>
            </div>
          </div>          <div className="pack-category">
            <h4>Story Packs</h4>
            {Object.entries(packData)
              .filter(([_, pack]) => pack.type === 'story')
              .map(([packId, pack]) => (
                <div key={packId} className="pack-item">
                  <label>
                    <input
                      type="checkbox"
                      checked={packOwnership[packId] || false}
                      onChange={() => handlePackToggle(packId)}
                    />
                    {pack.name}
                  </label>
                </div>
              ))}
          </div>

          <div className="pack-category">
            <h4>Collaboration Packs</h4>
            {Object.entries(packData)
              .filter(([_, pack]) => pack.type === 'collaboration')
              .map(([packId, pack]) => (
                <div key={packId} className="pack-item">
                  <label>
                    <input
                      type="checkbox"
                      checked={packOwnership[packId] || false}
                      onChange={() => handlePackToggle(packId)}
                    />
                    {pack.name}
                  </label>
                </div>
              ))}
          </div>

          <div className="pack-category">
            <h4>Memory Archive</h4>
            <div className="memory-archive-controls">
              <button onClick={handleSelectAllMemory} className="memory-btn">Select All</button>
              <button onClick={handleSelectNoneMemory} className="memory-btn">Select None</button>
            </div>
            <div className="memory-archive-songs">
              {packData.memory_archive.songs.map(song => (
                <div key={song} className="memory-song-item">
                  <label>
                    <input
                      type="checkbox"
                      checked={memoryArchiveOwnership[song] || false}
                      onChange={() => handleMemoryToggle(song)}
                    />
                    {song}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const Controls = ({ 
  sortBy, 
  setSortBy, 
  userScores,
  currentFilter,
  setCurrentFilter,
  searchTerm,
  setSearchTerm,
  packData,
  packOwnership,
  setPackOwnership,
  memoryArchiveOwnership,
  setMemoryArchiveOwnership
}) => {
  console.log('Controls packData:', packData)
  const [showOwnershipModal, setShowOwnershipModal] = useState(false)

  // Debug: Log packData to console
  console.log('Controls packData:', packData)

  const sortOptions = [
    { value: 'cc-desc', label: 'Chart Constant (High to Low)' },
    { value: 'cc-asc', label: 'Chart Constant (Low to High)' },
    { value: 'title-asc', label: 'Title (A-Z)' },
    { value: 'title-desc', label: 'Title (Z-A)' }
  ]

  const filterOptions = packData ? [
    { value: 'all_packs', label: 'All Packs' },
    { value: 'free', label: 'Free Only' },
    { value: 'world_extend', label: 'Free + World Extend' },
    { value: 'all_extend', label: 'Free + All Extend' },
    { value: 'all_except_memory', label: 'All (No Memory Archive)' },
    { value: 'story_packs_only', label: 'Story Packs Only' },
    { value: 'collaboration_packs_only', label: 'Collaboration Packs Only' },
    { value: 'custom', label: 'Custom (Based on Ownership)' }
  ] : [{ value: 'all_packs', label: 'All Packs' }]

  return (
    <>
      <section id="controls">
        <div className="controls-row">
          <div className="control-group">
            <label>Pack Filter:</label>
            <CustomDropdown 
              value={currentFilter}
              onChange={setCurrentFilter}
              options={filterOptions}
            />
          </div>
          
          <div className="control-group">
            <label>Search:</label>
            <input
              type="text"
              className="search-input"
              placeholder="Search songs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
            <div className="control-group">
            <label>Sort by:</label>
            <CustomDropdown 
              value={sortBy}
              onChange={setSortBy}
              options={sortOptions}
            />
          </div>
          
          {packData && (
            <button 
              className="ownership-btn"
              onClick={() => setShowOwnershipModal(true)}
            >
              Manage Ownership
            </button>
          )}
        </div>
      </section>

      <PackOwnershipModal
        isOpen={showOwnershipModal}
        onClose={() => setShowOwnershipModal(false)}
        packData={packData}
        packOwnership={packOwnership}
        setPackOwnership={setPackOwnership}
        memoryArchiveOwnership={memoryArchiveOwnership}
        setMemoryArchiveOwnership={setMemoryArchiveOwnership}
      />
    </>
  )
}

export default Controls
