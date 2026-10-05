const API_URL = "https://elegia-forum.onrender.com";

const ALLOWED_IMAGE_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif"
];
const ACCEPT_IMAGES = "image/jpeg,image/png,image/webp,image/gif";

// ===== DOM =====
const modalOverlay = document.getElementById("authModal");
const postModal = document.getElementById("postModal");
const profileModal = document.getElementById("profileModal");
const confirmModal = document.getElementById("confirmModal");
const loginBtn = document.getElementById("loginBtn");
const registerBtn = document.getElementById("registerBtn");
const closeModalBtn = document.getElementById("closeModal");
const closePostModalBtn = document.getElementById("closePostModal");
const closeProfileModalBtn = document.getElementById("closeProfileModal");
const modalTitle = document.getElementById("modalTitle");
const modalSubmitBtn = document.getElementById("modalSubmitBtn");
const switchText = document.getElementById("switchText");
const switchLink = document.getElementById("switchLink");
const usernameGroup = document.getElementById("usernameGroup");
const authButtons = document.getElementById("authButtons");
const userInfo = document.getElementById("userInfo");
const currentUserSpan = document.getElementById("currentUser");
const currentUserBtn = document.getElementById("currentUserBtn");
const userDropdown = document.getElementById("userDropdown");
const logoutBtn = document.getElementById("logoutBtn");
const profileBtn = document.getElementById("profileBtn");
const createPostBtn = document.getElementById("createPostBtn");
const postsContainer = document.getElementById("postsContainer");
const loadingPosts = document.getElementById("loadingPosts");
const toastContainer = document.getElementById("toastContainer");
const postForm = document.getElementById("postForm");
const postModalTitle = document.getElementById("postModalTitle");
const postSubmitBtn = document.getElementById("postSubmitBtn");
const headerRight = document.querySelector(".header-right");
const profileLogoutBtn = document.getElementById("profileLogoutBtn");
const profileMenuBtn = document.getElementById("profileMenuBtn");
const profileEditPanel = document.getElementById("profileEditPanel");
const closeEditPanel = document.getElementById("closeEditPanel");
const lightbox = document.getElementById("lightbox");
const lightboxImg = document.getElementById("lightboxImg");
const lightboxClose = document.getElementById("lightboxClose");

const postImageFile = document.getElementById("postImageFile");
const postPickBtn = document.getElementById("postPickBtn");
const postPreview = document.getElementById("postPreview");
const postPreviewImg = document.getElementById("postPreviewImg");
const postRemoveBtn = document.getElementById("postRemoveBtn");

let isLoginMode = true;
let editingPostId = null;
let postsCache = {};
let allPostsList = [];
let confirmCallback = null;
let searchTimer = null;

// ===== Toast =====
function showToast(message) {
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(() => {
        toast.classList.add("hide");
        setTimeout(() => toast.remove(), 250);
    }, 3000);
}

// ===== Confirm =====
function showConfirm(title, text, onConfirm) {
    document.getElementById("confirmTitle").textContent = title;
    document.getElementById("confirmText").textContent = text;
    confirmCallback = onConfirm;
    confirmModal.classList.add("active");
}

document.getElementById("confirmCancel").addEventListener("click", () => {
    confirmModal.classList.remove("active");
    confirmCallback = null;
});

document.getElementById("confirmOk").addEventListener("click", () => {
    confirmModal.classList.remove("active");
    if (confirmCallback) confirmCallback();
    confirmCallback = null;
});

confirmModal.addEventListener("click", (e) => {
    if (e.target === confirmModal) {
        confirmModal.classList.remove("active");
        confirmCallback = null;
    }
});

// ===== Helpers =====
function getCurrentUser() {
    return JSON.parse(localStorage.getItem("user") || "null");
}

function isLoggedIn() {
    return !!localStorage.getItem("token");
}

function requireAuth() {
    if (!isLoggedIn()) {
        openModal(true);
        showToast("Please log in to continue");
        return false;
    }
    return true;
}

function escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateStr) {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    if (diff < 60) return "just now";
    if (diff < 3600) return Math.floor(diff / 60) + " min ago";
    if (diff < 86400) return Math.floor(diff / 3600) + "h ago";
    return date.toLocaleDateString("en-US");
}

function shortName(name, max = 15) {
    const s = String(name || "");
    if (s.length <= max) return s;
    return s.slice(0, max) + "…";
}

function isAllowedImage(file) {
    return file && ALLOWED_IMAGE_TYPES.includes(file.type);
}

function avatarUrl(path) {
    if (!path) return null;
    if (path.startsWith("http")) return path;
    return API_URL + path;
}

function mediaUrl(path) {
    if (!path) return null;
    if (path.startsWith("http")) return path;
    return API_URL + path;
}

function renderAvatarHtml(avatarPath, label, extraClass) {
    const letter = String(label || "?")
        .charAt(0)
        .toUpperCase();
    const url = avatarUrl(avatarPath);
    if (url) {
        return `<div class="${extraClass}" style="background-image:url('${escapeHtml(url)}');background-size:cover;background-position:center;background-color:transparent;"></div>`;
    }
    return `<div class="${extraClass}">${letter}</div>`;
}

function doLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    closeProfileModal();
    updateAuthUI();
    loadPosts();
    showToast("Logged out");
}

function createLikeSvg() {
    return `<svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`;
}

function createPlusSvg() {
    return `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>`;
}

function createSendSvg() {
    return `<svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>`;
}

function createSaveSvg() {
    return `<svg viewBox="0 0 24 24"><path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/></svg>`;
}

// ===== Lightbox =====
function openLightbox(src) {
    if (!src || !lightbox || !lightboxImg) return;
    lightboxImg.src = src;
    lightbox.classList.add("open");
    lightbox.setAttribute("aria-hidden", "false");
}

function closeLightbox() {
    if (!lightbox) return;
    lightbox.classList.remove("open");
    lightbox.setAttribute("aria-hidden", "true");
    if (lightboxImg) lightboxImg.src = "";
}

