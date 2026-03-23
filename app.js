/*************************************************
 * 1. MOCK BACKEND CONFIGURATION
 *************************************************/
// Firebase has been removed; operations are now local/in-memory.

/*************************************************
 * 2. GLOBAL STATE & HELPERS
 *************************************************/
let currentRole = null;
let currentUserUID = null;
let dbIssues = []; // Realtime mirror of Firestore
let issueToResolve = null;
let leafletMap = null;
let currentMarkers = [];
let mapInitialized = false;

// Map helper icons
const categoryIcons = {
    "Roads": "fa-road",
    "Waste": "fa-trash",
    "Drainage": "fa-water",
    "Utilities": "fa-lightbulb",
    "Toilets": "fa-restroom"
};

function timeAgo(dateString) {
    if (!dateString) return "Just now";
    const date = new Date(dateString);
    const seconds = Math.floor((new Date() - date) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    return Math.floor(seconds) + " seconds ago";
}

function getPriority(votes) {
    if (votes > 10) return { level: "High", badge: "🔥 High" };
    if (votes >= 5) return { level: "Medium", badge: "⚡ Med" };
    return { level: "Low", badge: "🧊 Low" };
}

/*************************************************
 * 3. INITIALIZATION & LISTENERS
 *************************************************/
document.addEventListener("DOMContentLoaded", () => {
    // Standard DOM Listeners
    setupEventListeners();

    // Check localStorage for mocked session
    const savedUser = localStorage.getItem("fixmyarea_user");
    if (savedUser) {
        const u = JSON.parse(savedUser);
        handleSuccessfulLogin({ uid: u.uid }, u.role);
    } else {
        // Guest mode: render map and issues but require login for actions
        listenToIssues();
        if (!mapInitialized) initMap();
        else leafletMap.invalidateSize();
    }
});

function setupEventListeners() {
    // Modals

    // Modals
    document.getElementById("btnOpenReport").addEventListener("click", () => showModal("reportModal"));
    document.querySelectorAll(".close").forEach(btn => {
        btn.addEventListener("click", (e) => hideModal(e.target.closest(".modal").id));
    });

    // Filtering
    document.getElementById("searchInput").addEventListener("input", renderIssues);
    
    // Custom Dropdowns Logic
    document.querySelectorAll(".custom-dropdown-container").forEach(container => {
        const btn = container.querySelector(".custom-dropdown-btn");
        const menu = container.querySelector(".dropdown-menu");
        const hiddenInput = container.querySelector("input[type='hidden']");
        const selectedText = container.querySelector(".dropdown-selected-text");
        
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            // Close others
            document.querySelectorAll(".custom-dropdown-container").forEach(c => {
                if(c !== container) c.classList.remove("active");
            });
            document.getElementById("userProfile").classList.remove("active");
            
            container.classList.toggle("active");
        });
        
        container.querySelectorAll(".dropdown-item").forEach(item => {
            item.addEventListener("click", (e) => {
                e.stopPropagation();
                
                // Update text & value
                selectedText.innerText = item.innerText;
                hiddenInput.value = item.getAttribute("data-value");
                
                // Update selected styling
                container.querySelectorAll(".dropdown-item").forEach(i => i.classList.remove("selected"));
                item.classList.add("selected");
                
                container.classList.remove("active");
                renderIssues(); // Trigger filter
            });
        });
    });

    // Profile Dropdown Logic
    const profileContainer = document.getElementById("userProfile");
    const profileBtn = document.getElementById("btnProfileToggle");
    if(profileBtn) {
        profileBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            document.querySelectorAll(".custom-dropdown-container").forEach(c => c.classList.remove("active"));
            profileContainer.classList.toggle("active");
        });
    }

    // Close dropdowns on outside click
    document.addEventListener("click", () => {
        document.querySelectorAll(".custom-dropdown-container").forEach(c => c.classList.remove("active"));
        if(profileContainer) profileContainer.classList.remove("active");
    });

    // Form Submissions
    document.getElementById("reportForm").addEventListener("submit", handleReportSubmit);
    document.getElementById("adminForm").addEventListener("submit", handleAdminSubmit);
}

