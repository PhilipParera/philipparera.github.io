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

      // Process shipments to add freightMethodType and pod
      shipments.forEach(s => {
        if (s.freightMethod) {
          const parts = s.freightMethod.split(' ');
          s.freightMethodType = parts[0] || '';
          s.pod = parts[1] || '';
        } else {
          s.freightMethodType = '';
          s.pod = '';
        }
      });
      window.originalShipments = shipments;

      // Get unique values for filters
      const vendorDivisions = [...new Set(shipments.map(s => s.vendorDivision).filter(Boolean))].sort();
      const freightMethods = [...new Set(shipments.map(s => s.freightMethodType).filter(Boolean))].sort();
      const pods = [...new Set(shipments.map(s => s.pod).filter(Boolean))].sort();

      // Populate drop-downs
      populateDropdown('vendor-division-filter', vendorDivisions);
      populateDropdown('freight-method-filter', freightMethods);
      populateDropdown('pod-filter', pods);

      // Add event listeners to filters
      document.getElementById('vendor-division-filter').addEventListener('change', filterShipments);
      document.getElementById('freight-method-filter').addEventListener('change', filterShipments);
      document.getElementById('pod-filter').addEventListener('change', filterShipments);

      // Initial table render
      renderTable(shipments);
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

  function populateDropdown(selectId, options) {
    const select = document.getElementById(selectId);
    options.forEach(option => {
      const opt = document.createElement('option');
      opt.value = option;
      opt.textContent = option;
      select.appendChild(opt);
    });
  }

  function filterShipments() {
    const vendorDivision = document.getElementById('vendor-division-filter').value;
    const freightMethod = document.getElementById('freight-method-filter').value;
    const pod = document.getElementById('pod-filter').value;

    let filteredShipments = window.originalShipments;

    if (vendorDivision !== 'all') {
      filteredShipments = filteredShipments.filter(s => s.vendorDivision === vendorDivision);
    }
    if (freightMethod !== 'all') {
      filteredShipments = filteredShipments.filter(s => s.freightMethodType === freightMethod);
    }
    if (pod !== 'all') {
      filteredShipments = filteredShipments.filter(s => s.pod === pod);
    }

    renderTable(filteredShipments);
  }

  function renderTable(shipments) {
    const tbody = document.querySelector('#bid-table tbody');
    tbody.innerHTML = '';
    shipments.forEach(shipment => {
      const target = shipment.target || 'N/A';
      const firstId = maskId(shipment.firstId);
      const secondId = maskId(shipment.secondId);
      const row1 = document.createElement('tr');
      row1.innerHTML = `
        <td rowspan="3"><input type="number" class="bid-input" data-shipment-code="${shipment.shipmentCode}" placeholder="Enter your bid"></td>
        <td>${target}</td>
        <td rowspan="3">Open: ${shipment.openingDate}<br>Close: ${shipment.closingDate}</td>
        <td rowspan="3">${shipment.vendorDivision || 'N/A'}</td>
        <td>${shipment.freightMethod || 'N/A'}</td>
        <td>${shipment.gwKg || 'N/A'}</td>
        <td rowspan="3" class="wrapped-text">${shipment.shipperAddress || 'N/A'}</td>
        <td rowspan="3">${shipment.shipmentCode}</td>
      `;
      const row2 = document.createElement('tr');
      row2.innerHTML = `
        <td>${firstId}</td>
        <td>${shipment.incoterm || 'N/A'}</td>
        <td>${shipment.volCbm || 'N/A'}</td>
      `;
      const row3 = document.createElement('tr');
      row3.innerHTML = `
        <td>${secondId}</td>
        <td>${shipment.pol || 'N/A'}</td>
        <td></td> <!-- Empty cell for alignment -->
      `;
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
  }
});