lightboxClose?.addEventListener("click", closeLightbox);
lightbox?.addEventListener("click", (e) => {
    if (e.target === lightbox) closeLightbox();
});
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        closeLightbox();
        hideEditPanel();
    }
});

// ===== Post image preview =====
function clearPostPreview() {
    if (postImageFile) postImageFile.value = "";
    if (postPreview) postPreview.style.display = "none";
    if (postPreviewImg) postPreviewImg.src = "";
}

if (postPickBtn) {
    postPickBtn.addEventListener("click", () => postImageFile?.click());
}

if (postImageFile) {
    postImageFile.addEventListener("change", () => {
        const file = postImageFile.files[0];
        if (!file) {
            clearPostPreview();
            return;
        }
        if (!isAllowedImage(file)) {
            showToast("Only JPG, PNG, WEBP or GIF allowed");
            clearPostPreview();
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            showToast("File is larger than 5 MB");
            clearPostPreview();
            return;
        }
        postPreviewImg.src = URL.createObjectURL(file);
        postPreview.style.display = "block";
    });
}

if (postRemoveBtn) {
    postRemoveBtn.addEventListener("click", clearPostPreview);
}

// ===== API =====
async function apiRequest(
    url,
    method = "GET",
    data = null,
    requiresAuth = false
) {
    const headers = {};

    if (!(data instanceof FormData)) {
        headers["Content-Type"] = "application/json";
    }

    if (requiresAuth || localStorage.getItem("token")) {
        const token = localStorage.getItem("token");
        if (token) headers["Authorization"] = `Bearer ${token}`;
    }

    const options = { method, headers };
    if (data) {
        options.body = data instanceof FormData ? data : JSON.stringify(data);
    }

    let response;
    try {
        response = await fetch(`${API_URL}${url}`, options);
    } catch {
        throw new Error("No internet connection");
    }

    let result;
    try {
        result = await response.json();
    } catch {
        throw new Error("No internet connection");
    }

    if (!response.ok) {
        throw new Error(result.error || result.message || "Request failed");
    }
    return result;
}

// ===== Auth modal =====
function openModal(loginMode = true) {
    isLoginMode = loginMode;
    updateModalMode();
    modalOverlay.classList.add("active");
}

function closeModal() {
    modalOverlay.classList.remove("active");
    document.getElementById("authForm").reset();
    document.getElementById("username").value = "";
    document.getElementById("email").value = "";
    document.getElementById("password").value = "";
}

function updateModalMode() {
    if (isLoginMode) {
        modalTitle.textContent = "Log in";
        modalSubmitBtn.textContent = "Log in";
        switchText.textContent = "Don't have an account?";
        switchLink.textContent = "Sign up";
        usernameGroup.style.display = "none";
    } else {
        modalTitle.textContent = "Sign up";
        modalSubmitBtn.textContent = "Sign up";
        switchText.textContent = "Already have an account?";
        switchLink.textContent = "Log in";
        usernameGroup.style.display = "block";
    }
}

loginBtn?.addEventListener("click", () => openModal(true));
registerBtn?.addEventListener("click", () => openModal(false));
closeModalBtn.addEventListener("click", closeModal);
modalOverlay.addEventListener("click", (e) => {
    if (e.target === modalOverlay) closeModal();
});
switchLink.addEventListener("click", (e) => {
    e.preventDefault();
    isLoginMode = !isLoginMode;
    updateModalMode();
});

currentUserBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    userDropdown.classList.toggle("open");
});
document.addEventListener("click", () => {
    userDropdown?.classList.remove("open");
});

document.getElementById("authForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const username = document.getElementById("username").value.trim();

    if (!isLoginMode && !username) {
        showToast("Enter a username");
        return;
    }
    if (!email) {
        showToast("Enter your email");
        return;
    }
    if (!email.includes("@") || !email.includes(".")) {
        showToast("Enter a valid email");
        return;
    }
    if (!password) {
        showToast("Enter your password");
        return;
    }
    if (password.length < 6) {
        showToast("Password must be at least 6 characters");
        return;
    }

    try {
        let data;
        if (isLoginMode) {
            data = await apiRequest("/login", "POST", { email, password });
        } else {
            data = await apiRequest("/register", "POST", {
                email,
                username,
                password
            });
        }

        if (data.token) localStorage.setItem("token", data.token);

        if (data.user) {
            localStorage.setItem("user", JSON.stringify(data.user));
        } else if (data.username || data.email) {
            localStorage.setItem("user", JSON.stringify(data));
        }

        try {
            if (localStorage.getItem("token")) {
                const profile = await apiRequest("/profile", "GET", null, true);
                const localUser = getCurrentUser() || {};
                localStorage.setItem(
                    "user",
                    JSON.stringify({
                        ...localUser,
                        id: profile.id || localUser.id,
                        username: profile.username || localUser.username,
                        email: profile.email || localUser.email,
                        avatar_url: profile.avatar_url
                    })
                );
            }
        } catch {}

        showToast(isLoginMode ? "Logged in successfully" : "Account created");
        closeModal();
        updateAuthUI();
        loadPosts();
    } catch (err) {
        showToast(err.message);
    }
});

function bindLogout(el) {
    if (!el) return;
    el.addEventListener("click", doLogout);
}
bindLogout(logoutBtn);
bindLogout(profileLogoutBtn);

// ===== Auth UI =====
function applyAvatarEl(el, avatarPath, username) {
    if (!el) return;
    const url = avatarUrl(avatarPath);
    if (url) {
        el.style.backgroundImage = `url(${url})`;
        el.style.backgroundColor = "transparent";
        el.textContent = "";
    } else {
        el.style.backgroundImage = "none";
        el.style.backgroundColor = "#8e8e93";
        el.textContent = String(username || "?")
            .charAt(0)
            .toUpperCase();
    }
}

function setHeaderAvatar(avatarPath, username) {
    applyAvatarEl(
        document.getElementById("headerAvatar"),
        avatarPath,
        username
    );
    applyAvatarEl(
        document.getElementById("mobileNavAvatar"),
        avatarPath,
        username
    );
}

