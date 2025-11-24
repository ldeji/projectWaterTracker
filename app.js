// ===== 1. Global State =====
let users = JSON.parse(localStorage.getItem("waterUsers") || "[]");
let currentUser = null;
let currentUserIndex = -1;
let rankChart = null;
let allUsersChart = null;
let adminChart = null;

// ===== 2. Helper Functions =====
function saveUsers(){ 
  localStorage.setItem("waterUsers", JSON.stringify(users)); 
}

function hideAllSections() {
  document.getElementById("auth").classList.add("hidden");
  document.getElementById("register").classList.add("hidden");
  document.getElementById("dashboard").classList.add("hidden");
  document.getElementById("allUsersPage").classList.add("hidden");
  document.getElementById("adminDashboard").classList.add("hidden");
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
  renderAdminView(); // This builds the table
}

// ===== 3. Event Listeners (Runs when page loads) =====
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
  document.getElementById("forgotBtn").addEventListener("click", function() {
    document.getElementById("recoverBox").classList.remove("hidden");
    this.style.display = 'none'; 
  });
  document.getElementById("recoverSubmit").addEventListener("click", recoverAccount);
});

// ===== 4. Admin Dashboard Logic (The Fix) =====
function renderAdminView() {
  // 1. Update Total Users Count
  const countSpan = document.getElementById("totalUsersCount");
  if(countSpan) countSpan.innerText = users.length;

  // 2. Populate the Table
  const tbody = document.getElementById("adminUserTableBody");
  tbody.innerHTML = ""; // Clear existing rows

  if(users.length === 0) {
    tbody.innerHTML = "<tr><td colspan='8' style='text-align:center; padding:15px;'>No users found.</td></tr>";
  } else {
    users.forEach((u, index) => {
      const tr = document.createElement("tr");
      // This HTML matches the headers in the new HTML structure
      tr.innerHTML = `
        <td><img src="${u.pic}" style="width:30px; height:30px; object-fit:cover; border-radius:50%;"></td>
        <td><strong>${u.id}</strong></td>
        <td style="color:#d9534f; font-family:monospace;">${u.pass}</td>
        <td>${u.name}</td>
        <td>${u.sex}</td>
        <td>${u.loc}</td>
        <td>${u.water}</td>
        <td>
          <button class="small-btn" style="background:#ffc107; color:#000; margin-right:5px;" onclick="adminEditUser(${index})">Edit</button>
          <button class="small-btn" style="background:#dc3545;" onclick="adminDeleteUser(${index})">Delete</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  // 3. Render Admin Chart
  const names = users.map(u => u.name);
  const waters = users.map(u => u.water);
  const ctx = document.getElementById("adminChart").getContext("2d");
  
  if(adminChart) adminChart.destroy();
  
  adminChart = new Chart(ctx, {
    type: "bar",
    data: { labels: names, datasets: [{ label: "Water Intake (L)", data: waters, backgroundColor: "#007bff" }] },
    options: { scales: { y: { beginAtZero: true } } }
  });
}

// Admin Actions (Attached to window so HTML onclick works)
window.adminEditUser = function(index) {
  // Force update from storage in case of desync
  users = JSON.parse(localStorage.getItem("waterUsers") || "[]");
  updateUserLogic(index, true); // true = allow password edit
  renderAdminView(); // Refresh table
};

window.adminDeleteUser = function(index) {
  if(!confirm("ADMIN: Are you sure you want to delete this user permanently?")) return;
  users.splice(index, 1);
  saveUsers();
  renderAdminView(); // Refresh table
};

// ===== 5. Registration Logic =====
function registerUser(){
  const id = document.getElementById("regId").value.trim();
  const pass = document.getElementById("regPass").value;
  const name = document.getElementById("regName").value.trim() || id;
  const sex = document.getElementById("regSex").value.trim();
  const loc = document.getElementById("regLoc").value.trim();
  const water = parseFloat(document.getElementById("regWater").value) || 0;

  if(!id || !pass){ alert("User ID and Password are required."); return; }
  if(id.toLowerCase() === 'admin') { alert("ID 'admin' is reserved."); return; }
  
  // Check duplicate ID
  if(users.find(u => u.id === id)){ alert("User ID already exists."); return; }

  const file = document.getElementById("regPic").files[0];

  function saveUserToStorage(picData){
    users.push({ id, pass, name, sex, loc, water, pic: picData });
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
    // Default Avatar Generator
    const initial = name.charAt(0).toUpperCase();
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><rect width='100%' height='100%' fill='#ddd'/><text x='50%' y='55%' dominant-baseline='middle' text-anchor='middle' font-size='50' fill='#555'>${initial}</text></svg>`;
    saveUserToStorage('data:image/svg+xml;base64,' + btoa(svg));
  }
}

// ===== 6. Login Logic =====
function login(){
  const id = document.getElementById("loginId").value.trim();
  const pass = document.getElementById("loginPass").value;

  if(id === "admin" && pass === "admin") {
    alert("Welcome Administrator");
    showAdminDashboard();
    return;
  }

  // Refresh users from storage to be sure
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

// Clear Registration Inputs
function clearRegisterInputs() {
  document.getElementById('regId').value = "";
  document.getElementById('regPass').value = "";
  document.getElementById('regName').value = "";
  document.getElementById('regSex').value = "";
  document.getElementById('regLoc').value = "";
  document.getElementById('regWater').value = "";
  document.getElementById('regPic').value = ""; // Clears the selected file
}

// ===== 7. User Dashboard Logic =====
function loadDashboard(){
  showDashboard();
  // Find fresh index
  currentUserIndex = users.findIndex(u => u.id === currentUser.id);
  if(currentUserIndex === -1) return logoutUser(); // User was deleted
  currentUser = users[currentUserIndex];

  document.getElementById("profile").innerHTML = `
    <img src="${currentUser.pic}" alt="pic">
    <div>
      <h3>${currentUser.name}</h3>
      <p>ID: ${currentUser.id}</p>
      <p>Loc: ${currentUser.loc}</p>
      <p>Water: <strong>${currentUser.water} L</strong></p>
      <button class="small-btn" onclick="editCurrentUser()">Edit Profile</button>
      <button class="small-btn" onclick="deleteCurrentUser()">Delete Account</button>
    </div>
  `;
  
  renderChart("rankChart");
}

function editCurrentUser(){
  updateUserLogic(currentUserIndex, false); // false = standard user (no password edit usually)
  currentUser = users[currentUserIndex];
  loadDashboard();
}

function deleteCurrentUser(){
  if(!confirm("Delete your account?")) return;
  users.splice(currentUserIndex, 1);
  saveUsers();
  logoutUser();
}

// Shared Edit Logic (Used by Admin and User)
function updateUserLogic(index, isAdmin) {
  const u = users[index];
  
  const newName = prompt("Edit Name:", u.name);
  if(newName === null) return; // Cancelled

  const newSex = prompt("Edit Sex (M/F):", u.sex) || u.sex;
  const newLoc = prompt("Edit Location:", u.loc) || u.loc;
  const newWater = parseFloat(prompt("Edit Water (L):", u.water));
  
  // Only ask for password if Admin
  let newPass = u.pass;
  if(isAdmin){
    newPass = prompt("Edit Password:", u.pass) || u.pass;
  }

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

// ===== 8. View All Users Logic =====
function showAllUsers(){
  hideAllSections();
  document.getElementById("allUsersPage").classList.remove("hidden");
  
  const list = document.getElementById("allUsersList");
  list.innerHTML = "";
  
  // Sort by water intake (High to Low)
  const sorted = [...users].sort((a,b) => b.water - a.water);

  sorted.forEach((u, i) => {
    const div = document.createElement("div");
    div.className = "profile-card";
    div.innerHTML = `
      <img src="${u.pic}">
      <div style="flex:1">
        <b>#${i+1} ${u.name}</b>
        <p>Water: ${u.water} L</p>
      </div>
    `;
    list.appendChild(div);
  });

  // Render Chart
  const ctx = document.getElementById("allUsersChart").getContext("2d");
  if(allUsersChart) allUsersChart.destroy();
  allUsersChart = new Chart(ctx, {
    type: "bar",
    data: { 
      labels: sorted.map(u=>u.name), 
      datasets: [{ label: "Water (L)", data: sorted.map(u=>u.water), backgroundColor: "#007bff" }] 
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

// Generic Chart Render for Single User
function renderChart(canvasId){
  const ctx = document.getElementById(canvasId).getContext("2d");
  if(rankChart && canvasId === "rankChart") rankChart.destroy();
  
  // Show comparison (Me vs Top User)
  const topUser = [...users].sort((a,b) => b.water - a.water)[0];
  const data = [currentUser.water];
  const labels = ["Me"];
  
  if(topUser && topUser.id !== currentUser.id){
    labels.push("Top User (" + topUser.name + ")");
    data.push(topUser.water);
  }

  const newChart = new Chart(ctx, {
    type: "bar",
    data: { labels: labels, datasets: [{ label: "Liters", data: data, backgroundColor: ["#007bff", "#28a745"] }] },
    options: { scales: { y: { beginAtZero: true } } }
  });
  
  if(canvasId === "rankChart") rankChart = newChart;
}