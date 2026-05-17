<!-- ==================== JAVASCRIPT ==================== -->

// ============================================================
// CONFIGURATION — Update these values before deploying
// ============================================================
const CONFIG = {
  // Step 1: Deploy apps-script.gs and paste the Web App URL here
  SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbytayVJ89f_8Zhmb3-3LaPuN-8YRJ9uGEbUxS2Ss6-Ib67oPiFUWl0jN6tcLQG3yVdd/exec',

  // Step 2: Your UPI ID (e.g., 9676610537@ybl or yourname@oksbi)
  UPI_ID: 'YOUR_UPI_ID@bank',

  // Your lodge name (shown in UPI payment screen)
  UPI_NAME: 'Sri Krishna Lodge',

  PHONE: '+919676610537'
};

// ============================================================
// REVIEWS DATA (edit as needed)
// ============================================================
const REVIEWS = [
  { name:'Ravi Kumar', rating:5, text:'Excellent lodge! Clean rooms, very near to temple. Staff was very helpful.' },
  { name:'Sushma Devi', rating:5, text:'Comfortable stay and polite staff. Will definitely come again.' },
  { name:'Anil Reddy', rating:4, text:'Good value for money. Close to temple and beach.' },
  { name:'Priya S.', rating:5, text:'Best budget lodge in Antarvedi. Rooms were spotless!' },
  { name:'Venkat', rating:4, text:'Nice experience. Parking was easy and rooms were clean.' }
];

// ============================================================
// OFFERS DATA — fetched from Google Sheet
// ============================================================
let cachedOffers = [];