function updateAuthUI() {
    const user = getCurrentUser();
    if (isLoggedIn() && user) {
        authButtons.style.display = "none";
        userInfo.style.display = "block";
        if (createPostBtn) createPostBtn.style.display = "inline-flex";
        const full = user.username || user.email || "User";
        currentUserSpan.textContent = shortName(full);
        currentUserSpan.title = full;
        setHeaderAvatar(user.avatar_url, full);
        if (headerRight) headerRight.style.display = "flex";
    } else {
        authButtons.style.display = "flex";
        userInfo.style.display = "none";
        if (createPostBtn) createPostBtn.style.display = "none";
        applyAvatarEl(document.getElementById("mobileNavAvatar"), null, "?");
        if (headerRight) headerRight.style.display = "flex";
    }
}

window.addEventListener("resize", () => updateAuthUI());

document.getElementById("logoLink")?.addEventListener("click", (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
});

// ===== Post modal =====
function openPostModal(editPost = null) {
    if (!requireAuth()) return;

    editingPostId = editPost ? editPost.id : null;
    postModalTitle.textContent = editPost ? "Edit post" : "Create post";
    postSubmitBtn.textContent = editPost ? "Save" : "Post";

    document.getElementById("postTitle").value = editPost ? editPost.title : "";
    document.getElementById("postBody").value = editPost
        ? editPost.body || ""
        : "";
    clearPostPreview();

    if (editPost && editPost.image_url) {
        const url = mediaUrl(editPost.image_url);
        if (url && postPreviewImg && postPreview) {
            postPreviewImg.src = url;
            postPreview.style.display = "block";
        }
    }

    postModal.classList.add("active");
}

function closePostModal() {
    postModal.classList.remove("active");
    postForm.reset();
    clearPostPreview();
    editingPostId = null;
}

if (createPostBtn) {
    createPostBtn.addEventListener("click", () => openPostModal());
}
closePostModalBtn.addEventListener("click", closePostModal);
postModal.addEventListener("click", (e) => {
    if (e.target === postModal) closePostModal();
});

postForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!requireAuth()) return;

    const title = document.getElementById("postTitle").value.trim();
    const body = document.getElementById("postBody").value.trim();
    const imageFile = postImageFile ? postImageFile.files[0] : null;
    const previewVisible = postPreview && postPreview.style.display !== "none";

    if (!title) {
        showToast("Title is required");
        return;
    }
    if (!body) {
        showToast("Text is required");
        return;
    }
    if (imageFile && !isAllowedImage(imageFile)) {
        showToast("Only JPG, PNG, WEBP or GIF allowed");
        return;
    }
    if (imageFile && imageFile.size > 5 * 1024 * 1024) {
        showToast("File is larger than 5 MB");
        return;
    }

    const formData = new FormData();
    formData.append("title", title);
    formData.append("body", body);

    if (imageFile) {
        formData.append("image", imageFile);
    } else if (editingPostId && !previewVisible) {
        formData.append("image_url", "");
    }

    try {
        if (editingPostId) {
            await apiRequest(
                `/posts/${editingPostId}`,
                "PATCH",
                formData,
                true
            );
            showToast("Post updated");
        } else {
            await apiRequest("/posts", "POST", formData, true);
            showToast("Post published");
        }
        closePostModal();
        loadPosts();
    } catch (err) {
        showToast(err.message);
    }
});

function deletePost(postId) {
    if (!requireAuth()) return;

    showConfirm("Delete post?", "This action cannot be undone.", async () => {
        try {
            await apiRequest(`/posts/${postId}`, "DELETE", null, true);
            showToast("Post deleted");
            loadPosts();
        } catch (err) {
            showToast(err.message);
        }
    });
}

// ===== Profile =====
function setProfileAvatar(avatarPath, username) {
    applyAvatarEl(
        document.getElementById("profileAvatar"),
        avatarPath,
        username
    );
}

function hideEditPanel() {
    if (profileEditPanel) profileEditPanel.style.display = "none";
}

function setOwnProfileChrome(visible) {
    const v = visible ? "inline-flex" : "none";
    if (profileLogoutBtn) profileLogoutBtn.style.display = v;
    if (profileMenuBtn) profileMenuBtn.style.display = v;
    const del = document.getElementById("deleteAvatarBtn");
    if (!visible && del) del.style.display = "none";
}

function openOwnProfile() {
    if (!requireAuth()) return;
    hideEditPanel();
    loadOwnProfile();
    profileModal.classList.add("active");
}

async function openUserProfile(username) {
    if (!username) return;

    const me = getCurrentUser();
    if (me && me.username === username) {
        openOwnProfile();
        return;
    }

    hideEditPanel();
    setOwnProfileChrome(false);

    try {
        const user = await apiRequest(`/users/${encodeURIComponent(username)}`);

        document.getElementById("profileUsernameStatic").style.display =
            "block";
        document.getElementById("profileUsernameStatic").textContent =
            user.username;
        document.getElementById("profileUsernameStatic").title =
            user.username || "";
        document.getElementById("avatarActions").style.display = "none";
        document.getElementById("profileEmail").style.display = "none";
        document.getElementById("profileOwnContent").style.display = "none";
        // Always "Profile" — never other user's nick in topbar
        document.getElementById("profileTopTitle").textContent = "Profile";

        setProfileAvatar(user.avatar_url, user.username);
        document.getElementById("profileCreated").textContent =
            user.created_at || "—";
        document.getElementById("profilePostLikes").textContent =
            user.total_post_likes || 0;
        document.getElementById("profileCommentLikes").textContent =
            user.total_comment_likes || 0;

        profileModal.classList.add("active");
    } catch (err) {
        showToast(err.message);
    }
}

