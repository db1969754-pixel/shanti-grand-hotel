const API = "/api";
const WHATSAPP = "917894410792";
let currentUser = null;
let selectedRoom = null;
let pendingBooking = null;
let rooms = [];
let foods = [];

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

function toast(message){
  const el=document.createElement("div"); el.className="toast-msg"; el.textContent=message;
  document.body.appendChild(el); setTimeout(()=>el.remove(),3000);
}
async function api(path, options={}){
  const res=await fetch(API+path,{credentials:"include",headers:{"Content-Type":"application/json",...(options.headers||{})},...options});
  const data=await res.json().catch(()=>({}));
  if(!res.ok) throw new Error(data.error||"Request failed");
  return data;
}
function money(n){return new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(n)}
function whatsapp(text){window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`,"_blank")}
function showSection(id){
  $$(".page-section").forEach(x=>x.classList.add("hidden"));
  $$(".home-only").forEach(x=>x.classList.add("hidden"));
  if(id==="home"){ $("#home").classList.remove("hidden"); $("#about").classList.remove("hidden"); $("#homeReviews").classList.remove("hidden");}
  else {const el=$("#"+id); if(el) el.classList.remove("hidden");}
  $("#nav").classList.remove("nav-open");
  window.scrollTo({top:0,behavior:"smooth"});
  if(id==="rooms") loadRooms();
  if(id==="food") loadFoods();
  if(id==="services") loadServices();
  if(id==="facilities") loadFacilities();
  if(id==="gallery") loadGallery();
  if(id==="reviews") loadReviews();
  if(id==="dashboard") loadDashboard();
}
function openModal(html){$("#modalContent").innerHTML=html;$("#modal").classList.remove("hidden")}
function closeModal(){$("#modal").classList.add("hidden")}
function daysBetween(a,b){const x=new Date(a),y=new Date(b); return Math.max(1,Math.ceil((y-x)/86400000))}
function setUserFormValues(){
  if(!currentUser)return;
  $("#guestName").value=currentUser.name||"";
  $("#guestPhone").value=currentUser.phone||"";
  $("#bookingEmail").value=currentUser.email||"";
  $("#orderName").value=currentUser.name||"";
  $("#orderPhone").value=currentUser.phone||"";
}
async function boot(){
  try{
    const data=await api("/auth/me");
    if(data.user){currentUser=data.user; enterApp();} else enterAuth();
  }catch{enterAuth()}
}
function enterAuth(){$("#authView").classList.remove("hidden");$("#appView").classList.add("hidden")}
function enterApp(){$("#authView").classList.add("hidden");$("#appView").classList.remove("hidden");setUserFormValues();updateCartCount();loadHomeReviews();showSection("home")}
async function loadHomeReviews(){try{const d=await api("/reviews");renderReviews(d.reviews.slice(0,3),"homeReviewGrid")}catch{}}
function renderReviews(list,id){const el=$("#"+id); if(!el)return; el.innerHTML=list.map(r=>`<article class="review"><div class="stars">${"★".repeat(r.rating)}${"☆".repeat(5-r.rating)}</div><h3>${esc(r.name)}</h3><p>${esc(r.text)}</p></article>`).join("")}
function esc(s=""){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}

$$("[data-auth-tab]").forEach(btn=>btn.addEventListener("click",()=>{
  $$("[data-auth-tab]").forEach(x=>x.classList.remove("active"));btn.classList.add("active");
  ["loginForm","registerForm","guestForm"].forEach(x=>$("#"+x).classList.add("hidden"));
  $("#"+({login:"loginForm",register:"registerForm",guest:"guestForm"}[btn.dataset.authTab])).classList.remove("hidden");
}));
$("#loginForm").addEventListener("submit",async e=>{
  e.preventDefault();
  try{const d=await api("/auth/login",{method:"POST",body:JSON.stringify({email:$("#loginEmail").value,password:$("#loginPassword").value})});currentUser=d.user;enterApp()}catch(err){toast(err.message)}
});
$("#registerForm").addEventListener("submit",async e=>{
  e.preventDefault();
  try{const d=await api("/auth/register",{method:"POST",body:JSON.stringify({name:$("#registerName").value,email:$("#registerEmail").value,phone:$("#registerPhone").value,password:$("#registerPassword").value})});currentUser=d.user;enterApp()}catch(err){toast(err.message)}
});
$("#guestBtn").addEventListener("click",async()=>{
  try{const d=await api("/auth/guest",{method:"POST"});currentUser=d.user;enterApp()}catch(err){toast(err.message)}
});
$("#logoutBtn").addEventListener("click",async()=>{await api("/auth/logout",{method:"POST"});currentUser=null;enterAuth()});
$("#menuBtn").addEventListener("click",()=>$("#nav").classList.toggle("nav-open"));
document.addEventListener("click",e=>{const b=e.target.closest("[data-section]");if(b){e.preventDefault();showSection(b.dataset.section)}})
$("#closeModal").addEventListener("click",closeModal);$("#modal").addEventListener("click",e=>{if(e.target.id==="modal")closeModal()});
$("#cartBtn").addEventListener("click",()=>{showSection("cart");renderCart()});$("#openCart").addEventListener("click",()=>{showSection("cart");renderCart()});

async function loadRooms(){
  try{const q=new URLSearchParams({search:$("#roomSearch").value,type:$("#roomType").value,checkIn:$("#checkIn").value,checkOut:$("#checkOut").value});
  const d=await api("/rooms?"+q);rooms=d.rooms;renderRooms()}catch(err){toast(err.message)}
}
function renderRooms(){
  $("#roomGrid").innerHTML=rooms.map(r=>`<article class="card"><img src="${r.image}" alt="${esc(r.name)}" loading="lazy"><div class="card-body"><div class="row"><h3>${esc(r.name)}</h3><span class="price">${money(r.price)}/night</span></div><p>${esc(r.type)} · ${r.capacity} guests · ${esc(r.description)}</p><div class="row"><span>Room ${r.number}</span><button class="primary" onclick="selectRoom(${r.id})">Book</button></div></div></article>`).join("")||"<p>No rooms found.</p>"
}
window.selectRoom=function(id){
  selectedRoom=rooms.find(r=>r.id===id); if(!selectedRoom)return;
  $("#bookingRoomId").value=id;
  $("#bookingCheckIn").value=$("#checkIn").value||"";
  $("#bookingCheckOut").value=$("#checkOut").value||"";
  updateBookingSummary();showSection("booking");
}
function updateBookingSummary(){
  if(!selectedRoom)return;const a=$("#bookingCheckIn").value,b=$("#bookingCheckOut").value;
  if(a&&b){const n=daysBetween(a,b);$("#bookingSummary").innerHTML=`<strong>${esc(selectedRoom.name)}</strong><br>${n} night(s) × ${money(selectedRoom.price)} = <strong>${money(n*selectedRoom.price)}</strong>`}
}
["#roomSearch","#roomType","#checkIn","#checkOut"].forEach(s=>$(s).addEventListener("input",loadRooms));
["#bookingCheckIn","#bookingCheckOut"].forEach(s=>$(s).addEventListener("change",updateBookingSummary));
$("#bookingForm").addEventListener("submit",e=>{
  e.preventDefault();
  if(!selectedRoom)return;
  const ci=$("#bookingCheckIn").value,co=$("#bookingCheckOut").value;
  if(new Date(co)<=new Date(ci)){toast("Check-out must be after check-in");return}
  pendingBooking={roomId:selectedRoom.id,room:selectedRoom,guestName:$("#guestName").value,guestPhone:$("#guestPhone").value,email:$("#bookingEmail").value,guests:Number($("#guestCount").value),checkIn:ci,checkOut:co,notes:$("#bookingNotes").value,total:daysBetween(ci,co)*selectedRoom.price};
  $("#paymentSummary").innerHTML=`Room: <strong>${esc(selectedRoom.name)}</strong><br>Stay: ${pendingBooking.checkIn} → ${pendingBooking.checkOut}<br>Total: <strong>${money(pendingBooking.total)}</strong>`;
  showSection("payment");
});
$("#paymentForm").addEventListener("submit",async e=>{
  e.preventDefault();if(!pendingBooking)return;
  const paymentMethod=document.querySelector('input[name="pay"]:checked').value;
  try{
    const d=await api("/bookings",{method:"POST",body:JSON.stringify({...pendingBooking,paymentMethod})});
    const b=d.booking;
    whatsapp(`🏨 *Royal Grand Hotel - Room Booking*%0ABooking: ${b.bookingCode}%0AGuest: ${b.guestName}%0ARoom: ${b.roomName}%0ACheck-in: ${b.checkIn}%0ACheck-out: ${b.checkOut}%0AGuests: ${b.guests}%0ATotal: ₹${b.total}%0APayment: ${b.paymentMethod}`);
    toast("Booking confirmed");pendingBooking=null;showSection("dashboard");
  }catch(err){toast(err.message)}
});

async function loadFoods(){try{const q=new URLSearchParams({search:$("#foodSearch").value,category:$("#foodCategory").value});const d=await api("/foods?"+q);foods=d.foods;renderFoods()}catch(err){toast(err.message)}}
function renderFoods(){
  $("#foodGrid").innerHTML=foods.map(f=>`<article class="card"><img src="${f.image}" alt="${esc(f.name)}" loading="lazy"><div class="card-body"><div class="row"><h3>${esc(f.name)}</h3><span class="price">${money(f.price)}</span></div><p>${esc(f.category)} · ${esc(f.description)}</p><button class="primary" onclick="addFood(${f.id})">Add to Cart</button></div></article>`).join("")||"<p>No food found.</p>"
}
window.addFood=async function(id){try{await api("/cart",{method:"POST",body:JSON.stringify({foodId:id,quantity:1})});updateCartCount();toast("Added to cart")}catch(err){toast(err.message)}}
async function updateCartCount(){try{const d=await api("/cart");$("#cartCount").textContent=d.cart.reduce((a,x)=>a+x.quantity,0)}catch{}}
async function renderCart(){
  try{const d=await api("/cart");$("#cartItems").innerHTML=d.cart.map(x=>`<div class="cart-item"><img src="${x.image}" alt="${esc(x.name)}"><div><strong>${esc(x.name)}</strong><div>${money(x.price)}</div></div><div class="qty"><button onclick="changeQty(${x.foodId},${x.quantity-1})">−</button><b>${x.quantity}</b><button onclick="changeQty(${x.foodId},${x.quantity+1})">+</button><button onclick="changeQty(${x.foodId},0)">×</button></div></div>`).join("")||"<p>Your cart is empty.</p>";$("#cartTotal").textContent=money(d.total)}catch(err){toast(err.message)}
}
window.changeQty=async function(id,q){try{await api("/cart",{method:"POST",body:JSON.stringify({foodId:id,quantity:q})});await updateCartCount();await renderCart()}catch(err){toast(err.message)}}
$("#foodSearch").addEventListener("input",loadFoods);$("#foodCategory").addEventListener("change",loadFoods);
$("#foodOrderForm").addEventListener("submit",async e=>{
  e.preventDefault();
  try{const d=await api("/orders",{method:"POST",body:JSON.stringify({name:$("#orderName").value,phone:$("#orderPhone").value,room:$("#orderRoom").value,notes:$("#orderNotes").value})});
    const o=d.order;whatsapp(`🍽️ *Royal Grand Hotel - Food Order*%0AOrder: ${o.orderCode}%0AName: ${o.name}%0APhone: ${o.phone}%0ARoom: ${o.room||"N/A"}%0AItems: ${o.items.map(i=>`${i.name} x${i.quantity}`).join(", ")}%0ATotal: ₹${o.total}`);
    toast("Food order placed");await renderCart();showSection("dashboard");
  }catch(err){toast(err.message)}
});

const services=[["Room Service","🍽️","Meals, beverages and in-room requests"],["Airport Pickup","✈️","Airport transfer request"],["Laundry","🧺","Laundry and pressing"],["Housekeeping","🧹","Cleaning and room supplies"],["Taxi/Cab","🚕","Local or outstation cab"],["Extra Bed","🛏️","Extra bed for your room"],["Event/Banquet","🎉","Meeting, party and banquet enquiry"],["Breakfast Request","☕","Breakfast timing and room request"],["Luggage Assistance","🧳","Luggage help and storage"]];
function loadServices(){const el=$("#serviceGrid");el.innerHTML=services.map(s=>`<article class="service"><div style="font-size:30px">${s[1]}</div><h3>${s[0]}</h3><p>${s[2]}</p><button class="primary" onclick="requestService('${s[0]}')">Request</button></article>`).join("")}
window.requestService=async function(name){
  const details=prompt(`Details for ${name}:`);if(details===null)return;
  try{const d=await api("/services",{method:"POST",body:JSON.stringify({service:name,details})});whatsapp(`🛎️ *Royal Grand Hotel - Service Request*%0AService: ${name}%0AGuest: ${currentUser?.name||""}%0ADetails: ${details}%0ARequest: ${d.request.requestCode}`);toast("Service request sent")}catch(err){toast(err.message)}
}
function loadFacilities(){const data=[["🏊","Swimming Pool","Relax and refresh."],["🏋️","Fitness Centre","Workout facilities."],["📶","High-Speed Wi-Fi","Connected throughout the hotel."],["🚗","Parking","Guest parking assistance."],["🍴","Restaurant","All-day dining."],["🧑‍💼","Concierge","Guest assistance."],["🛗","Elevator","Easy floor access."],["🔒","24/7 Security","Guest safety and support."]];$("#facilityGrid").innerHTML=data.map(x=>`<article class="facility"><div style="font-size:30px">${x[0]}</div><h3>${x[1]}</h3><p>${x[2]}</p></article>`).join("")}
function loadGallery(){const arr=Array.from({length:12},(_,i)=>`https://loremflickr.com/900/650/hotel,luxury?lock=${300+i}`);$("#galleryGrid").innerHTML=arr.map((x,i)=>`<img src="${x}" alt="Hotel gallery ${i+1}" loading="lazy">`).join("")}
async function loadReviews(){try{const d=await api("/reviews");renderReviews(d.reviews,"reviewGrid")}catch(err){toast(err.message)}}
async function loadDashboard(){
  try{const d=await api("/dashboard");$("#dashboardStats").innerHTML=`<div><strong>${d.stats.bookings}</strong><span>Bookings</span></div><div><strong>${d.stats.foodOrders}</strong><span>Food Orders</span></div><div><strong>${d.stats.services}</strong><span>Service Requests</span></div><div><strong>${money(d.stats.foodSpent)}</strong><span>Food Spend</span></div>`;
  $("#dashboardBookings").innerHTML=d.bookings.map(b=>`<div class="dash-item"><strong>${esc(b.bookingCode)}</strong> · ${esc(b.roomName)}<br>${b.checkIn} → ${b.checkOut} · ${money(b.total)}</div>`).join("")||"<p>No bookings yet.</p>";
  $("#dashboardOrders").innerHTML=d.orders.map(o=>`<div class="dash-item"><strong>${esc(o.orderCode)}</strong> · ${money(o.total)}<br>${new Date(o.createdAt).toLocaleString()}</div>`).join("")||"<p>No food orders yet.</p>";
  }catch(err){toast(err.message)}
}
boot();
