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

const translations = {
    en: {
        dashboard: "Dashboard",
        profile: "My Profile",
        settings: "App Settings",
        about: "About Us",
        connect: "Join Volunteer",
        signOut: "Sign Out",
        reportIssue: "Report Issue",
        trackProgress: "Track Progress",
        howItWorks: "How FixMyArea Works",
        report: "Report",
        track: "Track & Verify",
        resolve: "Resolve",
        totalIssues: "Total Issues",
        mostReported: "Most Reported",
        mostCritical: "Most Critical",
        latestActivity: "Latest Activity",
        latestNews: "Live Updates & News",
        viewFullFeed: "View Full Feed",
        allCategories: "All Categories",
        allStatuses: "All Statuses",
        highestPriority: "Highest Priority",
        mostRecent: "Most Recent",
        welcomeGuest: "Welcome Guest",
        signIn: "Sign In",
        register: "Register Account",
        searchPlaceholder: "Search issues, locations, descriptions...",
        appearance: "Appearance",
        theme: "Application Theme",
        light: "Light Theme",
        dark: "Dark Theme",
        localization: "Localization",
        language: "Language Preference",
        save: "Save Preferences",
        saved: "Preferences Saved Successfully!",
        legendPending: "Pending",
        legendInProgress: "In Progress",
        legendReview: "Needs Review",
        legendResolved: "Resolved",
        legendReopened: "Reopened",
        locateMe: "Locate Me",
        resetView: "Reset View",
        heroBadge: "✨ Kozhikode Civic Initiative",
        heroTitle: "Empowering Citizens.<br>Transforming Kozhikode.",
        heroSub: "Report issues, track resolutions, and build a better community together through transparency and action.",
        howItWorksSub: "Simple steps to a cleaner and better city.",
        step1Desc: "Snap a photo and pin the location of any civic issue. It's fast, easy, and impactful.",
        step2Desc: "Monitor progress in real-time. Upvote critical issues to ensure they get the attention they deserve.",
        step3Desc: "Verify the fix once completed. We close the loop together with the local authorities.",
        liveUpdatesSub: "Stay informed about local civic actions."
    },
    ml: {
        dashboard: "ഡാഷ്ബോർഡ്",
        profile: "എന്റെ പ്രൊഫൈൽ",
        settings: "ആപ്പ് ക്രമീകരണങ്ങൾ",
        about: "ഞങ്ങളെക്കുറിച്ച്",
        connect: "വളന്റിയറാകൂ",
        signOut: "പുറത്തുകടക്കുക",
        reportIssue: "പ്രശ്നം റിപ്പോർട്ട് ചെയ്യുക",
        trackProgress: "പുരോഗതി ട്രാക്ക് ചെയ്യുക",
        howItWorks: "ഫിക്സ് മൈ ഏരിയ എങ്ങനെ പ്രവർത്തിക്കുന്നു",
        report: "1. റിപ്പോർട്ട്",
        track: "2. ട്രാക്ക്",
        resolve: "3. പരിഹാരം",
        totalIssues: "ആകെ പരാതികൾ",
        mostReported: "കൂടുതൽ റിപ്പോർട്ട് ചെയ്തത്",
        mostCritical: "ഏറ്റവും പ്രധാനം",
        latestActivity: "അവസാനത്തെ പ്രവർത്തനം",
        latestNews: "തത്സമയ അപ്‌ഡേറ്റുകൾ",
        viewFullFeed: "ഫീഡ് കാണുക",
        allCategories: "എല്ലാ വിഭാഗങ്ങളും",
        allStatuses: "എല്ലാ അവസ്ഥകളും",
        highestPriority: "ഏറ്റവും പ്രധാനം",
        mostRecent: "ഏറ്റവും പുതിയത്",
        welcomeGuest: "സ്വാഗതം ഗസ്റ്റ്",
        signIn: "ലോഗിൻ ചെയ്യുക",
        register: "അക്കൗണ്ട് തുടങ്ങുക",
        searchPlaceholder: "തിരയുക...",
        appearance: "രൂപഭാവം",
        theme: "ആപ്പ് തീം",
        light: "ലൈറ്റ് തീം",
        dark: "ഡാർക്ക് തീം",
        localization: "ഭാഷ തിരഞ്ഞെടുക്കുക",
        language: "ഭാഷ",
        save: "സേവ് ചെയ്യുക",
        saved: "വിജയകരമായി സേവ് ചെയ്തു!",
        legendPending: "തീർച്ചപ്പെടുത്തിയിട്ടില്ല",
        legendInProgress: "പുരോഗതിയിൽ",
        legendReview: "പരിശോധനയിൽ",
        legendResolved: "പരിഹരിച്ചു",
        legendReopened: "വീണ്ടും തുറന്നു",
        locateMe: "എന്റെ ലൊക്കേഷൻ",
        resetView: "റീസെറ്റ് വ്യൂ",
        heroBadge: "✨ കോഴിക്കോട് സിവിക് ഇനിഷ്യേറ്റീവ്",
        heroTitle: "പൗരന്മാരെ ശാക്തീകരിക്കുന്നു.<br>കോഴിക്കോടിനെ മാറ്റുന്നു.",
        heroSub: "പ്രശ്നങ്ങൾ റിപ്പോർട്ട് ചെയ്യുക, പരിഹാരങ്ങൾ ട്രാക്ക് ചെയ്യുക, സുതാര്യതയിലൂടെയും പ്രവർത്തനത്തിലൂടെയും മികച്ചൊരു സമൂഹം ഒരുമിച്ച് കെട്ടിപ്പടുക്കുക.",
        howItWorksSub: "വൃത്തിയുള്ളതും മെച്ചപ്പെട്ടതുമായ നഗരത്തിലേക്കുള്ള ലളിതമായ ഘട്ടങ്ങൾ.",
        step1Desc: "ഏതെങ്കിലും സിവിക് പ്രശ്നത്തിന്റെ ഫോട്ടോ എടുത്ത് ലൊക്കേഷൻ പിൻ ചെയ്യുക. ഇത് വേഗതയുള്ളതും എളുപ്പവുമാണ്.",
        step2Desc: "തത്സമയം പുരോഗതി നിരീക്ഷിക്കുക. അവശ്യ പ്രശ്നങ്ങൾക്ക് അർഹമായ ശ്രദ്ധ ലഭിക്കുന്നുവെന്ന് ഉറപ്പാക്കാൻ അവ വോട്ട് ചെയ്യുക.",
        step3Desc: "പൂർത്തിയായ പ്രശ്നങ്ങൾ പരിഹരിച്ചുവെന്ന് പരിശോധിക്കുക. പ്രാദേശിക അധികാരികളോടൊപ്പം ഞങ്ങൾ ഇത് പൂർത്തിയാക്കുന്നു.",
        liveUpdatesSub: "പ്രാദേശിക സിവിക് പ്രവർത്തനങ്ങളെക്കുറിച്ച് അറിയുക."
    },
    hi: {
        dashboard: "डैशबोर्ड",
        profile: "मेरी प्रोफ़ाइल",
        settings: "ऐप सेटिंग्स",
        about: "हमारे बारे में",
        connect: "स्वयंसेवक बनें",
        signOut: "साइन आउट",
        reportIssue: "समस्या रिपोर्ट करें",
        trackProgress: "प्रगति ट्रैक करें",
        howItWorks: "फिक्समाईएरिया कैसे काम करता है",
        report: "1. रिपोर्ट",
        track: "2. ट्रैक",
        resolve: "3. समाधान",
        totalIssues: "कुल मुद्दे",
        mostReported: "सर्वाधिक रिपोर्ट किए गए",
        mostCritical: "सबसे गंभीर",
        latestActivity: "नवीनतम गतिविधि",
        latestNews: "लाइव अपडेट",
        viewFullFeed: "फ़ीड देखें",
        allCategories: "सभी श्रेणियां",
        allStatuses: "सभी स्थितियां",
        highestPriority: "उच्चतम प्राथमिकता",
        mostRecent: "सबसे हालिया",
        welcomeGuest: "स्वागत है अतिथि",
        signIn: "साइन इन करें",
        register: "खाता बनाएं",
        searchPlaceholder: "खोजें...",
        appearance: "दिखावट",
        theme: "ऐप थीम",
        light: "लाइट थीम",
        dark: "डार्क थीम",
        localization: "स्थानीयकरण",
        language: "भाषा वरीयता",
        save: "प्राथमिकताएं सहेजें",
        saved: "प्राथमिकताएं सफलतापूर्वक सहेजी गईं!",
        legendPending: "लंबित",
        legendInProgress: "प्रगति में",
        legendReview: "समीक्षा आवश्यक",
        legendResolved: "सुलझाया गया",
        legendReopened: "फिर से खोला",
        locateMe: "मेरी स्थिति",
        resetView: "व्यू रिसेट करें",
        heroBadge: "✨ कोझिकोड नागरिक पहल",
        heroTitle: "नागरिकों को सशक्त बनाना।<br>कोझिकोड को बदलना।",
        heroSub: "समस्याओं की रिपोर्ट करें, समाधान ट्रैक करें और पारदर्शिता और कार्रवाई के माध्यम से मिलकर एक बेहतर समुदाय बनाएं।",
        howItWorksSub: "एक स्वच्छ और बेहतर शहर की दिशा में सरल कदम।",
        step1Desc: "किसी भी नागरिक समस्या का फोटो लें और स्थान पिन करें। यह तेज़ और आसान है।",
        step2Desc: "वास्तविक समय में प्रगति की निगरानी करें। महत्वपूर्ण मुद्दों को अपवोट करें।",
        step3Desc: "समाधान सत्यापित करें। हम स्थानीय अधिकारियों के साथ मिलकर काम करते हैं।",
        liveUpdatesSub: "स्थानीय नागरिक कार्यों के बारे में जानकारी रखें।"
    }
};