async function loadOwnProfile() {
    try {
        const user = await apiRequest("/profile", "GET", null, true);

        setOwnProfileChrome(true);

        document.getElementById("profileUsernameStatic").style.display =
            "block";
        document.getElementById("profileUsernameStatic").textContent =
            user.username || "";
        document.getElementById("profileUsernameStatic").title =
            user.username || "";
        document.getElementById("profileUsername").value = user.username || "";
        document.getElementById("avatarActions").style.display = "flex";
        document.getElementById("profileEmail").style.display = "block";
        document.getElementById("profileOwnContent").style.display = "block";
        document.getElementById("profileTopTitle").textContent = "Profile";

        document.getElementById("profileEmail").textContent = user.email || "";
        document.getElementById("profileCreated").textContent =
            user.created_at || "—";
        document.getElementById("profilePostLikes").textContent =
            user.total_post_likes || 0;
        document.getElementById("profileCommentLikes").textContent =
            user.total_comment_likes || 0;

        setProfileAvatar(user.avatar_url, user.username);

        const deleteBtn = document.getElementById("deleteAvatarBtn");
        deleteBtn.style.display = user.avatar_url ? "inline-flex" : "none";

        const localUser = getCurrentUser() || {};
        localStorage.setItem(
            "user",
            JSON.stringify({
                ...localUser,
                id: user.id || localUser.id,
                username: user.username,
                email: user.email,
                avatar_url: user.avatar_url
            })
        );
        updateAuthUI();

        loadLikedPosts();
        loadReceivedLikes();
    } catch (err) {
        showToast(err.message);
    }
}

function closeProfileModal() {
    profileModal.classList.remove("active");
    hideEditPanel();
}

profileBtn?.addEventListener("click", () => {
    userDropdown?.classList.remove("open");
    openOwnProfile();
});

closeProfileModalBtn.addEventListener("click", closeProfileModal);
profileModal.addEventListener("click", (e) => {
    if (e.target === profileModal) closeProfileModal();
});

profileMenuBtn?.addEventListener("click", () => {
    if (!profileEditPanel) return;
    const open = profileEditPanel.style.display === "block";
    profileEditPanel.style.display = open ? "none" : "block";
});

closeEditPanel?.addEventListener("click", hideEditPanel);

document
    .getElementById("saveUsernameBtn")
    .addEventListener("click", async () => {
        const username = document
            .getElementById("profileUsername")
            .value.trim();
        if (!username) {
            showToast("Username cannot be empty");
            return;
        }

        try {
            const user = await apiRequest(
                "/username",
                "PATCH",
                { username },
                true
            );
            showToast("Username updated");

            const localUser = getCurrentUser() || {};
            localStorage.setItem(
                "user",
                JSON.stringify({ ...localUser, username: user.username })
            );
            updateAuthUI();
            setProfileAvatar(user.avatar_url, user.username);
            document.getElementById("profileUsernameStatic").textContent =
                user.username;
            document.getElementById("profileUsernameStatic").title =
                user.username;
            hideEditPanel();
            loadPosts();
        } catch (err) {
            showToast(err.message);
        }
    });

document.getElementById("changeAvatarBtn").addEventListener("click", () => {
    document.getElementById("avatarInput").click();
});

document.getElementById("avatarInput").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!isAllowedImage(file)) {
        showToast("Only JPG, PNG, WEBP or GIF allowed");
        e.target.value = "";
        return;
    }

    if (file.size > 3 * 1024 * 1024) {
        showToast("File is larger than 3 MB");
        e.target.value = "";
        return;
    }

    const formData = new FormData();
    formData.append("avatar", file);

    try {
        const user = await apiRequest("/avatar", "POST", formData, true);
        showToast("Avatar updated");
        setProfileAvatar(user.avatar_url, user.username);
        document.getElementById("deleteAvatarBtn").style.display =
            "inline-flex";

        const localUser = getCurrentUser() || {};
        localStorage.setItem(
            "user",
            JSON.stringify({ ...localUser, avatar_url: user.avatar_url })
        );
        updateAuthUI();
        loadPosts();
    } catch (err) {
        showToast(err.message);
    }

    e.target.value = "";
});

document
    .getElementById("deleteAvatarBtn")
    .addEventListener("click", async () => {
        try {
            const user = await apiRequest("/avatar", "DELETE", null, true);
            showToast("Avatar removed");
            setProfileAvatar(null, user.username);
            document.getElementById("deleteAvatarBtn").style.display = "none";

            const localUser = getCurrentUser() || {};
            localStorage.setItem(
                "user",
                JSON.stringify({ ...localUser, avatar_url: null })
            );
            updateAuthUI();
            loadPosts();
        } catch (err) {
            showToast(err.message);
        }
    });

document.querySelectorAll(".profile-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
        document
            .querySelectorAll(".profile-tab")
            .forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");

        const name = tab.dataset.tab;
        document.getElementById("tabLiked").style.display =
            name === "liked" ? "block" : "none";
        document.getElementById("tabReceived").style.display =
            name === "received" ? "block" : "none";
    });
});

async function loadLikedPosts() {
    const list = document.getElementById("likedPostsList");
    list.innerHTML = `<p class="profile-empty">Loading...</p>`;

    try {
        const posts = await apiRequest("/liked-posts", "GET", null, true);

        if (!posts.length) {
            list.innerHTML = `<p class="profile-empty">You haven't upvoted anything yet</p>`;
            return;
        }

        list.innerHTML = "";
        posts.forEach((post) => {
            const item = document.createElement("div");
            item.className = "profile-list-item";
            item.innerHTML = `
                <div class="profile-list-item-title">${escapeHtml(post.title)}</div>
                <div class="profile-list-item-meta">${formatDate(post.created_at)} · ${post.likes_count || 0} likes</div>
            `;
            item.addEventListener("click", () => {
                closeProfileModal();
                scrollToPost(post.id);
            });
            list.appendChild(item);
        });
    } catch {
        list.innerHTML = `<p class="profile-empty">Failed to load</p>`;
    }
}

