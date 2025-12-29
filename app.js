// UNO Collection Tracker App
class UNOCollectionApp {
    constructor() {
        this.decks = this.loadDecks();
        this.categories = this.loadCategories();
        this.currentDeckId = null;
        this.isEditMode = false;
        this.perspectiveCropTool = null;
        this.tempPhotoData = null;
        this.currentView = 'grid'; // 'grid', 'list', or 'category'
        this.initializeApp();
    }

    initializeApp() {
        this.cacheElements();
        this.attachEventListeners();
        this.renderCollection();
        this.updateDeckCount();
    }

    cacheElements() {
        // Modals
        this.deckModal = document.getElementById('deckModal');
        this.viewModal = document.getElementById('viewModal');
        this.cropModal = document.getElementById('cropModal');

        // Buttons
        this.addDeckBtn = document.getElementById('addDeckBtn');
        this.closeModalBtn = document.getElementById('closeModal');
        this.closeViewModalBtn = document.getElementById('closeViewModal');
        this.cancelBtn = document.getElementById('cancelBtn');
        this.editDeckBtn = document.getElementById('editDeckBtn');
        this.deleteDeckBtn = document.getElementById('deleteDeckBtn');
        this.closeCropModalBtn = document.getElementById('closeCropModal');
        this.cancelCropBtn = document.getElementById('cancelCrop');
        this.applyCropBtn = document.getElementById('applyCrop');

        // Form elements
        this.deckForm = document.getElementById('deckForm');
        this.deckNameInput = document.getElementById('deckName');
        this.deckNotesInput = document.getElementById('deckNotes');
        this.categorySelect = document.getElementById('categorySelect');
        this.newCategoryInput = document.getElementById('newCategory');
        this.photoInput = document.getElementById('photoInput');
        this.photoUpload = document.getElementById('photoUpload');
        this.photoPreview = document.getElementById('photoPreview');
        this.previewImage = document.getElementById('previewImage');
        this.removePhotoBtn = document.getElementById('removePhoto');

        // Search
        this.searchInput = document.getElementById('searchInput');
        this.clearSearchBtn = document.getElementById('clearSearch');

        // Collection
        this.collectionGrid = document.getElementById('collectionGrid');
        this.emptyState = document.getElementById('emptyState');
        this.deckCountEl = document.getElementById('deckCount');

        // Other
        this.modalTitle = document.getElementById('modalTitle');
        this.viewModalContent = document.getElementById('viewModalContent');
    }

