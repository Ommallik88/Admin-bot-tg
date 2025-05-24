const token = "7996047143:AAExzCX8SK5F6-Etr89cV1a79hCShlsysbQ"; // Replace with your actual bot token
const imageUrl = "https://i.ibb.co/FLGDhWCJ/20250522-130025-2.png"; // Your image URL

// Optional: Audio files for notification sounds
// const successSound = new Audio('path/to/success.mp3'); // Replace with actual path
// const errorSound = new Audio('path/to/error.mp3');   // Replace with actual path
// const infoSound = new Audio('path/to/info.mp3');     // Replace with actual path

let automationInterval;
let isAutomationRunning = false;
let currentPeriodNumber = 0;

// --- Toast Notification Function ---
function showToast(message, type = 'info', duration = 4000) {
    const toastContainer = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.classList.add('toast', type);

    let iconClass = '';
    let ariaLabel = '';

    // let soundToPlay; // For optional sound effects

    if (type === 'success') {
        iconClass = 'fas fa-check-circle';
        ariaLabel = 'Success';
        // soundToPlay = successSound;
    } else if (type === 'error') {
        iconClass = 'fas fa-exclamation-triangle';
        ariaLabel = 'Error';
        // soundToPlay = errorSound;
    } else { // info
        iconClass = 'fas fa-info-circle';
        ariaLabel = 'Information';
        // soundToPlay = infoSound;
    }

    toast.innerHTML = `
        <i class="icon ${iconClass}" aria-label="${ariaLabel}"></i>
        <div class="message">${message}</div>
        <button class="close-button" onclick="closeToast(this.parentNode)" aria-label="Close notification">&times;</button>
    `;
    toastContainer.appendChild(toast);

    // Play sound if available
    // if (soundToPlay) {
    //     soundToPlay.play().catch(e => console.error("Error playing sound:", e));
    // }

    // Set the animation duration for the toast content and the progress bar
    const exitDuration = 400; // Matches CSS exit animation duration
    toast.style.setProperty('--toast-duration', `${duration / 1000}s`);
    toast.style.setProperty('--exit-duration', `${exitDuration / 1000}s`);


    // Automatically remove the toast after the duration (including exit animation)
    setTimeout(() => {
        toast.classList.add('exiting'); // Add a class to trigger the exit animation
        setTimeout(() => {
            if (toast && toast.parentNode === toastContainer) {
                toastContainer.removeChild(toast);
            }
        }, exitDuration); // Remove after the exit animation completes
    }, duration);
}

// Function to manually close a toast (called by the close button)
function closeToast(toastElement) {
    const toastContainer = document.getElementById('toast-container');
    if (toastElement && toastElement.parentNode === toastContainer) {
        toastElement.classList.add('exiting');
        setTimeout(() => {
            toastContainer.removeChild(toastElement);
        }, 400); // Match the CSS exit animation duration
    }
}


// --- Helper Functions ---

function extractDataFromInput(input) {
    let periodSuffix = "____";
    let result = "___";
    let accuracy = "___";

    // Extract 4-digit period number
    const periodMatch = input.match(/\b(\d{4})\b/);
    if (periodMatch && periodMatch[1]) {
        periodSuffix = periodMatch[1];
    }

    // Extract Result (BIG/SMALL)
    const resultMatch = input.match(/\b(BIG|SMALL)\b/i);
    if (resultMatch && resultMatch[1]) {
        result = resultMatch[1].toUpperCase();
    } else {
        result = Math.random() < 0.5 ? "BIG" : "SMALL"; // Random if not found
    }

    // Extract Accuracy
    const accuracyMatch = input.match(/Accuracy:\s*(\d+%)/i);
    if (accuracyMatch && accuracyMatch[1]) {
        accuracy = accuracyMatch[1];
    } else {
        accuracy = `${Math.floor(Math.random() * (96 - 60 + 1)) + 60}%`; // Random if not found
    }

    return {
        displayPeriod: periodSuffix,
        result: result,
        accuracy: accuracy
    };
}