async function loadReceivedLikes() {
    const list = document.getElementById("receivedLikesList");
    list.innerHTML = `<p class="profile-empty">Loading...</p>`;

    try {
        const items = await apiRequest("/received-likes", "GET", null, true);

        if (!items.length) {
            list.innerHTML = `<p class="profile-empty">No one has upvoted your posts yet</p>`;
            return;
        }

        list.innerHTML = "";
        items.forEach((row) => {
            const item = document.createElement("div");
            item.className = "profile-list-item";
            item.innerHTML = `
                <div class="profile-list-item-title">${escapeHtml(row.post_title)}</div>
                <div class="profile-list-item-meta">
                    ${escapeHtml(row.liker_username)} · ${formatDate(row.liked_at)}
                </div>
            `;
            item.addEventListener("click", () => {
                closeProfileModal();
                scrollToPost(row.post_id);
            });
            list.appendChild(item);
        });
    } catch {
        list.innerHTML = `<p class="profile-empty">Failed to load</p>`;
    }
}

function scrollToPost(postId) {
    const el = document.querySelector(`.post[data-id="${postId}"]`);
    if (!el) {
        showToast("Post not found on this page");
        return;
    }
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.remove("highlight");
    void el.offsetWidth;
    el.classList.add("highlight");
}

// ===== Comments =====
async function loadComments(postId, container) {
    try {
        const comments = await apiRequest(`/comments/${postId}`);
        comments.sort(
            (a, b) => new Date(a.created_at) - new Date(b.created_at)
        );
        renderComments(comments, container, postId);
    } catch {
        container.innerHTML = `<p style="color:#555;font-size:13px;">Failed to load comments</p>`;
    }
}

function renderComments(comments, container, postId) {
    const user = getCurrentUser();
    const topLevel = comments.filter((c) => !c.parent_id);
    const repliesMap = {};

    comments.forEach((c) => {
        if (c.parent_id) {
            if (!repliesMap[c.parent_id]) repliesMap[c.parent_id] = [];
            repliesMap[c.parent_id].push(c);
        }
    });

    const totalComments = comments.length;
    const postEl = container.closest(".post");
    if (postEl) {
        const countSpan = postEl.querySelector(".comments-count");
        if (countSpan) {
            countSpan.textContent = totalComments > 0 ? totalComments : "";
        }
    }

    container.innerHTML = "";

    const toolbar = document.createElement("div");
    toolbar.className = "comments-toolbar";
    toolbar.innerHTML = `
        <span style="font-size:13px;font-weight:600;color:#111;">Comments</span>
        <button type="button" class="action-btn" data-action="close-comments" data-post="${postId}">✕ Close</button>
    `;
    container.appendChild(toolbar);

    if (topLevel.length === 0) {
        const empty = document.createElement("p");
        empty.style.cssText = "color:#555;font-size:13px;margin-bottom:12px;";
        empty.textContent = "No comments yet";
        container.appendChild(empty);
    } else {
        topLevel.forEach((comment) => {
            container.appendChild(
                createCommentElement(comment, repliesMap, postId, user)
            );
        });
    }

    const form = document.createElement("div");
    form.className = "comment-form";
    form.innerHTML = `
        <div class="comment-composer">
            <input type="file" id="newCommentFile-${postId}" accept="${ACCEPT_IMAGES}" hidden />
            <button type="button" class="comment-composer-plus" data-action="pick-comment-file" data-post="${postId}" title="Add photo">
                ${createPlusSvg()}
            </button>
            <textarea placeholder="Add a comment..." id="newComment-${postId}" rows="2"></textarea>
            <button type="button" class="comment-send-btn" data-action="submit-comment" data-post="${postId}" title="Send">
                ${createSendSvg()}
            </button>
        </div>
        <div class="upload-preview" id="commentPreview-${postId}" style="display:none">
            <img id="commentPreviewImg-${postId}" alt="" />
            <button type="button" class="upload-remove" data-action="clear-comment-file" data-post="${postId}">&times;</button>
        </div>
    `;
    container.appendChild(form);
}

