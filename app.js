// ===== State =====
// We use "waterUsers" as the key.
let users = JSON.parse(localStorage.getItem("waterUsers") || "[]");
let currentUser = null;
let currentUserIndex = -1;
let rankChart = null;
let allUsersChart = null;

// ===== Helpers =====
function saveUsers(){ localStorage.setItem("waterUsers", JSON.stringify(users)); }
function showRegister(){ 
  document.getElementById("auth").classList.add("hidden"); 
  document.getElementById("register").classList.remove("hidden"); 
}
function showLogin(){ 
  document.getElementById("register").classList.add("hidden"); 
  document.getElementById("allUsersPage").classList.add("hidden"); 
  document.getElementById("dashboard").classList.add("hidden"); 
  document.getElementById("auth").classList.remove("hidden"); 
}
function showDashboard(){ 
  document.getElementById("auth").classList.add("hidden"); 
  document.getElementById("register").classList.add("hidden"); 
  document.getElementById("allUsersPage").classList.add("hidden"); 
  document.getElementById("dashboard").classList.remove("hidden"); 
}

// ===== Bind UI events after DOM is ready =====
document.addEventListener('DOMContentLoaded', ()=>{
  document.getElementById("regBtn").addEventListener("click", registerUser);
  document.getElementById("showRegLink").addEventListener("click", (e)=>{ e.preventDefault(); showRegister(); });
  document.getElementById("backLoginLink").addEventListener("click", (e)=>{ e.preventDefault(); showLogin(); });
  document.getElementById("loginBtn").addEventListener("click", login);
  document.getElementById("logoutBtn").addEventListener("click", logoutUser);
  document.getElementById("viewAllBtn").addEventListener("click", showAllUsers);
  document.getElementById("backBtn").addEventListener("click", backToDashboard);
  
  // Forgot Password Events
  document.getElementById("forgotBtn").addEventListener("click", function() {
    document.getElementById("recoverBox").classList.remove("hidden");
    this.style.display = 'none'; // Hide the "Forgot?" button after clicking
  });

  document.getElementById("recoverSubmit").addEventListener("click", recoverAccount);
});

// ===== Registration =====
function registerUser(){
  const id = document.getElementById("regId").value.trim();
  const pass = document.getElementById("regPass").value;
  const name = document.getElementById("regName").value.trim() || id;
  const sex = document.getElementById("regSex").value.trim();
  const loc = document.getElementById("regLoc").value.trim();
  const water = parseFloat(document.getElementById("regWater").value) || 0;

  if(!id || !pass){ alert("Please provide User ID and Password"); return; }
  if(users.find(u => u.id === id)){ alert("That User ID already exists. Pick another."); return; }

  const file = document.getElementById("regPic").files[0];

  function saveUser(picData){
    users.push({ id, pass, name, sex, loc, water, pic: picData });
    saveUsers();
    alert("Account created successfully! Please login.");
    // clear form
    document.getElementById("regId").value = "";
    document.getElementById("regPass").value = "";
    document.getElementById("regName").value = "";
    document.getElementById("regSex").value = "";
    document.getElementById("regLoc").value = "";
    document.getElementById("regWater").value = "";
    document.getElementById("regPic").value = null;
    showLogin();
  }

  if(file){
    const reader = new FileReader();
    reader.onload = function(){ saveUser(reader.result); };
    reader.readAsDataURL(file);
  } else {
    const initial = (name && name.charAt(0).toUpperCase()) || 'U';
    // FIXED: Added backticks (`) around the HTML string
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><rect width='100%' height='100%' fill='%23e6eef9'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-size='48' fill='%23666'>${initial}</text></svg>`;
    const defaultPic = 'data:image/svg+xml;base64,' + btoa(svg);
    saveUser(defaultPic);
  }
}

// ===== Login / Logout =====
function login(){
  const id = document.getElementById("loginId").value.trim();
  const pass = document.getElementById("loginPass").value;
  const user = users.find(u => u.id === id && u.pass === pass);
  if(!user){ alert("Invalid credentials."); return; }
  currentUser = user;
  currentUserIndex = users.findIndex(u => u.id === id);
  loadDashboard();
}

function logoutUser(){
  currentUser = null;
  currentUserIndex = -1;
  showLogin();
}

// ===== Dashboard =====
function loadDashboard(){
  showDashboard();
  // Refresh current user data in case it changed
  currentUserIndex = users.findIndex(u => u.id === currentUser.id);
  currentUser = users[currentUserIndex];

  // FIXED: Added backticks (`) around the HTML string
  document.getElementById("profile").innerHTML = `
    <img src="${currentUser.pic}" alt="avatar" />
    <div>
      <h3 style="margin:0;">${currentUser.name}</h3>
      <p style="margin:6px 0 0 0;">Sex: ${currentUser.sex || '-'}</p>
      <p style="margin:6px 0 0 0;">Location: ${currentUser.loc || '-'}</p>
      <p style="margin:6px 0 0 0;">Water Intake: ${currentUser.water} L</p>
      <div class="buttons-row" style="margin-top:8px;">
        <button class="small-btn" onclick="editCurrentUser()">Edit Profile</button>
        <button class="small-btn" onclick="deleteCurrentUser()">Delete Account</button>
      </div>
    </div>
  `;

  renderChart();
}