function generateAutomatedMessageContent() {
    const result = Math.random() < 0.5 ? "BIG" : "SMALL";
    const accuracy = `${Math.floor(Math.random() * (96 - 60 + 1)) + 60}%`;
    return {
        result,
        accuracy
    };
}

async function sendTelegramMessage(targetId, caption) {
    const url = `https://api.telegram.org/bot${token}/sendPhoto`;

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                chat_id: targetId,
                photo: imageUrl,
                caption: caption,
                parse_mode: "HTML"
            })
        });

        if (response.ok) {
            return {
                success: true
            };
        } else {
            const errorData = await response.json();
            return {
                success: false,
                description: errorData.description || 'Unknown error'
            };
        }
    } catch (error) {
        console.error("Network or API error:", error);
        return {
            success: false,
            description: `An error occurred: ${error.message}`
        };
    }
}

// --- Manual Message Sending ---

async function sendManualMessage() {
    const targetId = document.getElementById("targetId").value.trim();
    const userInput = document.getElementById("message").value.trim();

    if (!targetId) {
        showToast("SYSTEM ALERT: Target ID field is empty. Please specify a channel or user ID for manual payload deployment.", 'error');
        return;
    }
    if (!userInput) {
        showToast("SYSTEM ALERT: No payload detected. Please compose your message for manual transmission.", 'error');
        return;
    }

    const {
        displayPeriod,
        result,
        accuracy
    } = extractDataFromInput(userInput);

    const caption = `
<pre style="color: var(--accent-color-1);">
╔══════════════════════════════════╗
║ <b style="color: #fff;">PERIOD    </b>: ${displayPeriod.padEnd(25)}║
║ <b style="color: #fff;">OUTCOME   </b>: ${result.padEnd(25)}║
║ <b style="color: #fff;">ACCURACY  </b>: ${accuracy.padEnd(23)}║
╚══════════════════════════════════╝
</pre>`;

    const resultSending = await sendTelegramMessage(targetId, caption);

    if (resultSending.success) {
        showToast("PAYLOAD STATUS: Manual broadcast successful!", 'success');
        document.getElementById("message").value = ""; // Clear message after sending
    } else {
        showToast(`PAYLOAD STATUS: Manual broadcast failed! Error: ${resultSending.description}`, 'error');
    }
}

// --- Automated Message System ---

function extractInitialPeriodForAutomation(input) {
    const periodMatch = input.match(/\b(\d{4})\b/);
    if (periodMatch && periodMatch[1]) {
        return parseInt(periodMatch[1], 10);
    }
    return 0; // Default if no 4-digit number found
}

async function sendAutomatedMessage() {
    const targetId = document.getElementById("targetId").value.trim();

    if (!targetId) {
        showToast("SYSTEM ALERT: Autonomous sequence requires a target ID. Please define a Channel Chat ID or User ID. Terminating session.", 'error');
        stopAutomation();
        return;
    }

    // Increment the period number and format it to 4 digits
    const displayPeriod = String(currentPeriodNumber).padStart(4, '0');
    currentPeriodNumber++;

    const {
        result,
        accuracy
    } = generateAutomatedMessageContent();

    const caption = `
<pre style="color: var(--accent-color-1);">
╔══════════════════════════════════╗
║ <b style="color: #fff;">PERIOD    </b>: ${displayPeriod.padEnd(25)}║
║ <b style="color: #fff;">OUTCOME   </b>: ${result.padEnd(25)}║
║ <b style="color: #fff;">ACCURACY  </b>: ${accuracy.padEnd(23)}║
║ <b style="color: #fff;">PREDICTED </b>: X HACKER                 ║
╚══════════════════════════════════╝
</pre>`;

    const resultSending = await sendTelegramMessage(targetId, caption);

    if (resultSending.success) {
        console.log(`AUTONOMOUS SEQUENCE: Payload deployed for period: ${displayPeriod}`);
        showToast(`AUTONOMOUS SEQUENCE: Payload deployed for period ${displayPeriod}.`, 'success', 2000); // Shorter duration for frequent updates
    } else {
        console.error(`AUTONOMOUS SEQUENCE: Payload deployment failed for period ${displayPeriod}. Error: ${resultSending.description}`);
        showToast(`AUTONOMOUS SEQUENCE: Deployment failed for period ${displayPeriod}. Error: ${resultSending.description}. Autonomous session terminated.`, 'error');
        stopAutomation();
    }
}