function createCommentElement(comment, repliesMap, postId, user) {
    const div = document.createElement("div");
    div.className = "comment";
    div.dataset.id = comment.id;

    const isOwner = user && Number(user.id) === Number(comment.author_name);
    const authorId = comment.author_name;
    const authorLabel =
        comment.author_username || comment.author_name || "Anonymous";
    const authorShort = shortName(authorLabel);
    const replies = repliesMap[comment.id] || [];
    const likesCount = comment.likes_count || 0;
    const isLiked = comment.is_liked === true;
    const avatarHtml = renderAvatarHtml(
        comment.author_avatar,
        authorLabel,
        "comment-avatar"
    );
    const imgSrc = mediaUrl(comment.image_url);

    div.innerHTML = `
        <div class="comment-header">
            ${avatarHtml}
            <span class="comment-author" data-action="open-profile" data-username="${escapeHtml(String(authorLabel))}" data-author-id="${authorId}" title="${escapeHtml(String(authorLabel))}">${escapeHtml(authorShort)}</span>
            <span>· ${formatDate(comment.created_at)}</span>
        </div>
        <div class="comment-text" id="comment-text-${comment.id}">${escapeHtml(comment.comment_text)}</div>
        ${imgSrc ? `<div class="comment-image"><img src="${escapeHtml(imgSrc)}" alt="" data-lightbox="1" onerror="this.parentElement.style.display='none'" /></div>` : ""}
        
                <div class="comment-edit-form" id="edit-form-${comment.id}">
            <div class="comment-composer">
                <input type="file" accept="${ACCEPT_IMAGES}" class="edit-comment-file" hidden />
                <button type="button" class="comment-composer-plus" data-action="pick-edit-comment-file" data-id="${comment.id}" title="Photo">
                    ${createPlusSvg()}
                </button>
                <textarea rows="2">${escapeHtml(comment.comment_text)}</textarea>
                <button type="button" class="comment-save-btn" data-action="save-edit" data-id="${comment.id}" data-post="${postId}" title="Save">
                    ${createSaveSvg()}
                </button>
            </div>
            <div class="upload-preview edit-comment-preview" style="display:${comment.image_url ? "block" : "none"}">
                <img class="edit-comment-preview-img" src="${comment.image_url ? escapeHtml(mediaUrl(comment.image_url)) : ""}" alt="" />
                <button type="button" class="upload-remove" data-action="clear-edit-comment-file" data-id="${comment.id}">&times;</button>
            </div>
        </div>

        <div class="comment-bottom-row">
            <div class="comment-actions">
                <button class="comment-like-btn ${isLiked ? "liked" : ""}" data-action="like-comment" data-id="${comment.id}">
                    ${createLikeSvg()}
                    <span class="likes-count">${likesCount > 0 ? likesCount : ""}</span>
                </button>
                <button data-action="reply" data-id="${comment.id}">Reply</button>
                ${
                    isOwner
                        ? `
                    <button data-action="edit-comment" data-id="${comment.id}">Edit</button>
                    <button data-action="delete-comment" data-id="${comment.id}">Delete</button>
                `
                        : ""
                }
            </div>
            <div class="comment-edit-actions">
                <button class="btn btn-sm btn-login" data-action="cancel-edit" data-id="${comment.id}">Cancel</button>
            </div>
        </div>
        <div class="reply-form" id="reply-form-${comment.id}">
            <div class="comment-composer">
                <input type="file" accept="${ACCEPT_IMAGES}" class="reply-file" hidden />
                <button type="button" class="comment-composer-plus" data-action="pick-reply-file" data-id="${comment.id}" title="Add photo">
                    ${createPlusSvg()}
                </button>
                <textarea placeholder="Your reply..." rows="2"></textarea>
                <button type="button" class="comment-send-btn" data-action="submit-reply" data-id="${comment.id}" data-post="${postId}" title="Send">
                    ${createSendSvg()}
                </button>
            </div>
            <div class="upload-preview reply-preview" style="display:none">
                <img class="reply-preview-img" alt="" />
                <button type="button" class="upload-remove" data-action="clear-reply-file" data-id="${comment.id}">&times;</button>
            </div>
            <div style="margin-top:6px;">
                <button class="btn btn-sm btn-login" data-action="cancel-reply" data-id="${comment.id}">Cancel</button>
            </div>
        </div>
        <div class="replies" id="replies-${comment.id}"></div>
    `;

    const repliesContainer = div.querySelector(`#replies-${comment.id}`);
    replies.forEach((r) => {
        repliesContainer.appendChild(
            createCommentElement(r, repliesMap, postId, user)
        );
    });

    return div;
}

// ===== File change =====
postsContainer.addEventListener("change", (e) => {
    const input = e.target;
    if (!(input instanceof HTMLInputElement) || input.type !== "file") return;

    const file = input.files?.[0];
    if (!file) return;

    if (!isAllowedImage(file)) {
        showToast("Only JPG, PNG, WEBP or GIF allowed");
        input.value = "";
        return;
    }
    if (file.size > 3 * 1024 * 1024) {
        showToast("File is larger than 3 MB");
        input.value = "";
        return;
    }

    const url = URL.createObjectURL(file);

    if (input.id && input.id.startsWith("newCommentFile-")) {
        const postId = input.id.replace("newCommentFile-", "");
        const preview = document.getElementById(`commentPreview-${postId}`);
        const img = document.getElementById(`commentPreviewImg-${postId}`);
        if (img) img.src = url;
        if (preview) preview.style.display = "block";
        return;
    }

    if (input.classList.contains("edit-comment-file")) {
        const form = input.closest(".comment-edit-form");
        const preview = form?.querySelector(".edit-comment-preview");
        const img = form?.querySelector(".edit-comment-preview-img");
        input.dataset.removed = "0";
        if (img) img.src = url;
        if (preview) preview.style.display = "block";
        return;
    }

    if (input.classList.contains("reply-file")) {
        const form = input.closest(".reply-form");
        const preview = form?.querySelector(".reply-preview");
        const img = form?.querySelector(".reply-preview-img");
        if (img) img.src = url;
        if (preview) preview.style.display = "block";
    }
});

