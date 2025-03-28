document.addEventListener('DOMContentLoaded', () => {
    const bidderIdInput = document.getElementById('bidder-id');
    const verificationNumberInput = document.getElementById('verification-number');
    const messageDiv = document.getElementById('message');

    function displayMessage(text) {
        messageDiv.textContent = text;
    }

    async function validateLogin() {
        const bidderId = bidderIdInput.value;
        const verificationNumber = verificationNumberInput.value;

        if (bidderId.length !== 12 || verificationNumber.length !== 4) {
            displayMessage('Bidder ID must be 12 characters and Verification Number must be 4 characters.');
            return;
        }

        try {
            const response = await fetch('https://your-cloud-function-url/authenticateBidder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bidderId, verificationNumber }),
            });

            const data = await response.json();

            if (data.status === 'active') {
                window.location.href = 'main.html'; // Redirect to main page (create this later in Phase 2)
            } else if (data.error) {
                displayMessage(data.error);
            } else {
                displayMessage(data.message);
            }
        } catch (error) {
            console.error('Error:', error);
            displayMessage('An error occurred. Please try again later.');
        }
    }

    // Trigger validation on Enter key or form submission
    [bidderIdInput, verificationNumberInput].forEach(input => {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') validateLogin();
        });
    });
});