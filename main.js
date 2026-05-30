// ============================================================
// CONFIGURATION — Update these values before deploying
// ============================================================
const CONFIG = {
  // Step 1: Deploy apps-script.gs and paste the Web App URL here
  SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbx0CVL1wvKGMX_geky20KXw1oBgc8nCtRK82H9kUC4c3Dolw6ibdS8Q3vd5xe_C4vai/exec',

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
// MODERN UI — Loader, Particles, Scroll Reveal, Navbar
// ============================================================

// Page Loader
window.addEventListener('load', () => {
  setTimeout(() => {
    const loader = document.getElementById('pageLoader');
    if(loader) loader.classList.add('done');
  }, 1500);
});

// Navbar scroll effect
window.addEventListener('scroll', () => {
  const nav = document.querySelector('.navbar');
  if(nav) nav.classList.toggle('scrolled', window.scrollY > 60);
}, { passive: true });

// Hero Particles
(function createParticles(){
  const container = document.getElementById('heroParticles');
  if(!container) return;
  for(let i = 0; i < 18; i++){
    const p = document.createElement('span');
    p.className = 'particle';
    p.style.cssText = `
      left:${Math.random()*100}%;
      width:${Math.random()*3+1}px;
      height:${Math.random()*3+1}px;
      animation-duration:${Math.random()*12+8}s;
      animation-delay:${Math.random()*10}s;
      opacity:${Math.random()*.5+.1}
    `;
    container.appendChild(p);
  }
})();

// Scroll Reveal
(function initReveal(){
  const els = document.querySelectorAll('.section-title,.room-card,.form-card,.review-card,.contact-item,.faq-item,.gallery-grid img,.hero-stats');
  if(!els.length) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if(entry.isIntersecting){
        entry.target.classList.add('visible');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  els.forEach((el, i) => {
    el.classList.add('reveal');
    if(i % 3 === 1) el.classList.add('reveal-delay-1');
    if(i % 3 === 2) el.classList.add('reveal-delay-2');
    io.observe(el);
  });
})();

// ============================================================
// DATE DEFAULTS
// ============================================================
(function setMinDates(){
  const t = today();
  ['avCheckIn','avCheckOut','bkCheckIn','bkCheckOut','wkCheckIn','wkCheckOut'].forEach(id=>{
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
        const nights = Math.ceil((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24));
        result.innerHTML = `✅ <strong>${esc(roomType)} Room Available!</strong> <br><small style="font-weight:400">${checkIn} to ${checkOut} (${nights} night${nights>1?'s':''}) — Click <a href="#booking" style="color:inherit;text-decoration:underline">Book Now</a> to reserve.</small>`;
      } else {
        result.className = 'avail-result no';
        result.innerHTML = `❌ <strong>${esc(roomType)} Room Not Available</strong><br><small style="font-weight:400">For ${checkIn} to ${checkOut}. Try different dates or room type.</small>`;
      }
    } else {
      result.className = 'avail-result no';
      result.textContent = data.error || 'Error checking availability';
    }
  } catch(err){
    result.className = 'avail-result no';
    result.textContent = 'Could not connect to server. Please try again.';
  }
  result.style.display = 'block';
  btn.innerHTML = 'Check Availability';
  btn.disabled = false;
  return false;
}

// ============================================================
// ROOM TYPE RULES — Public Booking Validations Only
// ============================================================
const ROOM_RULES = {
  'Non-AC': { minPerDay: 800, maxGuests: 2, label: 'Non-AC' },
  'AC':     { minPerDay: 1000, maxGuests: 3, label: 'AC' },
  'Suite':  { minPerDay: 1800, maxGuests: 6, label: 'Suite' }
};

function getStayDays(checkIn, checkOut) {
  return Math.max(1, Math.round((new Date(checkOut) - new Date(checkIn)) / 86400000));
}

function getMinAmount(roomType, days) {
  const rule = ROOM_RULES[roomType];
  return rule ? rule.minPerDay * days : 0;
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
  const checkIn  = document.getElementById('bkCheckIn').value;
  const checkOut = document.getElementById('bkCheckOut').value;
  const roomType = document.getElementById('bkRoomType').value;
  const guestsVal = document.getElementById('bkGuests').value.trim();
  const guestsEl  = document.getElementById('bkGuests');
  const guestsErr = document.getElementById('bkGuestsError');

  if(checkIn >= checkOut){ alert('Check-out must be after check-in'); return false; }

  // --- Guest validation (public side only) ---
  guestsErr.style.display = 'none';
  const rule = ROOM_RULES[roomType];
  if(rule){
    // Mandatory
    if(!guestsVal || Number(guestsVal) < 1){
      guestsErr.textContent = 'Number of Guests is required.';
      guestsErr.style.display = 'block';
      guestsEl.focus();
      return false;
    }
    // Max guests
    if(Number(guestsVal) > rule.maxGuests){
      guestsErr.textContent = `Maximum ${rule.maxGuests} guest${rule.maxGuests>1?'s':''} are allowed for ${rule.label} rooms.`;
      guestsErr.style.display = 'block';
      guestsEl.focus();
      return false;
    }
  }

  btn.innerHTML = '<span class="spinner"></span> Booking...';
  btn.disabled = true;

  try {
    const data = await apiPost({
      action:'createBooking',
      guestName: document.getElementById('bkName').value.trim(),
      phone: document.getElementById('bkPhone').value.trim(),
      checkIn, checkOut,
      roomType,
      numGuests: guestsVal,
      notes: document.getElementById('bkNotes').value.trim()
    });
    if(data.success){
      data.roomType = roomType;
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
let currentMinAmount = 0;
let currentRoomType  = '';
let currentDays      = 1;

function showPaymentModal(data){
  currentBookingId = data.bookingId || '';
  currentRoomType  = data.roomType  || '';
  currentDays      = data.nights    || 1;
  const rule       = ROOM_RULES[currentRoomType];
  currentMinAmount = rule ? rule.minPerDay * currentDays : 0;

  document.getElementById('pmRef').textContent    = 'Booking Ref: ' + data.bookingId;
  document.getElementById('pmNights').textContent = currentDays + ' night' + (currentDays>1?'s':'');

  // Auto-populate info box
  const infoBox = document.getElementById('pmRoomAmountInfo');
  if(rule && currentMinAmount > 0){
    const perDay  = rule.minPerDay;
    const minAmt  = currentMinAmount;
    infoBox.innerHTML = `
      <strong>🏨 ${currentRoomType} Room</strong><br>
      <span style="color:var(--text-l)">Room charge: <strong>₹${perDay.toLocaleString('en-IN')} per day</strong></span><br>
      <span style="color:var(--navy)">📅 ${currentDays} day${currentDays>1?'s':''} stay — Minimum payable: <strong style="color:var(--gold-d)">₹${minAmt.toLocaleString('en-IN')}</strong></span>`;
  } else {
    infoBox.innerHTML = `<span style="color:var(--text-l)">📞 For amount details, call <a href="tel:09676610537" style="color:var(--gold-d);font-weight:700">096766 10537</a></span>`;
  }

  // Auto-fill the amount field with minimum
  const amountInput = document.getElementById('pmAmountInput');
  amountInput.value = currentMinAmount > 0 ? currentMinAmount : '';
  amountInput.min   = currentMinAmount > 0 ? currentMinAmount : 1;

  // Reset error & steps
  document.getElementById('pmAmountError').style.display = 'none';
  document.getElementById('pmStep1').style.display = 'block';
  document.getElementById('pmStep2').style.display = 'none';
  document.getElementById('paymentModal').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function generatePaymentQR(){
  const amount    = Number(document.getElementById('pmAmountInput').value);
  const errorDiv  = document.getElementById('pmAmountError');
  const rule      = ROOM_RULES[currentRoomType];

  // Clear previous error
  errorDiv.style.display = 'none';

  if(!amount || amount <= 0){
    errorDiv.textContent = 'Please enter a valid amount.';
    errorDiv.style.display = 'block';
    return;
  }

  // Minimum amount validation
  if(rule && currentMinAmount > 0 && amount < currentMinAmount){
    const perDay = rule.minPerDay;
    const days   = currentDays;
    if(days === 1){
      errorDiv.textContent = `${currentRoomType} room charge is ₹${perDay.toLocaleString('en-IN')} per day. Minimum payable amount is ₹${currentMinAmount.toLocaleString('en-IN')}.`;
    } else {
      errorDiv.textContent = `${currentRoomType} room charge is ₹${perDay.toLocaleString('en-IN')} per day. Minimum payable amount is ₹${currentMinAmount.toLocaleString('en-IN')} for ${days} days.`;
    }
    errorDiv.style.display = 'block';
    document.getElementById('pmAmountInput').focus();
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

  document.getElementById('pmAmount').textContent = '₹' + amount.toLocaleString('en-IN');
  document.getElementById('qrImage').src          = qrApiUrl;
  document.getElementById('pmUpiId').textContent  = 'UPI ID: ' + CONFIG.UPI_ID;

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
let allRooms = [];

async function loadRooms(){
  const token = sessionStorage.getItem('token');
  if(!token) return;
  const c = document.getElementById('roomsList');
  c.innerHTML = '<p style="text-align:center"><span class="spinner dark"></span> Loading rooms...</p>';
  try {
    const data = await apiPost({ action:'getRooms', token });
    if(data.success){
      allRooms = data.rooms || [];
      c.innerHTML = '<div class="room-grid">' + allRooms.map(r=>`
        <div class="room-tile" data-room-id="${r.roomNumber}">
          <h4>Room ${esc(r.roomNumber)}</h4>
          <p>${esc(r.roomType)}</p>
          <p style="color:var(--gold-d);font-weight:700;font-family:'Inter',sans-serif">₹${r.price}/night</p>
          <p>Max ${r.maxGuests} guests</p>
          <button class="room-toggle-btn ${r.active?'active':'inactive'}" onclick="toggleRoom('${r.roomNumber}', this)">
            ${r.active?'✓ Active':'✗ Inactive'}
          </button>
        </div>`).join('') + '</div>';
      updateToggleAllButton();
    }
  } catch(err){
    c.innerHTML = '<p style="color:var(--red)">Failed to load rooms</p>';
  }
}

async function toggleRoom(roomNumber, btn){
  const token = sessionStorage.getItem('token');
  if(!token) return;
  const isCurrentlyActive = btn.classList.contains('active');
  const newStatus = !isCurrentlyActive;
  
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner dark"></span>';
  
  try {
    const data = await apiPost({ 
      action:'updateRoomStatus', 
      token, 
      roomNumber,
      active: newStatus 
    });
    if(data.success){
      btn.classList.remove('active', 'inactive');
      btn.classList.add(newStatus ? 'active' : 'inactive');
      btn.innerHTML = newStatus ? '✓ Active' : '✗ Inactive';
      
      // Update allRooms array
      const room = allRooms.find(r => r.roomNumber === roomNumber);
      if(room) room.active = newStatus;
      
      updateToggleAllButton();
      logAction('edit', `Room ${roomNumber} status changed to ${newStatus ? 'Active' : 'Inactive'}`);
    } else {
      alert(data.error || 'Failed to update room status');
      btn.innerHTML = isCurrentlyActive ? '✓ Active' : '✗ Inactive';
    }
  } catch(err){
    alert('Error updating room status');
    btn.innerHTML = isCurrentlyActive ? '✓ Active' : '✗ Inactive';
  }
  btn.disabled = false;
}

function updateToggleAllButton(){
  const toggleBtn = document.getElementById('toggleAllRoomsBtn');
  if(!toggleBtn) return;
  const allActive = allRooms.every(r => r.active);
  const noneActive = allRooms.every(r => !r.active);
  
  if(allActive){
    toggleBtn.textContent = 'Deactivate All';
    toggleBtn.className = 'btn-gold';
  } else if(noneActive){
    toggleBtn.textContent = 'Activate All';
    toggleBtn.className = 'btn-gold';
  } else {
    toggleBtn.textContent = 'Activate All';
    toggleBtn.className = 'btn-gold';
  }
}

async function toggleAllRooms(){
  const token = sessionStorage.getItem('token');
  if(!token) return;
  const btn = document.getElementById('toggleAllRoomsBtn');
  const allActive = allRooms.every(r => r.active);
  const newStatus = !allActive; // If all are active, deactivate; otherwise activate
  
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Updating...';
  
  try {
    const data = await apiPost({ 
      action:'updateAllRoomsStatus', 
      token, 
      active: newStatus 
    });
    if(data.success){
      // Update all room tiles
      allRooms.forEach(r => r.active = newStatus);
      await loadRooms();
      logAction('edit', `All rooms ${newStatus ? 'activated' : 'deactivated'}`);
    } else {
      alert(data.error || 'Failed to update rooms');
    }
  } catch(err){
    alert('Error updating rooms');
  }
  btn.disabled = false;
}

// Load rooms when tab is clicked
const origSwitch = switchTab;
switchTab = function(panel, btn){
  origSwitch(panel, btn);
  if(panel === 'rooms') loadRooms();
  if(panel === 'offers') loadStaffOffers();
  if(panel === 'walkin' && allRooms.length === 0) loadRooms();
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

// ============================================================
// ACTIVITY LOG — local session log
// ============================================================
let activityLog = [];

function logAction(type, message){
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'});
  const dateStr = now.toLocaleDateString('en-IN',{day:'2-digit',month:'short'});
  const staff = sessionStorage.getItem('staffName') || 'Staff';
  activityLog.unshift({ type, message, time: timeStr + ', ' + dateStr, staff });
  if(activityLog.length > 200) activityLog = activityLog.slice(0,200);
}

function renderActivityLog(){
  const filter = (document.getElementById('alFilter')||{}).value || '';
  const feed = document.getElementById('alFeed');
  if(!feed) return;
  const filtered = filter ? activityLog.filter(l=>l.type===filter) : activityLog;
  if(filtered.length === 0){
    feed.innerHTML = '<p style="text-align:center;padding:32px;color:var(--text-l)">No activity recorded yet.</p>';
    return;
  }
  feed.innerHTML = filtered.map(l=>`
    <div class="log-item">
      <div class="log-dot ${esc(l.type)}"></div>
      <div>
        <div class="log-msg">${esc(l.message)}</div>
        <div class="log-meta">${esc(l.staff)} &middot; ${esc(l.time)}</div>
      </div>
    </div>`).join('');
}

function clearActivityLog(){
  if(!confirm('Clear activity log for this session?')) return;
  activityLog = [];
  renderActivityLog();
}

// ============================================================
// OVERVIEW EXTRAS — today check-ins/check-outs widget
// ============================================================
function renderOverviewExtras(){
  const t = today();
  const ins  = allBookings.filter(b=>b.checkIn===t);
  const outs = allBookings.filter(b=>b.checkOut===t);

  // Ensure the split div exists (add once)
  let split = document.getElementById('overviewSplit');
  if(!split){
    split = document.createElement('div');
    split.id = 'overviewSplit';
    split.className = 'overview-split';
    const ovPanel = document.getElementById('panel-overview');
    ovPanel.appendChild(split);
  }

  const makeList = (items, emptyMsg) => items.length
    ? items.map(b=>`<div class="cio-item">
        <div class="cio-name">${esc(b.guestName)}</div>
        <div class="cio-detail">Room ${esc(b.roomNumber||'TBD')} &bull; ${esc(b.roomType)} &bull;
          <span class="status-badge status-${esc(b.paymentStatus)}" style="font-size:.72rem">${esc(b.paymentStatus)}</span>
          &nbsp;<button class="wa-btn" style="font-size:.72rem;padding:2px 8px" onclick="sendWA('${esc(b.phone)}','${esc(b.guestName)}','${esc(b.bookingId)}')">WhatsApp</button>
        </div>
      </div>`).join('')
    : `<p style="color:var(--text-l);font-size:.85rem;padding:8px 0">${emptyMsg}</p>`;

  split.innerHTML = `
    <div class="checkinout-card">
      <h4>&#9650; Checking In Today <span style="background:var(--green);color:#fff;font-family:Inter,sans-serif;font-size:.75rem;padding:2px 8px;border-radius:10px;font-weight:600">${ins.length}</span></h4>
      ${makeList(ins,'No check-ins today')}
    </div>
    <div class="checkinout-card">
      <h4>&#9660; Checking Out Today <span style="background:var(--orange);color:#fff;font-family:Inter,sans-serif;font-size:.75rem;padding:2px 8px;border-radius:10px;font-weight:600">${outs.length}</span></h4>
      ${makeList(outs,'No check-outs today')}
    </div>`;
}

// ============================================================
// WALK-IN BOOKING
// ============================================================
function showWkRoomOptions(){
  try {
    const checkIn  = document.getElementById('wkCheckIn').value;
    const checkOut = document.getElementById('wkCheckOut').value;
    const strip    = document.getElementById('wkRoomStrip');
    const result   = document.getElementById('wkAvailResult');
    
    // Validate dates
    if(!checkIn || !checkOut){
      alert('Please select both check-in and check-out dates');
      return;
    }
    
    if(checkIn >= checkOut){
      alert('Check-out date must be after check-in date');
      return;
    }

    // Show all room types
    const roomTypes = ['Non-AC', 'AC', 'Suite'];
    const prices = {'Non-AC':600, 'AC':1000, 'Suite':1500};
    
    strip.innerHTML = roomTypes.map(rt => {
      return `<div class="walkin-room-btn" data-rt="${esc(rt)}"
        onclick="selectWkRoom(this)">
        ${esc(rt)}<br>
        <span style="font-size:.78rem;font-weight:400">&#8377;${prices[rt]}/night</span><br>
        <span style="font-size:.72rem">Click to select</span>
      </div>`;
    }).join('');

    if(result){
      result.className = 'avail-result yes';
      result.innerHTML = '✅ Select a room type above.';
      result.style.display = 'block';
    }
  } catch(e) {
    console.error('showWkRoomOptions error:', e);
    alert('Error loading rooms');
  }
}

function selectWkRoom(el){
  document.querySelectorAll('.walkin-room-btn').forEach(b=>b.classList.remove('selected'));
  el.classList.add('selected');
  document.getElementById('wkRoomType').value = el.dataset.rt;
}

async function submitWalkin(e){
  e.preventDefault();
  const btn = document.getElementById('wkBtn');
  const checkIn  = document.getElementById('wkCheckIn').value;
  const checkOut = document.getElementById('wkCheckOut').value;
  const roomType = document.getElementById('wkRoomType').value;

  // Validate dates
  if(!checkIn || !checkOut){
    alert('Please select both check-in and check-out dates');
    return false;
  }

  if(checkIn >= checkOut){
    alert('Check-out must be after check-in');
    return false;
  }

  if(!roomType){
    alert('Please select a room type');
    return false;
  }

  // Validate guest name
  const guestName = document.getElementById('wkName').value.trim();
  if(!guestName){
    alert('Please enter guest name');
    return false;
  }

  // Validate phone
  const phone = document.getElementById('wkPhone').value.trim();
  if(!phone){
    alert('Please enter phone number');
    return false;
  }

  btn.innerHTML = '<span class="spinner"></span> Booking...';
  btn.disabled = true;

  const payload = {
    action: 'createBooking',
    guestName: guestName,
    phone: phone,
    checkIn, 
    checkOut, 
    roomType,
    numGuests: document.getElementById('wkGuests').value || 1,
    notes: (document.getElementById('wkGovtId').value.trim()
      ? 'GovtID: '+document.getElementById('wkGovtId').value.trim()+' | ' : '')
      + document.getElementById('wkNotes').value.trim()
  };

  try {
    const data = await apiPost(payload);
    if(data.success){
      logAction('create', 'Walk-in booking created: '+guestName+' ('+roomType+') '+checkIn+' → '+checkOut);
      alert('Booking created! ID: ' + data.bookingId);
      document.getElementById('walkinForm').reset();
      document.getElementById('wkRoomStrip').innerHTML = '<div style="color:var(--text-l);font-size:.88rem;padding:8px 0">Select dates above to see available rooms</div>';
      document.getElementById('wkRoomType').value = '';
      document.getElementById('wkAvailResult').style.display = 'none';
      loadDashboardData();
      renderWalkinSidebar();
    } else {
      alert(data.error || 'Booking failed');
    }
  } catch(err){
    alert('Connection error. Please try again.');
  }
  btn.innerHTML = 'Confirm Walk-in Booking';
  btn.disabled = false;
  return false;
}

function renderWalkinSidebar(){
  const t = today();
  const todayList = document.getElementById('wkTodayList');
  const waList    = document.getElementById('wkWaList');
  if(!todayList) return;

  const todayBookings = allBookings.filter(b=>b.bookingDate===t || b.checkIn===t);
  if(todayBookings.length===0){
    todayList.innerHTML = '<p style="color:var(--text-l);font-size:.85rem">No bookings today yet.</p>';
  } else {
    todayList.innerHTML = todayBookings.slice(0,6).map(b=>`
      <div class="cio-item">
        <div class="cio-name">${esc(b.guestName)} &bull; ${esc(b.roomType)}</div>
        <div class="cio-detail">${esc(b.bookingId)} &bull; <span class="status-badge status-${esc(b.paymentStatus)}" style="font-size:.7rem">${esc(b.paymentStatus)}</span></div>
      </div>`).join('');
  }

  const recent5 = [...allBookings].reverse().slice(0,5);
  waList.innerHTML = recent5.map(b=>`
    <div class="cio-item" style="display:flex;justify-content:space-between;align-items:center">
      <div>
        <div class="cio-name" style="font-size:.85rem">${esc(b.guestName)}</div>
        <div class="cio-detail">${esc(b.phone)}</div>
      </div>
      <button class="wa-btn" onclick="sendWA('${esc(b.phone)}','${esc(b.guestName)}','${esc(b.bookingId)}')">WhatsApp</button>
    </div>`).join('');
}

function sendWA(phone, name, bookingId){
  const clean = String(phone).replace(/[^0-9]/g,'');
  const intl  = clean.startsWith('91') ? clean : '91'+clean;
  const msg   = encodeURIComponent(
    'Namaste '+name+', your booking at Sri Krishna Lodge Antarvedi is confirmed!\n'
    +'Booking ID: '+bookingId+'\n'
    +'For queries call: 096766 10537\n'
    +'Thank you for choosing us!'
  );
  window.open('https://wa.me/'+intl+'?text='+msg,'_blank');
  logAction('confirm','WhatsApp sent to '+name+' ('+phone+') for booking '+bookingId);
}

// ============================================================
// REPORTS
// ============================================================
function getReportPeriodDays(){
  const v = (document.getElementById('rpPeriod')||{}).value||'30';
  return v==='all' ? 99999 : Number(v);
}

function renderReports(){
  const days       = getReportPeriodDays();
  const roomFilter = (document.getElementById('rpRoomFilter')||{}).value||'';
  const cutoff     = new Date(); cutoff.setDate(cutoff.getDate()-days);
  const cutStr     = cutoff.toISOString().split('T')[0];

  const filtered = allBookings.filter(b=>{
    if(roomFilter && b.roomType!==roomFilter) return false;
    if(days < 99999 && b.bookingDate && b.bookingDate < cutStr) return false;
    return true;
  });

  const confirmed   = filtered.filter(b=>b.paymentStatus==='Confirmed');
  const pending     = filtered.filter(b=>b.paymentStatus==='Pending');
  const cancelled   = filtered.filter(b=>b.paymentStatus==='Cancelled');
  const totalRev    = confirmed.reduce((s,b)=>s+Number(b.amount||0),0);
  const pendingRev  = pending.reduce((s,b)=>s+Number(b.amount||0),0);

  // Stats strip
  const statsEl = document.getElementById('rpStats');
  if(statsEl) statsEl.innerHTML = `
    <div class="report-stat"><div class="report-stat-num">${filtered.length}</div><div class="report-stat-lbl">Total Bookings</div></div>
    <div class="report-stat"><div class="report-stat-num">${confirmed.length}</div><div class="report-stat-lbl">Confirmed</div></div>
    <div class="report-stat"><div class="report-stat-num">${pending.length}</div><div class="report-stat-lbl">Pending</div></div>
    <div class="report-stat"><div class="report-stat-num">${cancelled.length}</div><div class="report-stat-lbl">Cancelled</div></div>
    <div class="report-stat" style="border-top-color:var(--green)"><div class="report-stat-num" style="color:var(--green)">&#8377;${totalRev.toLocaleString('en-IN')}</div><div class="report-stat-lbl">Revenue Collected</div></div>
    <div class="report-stat" style="border-top-color:var(--orange)"><div class="report-stat-num" style="color:var(--orange)">&#8377;${pendingRev.toLocaleString('en-IN')}</div><div class="report-stat-lbl">Pending Amount</div></div>`;

  // Bar chart — last 14 days
  const barEl = document.getElementById('rpBarChart');
  if(barEl){
    const days14 = [];
    for(let i=13;i>=0;i--){
      const d = new Date(); d.setDate(d.getDate()-i);
      days14.push(d.toISOString().split('T')[0]);
    }
    const counts = days14.map(d=>allBookings.filter(b=>b.checkIn===d).length);
    const maxC   = Math.max(...counts,1);
    barEl.innerHTML = days14.map((d,i)=>{
      const label = d.slice(5); // MM-DD
      const h = Math.round((counts[i]/maxC)*120);
      return `<div class="bar-col">
        <div class="bar-val">${counts[i]||''}</div>
        <div class="bar-fill" style="height:${h}px"></div>
        <div class="bar-lbl">${label}</div>
      </div>`;
    }).join('');
  }

  // Room type breakdown
  const bdEl = document.getElementById('rpRoomBreakdown');
  if(bdEl){
    const rTypes = ['Non-AC','AC','Suite'];
    const colors = {'Non-AC':'var(--navy)','AC':'var(--gold-d)','Suite':'#6366f1'};
    bdEl.innerHTML = rTypes.map(rt=>{
      const cnt = filtered.filter(b=>b.roomType===rt).length;
      const rev = filtered.filter(b=>b.roomType===rt && b.paymentStatus==='Confirmed').reduce((s,b)=>s+Number(b.amount||0),0);
      const pct = filtered.length ? Math.round(cnt/filtered.length*100) : 0;
      return `<div style="background:var(--cream-d);border-radius:var(--r);padding:16px 20px;min-width:150px;border-left:4px solid ${colors[rt]}">
        <div style="font-weight:700;font-size:1.1rem;color:var(--navy)">${esc(rt)}</div>
        <div style="font-size:.85rem;color:var(--text-l);margin-top:4px">${cnt} bookings (${pct}%)</div>
        <div style="font-weight:700;color:${colors[rt]};margin-top:4px;font-family:Inter,sans-serif">&#8377;${rev.toLocaleString('en-IN')}</div>
      </div>`;
    }).join('');
  }
}

function exportReportCSV(){
  const rows = [['Booking ID','Guest','Phone','Room Type','Room No','Check-in','Check-out','Nights','Amount','Status','Booking Date','Notes']];
  allBookings.forEach(b=>{
    const nights = b.checkIn && b.checkOut
      ? Math.max(1,Math.round((new Date(b.checkOut)-new Date(b.checkIn))/(86400000)))
      : '';
    rows.push([b.bookingId,b.guestName,b.phone,b.roomType,b.roomNumber||'TBD',b.checkIn,b.checkOut,nights,b.amount,b.paymentStatus,b.bookingDate,b.notes||'']);
  });
  downloadCSV(rows,'bookings-report-'+today()+'.csv');
  logAction('edit','Exported bookings report CSV');
}

function downloadCSV(rows, filename){
  const csv = rows.map(r=>r.map(v=>`"${String(v||'').replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv],{type:'text/csv'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

// ============================================================
// GUEST REGISTER
// ============================================================
function filterGuestRegister(){
  const search     = (document.getElementById('grSearch').value||'').toLowerCase();
  const statusF    = document.getElementById('grStatusFilter').value;
  const t          = today();

  let filtered = allBookings.filter(b=>{
    if(search){
      const hay = (b.bookingId+b.guestName+b.phone+(b.notes||'')).toLowerCase();
      if(!hay.includes(search)) return false;
    }
    if(statusF === 'checkedin')  return b.checkIn === t;
    if(statusF === 'checkedout') return b.checkOut === t;
    if(statusF === 'upcoming')   return b.checkIn > t;
    return true;
  });
  filtered = [...filtered].reverse();

  const tbody = document.getElementById('grTbody');
  if(!tbody) return;
  if(filtered.length===0){
    tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:32px;color:var(--text-l)">No records found</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map(b=>{
    // Extract Govt ID from notes if saved there by walkin form
    const notesStr  = b.notes||'';
    let govtId = '';
    const idMatch = notesStr.match(/GovtID:\s*([^|]+)/);
    if(idMatch) govtId = idMatch[1].trim();

    return `<tr>
      <td><strong>${esc(b.bookingId)}</strong></td>
      <td>${esc(b.guestName)}</td>
      <td>${esc(b.phone)}</td>
      <td>${govtId ? '<span class="id-badge">'+esc(govtId)+'</span>' : '<span style="color:var(--text-xl);font-size:.8rem">Not captured</span>'}</td>
      <td>${esc(b.roomType)} ${b.roomNumber?'#'+esc(b.roomNumber):''}</td>
      <td>${b.checkIn}</td>
      <td>${b.checkOut}</td>
      <td>${b.numGuests||1}</td>
      <td><span class="status-badge status-${esc(b.paymentStatus)}">${esc(b.paymentStatus)}</span></td>
      <td><button class="wa-btn" onclick="sendWA('${esc(b.phone)}','${esc(b.guestName)}','${esc(b.bookingId)}')">WhatsApp</button></td>
    </tr>`;
  }).join('');
}

function exportGuestRegisterCSV(){
  const rows = [['Booking ID','Guest Name','Phone','Govt ID','Room Type','Room No','Check-in','Check-out','Guests','Status']];
  allBookings.forEach(b=>{
    const notesStr = b.notes||'';
    const idMatch  = notesStr.match(/GovtID:\s*([^|]+)/);
    const govtId   = idMatch ? idMatch[1].trim() : '';
    rows.push([b.bookingId,b.guestName,b.phone,govtId,b.roomType,b.roomNumber||'',b.checkIn,b.checkOut,b.numGuests||1,b.paymentStatus]);
  });
  downloadCSV(rows,'guest-register-'+today()+'.csv');
  logAction('edit','Exported guest register CSV');
}

// ============================================================
// PATCH existing functions to add logging + extras
// ============================================================
const _origLoadDashboard = loadDashboardData;
loadDashboardData = async function(){
  await _origLoadDashboard();
  renderOverviewExtras();
  renderWalkinSidebar();
};

const _origSwitchTab = switchTab;
switchTab = function(panel, btn){
  _origSwitchTab(panel, btn);
  if(panel==='reports')        renderReports();
  if(panel==='guestregister')  filterGuestRegister();
  if(panel==='activitylog')    renderActivityLog();
  if(panel==='walkin')         renderWalkinSidebar();
};

// Patch deleteBooking to log
const _origDeleteBooking = deleteBooking;
deleteBooking = async function(bookingId){
  const b = allBookings.find(x=>x.bookingId===bookingId);
  await _origDeleteBooking(bookingId);
  if(b) logAction('delete','Deleted booking '+bookingId+' ('+b.guestName+')');
};

// Patch saveBookingEdit to log
const _origSaveBkEdit = saveBookingEdit;
saveBookingEdit = async function(e){
  const bid = document.getElementById('edBookingId').value;
  const newStatus = document.getElementById('edStatus').value;
  const b = allBookings.find(x=>x.bookingId===bid);
  const oldStatus = b ? b.paymentStatus : '';
  await _origSaveBkEdit(e);
  if(oldStatus && newStatus !== oldStatus){
    logAction('confirm','Status changed: '+bid+' → '+newStatus);
  } else {
    logAction('edit','Edited booking '+bid);
  }
};

// Log login
const _origEnterDash = enterDashboard;
enterDashboard = function(name){
  _origEnterDash(name);
  logAction('login', name+' logged in');
};

// Set today as default for walk-in form
(function setWkDefaults(){
  const t = today();
  setTimeout(()=>{
    const ci = document.getElementById('wkCheckIn');
    const co = document.getElementById('wkCheckOut');
    if(ci){ ci.value = t; ci.min = t; }
    if(co){
      const tmr = new Date(); tmr.setDate(tmr.getDate()+1);
      co.value = tmr.toISOString().split('T')[0];
      co.min = t;
    }
  }, 100);
})();
