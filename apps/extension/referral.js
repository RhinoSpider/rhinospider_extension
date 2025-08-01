import { getReferralCode, useReferralCode, getUserData } from './service-worker-adapter';

document.addEventListener('DOMContentLoaded', async () => {
    const referralCodeDisplay = document.getElementById('referral-code-display');
    const copyCodeButton = document.getElementById('copy-code-button');
    const referralCountSpan = document.getElementById('referral-count');
    const rhinoPointsSpan = document.getElementById('rhino-points');
    const totalDataScrapedSpan = document.getElementById('total-data-scraped');
    const referralCodeInput = document.getElementById('referral-code-input');
    const useCodeButton = document.getElementById('use-code-button');
    const referralMessage = document.getElementById('referral-message');

    // Function to update UI with user data
    const updateUI = async () => {
        try {
            const userData = await getUserData();
            if (userData.ok) {
                referralCodeDisplay.value = userData.ok.referralCode;
                referralCountSpan.textContent = userData.ok.referralCount;
                rhinoPointsSpan.textContent = userData.ok.points;
                totalDataScrapedSpan.textContent = `${(userData.ok.totalDataScraped / 1024).toFixed(2)} KB`;
                if (userData.ok.referredBy) {
                    referralCodeInput.disabled = true;
                    useCodeButton.disabled = true;
                    referralMessage.textContent = "You have already been referred.";
                    referralMessage.className = "mt-2 text-sm text-green-600";
                }
            } else {
                // User not found, allow them to generate a code or use one
                referralCodeDisplay.value = "Generate Code";
                referralCountSpan.textContent = "0";
                rhinoPointsSpan.textContent = "0";
            }
        } catch (error) {
            console.error("Error fetching user data:", error);
            referralMessage.textContent = "Error loading data.";
            referralMessage.className = "mt-2 text-sm text-red-600";
        }
    };

    // Initial UI update
    await updateUI();

    // Handle Copy Code button click
    copyCodeButton.addEventListener('click', () => {
        referralCodeDisplay.select();
        document.execCommand('copy');
        alert('Referral code copied to clipboard!');
    });

    // Handle Use Code button click
    useCodeButton.addEventListener('click', async () => {
        const code = referralCodeInput.value.trim();
        if (code) {
            try {
                const result = await useReferralCode(code);
                if (result.ok) {
                    referralMessage.textContent = result.ok;
                    referralMessage.className = "mt-2 text-sm text-green-600";
                    await updateUI(); // Refresh UI after successful referral
                } else {
                    referralMessage.textContent = result.err;
                    referralMessage.className = "mt-2 text-sm text-red-600";
                }
            } catch (error) {
                console.error("Error using referral code:", error);
                referralMessage.textContent = "An error occurred while using the code.";
                referralMessage.className = "mt-2 text-sm text-red-600";
            }
        } else {
            referralMessage.textContent = "Please enter a referral code.";
            referralMessage.className = "mt-2 text-sm text-red-600";
        }
    });

    // Handle Generate Code if no code exists
    if (referralCodeDisplay.value === "Generate Code") {
        copyCodeButton.textContent = "Generate Code";
        copyCodeButton.removeEventListener('click', () => {
            referralCodeDisplay.select();
            document.execCommand('copy');
            alert('Referral code copied to clipboard!');
        });
        copyCodeButton.addEventListener('click', async () => {
            try {
                const result = await getReferralCode();
                if (result.ok) {
                    referralCodeDisplay.value = result.ok;
                    copyCodeButton.textContent = "Copy";
                    alert('Your new referral code has been generated!');
                } else {
                    alert('Error generating code: ' + result.err);
                }
            } catch (error) {
                console.error("Error generating referral code:", error);
                alert('An error occurred while generating the code.');
            }
        });
    }
});