function handleSuccessfulLogin(user, role) {
    currentUserUID = user.uid;
    currentRole = role;

    const navLinks = document.getElementById("desktopNavLinks");
    if(navLinks) navLinks.style.display = "flex";

    const userRoleText = currentRole === "admin" ? "Authority Portal" : "Citizen Portal";
    document.getElementById("profileName").innerText = userRoleText;
    
    const menuRoleEl = document.getElementById("profileMenuRole");
    if (menuRoleEl) menuRoleEl.innerText = userRoleText;
    
    const avatarEl = document.getElementById("profileAvatarInitials");
    if (avatarEl) {
        avatarEl.innerHTML = currentRole === "admin" ? '<i class="fa-solid fa-building-shield"></i>' : '<i class="fa-solid fa-user"></i>';
        avatarEl.style.background = "linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)";
        avatarEl.style.color = "white";
    }

    const authActions = document.getElementById("authMenuActions");
    if (authActions) {
        authActions.outerHTML = `
            <div class="dropdown-item" onclick="window.location.href='profile.html'">
                <i class="fa-solid fa-user-pen" style="color:var(--primary);"></i> <span style="color:var(--text-main); font-weight:600;">Edit Profile</span>
            </div>
            <div class="dropdown-item" onclick="logout()">
                <i class="fa-solid fa-right-from-bracket" style="color:var(--status-reopened);"></i> <span style="color:var(--status-reopened); font-weight:600;">Sign Out</span>
            </div>
        `;
    }

    const reportBtn = document.getElementById("btnOpenReport");
    if(reportBtn) {
        reportBtn.style.display = currentRole === "admin" ? "none" : "inline-flex";
    }

    if (!mapInitialized) initMap();
    else leafletMap.invalidateSize();


    // Start Realtime Firestore Listener
    listenToIssues();
}

function logout() {
    localStorage.removeItem("fixmyarea_user");
    location.reload();
}

/*************************************************
 * 5. DATABASE OPERATIONS (Cloud Sync)
 *************************************************/
/*************************************************
 * 5. DATABASE OPERATIONS (Local Sync)
 *************************************************/
function saveIssuesLocally() {
    localStorage.setItem("fixmyarea_issues", JSON.stringify(dbIssues));
}

function listenToIssues() {
    // Hide original spinner logic or keep it non-blocking
    const spinner = document.getElementById("loadingSpinner");
    if(spinner) spinner.style.display = "block";
    
    // Simulate network delay
    setTimeout(() => {
        if(spinner) spinner.style.display = "none";
        
        const localIssues = localStorage.getItem("fixmyarea_issues");
        if (localIssues) {
            dbIssues = JSON.parse(localIssues);
        } else {
            dbIssues = []; // Start fresh if nothing exists
        }
        
        renderIssues();
    }, 500);
}

function upvoteIssue(id, event) {
    if (event) event.stopPropagation();
    if (!currentUserUID) {
        window.location.href = "login.html";
        return;
    }
    
    const issue = dbIssues.find(i => i.id === id);
    if (issue) {
        issue.votes += 1;
        saveIssuesLocally();
        renderIssues();
    }
}

function markInProgress(id) {
    const issue = dbIssues.find(i => i.id === id);
    if (issue) {
        issue.status = "In Progress";
        saveIssuesLocally();
        renderIssues();
    }
}

function verifyFix(id, isConfirmed) {
    const issue = dbIssues.find(i => i.id === id);
    if (issue) {
        issue.status = isConfirmed ? "Resolved" : "Reopened";
        saveIssuesLocally();
        renderIssues();
    }
    hideModal("detailsModal");
}

/*************************************************
 * 6. CLOUD STORAGE (Actual File Uploads)
 *************************************************/
async function handleReportSubmit(e) {
    e.preventDefault();
    const submitBtn = document.getElementById("btnReportSubmit");
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';
    submitBtn.disabled = true;

    try {
        const file = document.getElementById("issueFile").files[0];
        const category = document.getElementById("issueCategory").value;
        const location = document.getElementById("issueLocation").value;
        const description = document.getElementById("issueDescription").value;

        // Convert image to Base64 using FileReader instead of Firebase Storage
        const reader = new FileReader();
        reader.onloadend = function() {
            const imageUrl = reader.result;
            
            // Generate mock lat/lng
            const lat = 11.25 + (Math.random() * 0.02);
            const lng = 75.77 + (Math.random() * 0.02);

            // Add to mock local DB
            const newIssue = {
                id: "issue_" + Date.now(),
                category, location, description,
                beforeImg: imageUrl,
                afterImg: null,
                status: "Pending",
                votes: 0,
                timestamp: new Date().toISOString(),
                uid: currentUserUID,
                lat, lng
            };
            
            dbIssues.push(newIssue);
            saveIssuesLocally();
            renderIssues();

            hideModal("reportModal");
            e.target.reset();
            
            submitBtn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Upload & Submit Report';
            submitBtn.disabled = false;
        };
        
        if (file) {
            reader.readAsDataURL(file);
        } else {
            throw new Error("Please select an image file.");
        }
    } catch (err) {
        alert("Upload Failed: " + err.message);
        submitBtn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Upload & Submit Report';
        submitBtn.disabled = false;
    }
}

function openAdminModal(id) {
    issueToResolve = id;
    showModal("adminModal");
}