// ===== Delegation =====
postsContainer.addEventListener("click", async (e) => {
    const zoomImg = e.target.closest(
        ".post-media img, .comment-image img[data-lightbox]"
    );
    if (zoomImg && zoomImg.src) {
        e.preventDefault();
        openLightbox(zoomImg.src);
        return;
    }

    const profileLink = e.target.closest("[data-action='open-profile']");
    if (profileLink) {
        e.preventDefault();
        const username = profileLink.dataset.username;
        const authorId = profileLink.dataset.authorId;
        const me = getCurrentUser();

        if (me && String(me.id) === String(authorId)) {
            openOwnProfile();
        } else if (username && isNaN(Number(username))) {
            openUserProfile(username);
        } else {
            showToast("Could not open profile");
        }
        return;
    }

    const btn = e.target.closest("button");
    if (!btn) return;

    const action = btn.dataset.action;
    const postId = btn.dataset.post;
    const commentId = btn.dataset.id;

    if (action === "close-comments") {
        const section = document.getElementById(`comments-${postId}`);
        if (section) section.style.display = "none";
        return;
    }

    if (action === "pick-edit-comment-file") {
        document
            .getElementById(`edit-form-${commentId}`)
            ?.querySelector(".edit-comment-file")
            ?.click();
        return;
    }

    if (action === "clear-edit-comment-file") {
        const form = document.getElementById(`edit-form-${commentId}`);
        if (!form) return;
        const input = form.querySelector(".edit-comment-file");
        const preview = form.querySelector(".edit-comment-preview");
        if (input) {
            input.value = "";
            input.dataset.removed = "1";
        }
        if (preview) preview.style.display = "none";
        return;
    }

    if (action === "pick-comment-file") {
        document.getElementById(`newCommentFile-${postId}`)?.click();
        return;
    }

    if (action === "clear-comment-file") {
        const input = document.getElementById(`newCommentFile-${postId}`);
        const preview = document.getElementById(`commentPreview-${postId}`);
        if (input) input.value = "";
        if (preview) preview.style.display = "none";
        return;
    }

    if (action === "pick-reply-file") {
        document
            .getElementById(`reply-form-${commentId}`)
            ?.querySelector(".reply-file")
            ?.click();
        return;
    }

    if (action === "clear-reply-file") {
        const form = document.getElementById(`reply-form-${commentId}`);
        if (!form) return;
        const input = form.querySelector(".reply-file");
        const preview = form.querySelector(".reply-preview");
        if (input) input.value = "";
        if (preview) preview.style.display = "none";
        return;
    }

    if (action === "like-post") {
        if (!requireAuth()) return;
        try {
            const result = await apiRequest(
                `/posts/${postId}/like`,
                "POST",
                null,
                true
            );
            const countEl = btn.querySelector(".likes-count");
            let count = parseInt(countEl.textContent) || 0;
            if (result.liked) {
                btn.classList.add("liked");
                count += 1;
            } else {
                btn.classList.remove("liked");
                count = Math.max(0, count - 1);
            }
            countEl.textContent = count > 0 ? count : "";
        } catch (err) {
            showToast(err.message);
        }
        return;
    }

    if (action === "like-comment") {
        if (!requireAuth()) return;
        try {
            const result = await apiRequest(
                `/posts/comments/${commentId}/like`,
                "POST",
                null,
                true
            );
            const countEl = btn.querySelector(".likes-count");
            let count = parseInt(countEl.textContent) || 0;
            if (result.liked) {
                btn.classList.add("liked");
                count += 1;
            } else {
                btn.classList.remove("liked");
                count = Math.max(0, count - 1);
            }
            countEl.textContent = count > 0 ? count : "";
        } catch (err) {
            showToast(err.message);
        }
        return;
    }

    if (action === "toggle-comments") {
        const section = document.getElementById(`comments-${postId}`);
        if (section.style.display === "none" || !section.style.display) {
            section.style.display = "block";
            if (!section.dataset.loaded) {
                await loadComments(postId, section);
                section.dataset.loaded = "1";
            }
        } else {
            section.style.display = "none";
        }
        return;
    }

    if (action === "edit-post") {
        const post = postsCache[postId];
        if (post) openPostModal(post);
        else showToast("Could not load post data");
        return;
    }

    if (action === "delete-post") {
        deletePost(postId);
        return;
    }

    if (action === "submit-comment") {
        if (!requireAuth()) return;
        const textarea = document.getElementById(`newComment-${postId}`);
        const text = textarea.value.trim();
        const fileInput = document.getElementById(`newCommentFile-${postId}`);
        const file = fileInput?.files?.[0];

        if (!text) return showToast("Enter a comment");
        if (file && !isAllowedImage(file)) {
            return showToast("Only JPG, PNG, WEBP or GIF allowed");
        }
        if (file && file.size > 3 * 1024 * 1024) {
            return showToast("File is larger than 3 MB");
        }

        const formData = new FormData();
        formData.append("comment_text", text);
        if (file) formData.append("comment_image", file);

        try {
            await apiRequest(`/comment/${postId}`, "POST", formData, true);
            showToast("Comment added");
            const section = document.getElementById(`comments-${postId}`);
            section.dataset.loaded = "";
            await loadComments(postId, section);
        } catch (err) {
            showToast(err.message);
        }
        return;
    }

    if (action === "reply") {
        if (!requireAuth()) return;
        document
            .getElementById(`reply-form-${commentId}`)
            .classList.toggle("open");
        return;
    }

    if (action === "cancel-reply") {
        document
            .getElementById(`reply-form-${commentId}`)
            .classList.remove("open");
        return;
    }

    if (action === "submit-reply") {
        if (!requireAuth()) return;
        const form = document.getElementById(`reply-form-${commentId}`);
        const text = form.querySelector("textarea").value.trim();
        const file = form.querySelector(".reply-file")?.files?.[0];

        if (!text) return showToast("Enter a reply");
        if (file && !isAllowedImage(file)) {
            return showToast("Only JPG, PNG, WEBP or GIF allowed");
        }
        if (file && file.size > 3 * 1024 * 1024) {
            return showToast("File is larger than 3 MB");
        }

        const formData = new FormData();
        formData.append("comment_text", text);
        formData.append("parent_id", String(commentId));
        if (file) formData.append("comment_image", file);

        try {
            await apiRequest(`/comment/${postId}`, "POST", formData, true);
            showToast("Reply added");
            const section = document.getElementById(`comments-${postId}`);
            section.dataset.loaded = "";
            await loadComments(postId, section);
        } catch (err) {
            showToast(err.message);
        }
        return;
    }

    if (action === "delete-comment") {
        if (!requireAuth()) return;
        showConfirm(
            "Delete comment?",
            "This action cannot be undone.",
            async () => {
                try {
                    await apiRequest(
                        `/comment/${commentId}`,
                        "DELETE",
                        null,
                        true
                    );
                    showToast("Comment deleted");
                    const postEl = btn.closest(".post");
                    const pid = postEl.dataset.id;
                    const section = document.getElementById(`comments-${pid}`);
                    section.dataset.loaded = "";
                    await loadComments(pid, section);
                } catch (err) {
                    showToast(err.message);
                }
            }
        );
        return;
    }

    if (action === "edit-comment") {
        if (!requireAuth()) return;
        document.getElementById(`edit-form-${commentId}`).classList.add("open");
        document.getElementById(`comment-text-${commentId}`).style.display =
            "none";
        const imgBlock = document
            .getElementById(`comment-text-${commentId}`)
            ?.parentElement?.querySelector(".comment-image");
        if (imgBlock) imgBlock.style.display = "none";
        return;
    }

    if (action === "cancel-edit") {
        document
            .getElementById(`edit-form-${commentId}`)
            .classList.remove("open");
        document.getElementById(`comment-text-${commentId}`).style.display =
            "block";
        return;
    }

    if (action === "save-edit") {
        if (!requireAuth()) return;
        const form = document.getElementById(`edit-form-${commentId}`);
        const newText = form.querySelector("textarea").value.trim();
        const fileInput = form.querySelector(".edit-comment-file");
        const file = fileInput?.files?.[0];
        const removed = fileInput?.dataset.removed === "1";
        const previewVisible =
            form.querySelector(".edit-comment-preview")?.style.display !==
            "none";

        if (!newText) return showToast("Text cannot be empty");
        if (file && !isAllowedImage(file)) {
            return showToast("Only JPG, PNG, WEBP or GIF allowed");
        }
        if (file && file.size > 3 * 1024 * 1024) {
            return showToast("File is larger than 3 MB");
        }

        const formData = new FormData();
        formData.append("comment_text", newText);
        if (file) {
            formData.append("comment_image", file);
        } else if (removed || !previewVisible) {
            formData.append("image_url", "");
        }

        try {
            await apiRequest(`/comment/${commentId}`, "PATCH", formData, true);
            showToast("Comment updated");
            const section = document.getElementById(`comments-${postId}`);
            section.dataset.loaded = "";
            await loadComments(postId, section);
        } catch (err) {
            showToast(err.message);
        }
        return;
    }
});