function applyLanguage(lang) {
    const t = translations[lang] || translations.en;
    
    // Standard translations
    document.querySelectorAll("[data-i18n]").forEach(el => {
        const key = el.getAttribute("data-i18n");
        if (t[key]) {
            if (el.tagName === "INPUT" && el.type === "search") {
                el.placeholder = t[key];
            } else if (t[key].includes("<br>")) {
                el.innerHTML = t[key];
            } else {
                el.innerText = t[key];
            }
        }
    });

    // Title translations
    document.querySelectorAll("[data-i18n-title]").forEach(el => {
        const key = el.getAttribute("data-i18n-title");
        if (t[key]) {
            el.title = t[key];
        }
    });
}

function applyTheme(theme) {
    if (theme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
    } else {
        document.documentElement.removeAttribute('data-theme');
    }
}

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
        else {
            setTimeout(() => leafletMap.invalidateSize(), 100);
        }
    }

    // Lang already applied via common.js if needed, but we keep it here for specific content
    const currentLang = localStorage.getItem("fixmyarea_lang") || "en";
    applyLanguage(currentLang);

    // Add support for multi-tab synchronization
    window.addEventListener('storage', (e) => {
        if (e.key === 'fixmyarea_issues') {
            const localIssues = localStorage.getItem("fixmyarea_issues");
            if (localIssues) {
                dbIssues = JSON.parse(localIssues);
                renderIssues();
            }
        }
        if (e.key === 'fixmyarea_user') {
            if (!e.newValue) {
                logout();
            } else {
                location.reload();
            }
        }
        if (e.key === 'fixmyarea_theme') {
            applyTheme(e.newValue);
            // Update settings UI if on settings page
            const themeSelect = document.getElementById('themeSelect');
            if (themeSelect) themeSelect.value = e.newValue;
        }
        if (e.key === 'fixmyarea_lang') {
            applyLanguage(e.newValue);
            // Update settings UI if on settings page
            const langSelect = document.getElementById('langSelect');
            if (langSelect) langSelect.value = e.newValue;
        }
    });
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
    if (typeof window.logout === 'function') window.logout();
    else {
        localStorage.removeItem("fixmyarea_user");
        location.reload();
    }
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

            // Get user info for report
            const userData = JSON.parse(localStorage.getItem("fixmyarea_user") || "{}");

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
                reporterName: userData.name || "Anonymous",
                reporterWard: userData.ward || "Unknown Ward",
                lat, lng
            };
            
            dbIssues.push(newIssue);
            saveIssuesLocally();
            renderIssues();

            // Handle redirection if we are in report.html
            if (window.location.href.includes('report.html')) {
                alert("Issue Submitted Successfully!");
                window.location.href = 'index.html';
            } else {
                hideModal("reportModal");
                e.target.reset();
                submitBtn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Upload & Submit Report';
                submitBtn.disabled = false;
            }
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

