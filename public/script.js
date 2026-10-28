// --- Global Functions for State Management ---
const API_BASE_URL = 'http://localhost:5000/api';

const getUserState = () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
};

const getToken = () => localStorage.getItem('token');

const setUserState = (user, token = null) => {
    if (user) {
        localStorage.setItem('user', JSON.stringify(user));
        if (token) localStorage.setItem('token', token);
    } else {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
    }
    renderNavbar(); // Re-render navbar on login/logout
};

const getAuthHeaders = () => {
    const headers = { 'Content-Type': 'application/json' };
    const token = getToken();
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
};

const showSection = (sectionName) => {
    const sections = ['search', 'auth', 'booking', 'ticket', 'history'];
    sections.forEach(id => {
        const el = document.getElementById(id + 'Section');
        if (el) el.classList.add('hidden');
    });
    
    const targetEl = document.getElementById(sectionName + 'Section');
    if (targetEl) targetEl.classList.remove('hidden');

    if (sectionName === 'history') {
        fetchHistory();
    } else if (sectionName === 'search') {
        document.getElementById('globalMessage').innerText = 'Welcome! Search for your next flight.';
    }
};

// --- Navbar Rendering ---
const renderNavbar = () => {
    const user = getUserState();
    const navButtonsEl = document.getElementById('navButtons');
    navButtonsEl.innerHTML = '';
    
    const createButton = (text, onClick, classes) => {
        const btn = document.createElement('button');
        btn.textContent = text;
        btn.className = classes;
        btn.onclick = onClick;
        return btn;
    };

    const searchBtn = createButton('Search Flights', () => showSection('search'), 'text-white hover:text-blue-200');
    navButtonsEl.appendChild(searchBtn);

    if (user) {
        const historyBtn = createButton('History', () => showSection('history'), 'text-white hover:text-blue-200');
        const userSpan = document.createElement('span');
        userSpan.className = 'text-blue-200 text-sm';
        userSpan.textContent = `Hi, ${user.name.split(' ')[0]}`;
        const logoutBtn = createButton('Logout', handleLogout, 'px-3 py-1 bg-red-500 rounded text-white hover:bg-red-600');
        
        navButtonsEl.appendChild(historyBtn);
        navButtonsEl.appendChild(userSpan);
        navButtonsEl.appendChild(logoutBtn);
    } else {
        const loginBtn = createButton('Login / Register', () => showSection('auth'), 'px-3 py-1 bg-green-500 rounded text-white hover:bg-green-600');
        navButtonsEl.appendChild(loginBtn);
    }
};

// --- AUTHENTICATION Logic ---
let isRegisterMode = false;

const toggleAuthMode = () => {
    isRegisterMode = !isRegisterMode;
    document.getElementById('authTitle').innerText = isRegisterMode ? 'Register' : 'Login';
    document.getElementById('authSubmitButton').innerText = isRegisterMode ? 'Register Account' : 'Login';
    document.getElementById('nameField').classList.toggle('hidden', !isRegisterMode);
    document.getElementById('toggleAuthModeBtn').innerText = isRegisterMode ? 'Switch to Login' : 'Switch to Register';
    document.getElementById('authMessage').innerText = '';
};

const handleLogout = () => {
    setUserState(null);
    showSection('search');
};

