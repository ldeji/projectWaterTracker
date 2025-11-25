// ===== 1. Global State =====
let users = JSON.parse(localStorage.getItem("waterUsers") || "[]");
let currentUser = null;
let currentUserIndex = -1;
let rankChart = null;
let allUsersChart = null;
let adminChart = null;

// ===== 2. Helper Functions (Dates & Math) =====

// Get today's date as simple string "YYYY-MM-DD"
function getTodayDate() {
  return new Date().toISOString().split('T')[0];
}

// Calculate total water for a specific user based on timeframe
function getUserTotal(user, type) {
  // If user has no logs, check if they have legacy "flat" water data
  if (!user.logs || user.logs.length === 0) {
    // Only return legacy water for 'lifetime', otherwise 0 for daily/weekly
    return type === 'lifetime' ? (user.water || 0) : 0;
  }

  const today = getTodayDate();
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7); // Go back 7 days

  return user.logs.reduce((sum, entry) => {
    // DAILY CALCULATION
    if (type === 'daily') {
      return entry.date === today ? sum + entry.amount : sum;
    }
    // WEEKLY CALCULATION
    if (type === 'weekly') {
      const entryDate = new Date(entry.date);
      // Check if entry date is newer than one week ago
      return entryDate >= oneWeekAgo ? sum + entry.amount : sum;
    }
    // LIFETIME CALCULATION
    return sum + entry.amount;
  }, 0);
}

// ===== 3. Navigation / Visibility Logic =====
function saveUsers(){ 
  localStorage.setItem("waterUsers", JSON.stringify(users)); 
}

function hideAllSections() {
  const sections = ["auth", "register", "dashboard", "allUsersPage", "adminDashboard"];
  sections.forEach(id => {
    const el = document.getElementById(id);
    if(el) el.classList.add("hidden");
  });
}

function showLogin(){ 
  hideAllSections();
  document.getElementById("auth").classList.remove("hidden"); 
  document.getElementById("loginId").value = "";
  document.getElementById("loginPass").value = "";
}

function showRegister(){ 
  hideAllSections();
  clearRegisterInputs();
  document.getElementById("register").classList.remove("hidden"); 
}

function showDashboard(){ 
  hideAllSections();
  document.getElementById("dashboard").classList.remove("hidden"); 
}

function showAdminDashboard(){
  hideAllSections();
  document.getElementById("adminDashboard").classList.remove("hidden");
  renderAdminView(); 
}

// ===== 4. Event Listeners (Runs when page loads) =====
document.addEventListener('DOMContentLoaded', ()=>{
  
  // Login & Register Events
  document.getElementById("loginBtn").addEventListener("click", login);
  document.getElementById("regBtn").addEventListener("click", registerUser);
  document.getElementById("showRegLink").addEventListener("click", (e)=>{ e.preventDefault(); showRegister(); });
  document.getElementById("backLoginLink").addEventListener("click", (e)=>{ e.preventDefault(); showLogin(); });
  
  // Admin Button on Login Page
  document.getElementById("adminDirectBtn").addEventListener("click", () => {
    const pass = prompt("Enter Admin Password:");
    if(pass === "admin") {
      showAdminDashboard();
    } else if(pass !== null) {
      alert("Incorrect Admin Password");
    }
  });

  // Dashboard & Nav Events
  document.getElementById("logoutBtn").addEventListener("click", logoutUser);
  document.getElementById("adminLogoutBtn").addEventListener("click", logoutUser);
  document.getElementById("viewAllBtn").addEventListener("click", showAllUsers);
  document.getElementById("backBtn").addEventListener("click", backToDashboard);

  // Password Recovery
  document.getElementById("forgotBtn").addEventListener("click", function(e) {
    e.preventDefault();
    document.getElementById("recoverBox").classList.remove("hidden");
  });
  document.getElementById("recoverSubmit").addEventListener("click", recoverAccount);
});