    attachEventListeners() {
        // Modal controls
        this.addDeckBtn.addEventListener('click', () => this.openAddModal());
        this.closeModalBtn.addEventListener('click', () => this.closeModal());
        this.closeViewModalBtn.addEventListener('click', () => this.closeViewModal());
        this.cancelBtn.addEventListener('click', () => this.closeModal());

        // Click outside modal to close
        this.deckModal.addEventListener('click', (e) => {
            if (e.target === this.deckModal) this.closeModal();
        });
        this.viewModal.addEventListener('click', (e) => {
            if (e.target === this.viewModal) this.closeViewModal();
        });

        // Form
        this.deckForm.addEventListener('submit', (e) => this.handleFormSubmit(e));

        // Category selector
        this.categorySelect.addEventListener('change', (e) => this.handleCategoryChange(e));

        // Photo upload
        this.photoUpload.addEventListener('click', () => this.photoInput.click());
        this.photoInput.addEventListener('change', (e) => this.handlePhotoUpload(e));
        this.removePhotoBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.removePhoto();
        });

        // Search
        this.searchInput.addEventListener('input', (e) => this.handleSearch(e));
        this.clearSearchBtn.addEventListener('click', () => {
            this.searchInput.value = '';
            this.clearSearchBtn.style.display = 'none';
            this.renderCollection();
        });

        // View toggle
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchView(e.currentTarget.dataset.view));
        });

        // View modal actions
        this.editDeckBtn.addEventListener('click', () => this.editCurrentDeck());
        this.deleteDeckBtn.addEventListener('click', () => this.deleteCurrentDeck());

        // Crop modal controls
        this.closeCropModalBtn.addEventListener('click', () => this.closeCropModal());
        this.cancelCropBtn.addEventListener('click', () => this.closeCropModal());
        this.applyCropBtn.addEventListener('click', () => this.applyCropAndClose());
    }

    // Local Storage operations
    loadDecks() {
        const stored = localStorage.getItem('unoDecks');
        return stored ? JSON.parse(stored) : [];
    }

    saveDecks() {
        try {
            localStorage.setItem('unoDecks', JSON.stringify(this.decks));
        } catch (e) {
            if (e.name === 'QuotaExceededError') {
                alert('Storage limit reached! Try using smaller images or delete some decks.');
                console.error('LocalStorage quota exceeded:', e);
            } else {
                alert('Error saving deck. Please try again.');
                console.error('Error saving to localStorage:', e);
            }
            throw e; // Re-throw to prevent the modal from closing
        }
    }

    loadCategories() {
        const stored = localStorage.getItem('unoCategories');
        return stored ? JSON.parse(stored) : ['UNO'];
    }

    saveCategories() {
        localStorage.setItem('unoCategories', JSON.stringify(this.categories));
    }

    addCategory(categoryName) {
        const trimmed = categoryName.trim();
        if (trimmed && !this.categories.includes(trimmed)) {
            this.categories.push(trimmed);
            this.saveCategories();
            this.populateCategoryDropdown();
        }
    }

    // Deck operations
    addDeck(deckData) {
        const deck = {
            id: Date.now(),
            name: deckData.name,
            category: deckData.category,
            photo: deckData.photo,
            notes: deckData.notes,
            dateAdded: new Date().toISOString()
        };
        this.decks.unshift(deck);
        this.saveDecks();
        this.renderCollection();
        this.updateDeckCount();
    }

    updateDeck(id, deckData) {
        const index = this.decks.findIndex(d => d.id === id);
        if (index !== -1) {
            this.decks[index] = {
                ...this.decks[index],
                name: deckData.name,
                category: deckData.category,
                photo: deckData.photo,
                notes: deckData.notes
            };
            this.saveDecks();
            this.renderCollection();
        }
    }

    deleteDeck(id) {
        this.decks = this.decks.filter(d => d.id !== id);
        this.saveDecks();
        this.renderCollection();
        this.updateDeckCount();
        this.closeViewModal();
    }

    getDeck(id) {
        return this.decks.find(d => d.id === id);
    }

    // View switching
    switchView(view) {
        this.currentView = view;

        // Update active button
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });

        // Update grid classes
        this.collectionGrid.classList.toggle('list-view', view === 'list');

        // Re-render collection with new view
        this.renderCollection();
    }

    // UI operations
    openAddModal() {
        this.isEditMode = false;
        this.currentDeckId = null;
        this.modalTitle.textContent = 'Add New Deck';
        this.resetForm();
        this.populateCategoryDropdown();
        this.deckModal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    openEditModal(id) {
        this.isEditMode = true;
        this.currentDeckId = id;
        const deck = this.getDeck(id);

        if (deck) {
            this.modalTitle.textContent = 'Edit Deck';
            this.populateCategoryDropdown();
            this.deckNameInput.value = deck.name;
            this.deckNotesInput.value = deck.notes || '';

            // Set category
            if (deck.category) {
                this.categorySelect.value = deck.category;
            }

            if (deck.photo) {
                this.previewImage.src = deck.photo;
                this.previewImage.style.display = 'block';
                this.photoPreview.style.display = 'none';
                this.removePhotoBtn.style.display = 'flex';
            }

            this.deckModal.classList.add('show');
            document.body.style.overflow = 'hidden';
        }
    }

    closeModal() {
        this.deckModal.classList.remove('show');
        document.body.style.overflow = '';
        this.resetForm();
    }

    openViewModal(id) {
        const deck = this.getDeck(id);
        if (!deck) return;

        this.currentDeckId = id;

        const imageHTML = deck.photo
            ? `<img src="${deck.photo}" alt="${deck.name}" class="view-deck-image">`
            : `<div class="view-deck-placeholder">🎴</div>`;

        const notesHTML = deck.notes
            ? `<div class="view-deck-notes">
                <h3>Notes</h3>
                <p>${deck.notes}</p>
               </div>`
            : '';

        this.viewModalContent.innerHTML = `
            ${imageHTML}
            <h2 class="view-deck-name">${deck.name}</h2>
            <div class="view-deck-date">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                Added ${this.formatDate(deck.dateAdded)}
            </div>
            ${notesHTML}
        `;

        this.viewModal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    closeViewModal() {
        this.viewModal.classList.remove('show');
        document.body.style.overflow = '';
        this.currentDeckId = null;
    }

    editCurrentDeck() {
        if (this.currentDeckId) {
            this.closeViewModal();
            setTimeout(() => {
                this.openEditModal(this.currentDeckId);
            }, 300);
        }
    }

    deleteCurrentDeck() {
        if (this.currentDeckId) {
            if (confirm('Are you sure you want to delete this deck? This action cannot be undone.')) {
                this.deleteDeck(this.currentDeckId);
            }
        }
    }

    resetForm() {
        this.deckForm.reset();
        this.previewImage.src = '';
        this.previewImage.style.display = 'none';
        this.photoPreview.style.display = 'flex';
        this.removePhotoBtn.style.display = 'none';
        this.newCategoryInput.style.display = 'none';
        this.newCategoryInput.value = '';
        this.currentDeckId = null;
        this.isEditMode = false;
    }

    handleFormSubmit(e) {
        e.preventDefault();

        // Get category
        let category = this.categorySelect.value;
        if (category === '__new__') {
            category = this.newCategoryInput.value.trim();
            if (category) {
                this.addCategory(category);
            } else {
                alert('Please enter a category name');
                return;
            }
        }

        const deckData = {
            name: this.deckNameInput.value.trim(),
            category: category || 'UNO',
            photo: this.previewImage.src || null,
            notes: this.deckNotesInput.value.trim()
        };

        if (this.isEditMode && this.currentDeckId) {
            this.updateDeck(this.currentDeckId, deckData);
        } else {
            this.addDeck(deckData);
        }

        this.closeModal();
    }

    handlePhotoUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('Please select an image file');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            this.tempPhotoData = e.target.result;
            this.openCropModal(this.tempPhotoData);
        };
        reader.readAsDataURL(file);
    }

    removePhoto() {
        this.photoInput.value = '';
        this.previewImage.src = '';
        this.previewImage.style.display = 'none';
        this.photoPreview.style.display = 'flex';
        this.removePhotoBtn.style.display = 'none';
    }

    handleCategoryChange(e) {
        if (e.target.value === '__new__') {
            this.newCategoryInput.style.display = 'block';
            this.newCategoryInput.focus();
        } else {
            this.newCategoryInput.style.display = 'none';
            this.newCategoryInput.value = '';
        }
    }

    populateCategoryDropdown() {
        // Clear existing options
        this.categorySelect.innerHTML = '';

        // Add placeholder
        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = 'Select or create category...';
        this.categorySelect.appendChild(placeholder);

        // Add existing categories
        this.categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            this.categorySelect.appendChild(option);
        });

        // Add "Add new" option
        const newOption = document.createElement('option');
        newOption.value = '__new__';
        newOption.textContent = '+ Add New Category';
        this.categorySelect.appendChild(newOption);
    }

    handleSearch(e) {
        const query = e.target.value.toLowerCase().trim();

        if (query) {
            this.clearSearchBtn.style.display = 'flex';
            const filtered = this.decks.filter(deck =>
                deck.name.toLowerCase().includes(query) ||
                (deck.category && deck.category.toLowerCase().includes(query)) ||
                (deck.notes && deck.notes.toLowerCase().includes(query))
            );
            this.renderCollection(filtered);
        } else {
            this.clearSearchBtn.style.display = 'none';
            this.renderCollection();
        }
    }

    clearSearch() {
        this.searchInput.value = '';
        this.clearSearchBtn.style.display = 'none';
        this.renderCollection();
        this.searchInput.focus();
    }

    renderCollection(decksToRender = this.decks) {
        this.collectionGrid.innerHTML = '';

        if (decksToRender.length === 0) {
            this.emptyState.classList.add('show');
            this.collectionGrid.style.display = 'none';
        } else {
            this.emptyState.classList.remove('show');
            this.collectionGrid.style.display = this.currentView === 'list' ? 'flex' : 'grid';

            // Category view - group by category
            if (this.currentView === 'category') {
                const groupedDecks = this.groupByCategory(decksToRender);
                Object.keys(groupedDecks).sort().forEach(category => {
                    const section = document.createElement('div');
                    section.className = 'category-section';

                    const header = document.createElement('div');
                    header.className = 'category-header';
                    header.innerHTML = `
                        <div>
                            <span class="category-title">${category}</span>
                            <span class="category-count">(${groupedDecks[category].length})</span>
                        </div>
                        <svg class="category-chevron" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                    `;

                    // Add click handler to toggle collapse
                    header.addEventListener('click', () => {
                        section.classList.toggle('collapsed');
                    });

                    section.appendChild(header);

                    const categoryGrid = document.createElement('div');
                    categoryGrid.className = 'collection-grid category-grid';
                    groupedDecks[category].forEach(deck => {
                        const card = this.createDeckCard(deck);
                        categoryGrid.appendChild(card);
                    });
                    section.appendChild(categoryGrid);

                    this.collectionGrid.appendChild(section);
                });
            } else {
                // Grid or list view
                decksToRender.forEach(deck => {
                    const card = this.createDeckCard(deck);
                    this.collectionGrid.appendChild(card);
                });
            }
        }
    }

    groupByCategory(decks) {
        const grouped = {};
        decks.forEach(deck => {
            const category = deck.category || 'Uncategorized';
            if (!grouped[category]) {
                grouped[category] = [];
            }
            grouped[category].push(deck);
        });
        return grouped;
    }

    createDeckCard(deck) {
        const card = document.createElement('div');
        card.className = 'deck-card';
        card.onclick = () => this.openViewModal(deck.id);

        const imageHTML = deck.photo
            ? `<img src="${deck.photo}" alt="${deck.name}" class="deck-card-image">`
            : `<div class="deck-card-image">🎴</div>`;

        const categoryHTML = deck.category
            ? `<div class="deck-card-category">${deck.category}</div>`
            : '';

        card.innerHTML = `
            ${imageHTML}
            <div class="deck-card-content">
                <div class="deck-card-title">${deck.name}</div>
                <div class="deck-card-date">${this.formatDate(deck.dateAdded)}</div>
                ${categoryHTML}
            </div>
        `;

        return card;
    }

    updateDeckCount() {
        this.deckCountEl.textContent = this.decks.length;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            return 'Today';
        } else if (diffDays === 1) {
            return 'Yesterday';
        } else if (diffDays < 7) {
            return `${diffDays} days ago`;
        } else if (diffDays < 30) {
            const weeks = Math.floor(diffDays / 7);
            return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
        } else if (diffDays < 365) {
            const months = Math.floor(diffDays / 30);
            return `${months} month${months > 1 ? 's' : ''} ago`;
        } else {
            return date.toLocaleDateString();
        }
    }

    // Perspective Crop methods
    openCropModal(imageData) {
        this.cropModal.classList.add('show');
        document.body.style.overflow = 'hidden';

        // Initialize perspective crop tool
        setTimeout(() => {
            this.perspectiveCropTool = new PerspectiveCrop(imageData, (croppedImage) => {
                this.handleCropComplete(croppedImage);
            });
        }, 100);
    }

    closeCropModal() {
        this.cropModal.classList.remove('show');
        document.body.style.overflow = '';

        // Clean up loupe canvas to prevent duplicates
        if (this.perspectiveCropTool && this.perspectiveCropTool.loupeCanvas) {
            this.perspectiveCropTool.loupeCanvas.remove();
        }

        this.perspectiveCropTool = null;
        this.tempPhotoData = null;
        this.photoInput.value = ''; // Reset file input
    }

    applyCropAndClose() {
        if (this.perspectiveCropTool) {
            this.perspectiveCropTool.applyCrop();
        }
    }

    handleCropComplete(croppedImage) {
        if (croppedImage) {
            // Set the cropped image as preview
            this.previewImage.src = croppedImage;
            this.previewImage.style.display = 'block';
            this.photoPreview.style.display = 'none';
            this.removePhotoBtn.style.display = 'flex';
        }

        this.closeCropModal();
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.unoApp = new UNOCollectionApp();
});
