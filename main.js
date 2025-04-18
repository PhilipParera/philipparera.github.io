document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('jwtToken');
  if (!token) {
      window.location.href = 'index.html';
  } else {
      // Display masked Bidder ID
      const bidderId = localStorage.getItem('bidderId');
      if (bidderId && bidderId.length === 12) {
          const maskedId = bidderId.slice(0, 4) + '****' + bidderId.slice(8);
          document.getElementById('bidder-id-display').textContent = `Bidder ID: ${maskedId}`;
      }

      // Handle submit button click
      document.getElementById('submit-bid').addEventListener('click', () => {
        const bidderId = localStorage.getItem('bidderId');
        const shipmentCode = document.getElementById('shipment-code').textContent;
        const bidValue = document.getElementById('bid-value').value;
      
        if (!bidValue) {
          alert('Please enter a bid value.');
          return;
        }
      
        const confirmation = confirm('I have read and acknowledge the FAQ page, and I am bidding for this shipment now.');
        if (confirmation) {
          const webAppUrl = 'https://script.google.com/macros/s/AKfycbylMWTwXMLIkUt-RjOczWZYRyh5gxWDoO5dT2jw0RE2dwOZfFpDpXSMA9A8a2l_CR3p/exec'; // Replace with your web app URL
          const data = {
            bidderId: bidderId,
            shipmentCode: shipmentCode,
            bidValue: bidValue
          };
      
          fetch(webAppUrl, {
            method: 'POST',
            mode: 'no-cors', // Required because the script doesn’t return CORS headers
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams(data)
          })
          .then(() => {
            alert('Bid submitted successfully.');
          })
          .catch(error => {
            console.error('Error:', error);
            alert('An error occurred while submitting the bid.');
          });
        }
      });