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

      // Process shipments to extract freightMethodOnly and pod
      shipments.forEach(shipment => {
        if (shipment.freightMethod) {
          const parts = shipment.freightMethod.split(' - ');
          const methodFull = parts[0] || 'N/A';
          shipment.freightMethodOnly = methodFull.substring(0, 3);
          shipment.pod = parts[1] || 'N/A';
        } else {
          shipment.freightMethodOnly = 'N/A';
          shipment.pod = 'N/A';
        }
      });

      // Get unique values for filters
      const uniqueVendors = [...new Set(shipments.map(s => s.vendorDivision || 'N/A'))].sort();
      const uniqueMethods = [...new Set(shipments.map(s => s.freightMethodOnly))].sort();
      const uniquePods = [...new Set(shipments.map(s => s.pod))].sort();

      // Populate drop-downs
      const vendorSelect = document.getElementById('vendor-filter');
      uniqueVendors.forEach(vendor => {
        const option = document.createElement('option');
        option.value = vendor;
        option.textContent = vendor;
        vendorSelect.appendChild(option);
      });

      const methodSelect = document.getElementById('method-filter');
      uniqueMethods.forEach(method => {
        const option = document.createElement('option');
        option.value = method;
        option.textContent = method;
        methodSelect.appendChild(option);
      });

      const podSelect = document.getElementById('pod-filter');
      uniquePods.forEach(pod => {
        const option = document.createElement('option');
        option.value = pod;
        option.textContent = pod;
        podSelect.appendChild(option);
      });

      // Add event listeners to filters
      vendorSelect.addEventListener('change', () => updateTable(shipments));
      methodSelect.addEventListener('change', () => updateTable(shipments));
      podSelect.addEventListener('change', () => updateTable(shipments));

      // Initial table rendering
      updateTable(shipments);
    })
    .catch(error => {
      console.error('Error fetching shipments:', error);
      alert('Failed to load shipments. Please try again later.');
    });
  }

  function updateTable(shipments) {
    const vendorSelect = document.getElementById('vendor-filter');
    const methodSelect = document.getElementById('method-filter');
    const podSelect = document.getElementById('pod-filter');

    const selectedVendor = vendorSelect.value;
    const selectedMethod = methodSelect.value;
    const selectedPod = podSelect.value;

    // Filter shipments based on selected values
    const filteredShipments = shipments.filter(shipment => {
      return (selectedVendor === '' || shipment.vendorDivision === selectedVendor) &&
             (selectedMethod === '' || shipment.freightMethodOnly === selectedMethod) &&
             (selectedPod === '' || shipment.pod === selectedPod);
    });

    // Update table
    const tbody = document.querySelector('#bid-table tbody');
    tbody.innerHTML = '';

    filteredShipments.forEach(shipment => {
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

    // Re-attach event listeners to bid inputs
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
});