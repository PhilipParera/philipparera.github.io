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

    // Fetch shipments
    fetch('https://us-central1-key-line-454113-g0.cloudfunctions.net/getShipmentCodes', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to fetch shipments');
      }
      return response.json();
    })
    .then(data => {
      const shipments = data.shipments;
      const tbody = document.querySelector('#bid-table tbody');
      shipments.forEach(shipment => {
        const target = shipment.target || 'N/A';
        const firstId = maskId(shipment.firstId);
        const secondId = maskId(shipment.secondId);
        const formattedOpeningDate = formatDate(shipment.openingDate);
        const formattedClosingDate = formatDate(shipment.closingDate);
        const row1 = document.createElement('tr');
        row1.innerHTML = `
          <td rowspan="3"><input type="number" class="bid-input" data-shipment-code="${shipment.shipmentCode}" placeholder="Enter your bid"></td>
          <td>${target}</td>
          <td rowspan="3">Open: ${formattedOpeningDate}<br>Close: ${formattedClosingDate}</td>
          <td rowspan="3">${shipment.shipmentCode}</td>
        `;
        const row2 = document.createElement('tr');
        row2.innerHTML = `<td>${firstId}</td>`;
        const row3 = document.createElement('tr');
        row3.innerHTML = `<td>${secondId}</td>`;
        tbody.appendChild(row1);
        tbody.appendChild(row2);
        tbody.appendChild(row3);
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
      console.error('Error fetching shipments:', error);
      alert('Failed to load shipments. Please try again later.');
    });
  }

  function maskId(id) {
    if (id && id.length === 12) {
      return id.slice(0, 4) + '****' + id.slice(8);
    }
    return id || 'N/A';
  }

  function formatDate(dateString) {
    if (!dateString) return 'N/A';
    // Extract the date part by removing the time component
    const dateOnly = dateString.split(' ').slice(0, 3).join(' ');
    const date = new Date(dateOnly);
    if (isNaN(date)) return 'Invalid Date';
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
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