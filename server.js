const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const url = require("url");

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const PUBLIC = path.join(ROOT, "public");
const DATA = path.join(ROOT, "data.json");
const sessions = new Map();

function readDB(){
  if(!fs.existsSync(DATA)) seed();
  return JSON.parse(fs.readFileSync(DATA,"utf8"));
}
function writeDB(db){fs.writeFileSync(DATA,JSON.stringify(db,null,2))}
function seed(){
  const types=["Deluxe","Executive","Suite","Family","Presidential"];
  const rooms=[];
  for(let i=1;i<=56;i++){
    const type=types[(i-1)%types.length];
    const prices={Deluxe:3500,Executive:5000,Suite:7500,Family:6500,Presidential:12000};
    rooms.push({id:i,number:100+i,name:`${type} Room ${i}`,type,price:prices[type]+((i-1)%4)*250,capacity:type==="Family"?4:type==="Presidential"?5:2,image:`https://loremflickr.com/900/650/hotel,${type.toLowerCase()},room?lock=${1000+i}`,description:`Comfortable ${type.toLowerCase()} accommodation with modern amenities.`});
  }
  const base=[
    ["Masala Dosa","Breakfast",180],["Idli Sambar","Breakfast",140],["Poha","Breakfast",120],["Aloo Paratha","Breakfast",160],["Veg Sandwich","Breakfast",170],
    ["Paneer Tikka","Indian",320],["Butter Chicken","Indian",420],["Dal Makhani","Indian",300],["Palak Paneer","Indian",320],["Chole Bhature","Indian",220],
    ["Veg Hakka Noodles","Chinese",260],["Chicken Fried Rice","Chinese",330],["Manchurian","Chinese",240],["Chilli Paneer","Chinese",290],["Spring Rolls","Chinese",220],
    ["Margherita Pizza","Pizza",380],["Farmhouse Pizza","Pizza",450],["Chicken Pizza","Pizza",520],["Paneer Pizza","Pizza",470],["Four Cheese Pizza","Pizza",550],
    ["Classic Burger","Burger",280],["Chicken Burger","Burger",340],["Cheese Burger","Burger",320],["Veg Burger","Burger",260],["Double Patty Burger","Burger",390],
    ["Chicken Biryani","Biryani",420],["Mutton Biryani","Biryani",520],["Veg Biryani","Biryani",320],["Egg Biryani","Biryani",350],["Hyderabadi Biryani","Biryani",460],
    ["Pasta Alfredo","Continental",390],["Pasta Arrabbiata","Continental",360],["Grilled Chicken","Continental",520],["Veg Lasagna","Continental",420],["Fish and Chips","Continental",480],
    ["Gulab Jamun","Dessert",140],["Chocolate Brownie","Dessert",190],["Cheesecake","Dessert",260],["Ice Cream Sundae","Dessert",220],["Fruit Platter","Dessert",240],
    ["Masala Chai","Beverage",90],["Cappuccino","Beverage",180],["Fresh Lime Soda","Beverage",120],["Mango Shake","Beverage",180],["Mineral Water","Beverage",60],
    ["French Fries","Snacks",160],["Nachos","Snacks",220],["Paneer Roll","Snacks",210],["Chicken Wings","Snacks",320],["Club Sandwich","Snacks",290]
  ];
  const foods=[];
  for(let i=0;i<400;i++){
    const b=base[i%base.length], suffix=i<base.length?"":` Special ${Math.floor(i/base.length)+1}`;
    foods.push({id:i+1,name:b[0]+suffix,category:b[1],price:b[2]+((i*17)%80),image:`https://loremflickr.com/800/600/${encodeURIComponent(b[0].toLowerCase())}?lock=${2000+i}`,description:`Freshly prepared ${b[0].toLowerCase()} from our hotel kitchen.`});
  }
  writeDB({users:[],rooms,foods,bookings:[],cart:[],orders:[],services:[]});
}
function body(req){
  return new Promise((resolve,reject)=>{
    let s="";req.on("data",c=>s+=c);req.on("end",()=>{try{resolve(s?JSON.parse(s):{})}catch{resolve({})}});req.on("error",reject);
  });
}
function send(res,status,data,headers={}){
  const raw=typeof data==="string"?data:JSON.stringify(data);
  res.writeHead(status,{"Content-Type":"application/json; charset=utf-8","Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"Content-Type","Access-Control-Allow-Methods":"GET,POST,OPTIONS",...headers});
  res.end(raw);
}
function user(req){
  const token=(req.headers.cookie||"").split(";").map(x=>x.trim()).find(x=>x.startsWith("token="))?.split("=")[1];
  return token?sessions.get(token):null;
}
function requireUser(req,res){
  const u=user(req);if(!u){send(res,401,{error:"Please login first."});return null}return u;
}
function id(){return crypto.randomBytes(5).toString("hex").toUpperCase()}
function now(){return new Date().toISOString()}
function nights(a,b){return Math.max(1,Math.ceil((new Date(b)-new Date(a))/86400000))}
const reviews=[
{name:"Amit",rating:5,text:"Beautiful rooms, friendly staff and smooth service."},
{name:"Priya",rating:5,text:"Food ordering was convenient and the stay was comfortable."},
{name:"Rahul",rating:4,text:"Clean property with helpful guest services."},
{name:"Sneha",rating:5,text:"Loved the atmosphere and breakfast."},
{name:"Arjun",rating:4,text:"Good rooms and quick response from the service team."},
{name:"Meera",rating:5,text:"A comfortable hotel for family travel."}
];

async function api(req,res,p){
  const db=readDB();
  if(req.method==="OPTIONS"){send(res,204,{});return}
  if(p==="/api/auth/me"){const u=user(req);send(res,200,{user:u||null});return}
  if(p==="/api/auth/register"&&req.method==="POST"){
    const b=await body(req);
    if(!b.name||!b.email||!b.phone||!b.password||b.password.length<6){send(res,400,{error:"Complete all fields; password must be 6+ characters."});return}
    if(db.users.some(x=>x.email===b.email.toLowerCase())){send(res,400,{error:"Email already registered."});return}
    const u={id:id(),name:b.name,email:b.email.toLowerCase(),phone:b.phone,is_guest:false,password:b.password,createdAt:now()};
    db.users.push(u);writeDB(db);const token=id();sessions.set(token,u);send(res,200,{user:safe(u)},{ "Set-Cookie":`token=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=604800`});return
  }
  if(p==="/api/auth/login"&&req.method==="POST"){
    const b=await body(req),u=db.users.find(x=>x.email===String(b.email||"").toLowerCase()&&x.password===b.password);
    if(!u){send(res,401,{error:"Invalid email or password."});return}
    const token=id();sessions.set(token,u);send(res,200,{user:safe(u)},{ "Set-Cookie":`token=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=604800`});return
  }
  if(p==="/api/auth/guest"&&req.method==="POST"){
    const u={id:id(),name:"Guest User",email:`guest-${Date.now()}@guest.local`,phone:"",is_guest:true,createdAt:now()};
    db.users.push(u);writeDB(db);const token=id();sessions.set(token,u);send(res,200,{user:safe(u)},{ "Set-Cookie":`token=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=604800`});return
  }
  if(p==="/api/auth/logout"&&req.method==="POST"){const u=user(req);const token=(req.headers.cookie||"").split(";").map(x=>x.trim()).find(x=>x.startsWith("token="))?.split("=")[1];if(token)sessions.delete(token);send(res,200,{ok:true},{"Set-Cookie":"token=; HttpOnly; Path=/; Max-Age=0"});return}
  if(p==="/api/rooms"){
    let rooms=db.rooms.slice();const q=url.parse(req.url,true).query;
    if(q.search)rooms=rooms.filter(r=>(r.name+" "+r.number).toLowerCase().includes(q.search.toLowerCase()));
    if(q.type)rooms=rooms.filter(r=>r.type===q.type);
    if(q.checkIn&&q.checkOut)rooms=rooms.filter(r=>!db.bookings.some(b=>b.roomId===r.id&&b.status==="confirmed"&&b.checkIn<q.checkOut&&b.checkOut>q.checkIn));
    send(res,200,{rooms});return
  }
  if(p==="/api/foods"){
    let foods=db.foods.slice();const q=url.parse(req.url,true).query;
    if(q.search)foods=foods.filter(f=>(f.name+" "+f.description).toLowerCase().includes(q.search.toLowerCase()));
    if(q.category)foods=foods.filter(f=>f.category===q.category);
    send(res,200,{foods});return
  }
  const u=requireUser(req,res);if(!u)return;
  if(p==="/api/cart"&&req.method==="GET"){
    const items=db.cart.filter(c=>c.userId===u.id).map(c=>{const f=db.foods.find(x=>x.id===c.foodId);return {...f,foodId:f.id,quantity:c.quantity}});
    send(res,200,{cart:items,total:items.reduce((s,x)=>s+x.price*x.quantity,0)});return
  }
  if(p==="/api/cart"&&req.method==="POST"){
    const b=await body(req),q=Number(b.quantity)||0;let c=db.cart.find(x=>x.userId===u.id&&x.foodId===Number(b.foodId));
    if(q<=0)db.cart=db.cart.filter(x=>!(x.userId===u.id&&x.foodId===Number(b.foodId)));else if(c)c.quantity=q;else db.cart.push({userId:u.id,foodId:Number(b.foodId),quantity:q});
    writeDB(db);send(res,200,{ok:true});return
  }
  if(p==="/api/bookings"&&req.method==="POST"){
    const b=await body(req),r=db.rooms.find(x=>x.id===Number(b.roomId));
    if(!r)return send(res,404,{error:"Room not found"});
    if(new Date(b.checkOut)<=new Date(b.checkIn))return send(res,400,{error:"Invalid dates"});
    if(db.bookings.some(x=>x.roomId===r.id&&x.status==="confirmed"&&x.checkIn<b.checkOut&&x.checkOut>b.checkIn))return send(res,409,{error:"Room is not available for those dates."});
    const booking={id:id(),bookingCode:"RG-"+id(),userId:u.id,roomId:r.id,roomName:r.name,roomNumber:r.number,guestName:b.guestName,guestPhone:b.guestPhone,email:b.email,guests:Number(b.guests)||1,checkIn:b.checkIn,checkOut:b.checkOut,notes:b.notes||"",paymentMethod:b.paymentMethod||"cash",total:nights(b.checkIn,b.checkOut)*r.price,status:"confirmed",createdAt:now()};
    db.bookings.push(booking);writeDB(db);send(res,200,{booking});return
  }
  if(p==="/api/orders"&&req.method==="POST"){
    const b=await body(req),items=db.cart.filter(c=>c.userId===u.id).map(c=>{const f=db.foods.find(x=>x.id===c.foodId);return {foodId:f.id,name:f.name,price:f.price,quantity:c.quantity}});
    if(!items.length)return send(res,400,{error:"Cart is empty"});
    const order={id:id(),orderCode:"FOOD-"+id(),userId:u.id,name:b.name,phone:b.phone,room:b.room||"",notes:b.notes||"",total:items.reduce((s,x)=>s+x.price*x.quantity,0),items,createdAt:now()};
    db.orders.push(order);db.cart=db.cart.filter(c=>c.userId!==u.id);writeDB(db);send(res,200,{order});return
  }
  if(p==="/api/services"&&req.method==="POST"){
    const b=await body(req),request={id:id(),requestCode:"SRV-"+id(),userId:u.id,service:b.service,details:b.details||"",createdAt:now()};
    db.services.push(request);writeDB(db);send(res,200,{request});return
  }
  if(p==="/api/reviews"){send(res,200,{reviews});return}
  if(p==="/api/dashboard"){
    const bookings=db.bookings.filter(x=>x.userId===u.id),orders=db.orders.filter(x=>x.userId===u.id),services=db.services.filter(x=>x.userId===u.id);
    send(res,200,{bookings,orders,services,stats:{bookings:bookings.length,foodOrders:orders.length,services:services.length,foodSpent:orders.reduce((s,x)=>s+x.total,0)}});return
  }
  send(res,404,{error:"API route not found"});
}
function safe(u){const x={...u};delete x.password;return x}

function staticFile(req,res){
  let p=url.parse(req.url).pathname;
  if(p==="/")p="/index.html";
  const file=path.normalize(path.join(PUBLIC,p));
  if(!file.startsWith(PUBLIC)){res.writeHead(403);return res.end("Forbidden")}
  fs.readFile(file,(e,data)=>{
    if(e){fs.readFile(path.join(PUBLIC,"index.html"),(e2,d)=>{if(e2){res.writeHead(404);return res.end("Not found")}res.writeHead(200,{"Content-Type":"text/html"});res.end(d)});return}
    const ext=path.extname(file);const ct={".html":"text/html; charset=utf-8",".css":"text/css; charset=utf-8",".js":"application/javascript; charset=utf-8",".json":"application/json"}[ext]||"application/octet-stream";
    res.writeHead(200,{"Content-Type":ct});res.end(data);
  });
}
const server=http.createServer(async(req,res)=>{
  try{
    const p=url.parse(req.url).pathname;
    if(p.startsWith("/api/"))await api(req,res,p);else staticFile(req,res);
  }catch(e){console.error(e);send(res,500,{error:"Server error: "+e.message})}
});
server.listen(PORT,()=>console.log(`Royal Grand Hotel running at http://localhost:${PORT}`));
