// =========================================================================
// KODE JAVASCRIPT: script.js (Cloud-Synced Version)
// =========================================================================

// ⚠️ PASTI INI SUDAH DI GANTI DENGAN URL WEB APP YANG ANDA DAPATKAN DARI DEPLOYMENT
const API_URL = 'https://script.google.com/macros/s/AKfycbyFtfvO8pPPtWUuB2pZy49RpZsMYoyMb5xPTEKQAm35t2pSg6yQ4wHyg1fi3J7-cdkw/exec'; 

let bookDatabase = []; 

function generateUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
}

// --- FUNGSI UTAMA: Ambil Data dari Cloud ---
async function fetchBooks() {
    const resultsContainer = document.getElementById('searchResults');
    resultsContainer.innerHTML = '<p class="placeholder-text loading-text">⏳ Memuat data dari Cloud...</p>';
    
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
            
            searchBook(true); 
        } else {
            resultsContainer.innerHTML = `<p class="message-text error-message">❌ Gagal membaca data dari Sheets: ${result.message}</p>`;
        }
    } catch (error) {
        // Error di sini menunjukkan masalah pada API URL atau koneksi
        resultsContainer.innerHTML = '<p class="message-text error-message">❌ Koneksi ke API gagal. Cek URL Apps Script Anda (Pastikan sudah Deploy).</p>';
        console.error("Fetch error:", error);
    }
}


// --- FUNGSI PENCARIAN & TAMPILAN ---
function searchBook(isInitialLoad = false) {
    const searchInput = document.getElementById('searchInput').value.toLowerCase().trim();
    const resultsContainer = document.getElementById('searchResults');
    let resultsHTML = '';

    const filteredBooks = bookDatabase.filter(book => {
        return book.title && book.title.toLowerCase().includes(searchInput) ||
               book.author && book.author.toLowerCase().includes(searchInput) ||
               book.isbn && book.isbn.includes(searchInput);
    });

    if (bookDatabase.length === 0) {
        resultsHTML = '<p class="placeholder-text">Database kosong. Silakan input buku baru untuk memulai.</p>';
    } else if (filteredBooks.length > 0) {
        filteredBooks.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
        
        filteredBooks.forEach(book => {
            // Struktur hasil pencarian disesuaikan
            resultsHTML += `
                <div class="book-item">
                    <div class="book-details">
                        <strong>${book.title}</strong>
                        <p>Pengarang: ${book.author}</p>
                        <p>ISBN: ${book.isbn}</p>
                    </div>
                    <span class="book-location">Rak: ${book.location}</span>
                </div>
            `;
        });
    } else if (searchInput.length > 0) {
        resultsHTML = '<p class="message-text error-message">❌ Maaf, buku tidak ditemukan.</p>';
    } else if (isInitialLoad) {
         resultsHTML = '<p class="placeholder-text">Hasil pencarian akan muncul di sini.</p>'; 
    }

    resultsContainer.innerHTML = resultsHTML;
}


// --- FUNGSI INPUT DATA BARU (Simpan ke Sheets) ---
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
        // Error di sini menunjukkan masalah pada API URL atau koneksi
        inputMessage.textContent = '❌ Gagal koneksi ke API saat menambahkan data. Cek URL Anda.';
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
