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

    // Display user name
    const userName = localStorage.getItem('userName');
    if (userName) {
      document.getElementById('user-name').textContent = userName;
    }

    // Fetch shipment codes
    fetch('https://us-central1-key-line-454113-g0.cloudfunctions.net/getShipmentCodes', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to fetch shipment codes');
      }
      return response.json();
    })
    .then(data => {
      const shipmentCodes = data.shipmentCodes;
      const tbody = document.querySelector('#bid-table tbody');
      shipmentCodes.forEach(code => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td><input type="number" class="bid-input" data-shipment-code="${code}" placeholder="Enter your bid"></td>
          <td>${code}</td>
        `;
        tbody.appendChild(row);
      });
      // Add event listeners to bid inputs
      const bidInputs = document.querySelectorAll('.bid-input');
      bidInputs.forEach(input => {
        input.addEventListener('keypress', (event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            const shipmentCode = input.getAttribute('data-shipment-code');
            const bidValue = input.value;
            if (bidValue) {
              submitBid(shipmentCode, bidValue, input);
            } else {
              alert('Please enter a bid value.');
            }
          }
        });
      });
    })
    .catch(error => {
      console.error('Error fetching shipment codes:', error);
      alert('Failed to load shipment codes. Please try again later.');
    });
  }

  function submitBid(shipmentCode, bidValue, input) {
    const bidderId = localStorage.getItem('bidderId');
    const confirmation = confirm('I have read and acknowledge the FAQ page, and I am bidding for this shipment now.');
    if (confirmation) {
      const webAppUrl = 'https://script.google.com/macros/s/AKfycbylMWTwXMLIkUt-RjOczWZYRyh5gxWDoO5dT2jw0RE2dwOZfFpDpXSMA9A8a2l_CR3p/exec';
      const data = {
        bidderId: bidderId,
        shipmentCode: shipmentCode,
        bidValue: bidValue
      };
      fetch(webAppUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams(data)
      })
      .then(() => {
        alert('Bid submitted successfully.');
        if (input) input.value = '';
      })
      .catch(error => {
        console.error('Error:', error);
        alert('An error occurred while submitting the bid.');
      });
    }
  }
});