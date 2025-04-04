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
      displayMessage('Please check your entries and repeat them again.');
      return;
    }

    try {
      const response = await fetch('https://us-central1-key-line-454113-g0.cloudfunctions.net/authenticateBidder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bidderId, verificationNumber }),
      });

      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);

      if (response.ok && data.message === 'Authentication successful') {
        localStorage.setItem('jwtToken', data.token);
        window.location.href = 'main.html';
      } else if (data.error) {
        displayMessage(data.error);
      } else {
        displayMessage(data.message || 'Authentication failed');
      }
    } catch (error) {
      console.error('Error:', error);
      displayMessage('An error occurred. Please try again later.');
    }
  }

  [bidderIdInput, verificationNumberInput].forEach(input => {
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') validateLogin();
    });
  });
});