// ===== 5. Registration Logic =====
function registerUser(){
  const id = document.getElementById("regId").value.trim();
  const pass = document.getElementById("regPass").value;
  const name = document.getElementById("regName").value.trim() || id;
  const sex = document.getElementById("regSex").value.trim();
  const loc = document.getElementById("regLoc").value.trim();
  
  // Initial Water Input
  const initialWater = parseFloat(document.getElementById("regWater").value) || 0;

  if(!id || !pass){ alert("User ID and Password are required."); return; }
  if(id.toLowerCase() === 'admin') { alert("ID 'admin' is reserved."); return; }
  if(users.find(u => u.id === id)){ alert("User ID already exists."); return; }

  const file = document.getElementById("regPic").files[0];

  function saveUserToStorage(picData){
    // Create initial log if they entered water during registration
    const initialLogs = [];
    if(initialWater > 0) {
      initialLogs.push({ date: getTodayDate(), amount: initialWater });
    }

    users.push({ 
        id, pass, name, sex, loc, 
        water: initialWater, // Legacy support
        logs: initialLogs,   // NEW: History Tracking
        pic: picData 
    });
    saveUsers();
    alert("Registration Successful! Please Login.");
    showLogin();
  }

  // Handle Image
  if(file){
    const reader = new FileReader();
    reader.onload = function(){ saveUserToStorage(reader.result); };
    reader.readAsDataURL(file);
  } else {
    // Generate Avatar
    const initial = name.charAt(0).toUpperCase();
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><rect width='100%' height='100%' fill='#ddd'/><text x='50%' y='55%' dominant-baseline='middle' text-anchor='middle' font-size='50' fill='#555'>${initial}</text></svg>`;
    saveUserToStorage('data:image/svg+xml;base64,' + btoa(svg));
  }
}

function clearRegisterInputs() {
  document.getElementById('regId').value = "";
  document.getElementById('regPass').value = "";
  document.getElementById('regName').value = "";
  document.getElementById('regSex').value = "";
  document.getElementById('regLoc').value = "";
  document.getElementById('regWater').value = "";
  document.getElementById('regPic').value = ""; 
}

// ===== 6. Login Logic =====
function login(){
  const id = document.getElementById("loginId").value.trim();
  const pass = document.getElementById("loginPass").value;

  if(id === "admin" && pass === "admin") {
    showAdminDashboard();
    return;
  }

  users = JSON.parse(localStorage.getItem("waterUsers") || "[]");
  const user = users.find(u => u.id === id && u.pass === pass);
  
  if(!user){ alert("Invalid ID or Password"); return; }

  currentUser = user;
  loadDashboard();
}

function logoutUser(){
  currentUser = null;
  showLogin();
}

// ===== 7. User Dashboard Logic =====
function loadDashboard(){
  showDashboard();
  
  // Refresh current user data from source
  currentUserIndex = users.findIndex(u => u.id === currentUser.id);
  if(currentUserIndex === -1) return logoutUser();
  currentUser = users[currentUserIndex];

  // Calculate stats
  const dailyTotal = getUserTotal(currentUser, 'daily');
  const lifetimeTotal = getUserTotal(currentUser, 'lifetime');

  document.getElementById("profile").innerHTML = `
    <img src="${currentUser.pic}" alt="pic">
    <div>
      <h3>${currentUser.name}</h3>
      <p>ID: ${currentUser.id} | Loc: ${currentUser.loc}</p>
      <p>Today: <strong style="color:#28a745; font-size:1.2em;">${dailyTotal.toFixed(1)} L</strong></p>
      <p style="font-size:0.8em; color:#666;">Lifetime: ${lifetimeTotal.toFixed(1)} L</p>
      <button class="small-btn" onclick="editCurrentUser()">Edit Profile</button>
      <button class="small-btn" onclick="deleteCurrentUser()" style="background:#dc3545;">Delete</button>
    </div>
  `;
  
  renderChart("rankChart");
  updateRankings(); // Update the leaderboards
}

function logWaterAction() {
  const amount = parseFloat(prompt("How many Liters did you just drink?", "0.5"));
  
  if (!amount || amount <= 0) return;

  // 1. Update Legacy Total
  currentUser.water = (currentUser.water || 0) + amount;

  // 2. Add to History Log
  if (!currentUser.logs) currentUser.logs = []; 
  
  currentUser.logs.push({
    date: getTodayDate(),
    amount: amount
  });

  // 3. Save
  users[currentUserIndex] = currentUser;
  saveUsers();
  
  // 4. Reload
  loadDashboard();
}

// NEW: Render Daily/Weekly Lists
function updateRankings() {
  // Get Daily Leaders
  const dailyData = users.map(u => ({ 
    name: u.name, 
    val: getUserTotal(u, 'daily') 
  })).sort((a,b) => b.val - a.val).slice(0, 3);

  // Get Weekly Leaders
  const weeklyData = users.map(u => ({ 
    name: u.name, 
    val: getUserTotal(u, 'weekly') 
  })).sort((a,b) => b.val - a.val).slice(0, 3);

  // Render HTML
  document.getElementById("dailyRankList").innerHTML = dailyData.map((d, i) => 
    `<li><span>#${i+1} ${d.name}</span> <span>${d.val.toFixed(1)}L</span></li>`
  ).join('') || "<li>No data today</li>";

  document.getElementById("weeklyRankList").innerHTML = weeklyData.map((d, i) => 
    `<li><span>#${i+1} ${d.name}</span> <span>${d.val.toFixed(1)}L</span></li>`
  ).join('') || "<li>No data this week</li>";
}

function editCurrentUser(){
  updateUserLogic(currentUserIndex, false); 
  currentUser = users[currentUserIndex];
  loadDashboard();
}

function deleteCurrentUser(){
  if(!confirm("Delete your account?")) return;
  users.splice(currentUserIndex, 1);
  saveUsers();
  logoutUser();
}

