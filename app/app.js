document.addEventListener("DOMContentLoaded", () => {
    // DOM Elements
    const thoughtInput = document.getElementById("thoughtInput");
    const captureBtn = document.getElementById("captureBtn");
    const memoryStream = document.getElementById("memoryStream");
    
    const fileInput = document.getElementById("fileInput");
    const dropzone = document.getElementById("dropzone");
    const uploadFridgeBtn = document.getElementById("uploadFridgeBtn");
    const uploadACBtn = document.getElementById("uploadACBtn");
    
    const emailSender = document.getElementById("emailSender");
    const emailSubject = document.getElementById("emailSubject");
    const emailBody = document.getElementById("emailBody");
    const emailWebhookBtn = document.getElementById("emailWebhookBtn");
    
    const netWorth = document.getElementById("netWorth");
    const netCashFlow = document.getElementById("netCashFlow");
    const bankAmount = document.getElementById("bankAmount");
    const bankDesc = document.getElementById("bankDesc");
    const bankWebhookBtn = document.getElementById("bankWebhookBtn");
    const assetsList = document.getElementById("assetsList");
    const ledgerList = document.getElementById("ledgerList");
    
    const taskTitle = document.getElementById("taskTitle");
    const taskDuration = document.getElementById("taskDuration");
    const taskStartTime = document.getElementById("taskStartTime");
    const taskPriority = document.getElementById("taskPriority");
    const scheduleTaskBtn = document.getElementById("scheduleTaskBtn");
    
    const overrunTaskSelect = document.getElementById("overrunTaskSelect");
    const overrunDuration = document.getElementById("overrunDuration");
    const triggerOverrunBtn = document.getElementById("triggerOverrunBtn");
    const calendarTimeline = document.getElementById("calendarTimeline");
    
    const resetBtn = document.getElementById("resetBtn");

    // Initialize Default Start Time to current hour
    const now = new Date();
    now.setMinutes(0);
    now.setSeconds(0);
    now.setMilliseconds(0);
    // Format to YYYY-MM-DDTHH:MM local string
    const offset = now.getTimezoneOffset();
    const localNow = new Date(now.getTime() - (offset * 60 * 1000));
    taskStartTime.value = localNow.toISOString().slice(0, 16);

    // Initial load
    refreshAll();

    // Event Listeners
    captureBtn.addEventListener("click", captureThought);
    thoughtInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") captureThought();
    });

    emailWebhookBtn.addEventListener("click", simulateEmailWebhook);
    bankWebhookBtn.addEventListener("click", simulateBankWebhook);
    scheduleTaskBtn.addEventListener("click", scheduleTask);
    triggerOverrunBtn.addEventListener("click", triggerOverrun);
    resetBtn.addEventListener("click", resetDatabase);

    // Dropzone Events
    dropzone.addEventListener("click", () => fileInput.click());
    dropzone.addEventListener("dragover", (e) => {
        e.preventDefault();
        dropzone.style.borderColor = "var(--color-primary)";
    });
    dropzone.addEventListener("dragleave", () => {
        dropzone.style.borderColor = "var(--panel-border)";
    });
    dropzone.addEventListener("drop", (e) => {
        e.preventDefault();
        dropzone.style.borderColor = "var(--panel-border)";
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileUpload(files[0]);
        }
    });
    fileInput.addEventListener("change", (e) => {
        if (e.target.files.length > 0) {
            handleFileUpload(e.target.files[0]);
        }
    });

    // Preset PDF mock uploads
    uploadFridgeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        submitMockUpload("Fridge_Manual.pdf", "application/pdf", "Refrigerator user manual: clean condenser coils every 180 days and clean water filter every 90 days. Estimated value $1500.");
    });
    uploadACBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        submitMockUpload("AC_Specs.txt", "text/plain", "AC split unit manual details: clean filter every 30 days. Unit price $800.");
    });

    // Core functions
    async function refreshAll() {
        await Promise.all([
            fetchMemories(),
            fetchWalletData(),
            fetchCalendarData()
        ]);
    }

    async function fetchMemories() {
        // Fetch raw memories from database
        try {
            const res = await fetch("/api/wallet"); // wallet returns summary/assets, let's fetch log stream via wallet transactions & custom lists
            const walletData = await res.json();
            
            // To show memories, let's query the specific API (let's create a memory fetching logic)
            // Wait, we can fetch all transactions + assets + tasks to build the history stream or directly call db.
            // Since the database has memories, let's fetch from the backend api
            const brainRes = await fetch("/api/wallet"); // status/details
            // Let's use the wallet transaction log stream as our central ledger and display memories.
            // Actually, we can fetch tasks, assets, and transactions to populate the dashboard.
            // Let's call /api/wallet and /api/hands.
        } catch (err) {
            console.error("Error fetching data:", err);
        }
    }

    async function fetchWalletData() {
        try {
            const res = await fetch("/api/wallet");
            const data = await res.json();
            
            // Update Summary Card
            netWorth.textContent = `$${data.summary.total_asset_value.toFixed(2)}`;
            const burn = data.summary.net_cash_flow;
            netCashFlow.textContent = `${burn >= 0 ? "+" : ""}$${burn.toFixed(2)}`;
            netCashFlow.style.color = burn >= 0 ? "var(--color-success)" : "var(--color-danger)";

            // Update Assets List
            assetsList.innerHTML = "";
            if (data.assets.length === 0) {
                assetsList.innerHTML = `<div class="stream-empty">No assets registered. Load Fridge_Manual.pdf to register.</div>`;
            } else {
                data.assets.forEach(asset => {
                    const div = document.createElement("div");
                    div.className = "asset-row";
                    div.innerHTML = `
                        <div class="asset-details">
                            <span class="asset-name">${asset.name}</span>
                            <span class="asset-sub">Type: ${asset.type} | Added: ${asset.purchase_date}</span>
                        </div>
                        <span class="ledger-amount expense">$${asset.value.toFixed(2)}</span>
                    `;
                    assetsList.appendChild(div);
                });
            }

            // Update Transaction Ledger
            ledgerList.innerHTML = "";
            if (data.transactions.length === 0) {
                ledgerList.innerHTML = `<div class="stream-empty">No ledger events.</div>`;
            } else {
                data.transactions.forEach(tx => {
                    const div = document.createElement("div");
                    div.className = "ledger-row";
                    const isInc = tx.type === "income";
                    div.innerHTML = `
                        <div class="ledger-details">
                            <span class="ledger-title">${tx.description}</span>
                            <span class="ledger-sub">${tx.transaction_date.replace("T", " ").slice(0, 16)}</span>
                        </div>
                        <div class="ledger-amount ${tx.type}">
                            ${isInc ? "+" : "-"}$${tx.amount.toFixed(2)}
                            <span class="status-indicator ${tx.is_verified ? "status-verified" : "status-unverified"}">
                                ${tx.is_verified ? "Verified" : "Pending"}
                            </span>
                        </div>
                    `;
                    ledgerList.appendChild(div);
                });
            }
        } catch (err) {
            console.error("Error fetching wallet data:", err);
        }
    }

    async function fetchCalendarData() {
        try {
            const res = await fetch("/api/hands");
            const data = await res.json();
            
            // Update Calendar Timeline
            calendarTimeline.innerHTML = "";
            overrunTaskSelect.innerHTML = `<option value="">Select a task...</option>`;
            
            if (data.tasks.length === 0) {
                calendarTimeline.innerHTML = `<div class="stream-empty">No tasks scheduled.</div>`;
            } else {
                // Populate overrun select options
                data.tasks.forEach(task => {
                    if (task.start_time) {
                        const opt = document.createElement("option");
                        opt.value = task.id;
                        opt.textContent = `${task.title} (${task.duration_minutes} min)`;
                        overrunTaskSelect.appendChild(opt);
                    }
                });

                data.tasks.forEach(task => {
                    const div = document.createElement("div");
                    const priorityClass = `priority-${task.priority}`;
                    const fixedClass = task.is_fixed ? "fixed" : "";
                    div.className = `timeline-event ${priorityClass} ${fixedClass}`;
                    
                    let timeStr = "Fluid";
                    if (task.start_time) {
                        const d = new Date(task.start_time);
                        timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    }

                    div.innerHTML = `
                        <div class="event-time">${timeStr}</div>
                        <div class="event-details">
                            <span class="event-title">${task.title}</span>
                            <span class="event-duration">Duration: ${task.duration_minutes} mins</span>
                        </div>
                        <span class="event-tag">${task.is_fixed ? "Fixed" : "Fluid"}</span>
                    `;
                    calendarTimeline.appendChild(div);
                });
            }
        } catch (err) {
            console.error("Error fetching calendar data:", err);
        }
    }

    async function captureThought() {
        const text = thoughtInput.value.trim();
        if (!text) return;
        
        try {
            const res = await fetch("/api/brain/text", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: jsonStringify({ content: text })
            });
            const data = await res.json();
            if (data.success) {
                thoughtInput.value = "";
                appendMemoryToStream(data.result);
                await refreshAll();
            }
        } catch (err) {
            console.error(err);
        }
    }

    async function simulateEmailWebhook() {
        const sender = emailSender.value.trim();
        const subject = emailSubject.value.trim();
        const body = emailBody.value.trim();
        if (!sender || !body) return;

        try {
            const res = await fetch("/api/brain/email", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: jsonStringify({ sender, subject, body })
            });
            const data = await res.json();
            if (data.success) {
                appendMemoryToStream(data.result);
                await refreshAll();
            }
        } catch (err) {
            console.error(err);
        }
    }

    async function handleFileUpload(file) {
        const reader = new FileReader();
        reader.onload = async (e) => {
            const content = e.target.result;
            await submitMockUpload(file.name, file.type, content);
        };
        reader.readAsText(file);
    }

    async function submitMockUpload(filename, fileType, fileContent) {
        try {
            const res = await fetch("/api/brain/upload", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: jsonStringify({ filename, file_type: fileType, file_content: fileContent })
            });
            const data = await res.json();
            if (data.success) {
                appendMemoryToStream({
                    content: `Uploaded document: ${filename}`,
                    source: "document",
                    created_at: new Date().toISOString()
                });
                await refreshAll();
            }
        } catch (err) {
            console.error(err);
        }
    }

    async function simulateBankWebhook() {
        const amount = parseFloat(bankAmount.value);
        const desc = bankDesc.value.trim();
        if (isNaN(amount) || !desc) return;

        try {
            const res = await fetch("/api/wallet/webhook", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: jsonStringify({ amount, description: desc })
            });
            const data = await res.json();
            if (data.success) {
                await refreshAll();
            }
        } catch (err) {
            console.error(err);
        }
    }

    async function scheduleTask() {
        const title = taskTitle.value.trim();
        const duration = parseInt(taskDuration.value);
        const start = taskStartTime.value;
        const priority = parseInt(taskPriority.value);
        if (!title || isNaN(duration)) return;

        try {
            const res = await fetch("/api/hands/task", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: jsonStringify({
                    title,
                    duration,
                    start_time: start ? new Date(start).toISOString() : null,
                    priority,
                    is_fixed: false
                })
            });
            const data = await res.json();
            if (data.success) {
                await refreshAll();
            }
        } catch (err) {
            console.error(err);
        }
    }

    async function triggerOverrun() {
        const taskId = overrunTaskSelect.value;
        const duration = parseInt(overrunDuration.value);
        if (!taskId || isNaN(duration)) return;

        try {
            const res = await fetch("/api/hands/overrun", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: jsonStringify({ task_id: taskId, actual_duration: duration })
            });
            const data = await res.json();
            if (data.success) {
                await refreshAll();
            }
        } catch (err) {
            console.error(err);
        }
    }

    async function resetDatabase() {
        if (!confirm("Are you sure you want to reset the local database?")) return;
        try {
            const res = await fetch("/api/reset", { method: "POST" });
            const data = await res.json();
            if (data.success) {
                memoryStream.innerHTML = `<div class="stream-empty">No ambient memories captured yet.</div>`;
                await refreshAll();
            }
        } catch (err) {
            console.error(err);
        }
    }

    function appendMemoryToStream(memory) {
        // Clear empty state
        const empty = memoryStream.querySelector(".stream-empty");
        if (empty) empty.remove();
        
        const div = document.createElement("div");
        div.className = "feed-item";
        
        const time = new Date(memory.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        div.innerHTML = `
            <div class="item-meta">
                <span class="item-badge badge-${memory.source}">${memory.source}</span>
                <span>${time}</span>
            </div>
            <div class="item-content">${memory.content}</div>
        `;
        
        // Add to top of feed
        memoryStream.insertBefore(div, memoryStream.firstChild);
    }

    function jsonStringify(obj) {
        return JSON.stringify(obj);
    }
});