// ===== Posts + search =====
function renderPostsList(posts) {
    postsContainer.innerHTML = "";

    if (!posts || posts.length === 0) {
        postsContainer.innerHTML = `<p class="no-posts">No posts yet</p>`;
        return;
    }

    const user = getCurrentUser();

    for (const post of posts) {
        postsCache[post.id] = post;

        const article = document.createElement("article");
        article.className = "post";
        article.dataset.id = post.id;

        const isOwner = user && Number(user.id) === Number(post.author_name);
        const authorId = post.author_name;
        const authorLabel =
            post.author_username || post.author_name || "Anonymous";
        const authorShort = shortName(authorLabel);
        const date = formatDate(post.created_at);
        const likesCount = post.likes_count || 0;
        const isLiked = post.is_liked === true;
        const avatarHtml = renderAvatarHtml(
            post.author_avatar,
            authorLabel,
            "post-avatar"
        );
        const imgSrc = mediaUrl(post.image_url);

        article.innerHTML = `
            <div class="post-header">
                <div class="post-header-left">
                    ${avatarHtml}
                    <div class="post-meta">
                        <a href="#" data-action="open-profile" data-username="${escapeHtml(String(authorLabel))}" data-author-id="${authorId}" title="${escapeHtml(String(authorLabel))}">${escapeHtml(authorShort)}</a> · ${date}
                    </div>
                </div>
                ${
                    isOwner
                        ? `
                    <div class="post-owner-actions">
                        <button data-action="edit-post" data-post="${post.id}">Edit</button>
                        <button data-action="delete-post" data-post="${post.id}">Delete</button>
                    </div>
                `
                        : ""
                }
            </div>
            <h2 class="post-title">${escapeHtml(post.title)}</h2>
            ${post.body ? `<p class="post-text">${escapeHtml(post.body)}</p>` : ""}
            ${imgSrc ? `<div class="post-media"><img src="${escapeHtml(imgSrc)}" alt="" onerror="this.parentElement.style.display='none'" /></div>` : ""}
            <div class="post-actions">
                <button class="action-btn ${isLiked ? "liked" : ""}" data-action="like-post" data-post="${post.id}">
                    ${createLikeSvg()}
                    <span class="likes-count">${likesCount > 0 ? likesCount : ""}</span>
                </button>
                <button class="action-btn" data-action="toggle-comments" data-post="${post.id}">
                    <svg viewBox="0 0 24 24"><path d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18zM18 14H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/></svg>
                    <span class="comments-count" id="count-${post.id}">...</span>
                    <span>Comments</span>
                </button>
            </div>
            <div class="comments-section" id="comments-${post.id}" style="display:none;"></div>
        `;

        postsContainer.appendChild(article);
    }

    posts.forEach(async (post) => {
        try {
            const comments = await apiRequest(`/comments/${post.id}`);
            const countEl = document.getElementById(`count-${post.id}`);
            if (countEl) {
                countEl.textContent =
                    comments.length > 0 ? comments.length : "";
            }
        } catch {
            const countEl = document.getElementById(`count-${post.id}`);
            if (countEl) countEl.textContent = "";
        }
    });
}

function applySearchFilter() {
    const q = (document.getElementById("searchInput")?.value || "")
        .trim()
        .toLowerCase();

    if (!q) {
        renderPostsList(allPostsList);
        return;
    }

    const filtered = allPostsList.filter((p) =>
        String(p.title || "")
            .toLowerCase()
            .includes(q)
    );

    if (filtered.length === 0) {
        postsContainer.innerHTML = `<p class="no-posts">No posts found</p>`;
        return;
    }

    renderPostsList(filtered);
}

document.getElementById("searchInput")?.addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(applySearchFilter, 200);
});

async function loadPosts() {
    try {
        loadingPosts.style.display = "block";
        postsContainer.innerHTML = "";
        postsContainer.appendChild(loadingPosts);

        const posts = await apiRequest("/posts");
        allPostsList = posts || [];
        postsCache = {};

        loadingPosts.style.display = "none";

        const q = (document.getElementById("searchInput")?.value || "").trim();
        if (q) applySearchFilter();
        else renderPostsList(allPostsList);
    } catch (err) {
        loadingPosts.style.display = "none";
        postsContainer.innerHTML = `<p class="error">Failed to load posts: ${err.message}</p>`;
    }
}

// ===== Mobile nav =====
document.getElementById("mobileFeedBtn")?.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
});

document.getElementById("mobileProfileBtn")?.addEventListener("click", () => {
    if (!isLoggedIn()) {
        openModal(true);
        showToast("Please log in to continue");
        return;
    }
    openOwnProfile();
});

// ===== Start =====
document.addEventListener("DOMContentLoaded", () => {
    setOwnProfileChrome(false);
    updateAuthUI();
    loadPosts();
});