// ===== 8. Admin & Shared Logic =====
function renderAdminView() {
  document.getElementById("totalUsersCount").innerText = users.length;
  const tbody = document.getElementById("adminUserTableBody");
  tbody.innerHTML = ""; 

  if(users.length === 0) {
    tbody.innerHTML = "<tr><td colspan='8' style='text-align:center;'>No users found.</td></tr>";
  } else {
    users.forEach((u, index) => {
      // Use getUserTotal to get accurate lifetime amount
      const totalWater = getUserTotal(u, 'lifetime');
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><img src="${u.pic}" style="width:30px; height:30px; object-fit:cover; border-radius:50%;"></td>
        <td><strong>${u.id}</strong></td>
        <td style="color:#d9534f; font-family:monospace;">${u.pass}</td>
        <td>${u.name}</td>
        <td>${u.sex}</td>
        <td>${u.loc}</td>
        <td>${totalWater.toFixed(1)}</td>
        <td>
          <button class="small-btn" style="background:#ffc107; color:#000;" onclick="adminEditUser(${index})">Edit</button>
          <button class="small-btn" style="background:#dc3545;" onclick="adminDeleteUser(${index})">Delete</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  // Admin Chart
  const names = users.map(u => u.name);
  const waters = users.map(u => getUserTotal(u, 'lifetime'));
  const ctx = document.getElementById("adminChart").getContext("2d");
  
  if(adminChart) adminChart.destroy();
  adminChart = new Chart(ctx, {
    type: "bar",
    data: { labels: names, datasets: [{ label: "Total Water (L)", data: waters, backgroundColor: "#007bff" }] },
    options: { scales: { y: { beginAtZero: true } } }
  });
}

// Window functions for HTML access
window.adminEditUser = function(index) {
  users = JSON.parse(localStorage.getItem("waterUsers") || "[]");
  updateUserLogic(index, true); 
  renderAdminView(); 
};

window.adminDeleteUser = function(index) {
  if(!confirm("ADMIN: Delete user?")) return;
  users.splice(index, 1);
  saveUsers();
  renderAdminView(); 
};

function updateUserLogic(index, isAdmin) {
  const u = users[index];
  const newName = prompt("Edit Name:", u.name);
  if(newName === null) return; 

  const newSex = prompt("Edit Sex (M/F):", u.sex) || u.sex;
  const newLoc = prompt("Edit Location:", u.loc) || u.loc;
  
  // Edit logic specific: we update the 'legacy' water, 
  // but we can't easily edit individual history logs via simple prompt.
  // We will assume this edit resets/adjusts the base value.
  const newWater = parseFloat(prompt("Edit Total Water (L):", u.water));
  
  let newPass = u.pass;
  if(isAdmin) newPass = prompt("Edit Password:", u.pass) || u.pass;

  users[index] = {
    ...u,
    name: newName || u.name,
    sex: newSex,
    loc: newLoc,
    water: isNaN(newWater) ? u.water : newWater,
    pass: newPass
  };
  saveUsers();
}

function showAllUsers(){
  hideAllSections();
  document.getElementById("allUsersPage").classList.remove("hidden");
  
  const list = document.getElementById("allUsersList");
  list.innerHTML = "";
  
  const sorted = [...users].sort((a,b) => getUserTotal(b, 'lifetime') - getUserTotal(a, 'lifetime'));

  sorted.forEach((u, i) => {
    const div = document.createElement("div");
    div.className = "profile-box"; // Recycle profile box class
    div.innerHTML = `
      <img src="${u.pic}">
      <div style="flex:1">
        <b>#${i+1} ${u.name}</b>
        <p>Total: ${getUserTotal(u, 'lifetime').toFixed(1)} L</p>
      </div>
    `;
    list.appendChild(div);
  });

  const ctx = document.getElementById("allUsersChart").getContext("2d");
  if(allUsersChart) allUsersChart.destroy();
  allUsersChart = new Chart(ctx, {
    type: "bar",
    data: { 
      labels: sorted.map(u=>u.name), 
      datasets: [{ label: "Water (L)", data: sorted.map(u=>getUserTotal(u, 'lifetime')), backgroundColor: "#007bff" }] 
    },
    options: { scales: { y: { beginAtZero: true } } }
  });
}

function backToDashboard(){
  if(currentUser) loadDashboard();
  else showLogin();
}

function recoverAccount(){
  const name = document.getElementById("recoverName").value.trim();
  const u = users.find(u => u.name.toLowerCase() === name.toLowerCase());
  if(u) alert(`ID: ${u.id}\nPassword: ${u.pass}`);
  else alert("User not found.");
}

function renderChart(canvasId){
  const ctx = document.getElementById(canvasId).getContext("2d");
  if(rankChart && canvasId === "rankChart") rankChart.destroy();
  
  // Use daily totals for comparison chart
  const myTotal = getUserTotal(currentUser, 'daily');
  const topUser = [...users].sort((a,b) => getUserTotal(b, 'daily') - getUserTotal(a, 'daily'))[0];
  
  const data = [myTotal];
  const labels = ["Me (Today)"];
  
  if(topUser && topUser.id !== currentUser.id){
    labels.push(`Top: ${topUser.name}`);
    data.push(getUserTotal(topUser, 'daily'));
  }

  const newChart = new Chart(ctx, {
    type: "bar",
    data: { labels: labels, datasets: [{ label: "Liters Today", data: data, backgroundColor: ["#28a745", "#007bff"] }] },
    options: { scales: { y: { beginAtZero: true } } }
  });
  
  if(canvasId === "rankChart") rankChart = newChart;
}