function locateMe() {
    if (!leafletMap) return;
    leafletMap.locate({setView: true, maxZoom: 16});
}

function resetMapView() {
    if (!leafletMap) return;
    leafletMap.setView([11.2588, 75.7804], 14);
}

function updateMap(filteredList) {
    if (!leafletMap) return;
    
    // Clear existing markers
    currentMarkers.forEach(m => leafletMap.removeLayer(m));
    currentMarkers = [];

    const now = new Date();

    filteredList.forEach(issue => {
        if (issue.lat && issue.lng) {
            let color = "#F59E0B"; // Pending
            if (issue.status === "In Progress") color = "#3B82F6";
            if (issue.status === "Review") color = "#8B5CF6";
            if (issue.status === "Resolved") color = "#10B981";
            if (issue.status === "Reopened") color = "#EF4444";

            // Determine if it's a "new" issue (reported in the last 5 minutes)
            const reportedTime = new Date(issue.timestamp);
            const isVeryRecent = (now - reportedTime) < 5 * 60 * 1000;

            const markerHtml = `
                <div class="custom-marker-wrapper ${isVeryRecent ? 'pulse-new' : ''}">
                    <div style="background-color: ${color}; width: 18px; height: 18px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 10px rgba(0,0,0,0.3);"></div>
                </div>
            `;
            
            const icon = L.divIcon({ 
                html: markerHtml, 
                className: 'custom-leaflet-marker', 
                iconSize: [24, 24], 
                iconAnchor: [12, 12] 
            });

            const marker = L.marker([issue.lat, issue.lng], { icon }).addTo(leafletMap);
            
            // Add tooltip for quick info
            marker.bindTooltip(`<strong>${issue.category}</strong><br>${issue.location}`, {
                direction: 'top',
                offset: [0, -10]
            });

            marker.on('click', () => openDetails(issue.id));
            currentMarkers.push(marker);
            
            // If it's very recent and we just loaded/updated, maybe fly to it?
            // (Only for the most recent one to avoid multiple flies)
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