function startAutomation() {
    const targetId = document.getElementById("targetId").value.trim();
    const initialMessageInput = document.getElementById("message").value.trim();

    if (!targetId) {
        showToast("SYSTEM ALERT: Target ID is critical for autonomous operations. Please provide a Channel Chat ID or User ID.", 'error');
        return;
    }
    if (!initialMessageInput) {
        showToast("SYSTEM ALERT: Initial payload string missing. Please include a starting 4-digit period code (e.g., 'CODE: 0123') to calibrate autonomous sequence.", 'error');
        return;
    }

    currentPeriodNumber = extractInitialPeriodForAutomation(initialMessageInput);
    if (currentPeriodNumber === 0 && !initialMessageInput.match(/\b\d{4}\b/)) {
        showToast("SYSTEM ALERT: Unable to detect a valid 4-digit period string in your initial payload. Please ensure it's present (e.g., '0123') to initiate autonomous sequence.", 'error');
        return;
    }

    isAutomationRunning = true;
    const button = document.getElementById("toggleAutomationButton");
    button.innerHTML = '<i class="fas fa-pause-circle"></i> DEACTIVATE AUTONOMOUS SEQUENCE';
    button.classList.add("stop-button");
    document.getElementById("targetId").readOnly = true; // Disable input during automation
    document.getElementById("message").readOnly = true; // Disable input during automation

    // Send the first message immediately
    sendAutomatedMessage();

    automationInterval = setInterval(sendAutomatedMessage, 60000); // 1 minute interval
    showToast("AUTONOMOUS SEQUENCE STATUS: Activated. Payloads will deploy every 60 seconds.", 'success');
}

function stopAutomation() {
    isAutomationRunning = false;
    clearInterval(automationInterval);
    const button = document.getElementById("toggleAutomationButton");
    button.innerHTML = '<i class="fas fa-robot"></i> ACTIVATE AUTONOMOUS SEQUENCE';
    button.classList.remove("stop-button");
    document.getElementById("targetId").readOnly = false; // Enable input
    document.getElementById("message").readOnly = false; // Enable input
    showToast("AUTONOMOUS SEQUENCE STATUS: Terminated.", 'info');
}

function toggleAutomation() {
    if (isAutomationRunning) {
        stopAutomation();
    } else {
        startAutomation();
    }
}

// --- Sticker Sending ---

async function sendSticker(stickerId) {
    const targetId = document.getElementById("targetId").value.trim();

    if (!targetId) {
        showToast("SYSTEM ALERT: No target ID specified. Cannot deploy emoticon pack without a valid channel or user ID.", 'error');
        return;
    }

    const url = `https://api.telegram.org/bot${token}/sendSticker`;

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                chat_id: targetId,
                sticker: stickerId
            })
        });

        if (response.ok) {
            showToast("EMOTICON PACK STATUS: Deployment successful!", 'success');
        } else {
            const errorData = await response.json();
            showToast(`EMOTICON PACK STATUS: Deployment failed! Error: ${errorData.description || 'Unknown error'}`, 'error');
        }
    } catch (error) {
        console.error("Error sending sticker:", error);
        showToast("CRITICAL ERROR: Failed to establish connection for emoticon pack deployment.", 'error');
    }
}