const handleAuthSubmit = async (e) => {
    e.preventDefault();
    const endpoint = isRegisterMode ? 'auth/register' : 'auth/login';
    const name = document.getElementById('authName').value;
    const email = document.getElementById('authEmail').value;
    const password = document.getElementById('authPassword').value;
    const authMessageEl = document.getElementById('authMessage');
    authMessageEl.innerText = 'Processing...';

    const body = { email, password };
    if (isRegisterMode) body.name = name;

    try {
        const res = await fetch(`${API_BASE_URL}/${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        const data = await res.json();

        if (res.ok && data.user) {
            // Save user details AND JWT token
            setUserState(data.user, data.token);
            authMessageEl.innerText = data.message;
            showSection('search');
        } else if (res.ok && !data.user) {
            // Successful registration, prompt login
            authMessageEl.innerText = data.message;
            toggleAuthMode(); // Switch to login view
        } else {
            authMessageEl.innerText = `Error: ${data.message}`;
        }
    } catch (err) {
        authMessageEl.innerText = 'Error connecting to server.';
    }
};

// --- SEARCH Logic ---
const handleSearchSubmit = async (e) => {
    e.preventDefault();
    
    const departure = document.getElementById("departure").value.trim();
    const arrival = document.getElementById("arrival").value.trim();
    const date = document.getElementById("date").value.trim(); 

    const messageEl = document.getElementById("globalMessage");
    const resultsEl = document.getElementById("resultsContainer");

    messageEl.innerText = "Searching for flights...";
    resultsEl.innerHTML = '';
    
    document.getElementById("bookingSection").classList.add('hidden');
    document.getElementById("ticketSection").classList.add('hidden');

    try {
        const res = await fetch(`${API_BASE_URL}/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ departure, arrival, date }),
        });
        const data = await res.json();
        
        messageEl.innerText = data.message;

        if (data.flights && data.flights.length > 0) {
            resultsEl.innerHTML = data.flights.map(flight => `
                <div class="flight-card bg-white p-4 rounded-lg shadow-md mb-4 flex justify-between items-center" data-flight-id="${flight.id}">
                    <div>
                        <p class="text-lg font-semibold text-blue-600">${flight.airline} (${flight.flight_number})</p>
                        <p class="text-sm text-gray-600">${flight.departure_city} → ${flight.arrival_city}</p>
                        <p class="text-xs text-gray-500">Depart: ${flight.departure_time.substring(0, 10)} @ ${flight.departure_time.substring(11, 16)}</p>
                    </div>
                    <div class="text-right">
                        <p class="text-xl font-bold text-green-600">₹ ${flight.price}</p>
                        <p class="text-xs text-gray-500">Seats: <span class="seat-count">${flight.available_seats}</span></p>
                        <button class="book-now-btn mt-2 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                                data-flight-id="${flight.id}" 
                                data-airline="${flight.airline}" 
                                data-price="${flight.price}"
                                data-seats="${flight.available_seats}">Book Now</button>
                    </div>
                </div>
            `).join('');

            document.querySelectorAll('.book-now-btn').forEach(button => {
                button.addEventListener('click', handleBookNowClick);
            });
        }
    } catch (err) {
        messageEl.innerText = "❌ Failed to connect to server.";
    }
};

// --- BOOKING Logic ---
const handleBookNowClick = (event) => {
    const user = getUserState();
    if (!user) {
        document.getElementById('globalMessage').innerText = 'Please Login to proceed with booking.';
        showSection('auth');
        return;
    }
    
    const button = event.target;
    const flightId = button.dataset.flightId;
    const airline = button.dataset.airline;
    const price = button.dataset.price;
    const availableSeats = parseInt(button.dataset.seats);

    if (availableSeats <= 0) {
        document.getElementById('globalMessage').innerText = 'This flight is sold out.';
        return;
    }

    document.getElementById('bookingFlightId').value = flightId;
    document.getElementById('bookingFlightInfo').innerHTML = `Booking: <strong>${airline}</strong> (Price: ₹${price})`;
    document.getElementById('bookingSeatsToBook').max = Math.min(availableSeats, 5);
    
    // Pre-fill user data
    document.getElementById('bookingCustomerName').value = user.name;
    document.getElementById('bookingCustomerEmail').value = user.email;

    document.getElementById('globalMessage').innerText = `Ready to book flight ${flightId}.`;
    document.getElementById('bookingSection').classList.remove('hidden');
};

const handleBookingSubmit = async (e) => {
    e.preventDefault();
    const user = getUserState();
    if (!user) return; 

    const flightId = document.getElementById("bookingFlightId").value;
    const customerName = document.getElementById("bookingCustomerName").value.trim();
    const email = document.getElementById("bookingCustomerEmail").value.trim();
    const seats = document.getElementById("bookingSeatsToBook").value;
    
    const messageEl = document.getElementById('globalMessage');
    messageEl.innerText = "Processing booking...";
    document.getElementById("bookingSection").classList.add('hidden');

    try {
        const res = await fetch(`${API_BASE_URL}/book`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ 
                flightId, 
                customerName, 
                email, 
                seats
            }),
        });
        const data = await res.json();

        messageEl.innerText = data.message;

        if (res.ok && data.ticket) {
            displayTicket(data.ticket);
        }

    } catch (err) {
        messageEl.innerText = "❌ A network error occurred during booking.";
    }
};