async function handleAdminSubmit(e) {
    e.preventDefault();
    const submitBtn = document.getElementById("btnAdminSubmit");
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';
    submitBtn.disabled = true;

    try {
        const file = document.getElementById("adminFile").files[0];
        
        // Convert fix image to Base64
        const reader = new FileReader();
        reader.onloadend = function() {
            const imageUrl = reader.result;
            
            // Update mock issue
            const issue = dbIssues.find(i => i.id === issueToResolve);
            if (issue) {
                issue.afterImg = imageUrl;
                issue.status = "Review";
                saveIssuesLocally();
                renderIssues();
            }

            hideModal("adminModal");
            e.target.reset();
            
            submitBtn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Upload Fix Proof';
            submitBtn.disabled = false;
        };
        
        if (file) {
            reader.readAsDataURL(file);
        } else {
            throw new Error("Please select an image file.");
        }
    } catch (err) {
        alert("Failure: " + err.message);
        submitBtn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Upload Fix Proof';
        submitBtn.disabled = false;
    }
}

/*************************************************
 * 7. RENDERING LOGIC (Updated to map dbIssues)
 *************************************************/
function renderIssues() {
    // Removed early return for !currentRole to allow guests to see issues
    const grid = document.getElementById("issuesGrid");
    grid.innerHTML = "";

    let filtered = dbIssues;

    const query = document.getElementById("searchInput").value.toLowerCase();
    if (query) {
        filtered = filtered.filter(i =>
            i.description.toLowerCase().includes(query) ||
            i.location.toLowerCase().includes(query) ||
            i.category.toLowerCase().includes(query)
        );
    }

    const cat = document.getElementById("categoryFilter").value;
    if (cat !== "All") filtered = filtered.filter(i => i.category === cat);

    const stat = document.getElementById("statusFilter").value;
    if (stat !== "All") filtered = filtered.filter(i => i.status === stat);

    const sort = document.getElementById("sortFilter").value;
    if (sort === "priority") filtered.sort((a, b) => b.votes - a.votes);
    else filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    const maxVotes = Math.max(...dbIssues.map(i => i.votes), 0);

    filtered.forEach(issue => {
        const priorityInfo = getPriority(issue.votes);
        const isCritical = issue.votes === maxVotes && issue.votes > 0;
        const card = document.createElement("div");
        card.className = `issue-card ${priorityInfo.level === 'High' ? 'priority-high' : ''}`;

        let statusClass = "status-pending";
        if (issue.status === "In Progress") statusClass = "status-progress";
        if (issue.status === "Review") statusClass = "status-review";
        if (issue.status === "Resolved") statusClass = "status-resolved";
        if (issue.status === "Reopened") statusClass = "status-reopened";

        const iconClass = categoryIcons[issue.category] || "fa-triangle-exclamation";

        card.innerHTML = `
            <div class="card-image-wrap">
                <img src="${issue.beforeImg}" alt="Issue" class="card-image">
                <span class="top-badge"><i class="fa-regular fa-clock"></i> ${timeAgo(issue.timestamp)}</span>
                ${isCritical ? '<span class="top-badge critical-badge">🔥 MOST CRITICAL</span>' : ''}
                <span class="status-badge ${statusClass}">${issue.status}</span>
            </div>
            <div class="card-content">
                <div class="card-meta">
                    <span class="category-text"><i class="fa-solid ${iconClass}"></i> ${issue.category}</span>
                    <span class="priority-tag ${priorityInfo.level}">${priorityInfo.badge}</span>
                </div>
                <div class="card-location"><i class="fa-solid fa-location-dot"></i> ${issue.location}</div>
                <p class="card-desc">${issue.description}</p>
                
                <div class="card-footer">
                    <button class="upvote-btn" onclick="upvoteIssue('${issue.id}', event)">
                        <i class="fa-solid fa-arrow-up"></i> ${issue.votes}
                    </button>
                    <button class="btn btn-outline" onclick="openDetails('${issue.id}')">View Details</button>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });

    updateMap(filtered);
    updateInsights();
}

/*************************************************
 * 8. MAP & UI LOGIC
 *************************************************/
function initMap() {
    leafletMap = L.map('map').setView([11.2588, 75.7804], 14);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
    }).addTo(leafletMap);
    mapInitialized = true;
}

function updateMap(filteredList) {
    if (!leafletMap) return;
    currentMarkers.forEach(m => leafletMap.removeLayer(m));
    currentMarkers = [];

    filteredList.forEach(issue => {
        if (issue.lat && issue.lng) {
            let color = "#F59E0B";
            if (issue.status === "In Progress") color = "#3B82F6";
            if (issue.status === "Review") color = "#8B5CF6";
            if (issue.status === "Resolved") color = "#10B981";

            const markerHtml = `<div style="background-color: ${color}; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.4);"></div>`;
            const icon = L.divIcon({ html: markerHtml, className: 'custom-leaflet-marker', iconSize: [16, 16], iconAnchor: [8, 8] });

            const marker = L.marker([issue.lat, issue.lng], { icon }).addTo(leafletMap);
            marker.on('click', () => openDetails(issue.id));
            currentMarkers.push(marker);
        }
    });
}

function updateInsights() {
    document.getElementById("statTotal").innerText = dbIssues.length;
    const catFreq = {};
    let maxCat = "-", maxCount = 0;
    dbIssues.forEach(i => {
        catFreq[i.category] = (catFreq[i.category] || 0) + 1;
        if (catFreq[i.category] > maxCount) {
            maxCount = catFreq[i.category];
            maxCat = i.category;
        }
    });
    document.getElementById("statCommonCategory").innerText = maxCat;

    const highestVoted = dbIssues.reduce((prev, current) => (prev.votes > current.votes) ? prev : current, { votes: -1 });
    document.getElementById("statCritical").innerText = highestVoted.votes > -1 ? highestVoted.location.split(',')[0] : "-";
    document.getElementById("statRecent").innerText = dbIssues.length > 0 ? timeAgo(dbIssues[Math.max(0, dbIssues.length - 1)].timestamp) : "-";
}

function openDetails(id) {
    const issue = dbIssues.find(i => i.id === id);
    if (!issue) return;

    const priorityInfo = getPriority(issue.votes);
    let statusClass = "status-pending";
    if (issue.status === "In Progress") statusClass = "status-progress";
    if (issue.status === "Review") statusClass = "status-review";
    if (issue.status === "Resolved") statusClass = "status-resolved";
    if (issue.status === "Reopened") statusClass = "status-reopened";

    let actionButtons = '';

    if (currentRole === "admin") {
        if (issue.status === "Pending" || issue.status === "Reopened") {
            actionButtons = `<button class="btn btn-primary" onclick="markInProgress('${issue.id}'); hideModal('detailsModal')"><i class="fa-solid fa-hammer"></i> Pick Up Issue (In Progress)</button>`;
        } else if (issue.status === "In Progress") {
            actionButtons = `<button class="btn btn-success" onclick="openAdminModal('${issue.id}'); hideModal('detailsModal')"><i class="fa-solid fa-camera"></i> Provide Fix Proof</button>`;
        }
    } else if (currentRole === "citizen") {
        if (issue.status === "Review") {
            actionButtons = `
                <button class="btn btn-danger" onclick="verifyFix('${issue.id}', false)"><i class="fa-solid fa-xmark"></i> Reject & Reopen</button>
                <button class="btn btn-success" onclick="verifyFix('${issue.id}', true)"><i class="fa-solid fa-check"></i> Confirm Fixed</button>
            `;
        }
    } else {
        actionButtons = `<button class="btn btn-primary" onclick="hideModal('detailsModal'); window.location.href='login.html';"><i class="fa-solid fa-right-to-bracket"></i> Login to Interact</button>`;
    }

    const html = `
        <div class="details-header">
            <div>
                <h2>${issue.category} at ${issue.location}</h2>
                <div class="details-badges">
                    <span class="badge ${statusClass}">${issue.status === "Review" ? "Needs Verification" : issue.status}</span>
                    <span class="badge" style="background:#4F46E5;"><i class="fa-regular fa-clock"></i> Reported ${timeAgo(issue.timestamp)}</span>
                    <span class="badge" style="background:transparent; border:1px solid #E2E8F0; color:#0F172A;"><i class="fa-solid fa-fire text-red-500"></i> ${priorityInfo.level} Priority</span>
                </div>
            </div>
            <button class="upvote-btn" onclick="upvoteIssue('${issue.id}', event); hideModal('detailsModal'); setTimeout(()=>openDetails('${issue.id}'),200)">
                <i class="fa-solid fa-arrow-up"></i> ${issue.votes}
            </button>
        </div>
        
        <p style="font-size: 1.125rem; color: #475569; margin-bottom: 2rem;">${issue.description}</p>
        
        <div class="media-comparison">
            <div class="media-side">
                <h4><i class="fa-solid fa-image"></i> Problem Reported</h4>
                <img src="${issue.beforeImg}" alt="Before">
            </div>
            ${issue.afterImg ? `
            <div class="media-side">
                <h4><i class="fa-solid fa-image"></i> Resolution Proof</h4>
                <img src="${issue.afterImg}" alt="After">
            </div>
            ` : ''}
        </div>
        
        <div class="details-actions">
            ${actionButtons || '<span style="color:#64748B; font-weight:500; font-size:0.875rem;">No actions available for your role at this stage.</span>'}
        </div>
    `;

    document.getElementById("detailsModalBody").innerHTML = html;
    showModal("detailsModal");
}