function editCurrentUser(){
  if(currentUserIndex < 0) return alert("No user is logged in");
  const u = users[currentUserIndex];
  const newName = prompt("Edit name", u.name) || u.name;
  const newSex = prompt("Edit sex (M/F)", u.sex) || u.sex;
  const newLoc = prompt("Edit location", u.loc) || u.loc;
  const newWater = parseFloat(prompt("Edit water intake (L)", u.water)) || u.water;

  users[currentUserIndex] = { ...u, name: newName, sex: newSex, loc: newLoc, water: newWater };
  saveUsers();
  currentUser = users[currentUserIndex];
  loadDashboard();
}

function deleteCurrentUser(){
  if(currentUserIndex < 0) return alert("No user is logged in");
  if(!confirm("Are you sure you want to delete your account? This action cannot be undone.")) return;
  users.splice(currentUserIndex, 1);
  saveUsers();
  alert("Account deleted.");
  currentUser = null;
  currentUserIndex = -1;
  showLogin();
}

// ===== All Users page =====
function showAllUsers(){
  document.getElementById("dashboard").classList.add("hidden");
  document.getElementById("allUsersPage").classList.remove("hidden");
  renderAllUsers();
  renderAllUsersChart();
}

function backToDashboard(){
  document.getElementById("allUsersPage").classList.add("hidden");
  if(currentUser) loadDashboard(); else showLogin();
}

function renderAllUsers(){
  const container = document.getElementById("allUsersList");
  container.innerHTML = "";
  users.forEach((u, i) => {
    const div = document.createElement("div");
    div.className = "profile-card";
    // FIXED: Added backticks (`) around the HTML string
    div.innerHTML = `
      <img src="${u.pic}" alt="avatar" />
      <div style="flex:1;">
        <h4 style="margin:0;">${u.name}</h4>
        <p style="margin:6px 0 0 0;">Sex: ${u.sex || '-'}</p>
        <p style="margin:6px 0 0 0;">Location: ${u.loc || '-'}</p>
        <p style="margin:6px 0 0 0;">Water: ${u.water} L</p>
      </div>
    `;
    container.appendChild(div);
  });
}

// ===== Charts =====
function renderChart(){
  const names = users.map(u => u.name);
  const waters = users.map(u => u.water);
  const ctx = document.getElementById("rankChart").getContext("2d");
  if(rankChart) rankChart.destroy();
  rankChart = new Chart(ctx, {
    type: "bar",
    data: { labels: names, datasets: [{ label: "Water Intake (L)", data: waters, backgroundColor: "#0a62a8" }] },
    options: { scales: { y: { beginAtZero: true } } }
  });
}

function renderAllUsersChart(){
  const names = users.map(u => u.name);
  const waters = users.map(u => u.water);
  const ctx = document.getElementById("allUsersChart").getContext("2d");
  if(allUsersChart) allUsersChart.destroy();
  allUsersChart = new Chart(ctx, {
    type: "bar",
    data: { labels: names, datasets: [{ label: "Water Intake (L)", data: waters, backgroundColor: "#0a62a8" }] },
    options: { scales: { y: { beginAtZero: true } } }
  });
}

// ===== Account Recovery =====
function recoverAccount(){
  const recoverName = document.getElementById("recoverName").value.trim();
  if (recoverName === "") {
    alert("Please enter your name");
    return;
  }

  // FIXED: Use the global 'users' array which is already loaded from 'waterUsers'
  // Search by name (case insensitive)
  const foundUser = users.find(u => u.name.toLowerCase() === recoverName.toLowerCase());

  if (!foundUser) {
    alert("Name not found. Please check and try again.");
    return;
  }

  // FIXED: Use correct property names (.id and .pass)
  alert(
    "Login Details Found!\n\n" +
    "User ID: " + foundUser.id + "\n" +
    "Password: " + foundUser.pass
  );
}