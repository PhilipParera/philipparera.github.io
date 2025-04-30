document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('jwtToken');
  const bidderId = localStorage.getItem('bidderId');
  if (!token || !bidderId) {
    window.location.href = 'index.html';
    return;
  }

  // Display masked Bidder ID
  if (bidderId.length === 12) {
    const maskedId = bidderId.slice(0, 4) + '****' + bidderId.slice(8);
    document.getElementById('bidder-id-display').textContent = `Bidder ID: ${maskedId}`;
  }

  // Function to mask ID for display
  function maskId(id) {
    if (id && id.length === 12) {
      return id.slice(0, 4) + '****' + id.slice(8);
    }
    return id || 'N/A';
  }

  let shipmentsData = [];
  let allBidsData = [];

  // Function to parse date from "MMM/DD/YYYY" format
  function parseDate(dateStr) {
    const months = {
      'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
      'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
    };
    const [monthAbbr, day, year] = dateStr.split('/');
    const cleanedMonthAbbr = monthAbbr.replace(/\.$/, ''); // Remove trailing period
    const month = months[cleanedMonthAbbr];
    if (month === undefined) {
      return null;
    }
    return new Date(year, month, day);
  }

  // Fetch closed shipments
  fetch('https://us-central1-key-line-454113-g0.cloudfunctions.net/getShipmentCodes?sheet=Closed', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Failed to fetch closed shipments');
    }
    return response.json();
  })
  .then(data => {
    shipmentsData = data.shipments;

    // Process shipments: trim data, parse freight method, handle closing date, and add COO
    shipmentsData.forEach(shipment => {
      shipment.shipmentCode = shipment.shipmentCode.trim();
      shipment.firstId = shipment.firstId.trim();
      if (shipment.freightMethod) {
        const parts = shipment.freightMethod.split(' - ');
        shipment.freightMethodOnly = parts[0] ? parts[0].substring(0, 3) : 'N/A';
        shipment.pod = parts[1] || 'N/A';
      } else {
        shipment.freightMethodOnly = 'N/A';
        shipment.pod = 'N/A';
      }
      if (shipment.closingDate) {
        const parts = shipment.closingDate.split(' ');
        if (parts.length >= 3) {
          const month = parts[0].replace(/\.$/, ''); // "Apr." → "Apr"
          const day = parts[1].replace(/,$/, '');    // "24," → "24"
          const year = parts[2];                     // "2025"
          const dateStr = `${month}/${day}/${year}`; // "Apr/24/2025"
          shipment.closingDateObj = parseDate(dateStr);
          if (shipment.closingDateObj) {
            const yearNum = shipment.closingDateObj.getFullYear();
            const monthNum = String(shipment.closingDateObj.getMonth() + 1).padStart(2, '0');
            const dayNum = String(shipment.closingDateObj.getDate()).padStart(2, '0');
            shipment.closingDateStr = `${yearNum}-${monthNum}-${dayNum}`;
          } else {
            shipment.closingDateStr = null;
          }
        } else {
          shipment.closingDateObj = null;
          shipment.closingDateStr = null;
        }
      } else {
        shipment.closingDateObj = null;
        shipment.closingDateStr = null;
      }
      // Add COO
      const pol = shipment.pol || '';
      const polParts = pol.split(',');
      shipment.coo = polParts.length > 1 ? polParts[polParts.length - 1].trim().slice(-2) : 'N/A';
    });

    // Get unique values for filters
    const uniqueWinners = [...new Set(shipmentsData.map(s => s.firstId || 'N/A'))].sort();
    const uniqueVendors = [...new Set(shipmentsData.map(s => s.vendorDivision || 'N/A'))].sort();
    const uniqueMethods = [...new Set(shipmentsData.map(s => s.freightMethodOnly))].sort();
    const uniquePods = [...new Set(shipmentsData.map(s => s.pod))].sort();
    const uniqueCoos = [...new Set(shipmentsData.map(s => s.coo))].sort();

    // Populate drop-downs
    const winnerSelect = document.getElementById('winner-filter');
    uniqueWinners.forEach(winner => {
      const option = document.createElement('option');
      option.value = winner;
      option.textContent = maskId(winner);
      winnerSelect.appendChild(option);
    });

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

    const cooSelect = document.getElementById('coo-filter');
    uniqueCoos.forEach(coo => {
      const option = document.createElement('option');
      option.value = coo;
      option.textContent = coo;
      cooSelect.appendChild(option);
    });

    // Add event listeners to filters
    winnerSelect.addEventListener('change', updateTable);
    vendorSelect.addEventListener('change', updateTable);
    methodSelect.addEventListener('change', updateTable);
    podSelect.addEventListener('change', updateTable);
    cooSelect.addEventListener('change', updateTable);
    document.getElementById('start-date').addEventListener('change', updateTable);
    document.getElementById('end-date').addEventListener('change', updateTable);

    // Fetch bid data
    fetch('https://us-central1-key-line-454113-g0.cloudfunctions.net/getBidData', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to fetch bid data');
      }
      return response.json();
    })
    .then(bidData => {
      allBidsData = bidData.bids.map(bid => ({
        bidderId: bid.bidderId.trim(),
        jobCode: bid.jobCode.trim(),
        bidValue: bid.bidValue
      }));
      updateTable(); // Initial table rendering
    })
    .catch(error => {
      alert('Failed to load bid data. Please try again later.');
    });

    // Add exit button functionality
    const exitButton = document.getElementById('exit-button');
    if (exitButton) {
      exitButton.addEventListener('click', () => {
        localStorage.removeItem('jwtToken');
        localStorage.removeItem('bidderId');
        localStorage.removeItem('userName');
        window.location.href = 'index.html';
      });
    }
  })
  .catch(error => {
    alert('Failed to load closed shipments. Please try again later.');
  });

  // Update table based on filter selections
  function updateTable() {
    const winnerSelect = document.getElementById('winner-filter');
    const vendorSelect = document.getElementById('vendor-filter');
    const methodSelect = document.getElementById('method-filter');
    const podSelect = document.getElementById('pod-filter');
    const cooSelect = document.getElementById('coo-filter');
    const startDateInput = document.getElementById('start-date');
    const endDateInput = document.getElementById('end-date');

    const selectedWinner = winnerSelect.value;
    const selectedVendor = vendorSelect.value;
    const selectedMethod = methodSelect.value;
    const selectedPod = podSelect.value;
    const selectedCoo = cooSelect.value;
    const startDateStr = startDateInput.value;
    const endDateStr = endDateInput.value;

    const filteredShipments = shipmentsData.filter(shipment => {
      const dateCondition = (!startDateStr || (shipment.closingDateStr && shipment.closingDateStr >= startDateStr)) &&
                            (!endDateStr || (shipment.closingDateStr && shipment.closingDateStr <= endDateStr));
      return (selectedWinner === '' || shipment.firstId === selectedWinner) &&
             (selectedVendor === '' || shipment.vendorDivision === selectedVendor) &&
             (selectedMethod === '' || shipment.freightMethodOnly === selectedMethod) &&
             (selectedPod === '' || shipment.pod === selectedPod) &&
             (selectedCoo === '' || shipment.coo === selectedCoo) &&
             dateCondition;
    });

    const tbody = document.querySelector('#closed-bid-table tbody');
    tbody.innerHTML = '';

    filteredShipments.forEach(shipment => {
      const winner = maskId(shipment.firstId);
      const jobCode = shipment.shipmentCode;
      const spread = calculateSpread(bidderId, jobCode, shipment.firstId, shipment.winningBidValue);
      const coo = shipment.coo;

      const row1 = document.createElement('tr');
      row1.innerHTML = `
        <td rowspan="2">${shipment.closingDateStr || 'N/A'}</td>
        <td rowspan="2">${winner}</td>
        <td rowspan="2">${spread}</td>
        <td>${shipment.vendorDivision || 'N/A'}</td>
        <td>${shipment.freightMethod || 'N/A'}</td>
        <td rowspan="2">${coo}</td>
        <td>${shipment.gwKg || 'N/A'}</td>
        <td rowspan="2" class="wrapped-text">${shipment.shipperAddress || 'N/A'}</td>
        <td rowspan="2">${jobCode}</td>
      `;
      tbody.appendChild(row1);

      const row2 = document.createElement('tr');
      row2.innerHTML = `
        <td>${shipment.incoterm || 'N/A'}</td>
        <td>${shipment.pol || 'N/A'}</td>
        <td>${shipment.volCbm || 'N/A'}</td>
      `;
      tbody.appendChild(row2);
    });
  }

  // Calculate spread using full IDs with winning bid value
  function calculateSpread(bidderId, jobCode, winnerId, winningBidValue) {
    try {
      const normalizedJobCode = jobCode.trim();
      const normalizedBidderId = bidderId.trim();
      const normalizedWinnerId = winnerId.trim();

      const bidderBids = allBidsData.filter(bid => 
        bid.bidderId.trim() === normalizedBidderId && 
        bid.jobCode.trim() === normalizedJobCode
      );

      if (bidderBids.length === 0) {
        return 'No Bid';
      }

      if (normalizedBidderId === normalizedWinnerId) {
        return 'Won';
      }

      const winningBid = parseFloat(winningBidValue);
      if (isNaN(winningBid) || winningBid <= 0) {
        return 'No Winning Bid';
      }

      const bidderLowestBid = Math.min(...bidderBids.map(bid => bid.bidValue));

      if (bidderLowestBid === winningBid) return '-';

      const spreadPercentage = ((bidderLowestBid - winningBid) / winningBid * 100).toFixed(2);
      return `${spreadPercentage}%`;
    } catch (error) {
      return 'Error';
    }
  }
});