// --- TICKET Display Logic ---
const displayTicket = (ticket) => {
    document.getElementById("searchSection").classList.add('hidden');
    document.getElementById("ticketSection").classList.remove('hidden');

    const departureTime = new Date(ticket.departure_time);
    const formattedDate = departureTime.toLocaleDateString('en-IN');
    const formattedTime = departureTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

    const ticketHtml = `
        <div class="max-w-md mx-auto mt-8">
            <div class="ticket-card">
                <div class="bg-blue-600 text-white p-4 flex justify-between items-center rounded-t-lg">
                    <h4 class="text-xl font-bold">${ticket.airline}</h4>
                    <p class="text-lg">${ticket.flight_number}</p>
                </div>
                <div class="p-6 bg-white border-x border-b border-gray-200 rounded-b-lg">
                    <p class="mb-2"><strong>Passenger:</strong> ${ticket.customer_name}</p>
                    <p class="mb-2"><strong>Email:</strong> ${ticket.email}</p>
                    <div class="text-center my-4 p-3 bg-gray-100 rounded">
                        <span class="font-bold text-lg">${ticket.departure_city}</span> 
                        → 
                        <span class="font-bold text-lg">${ticket.arrival_city}</span>
                    </div>
                    <p class="text-sm"><strong>Date:</strong> ${formattedDate} | <strong>Departure:</strong> ${formattedTime}</p>
                    <p class="text-sm mt-1"><strong>Seats Booked:</strong> ${ticket.seats_booked}</p>
                    <div class="mt-4 pt-4 border-t border-dashed border-gray-300 flex justify-between items-center">
                        <p class="text-xs">Booking ID: ${ticket.booking_id}</p>
                        <p class="text-xl font-extrabold text-green-600">₹ ${ticket.price_paid}</p>
                    </div>
                </div>
            </div>
            <button id="cancelButton" data-booking-id="${ticket.booking_id}" data-flight-id="${ticket.flight_id}" class="w-full mt-4 p-3 bg-red-600 text-white rounded font-bold hover:bg-red-700">Cancel Booking</button>
        </div>
    `;
    document.getElementById("ticketSection").innerHTML = ticketHtml;
    document.getElementById("cancelButton").addEventListener('click', handleCancellation);
};

// --- HISTORY Logic ---
const fetchHistory = async () => {
    const user = getUserState();
    if (!user) return;

    const historyEl = document.getElementById('historyContent');
    historyEl.innerHTML = '<p class="text-center text-gray-500 mt-4">Loading history...</p>';

    try {
        const res = await fetch(`${API_BASE_URL}/history`, {
            headers: getAuthHeaders(),
        });
        const data = await res.json();
        
        if (data.history && data.history.length > 0) {
            historyEl.innerHTML = data.history.map(b => `
                <div class="bg-white p-4 border border-gray-200 rounded-lg shadow-sm mb-3">
                    <p class="font-bold text-blue-700">${b.departure_city} → ${b.arrival_city}</p>
                    <p class="text-sm">Flight: ${b.airline} (${b.flight_number})</p>
                    <p class="text-xs">Date Booked: ${new Date(b.booking_date).toLocaleDateString()}</p>
                    <p class="text-sm">Travel Date: ${new Date(b.departure_time).toLocaleDateString()} | Seats: ${b.seats_booked}</p>
                    <p class="text-xs text-gray-500">Booking ID: ${b.booking_id}</p>
                </div>
            `).join('');
        } else {
            historyEl.innerHTML = '<p class="text-center text-gray-500 mt-4">No bookings found in your history.</p>';
        }

    } catch (err) {
        historyEl.innerHTML = '<p class="text-center text-red-500 mt-4">Failed to load history.</p>';
    }
};

// --- CANCELLATION Logic ---
const handleCancellation = async (event) => {
    const button = event.target;
    const bookingId = button.dataset.bookingId;
    
    if (!confirm(`Are you sure you want to cancel Booking ID ${bookingId}?`)) return;

    const messageEl = document.getElementById('globalMessage');
    messageEl.innerText = "Processing cancellation...";
    document.getElementById("ticketSection").classList.add('hidden');

    try {
        const res = await fetch(`${API_BASE_URL}/cancel`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ bookingId }),
        });

        const data = await res.json();
        messageEl.innerText = data.message;
        
        if (res.ok) {
             document.getElementById('globalMessage').innerText = data.message + ". Please refresh search results to see updated seat count.";
        }
    } catch (err) {
        messageEl.innerText = "❌ A network error occurred during cancellation.";
    }
};

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    renderNavbar(); // Render initial Navbar

    // Add event listeners to forms
    document.getElementById('searchForm').addEventListener('submit', handleSearchSubmit);
    document.getElementById('authForm').addEventListener('submit', handleAuthSubmit);
    document.getElementById('bookingForm').addEventListener('submit', handleBookingSubmit);
    
    // Add event listener to auth mode toggle button
    document.getElementById('toggleAuthModeBtn').addEventListener('click', toggleAuthMode);
    
    showSection('search'); // Show search page by default
});
