// =========================================================================
// I. KONFIGURASI API (Google Apps Script URL)
// =========================================================================

// ⚠️ WAJIB GANTI URL INI
const API_URL = 'https://script.google.com/macros/s/AKfycbxABqLtyqycUOxZ-ScdXkP7-hUVZ5Yvd9huqNy1_CqoaQRaumRpe40QtPq2J5sKIyyo/exec'; 

let bookDatabase = []; 

function generateUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
}

// --- FUNGSI UTAMA: Ambil Data dari Cloud ---
async function fetchBooks() {
    const resultsContainer = document.getElementById('searchResults');
    resultsContainer.innerHTML = '<p class="placeholder-text loading-text"><i class="fas fa-sync fa-spin"></i> Mengambil data dari Cloud...</p>';
    
    try {
        const response = await fetch(`${API_URL}?action=read`);
        const result = await response.json();

        if (result.status === 'SUCCESS') {
            bookDatabase = result.data.filter(book => book.judul && book.judul.toString().trim().length > 0)
                .map(book => ({
                    id: book.id ? book.id.toString() : generateUniqueId(),
                    title: book.judul,
                    author: book.pengarang,
                    isbn: book.isbn.toString(),
                    location: book.lokasi
                }));
            
            searchBook();
        } else {
            resultsContainer.innerHTML = `<p class="message-text error-message">❌ Gagal membaca data dari Sheets: ${result.message}</p>`;
        }
    } catch (error) {
        resultsContainer.innerHTML = '<p class="message-text error-message">❌ Koneksi ke API gagal. Pastikan URL Apps Script benar.</p>';
        console.error("Fetch error:", error);
    }
}


// --- FUNGSI PENCARIAN & TAMPILAN ---
function searchBook() {
    const searchInput = document.getElementById('searchInput').value.toLowerCase().trim();
    const resultsContainer = document.getElementById('searchResults');
    let resultsHTML = '';

    const filteredBooks = bookDatabase.filter(book => {
        return book.title && book.title.toLowerCase().includes(searchInput) ||
               book.author && book.author.toLowerCase().includes(searchInput) ||
               book.isbn && book.isbn.includes(searchInput);
    });

    if (bookDatabase.length === 0 && searchInput.length === 0) {
        resultsHTML = '<p class="placeholder-text">Database kosong. Silakan input buku baru untuk memulai.</p>';
    } else if (filteredBooks.length > 0) {
        filteredBooks.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
        
        filteredBooks.forEach(book => {
            resultsHTML += `
                <div class="book-item">
                    <div class="book-details">
                        <strong>${book.title}</strong>
                        <p>Pengarang: ${book.author} | ISBN: ${book.isbn}</p>
                    </div>
                    <div class="location-container">
                        <span class="book-location" id="location-${book.id}">${book.location}</span>
                        <button class="edit-location-btn" onclick="editLocation('${book.id}')" title="Ganti Nomor Rak">
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
                </div>
            `;
        });
    } else if (searchInput.length > 0) {
        resultsHTML = '<p class="message-text error-message">❌ Maaf, buku tidak ditemukan.</p>';
    } else {
         resultsHTML = '<p class="placeholder-text">Masukkan kata kunci untuk mencari buku Anda.</p>';
    }

    resultsContainer.innerHTML = resultsHTML;
}


// --- FUNGSI EDIT LOKASI ---
window.editLocation = async function(id) {
    const bookIndex = bookDatabase.findIndex(book => book.id.toString() === id.toString());
    if (bookIndex === -1) {
        alert("Buku tidak ditemukan!");
        return;
    }

    const currentBook = bookDatabase[bookIndex];
    const newLocation = prompt(`Masukkan Nomor Rak/Lokasi baru untuk buku "${currentBook.title}":`, currentBook.location);

    if (newLocation === null || newLocation.trim() === "" || newLocation.trim().toUpperCase() === currentBook.location) {
        return; 
    }

    const trimmedLocation = newLocation.trim().toUpperCase();

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'update',
                id: id,
                location: trimmedLocation
            }),
            headers: { 'Content-Type': 'application/json' }
        });
        const result = await response.json();

        if (result.status === 'SUCCESS') {
            alert(`Lokasi buku "${currentBook.title}" berhasil diubah menjadi ${trimmedLocation}. Data Cloud diperbarui!`);
            fetchBooks(); 
        } else {
             alert(`Gagal update: ${result.message}`);
        }
    } catch (error) {
        alert("Gagal koneksi ke API saat update.");
    }
}


// --- FUNGSI INPUT DATA BARU ---
document.getElementById('newBookForm').addEventListener('submit', async function(event) {
    event.preventDefault();

    const title = document.getElementById('newTitle').value.trim();
    const author = document.getElementById('newAuthor').value.trim();
    const isbn = document.getElementById('newIsbn').value.trim();
    const location = document.getElementById('newLocation').value.trim();
    const inputMessage = document.getElementById('inputMessage');

    const isDuplicate = bookDatabase.some(book => book.isbn === isbn);

    if (isDuplicate) {
        inputMessage.textContent = '❌ Gagal: ISBN ini sudah terdaftar di sistem.';
        inputMessage.className = 'message-text error-message'; 
        setTimeout(() => { inputMessage.textContent = ''; inputMessage.className = 'message-text'; }, 5000);
        return;
    }
    
    const newBookData = {
        action: 'create',
        id: generateUniqueId(),
        title: title,
        author: author,
        isbn: isbn,
        location: location.toUpperCase()
    };
    
    inputMessage.textContent = '⏳ Menyimpan data ke Cloud...';
    inputMessage.className = 'message-text';

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify(newBookData),
            headers: { 'Content-Type': 'application/json' }
        });
        const result = await response.json();

        if (result.status === 'SUCCESS') {
            document.getElementById('newBookForm').reset();
            inputMessage.textContent = '✅ Buku berhasil ditambahkan dan disinkronkan!';
            inputMessage.className = 'message-text success-message';
            fetchBooks();
        } else {
             inputMessage.textContent = `❌ Gagal menyimpan data: ${result.message}`;
             inputMessage.className = 'message-text error-message';
        }

    } catch (error) {
        console.error("Error adding document: ", error);
        inputMessage.textContent = '❌ Gagal koneksi ke API saat menambahkan data.';
        inputMessage.className = 'message-text error-message';
    }

    setTimeout(() => {
        inputMessage.textContent = '';
        inputMessage.className = 'message-text';
    }, 5000);
});


document.getElementById('searchInput').addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        searchBook();
    }
});

fetchBooks();