// ============================================================
// HELPER FUNCTIONS
// ============================================================
function esc(s){ return String(s||'').replace(/[&<>"']/g,c=>'&#'+c.charCodeAt(0)+';'); }
function today(){ return new Date().toISOString().split('T')[0]; }

async function apiGet(params) {
  const url = CONFIG.SCRIPT_URL + '?' + new URLSearchParams(params).toString();
  const r = await fetch(url, { redirect:'follow' });
  return r.json();
}

async function apiPost(data) {
  const r = await fetch(CONFIG.SCRIPT_URL, {
    method:'POST',
    headers:{'Content-Type':'text/plain;charset=utf-8'},
    body: JSON.stringify(data),
    redirect:'follow'
  });
  return r.json();
}

// ============================================================
// NAVBAR
// ============================================================
function toggleNav(){
  document.getElementById('navLinks').classList.toggle('open');
}
// Close nav on link click (mobile)
document.querySelectorAll('.nav-links a').forEach(a=>{
  a.addEventListener('click',()=>document.getElementById('navLinks').classList.remove('open'));
});

// ============================================================
// DATE DEFAULTS
// ============================================================
(function setMinDates(){
  const t = today();
  ['avCheckIn','avCheckOut','bkCheckIn','bkCheckOut'].forEach(id=>{
    const el = document.getElementById(id);
    if(el) el.min = t;
  });
})();

// ============================================================
// CHECK AVAILABILITY (PUBLIC)
// ============================================================
async function checkAvailability(e){
  e.preventDefault();
  const btn = document.getElementById('avBtn');
  const result = document.getElementById('availResult');
  const checkIn = document.getElementById('avCheckIn').value;
  const checkOut = document.getElementById('avCheckOut').value;
  const roomType = document.getElementById('avRoomType').value;

  if(checkIn >= checkOut){ alert('Check-out must be after check-in'); return false; }

  btn.innerHTML = '<span class="spinner"></span> Checking...';
  btn.disabled = true;
  result.className = 'avail-result';
  result.style.display = 'none';

  try {
    const data = await apiGet({ action:'checkAvailability', checkIn, checkOut, roomType });
    if(data.success){
      if(data.available){
        result.className = 'avail-result yes';
        result.innerHTML = '✅ Rooms Available! <br><small style="font-weight:400">Click <a href="#booking" style="color:inherit;text-decoration:underline">Book Now</a> to reserve.</small>';
      } else {
        result.className = 'avail-result no';
        result.innerHTML = '❌ No rooms available for the selected dates.<br><small style="font-weight:400">Try different dates or room type.</small>';
      }
    } else {
      result.className = 'avail-result no';
      result.textContent = data.error || 'Error checking availability';
    }
  } catch(err){
    result.className = 'avail-result no';
    result.textContent = 'Could not connect to server. Please try again.';
  }
  btn.innerHTML = 'Check Availability';
  btn.disabled = false;
  return false;
}

// ============================================================
// BOOKING (PUBLIC)
// ============================================================
function scrollToBooking(roomType){
  document.getElementById('bkRoomType').value = roomType;
  document.getElementById('booking').scrollIntoView({ behavior:'smooth' });
}

async function submitBooking(e){
  e.preventDefault();
  const btn = document.getElementById('bkBtn');
  const checkIn = document.getElementById('bkCheckIn').value;
  const checkOut = document.getElementById('bkCheckOut').value;

  if(checkIn >= checkOut){ alert('Check-out must be after check-in'); return false; }

  btn.innerHTML = '<span class="spinner"></span> Booking...';
  btn.disabled = true;

  try {
    const data = await apiPost({
      action:'createBooking',
      guestName: document.getElementById('bkName').value.trim(),
      phone: document.getElementById('bkPhone').value.trim(),
      checkIn, checkOut,
      roomType: document.getElementById('bkRoomType').value,
      numGuests: document.getElementById('bkGuests').value,
      notes: document.getElementById('bkNotes').value.trim()
    });
    if(data.success){
      showPaymentModal(data);
      document.getElementById('bookingForm').reset();
    } else {
      alert(data.error || 'Booking failed. Please try again.');
    }
  } catch(err){
    alert('Could not connect to server. Please try again.');
  }
  btn.innerHTML = 'Book Now';
  btn.disabled = false;
  return false;
}

let currentBookingId = '';

function showPaymentModal(data){
  currentBookingId = data.bookingId || '';
  document.getElementById('pmRef').textContent = 'Booking Ref: ' + data.bookingId;
  document.getElementById('pmNights').textContent = data.nights + ' night' + (data.nights>1?'s':'');
  // Reset to step 1
  document.getElementById('pmStep1').style.display = 'block';
  document.getElementById('pmStep2').style.display = 'none';
  document.getElementById('pmAmountInput').value = '';
  document.getElementById('paymentModal').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function generatePaymentQR(){
  const amount = document.getElementById('pmAmountInput').value;
  if(!amount || Number(amount) <= 0){
    alert('Please enter a valid amount');
    return;
  }
  // Build UPI deep link
  const upiUrl = 'upi://pay?pa=' + encodeURIComponent(CONFIG.UPI_ID)
    + '&pn=' + encodeURIComponent(CONFIG.UPI_NAME)
    + '&am=' + encodeURIComponent(amount)
    + '&cu=INR'
    + '&tn=' + encodeURIComponent('Booking ' + currentBookingId);

  // Generate QR using free API
  const qrApiUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=' + encodeURIComponent(upiUrl);

  document.getElementById('pmAmount').textContent = '₹' + amount;
  document.getElementById('qrImage').src = qrApiUrl;
  document.getElementById('pmUpiId').textContent = 'UPI ID: ' + CONFIG.UPI_ID;

  // Switch to step 2
  document.getElementById('pmStep1').style.display = 'none';
  document.getElementById('pmStep2').style.display = 'block';
}

function closePaymentModal(){
  document.getElementById('paymentModal').classList.remove('active');
  document.body.style.overflow = '';
}

// ============================================================
// REVIEWS
// ============================================================
(function renderReviews(){
  const c = document.getElementById('reviewsContainer');
  REVIEWS.forEach(r=>{
    const stars = '★'.repeat(r.rating) + '☆'.repeat(5-r.rating);
    const div = document.createElement('div');
    div.className = 'review-card';
    div.innerHTML = `
      <div class="review-stars">${stars}</div>
      <p class="review-text">"${esc(r.text)}"</p>
      <div class="review-author">${esc(r.name)}</div>`;
    c.appendChild(div);
  });
})();

// ============================================================
// FAQ
// ============================================================
function toggleFaq(el){
  const item = el.parentElement;
  const wasOpen = item.classList.contains('open');
  document.querySelectorAll('.faq-item').forEach(i=>i.classList.remove('open'));
  if(!wasOpen) item.classList.add('open');
}

// ============================================================
// OFFERS (PUBLIC — fetched from Google Sheet)
// ============================================================
function toggleOffer(){
  const drawer = document.getElementById('offerDrawer');
  drawer.classList.toggle('open');
  populateOffers();
}

async function populateOffers(){
  const c = document.getElementById('offerContent');
  c.innerHTML = '<div style="text-align:center;padding:30px"><span class="spinner dark"></span> Loading...</div>';
  try {
    const data = await apiGet({ action:'getActiveOffers' });
    if(data.success){
      cachedOffers = data.offers || [];
    }
  } catch(err){
    // use cached if fetch fails
  }
  const t = today();
  const active = cachedOffers.filter(o=>o.validTill >= t);
  if(active.length){
    c.innerHTML = active.map(o=>`
      <div style="background:var(--cream);border-radius:var(--r);padding:20px;margin-bottom:16px">
        <h4 style="color:var(--navy);margin-bottom:8px">${esc(o.title)}</h4>
        <p style="color:var(--text-l);font-size:.9rem;margin-bottom:8px">${esc(o.description)}</p>
        <p style="font-size:.8rem;color:var(--text-xl)">Valid till: ${o.validTill}</p>
        <a href="#booking" onclick="toggleOffer()" class="btn-navy" style="display:inline-block;padding:8px 20px;margin-top:10px;font-size:.85rem;text-align:center">Book Now</a>
      </div>`).join('');
  } else {
    c.innerHTML = '<div style="text-align:center;padding:40px 0;color:var(--text-l)"><div style="font-size:2.5rem;margin-bottom:10px">🙁</div>No active offers right now.<br>Check back soon!</div>';
  }
}

// ============================================================
// STAFF LOGIN / LOGOUT
// ============================================================
function showLogin(){
  document.getElementById('loginOverlay').classList.add('active');
  document.getElementById('loginUser').focus();
}
function hideLogin(){
  document.getElementById('loginOverlay').classList.remove('active');
  document.getElementById('loginErr').style.display = 'none';
}

async function doLogin(){
  const btn = document.getElementById('loginBtn');
  const errEl = document.getElementById('loginErr');
  const username = document.getElementById('loginUser').value.trim();
  const password = document.getElementById('loginPass').value;

  if(!username || !password){ errEl.textContent='Enter username and password';errEl.style.display='block';return; }

  btn.innerHTML = '<span class="spinner"></span> Signing in...';
  btn.disabled = true;
  errEl.style.display = 'none';

  try {
    const data = await apiPost({ action:'staffLogin', username, password });
    if(data.success){
      sessionStorage.setItem('token', data.token);
      sessionStorage.setItem('staffName', data.name);
      hideLogin();
      enterDashboard(data.name);
    } else {
      errEl.textContent = data.error || 'Login failed';
      errEl.style.display = 'block';
    }
  } catch(err){
    errEl.textContent = 'Connection error. Try again.';
    errEl.style.display = 'block';
  }
  btn.innerHTML = 'Sign In';
  btn.disabled = false;
}

async function doLogout(){
  const token = sessionStorage.getItem('token');
  if(token) apiPost({ action:'staffLogout', token }).catch(()=>{});
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('staffName');
  document.getElementById('dashboard').classList.remove('active');
  document.getElementById('publicView').classList.remove('hidden');
}

function enterDashboard(name){
  document.getElementById('staffName').textContent = 'Welcome, ' + esc(name);
  document.getElementById('publicView').classList.add('hidden');
  document.getElementById('dashboard').classList.add('active');
  loadDashboardData();
}

// Auto-restore session
(function(){
  const token = sessionStorage.getItem('token');
  const name = sessionStorage.getItem('staffName');
  if(token && name) enterDashboard(name);
})();

// ============================================================
// DASHBOARD — TABS
// ============================================================
function switchTab(panel, btn){
  document.querySelectorAll('.dash-panel').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.dash-tab').forEach(t=>t.classList.remove('active'));
  document.getElementById('panel-'+panel).classList.add('active');
  btn.classList.add('active');
}

// ============================================================
// DASHBOARD — DATA LOADING
// ============================================================
let allBookings = [];

async function loadDashboardData(){
  const token = sessionStorage.getItem('token');
  if(!token) return;
  try {
    const data = await apiPost({ action:'getAllBookings', token });
    if(data.success){
      allBookings = data.bookings || [];
      renderOverview();
      renderAllBookings();
    } else if(data.error === 'Unauthorized'){
      doLogout();
    }
  } catch(err){
    console.error('Failed to load bookings', err);
  }
}

function renderOverview(){
  const t = today();
  document.getElementById('statTotal').textContent = allBookings.length;
  document.getElementById('statToday').textContent = allBookings.filter(b=>b.checkIn===t).length;
  document.getElementById('statCheckout').textContent = allBookings.filter(b=>b.checkOut===t).length;
  document.getElementById('statPending').textContent = allBookings.filter(b=>b.paymentStatus==='Pending').length;

  // Recent bookings (last 5)
  const recent = [...allBookings].reverse().slice(0,5);
  const tbody = document.querySelector('#recentTable tbody');
  tbody.innerHTML = recent.map(b=>`
    <tr>
      <td><strong>${esc(b.bookingId)}</strong></td>
      <td>${esc(b.guestName)}</td>
      <td>${esc(b.roomType)}</td>
      <td>${b.checkIn}</td>
      <td>${b.checkOut}</td>
      <td><span class="status-badge status-${esc(b.paymentStatus)}">${esc(b.paymentStatus)}</span></td>
    </tr>`).join('');
}

function renderAllBookings(){
  filterBookings();
}

function filterBookings(){
  const search = (document.getElementById('searchInput').value||'').toLowerCase();
  const status = document.getElementById('filterStatus').value;
  const room = document.getElementById('filterRoom').value;

  let filtered = allBookings.filter(b=>{
    if(status && b.paymentStatus !== status) return false;
    if(room && b.roomType !== room) return false;
    if(search){
      const hay = (b.bookingId+b.guestName+b.phone).toLowerCase();
      if(!hay.includes(search)) return false;
    }
    return true;
  });

  // Sort newest first
  filtered = [...filtered].reverse();

  const tbody = document.querySelector('#allBookingsTable tbody');
  if(filtered.length === 0){
    tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:32px;color:var(--text-l)">No bookings found</td></tr>';
    return;
  }
  tbody.innerHTML = filtered.map(b=>`
    <tr>
      <td><strong>${esc(b.bookingId)}</strong></td>
      <td>${esc(b.guestName)}</td>
      <td>${esc(b.phone)}</td>
      <td>${esc(b.roomType)}</td>
      <td>${esc(b.roomNumber)}</td>
      <td>${b.checkIn}</td>
      <td>${b.checkOut}</td>
      <td>₹${b.amount}</td>
      <td><span class="status-badge status-${esc(b.paymentStatus)}">${esc(b.paymentStatus)}</span></td>
      <td>
        <button class="action-btn edit-btn" onclick="openEditModal('${esc(b.bookingId)}')">Edit</button>
        <button class="action-btn del-btn" onclick="deleteBooking('${esc(b.bookingId)}')">Del</button>
      </td>
    </tr>`).join('');
}

// ============================================================
// DASHBOARD — EDIT BOOKING
// ============================================================
function openEditModal(bookingId){
  const b = allBookings.find(x=>x.bookingId===bookingId);
  if(!b) return;
  document.getElementById('edBookingId').value = b.bookingId;
  document.getElementById('edName').value = b.guestName;
  document.getElementById('edPhone').value = b.phone;
  document.getElementById('edCheckIn').value = b.checkIn;
  document.getElementById('edCheckOut').value = b.checkOut;
  document.getElementById('edRoomType').value = b.roomType;
  document.getElementById('edRoomNum').value = b.roomNumber||'TBD';
  document.getElementById('edAmount').value = b.amount;
  document.getElementById('edStatus').value = b.paymentStatus;
  document.getElementById('edGuests').value = b.numGuests||1;
  document.getElementById('edBookingDate').value = b.bookingDate;
  document.getElementById('edNotes').value = b.notes||'';
  document.getElementById('editOverlay').classList.add('active');
}

function closeEditModal(){
  document.getElementById('editOverlay').classList.remove('active');
}

async function saveBookingEdit(e){
  e.preventDefault();
  const btn = document.getElementById('edSaveBtn');
  btn.innerHTML = '<span class="spinner"></span> Saving...';
  btn.disabled = true;

  try {
    const data = await apiPost({
      action:'updateBooking',
      token: sessionStorage.getItem('token'),
      bookingId: document.getElementById('edBookingId').value,
      guestName: document.getElementById('edName').value.trim(),
      phone: document.getElementById('edPhone').value.trim(),
      checkIn: document.getElementById('edCheckIn').value,
      checkOut: document.getElementById('edCheckOut').value,
      roomType: document.getElementById('edRoomType').value,
      roomNumber: document.getElementById('edRoomNum').value.trim(),
      amount: Number(document.getElementById('edAmount').value),
      paymentStatus: document.getElementById('edStatus').value,
      numGuests: Number(document.getElementById('edGuests').value),
      notes: document.getElementById('edNotes').value.trim()
    });
    if(data.success){
      closeEditModal();
      loadDashboardData();
    } else {
      alert(data.error||'Update failed');
    }
  } catch(err){
    alert('Connection error');
  }
  btn.innerHTML = 'Save Changes';
  btn.disabled = false;
  return false;
}

// ============================================================
// DASHBOARD — DELETE BOOKING
// ============================================================
async function deleteBooking(bookingId){
  if(!confirm('Are you sure you want to delete booking '+bookingId+'?')) return;
  try {
    const data = await apiPost({
      action:'deleteBooking',
      token: sessionStorage.getItem('token'),
      bookingId
    });
    if(data.success) loadDashboardData();
    else alert(data.error||'Delete failed');
  } catch(err){
    alert('Connection error');
  }
}

// ============================================================
// DASHBOARD — ROOMS LIST
// ============================================================
async function loadRooms(){
  const token = sessionStorage.getItem('token');
  if(!token) return;
  const c = document.getElementById('roomsList');
  c.innerHTML = '<p style="text-align:center"><span class="spinner dark"></span> Loading rooms...</p>';
  try {
    const data = await apiPost({ action:'getRooms', token });
    if(data.success){
      const rooms = data.rooms || [];
      c.innerHTML = '<div class="room-grid">' + rooms.map(r=>`
        <div class="room-tile">
          <h4>Room ${esc(r.roomNumber)}</h4>
          <p>${esc(r.roomType)}</p>
          <p style="color:var(--gold-d);font-weight:700;font-family:'Inter',sans-serif">₹${r.price}/night</p>
          <p>Max ${r.maxGuests} guests</p>
          <p style="color:${r.active?'var(--green)':'var(--red)'};font-weight:600;font-size:.8rem">${r.active?'Active':'Inactive'}</p>
        </div>`).join('') + '</div>';
    }
  } catch(err){
    c.innerHTML = '<p style="color:var(--red)">Failed to load rooms</p>';
  }
}

// Load rooms when tab is clicked
const origSwitch = switchTab;
switchTab = function(panel, btn){
  origSwitch(panel, btn);
  if(panel === 'rooms') loadRooms();
  if(panel === 'offers') loadStaffOffers();
};

// ============================================================
// DASHBOARD — STAFF OFFERS MANAGEMENT
// ============================================================
let allOffers = [];

async function loadStaffOffers(){
  const token = sessionStorage.getItem('token');
  if(!token) return;
  const tbody = document.querySelector('#offersTable tbody');
  tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:24px"><span class="spinner dark"></span> Loading...</td></tr>';
  try {
    const data = await apiPost({ action:'getAllOffers', token });
    if(data.success){
      allOffers = data.offers || [];
      renderStaffOffers();
    } else if(data.error === 'Unauthorized'){
      doLogout();
    }
  } catch(err){
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--red)">Failed to load offers</td></tr>';
  }
}

function renderStaffOffers(){
  const tbody = document.querySelector('#offersTable tbody');
  const t = today();
  if(allOffers.length === 0){
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--text-l)">No offers yet. Click "+ Add Offer" to create one.</td></tr>';
    return;
  }
  tbody.innerHTML = allOffers.map(o=>{
    const expired = o.validTill < t;
    const statusText = !o.active ? 'Inactive' : (expired ? 'Expired' : 'Active');
    const statusClass = !o.active ? 'status-Cancelled' : (expired ? 'status-Refunded' : 'status-Confirmed');
    return `<tr${expired?' style="opacity:.6"':''}>
      <td><strong>${esc(o.offerId)}</strong></td>
      <td>${esc(o.title)}</td>
      <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(o.description)}</td>
      <td>${o.validTill}</td>
      <td><span class="status-badge ${statusClass}">${statusText}</span></td>
      <td>
        <button class="action-btn edit-btn" onclick="openOfferModal('${esc(o.offerId)}')">Edit</button>
        <button class="action-btn del-btn" onclick="deleteOffer('${esc(o.offerId)}')">Del</button>
      </td>
    </tr>`;
  }).join('');
}

function openOfferModal(offerId){
  const isEdit = !!offerId;
  document.getElementById('offerModalTitle').textContent = isEdit ? 'Edit Offer' : 'Add New Offer';
  document.getElementById('ofSaveBtn').textContent = isEdit ? 'Save Changes' : 'Create Offer';
  if(isEdit){
    const o = allOffers.find(x=>x.offerId===offerId);
    if(!o) return;
    document.getElementById('ofEditId').value = o.offerId;
    document.getElementById('ofTitle').value = o.title;
    document.getElementById('ofDesc').value = o.description || '';
    document.getElementById('ofValidTill').value = o.validTill;
    document.getElementById('ofActive').value = o.active ? 'true' : 'false';
  } else {
    document.getElementById('ofEditId').value = '';
    document.getElementById('ofTitle').value = '';
    document.getElementById('ofDesc').value = '';
    document.getElementById('ofValidTill').value = '';
    document.getElementById('ofActive').value = 'true';
  }
  document.getElementById('offerEditOverlay').classList.add('active');
}

function closeOfferModal(){
  document.getElementById('offerEditOverlay').classList.remove('active');
}

async function saveOffer(e){
  e.preventDefault();
  const btn = document.getElementById('ofSaveBtn');
  btn.innerHTML = '<span class="spinner"></span> Saving...';
  btn.disabled = true;
  const offerId = document.getElementById('ofEditId').value;
  const payload = {
    action: offerId ? 'updateOffer' : 'createOffer',
    token: sessionStorage.getItem('token'),
    title: document.getElementById('ofTitle').value.trim(),
    description: document.getElementById('ofDesc').value.trim(),
    validTill: document.getElementById('ofValidTill').value,
    active: document.getElementById('ofActive').value === 'true'
  };
  if(offerId) payload.offerId = offerId;
  try {
    const data = await apiPost(payload);
    if(data.success){
      closeOfferModal();
      loadStaffOffers();
    } else {
      alert(data.error || 'Failed to save offer');
    }
  } catch(err){
    alert('Connection error');
  }
  btn.textContent = offerId ? 'Save Changes' : 'Create Offer';
  btn.disabled = false;
  return false;
}

async function deleteOffer(offerId){
  if(!confirm('Delete this offer?')) return;
  try {
    const data = await apiPost({ action:'deleteOffer', token:sessionStorage.getItem('token'), offerId });
    if(data.success) loadStaffOffers();
    else alert(data.error || 'Delete failed');
  } catch(err){
    alert('Connection error');
  }
}

// ============================================================
// DASHBOARD — ROOM AVAILABILITY (DETAILED)
// ============================================================
async function loadRoomAvailability(){
  const token = sessionStorage.getItem('token');
  const checkIn = document.getElementById('raCheckIn').value;
  const checkOut = document.getElementById('raCheckOut').value;
  const grid = document.getElementById('roomAvailGrid');

  if(!checkIn || !checkOut){ alert('Select dates'); return; }
  if(checkIn >= checkOut){ alert('Check-out must be after check-in'); return; }

  grid.innerHTML = '<p style="text-align:center"><span class="spinner dark"></span> Checking...</p>';

  try {
    const data = await apiPost({ action:'getAvailabilityDetails', token, checkIn, checkOut });
    if(data.success){
      const rooms = data.rooms || [];
      grid.innerHTML = rooms.map(r=>{
        const cls = r.available ? 'room-tile' : 'room-tile occupied';
        let info = r.available
          ? '<p style="color:var(--green);font-weight:600">Available</p>'
          : `<p style="color:var(--red);font-weight:600">Occupied</p>
             <p style="font-size:.78rem">${esc(r.bookedBy?.guestName||'')} | ${r.bookedBy?.checkIn} → ${r.bookedBy?.checkOut}</p>
             <p style="font-size:.75rem;color:var(--text-xl)">${esc(r.bookedBy?.paymentStatus||'')}</p>`;
        return `<div class="${cls}">
          <h4>Room ${esc(r.roomNumber)}</h4>
          <p>${esc(r.roomType)} — ₹${r.price}</p>
          ${info}
        </div>`;
      }).join('');
    } else {
      grid.innerHTML = '<p style="color:var(--red)">'+esc(data.error)+'</p>';
    }
  } catch(err){
    grid.innerHTML = '<p style="color:var(--red)">Connection error</p>';
  }
}

// ============================================================
// KEYBOARD / ESC handling
// ============================================================
document.addEventListener('keydown', e=>{
  if(e.key === 'Escape'){
    closePaymentModal();
    closeEditModal();
    closeOfferModal();
    hideLogin();
    if(document.getElementById('offerDrawer').classList.contains('open')) toggleOffer();
  }
});

// Enter key on login
document.getElementById('loginPass').addEventListener('keydown', e=>{
  if(e.key === 'Enter') doLogin();
});
