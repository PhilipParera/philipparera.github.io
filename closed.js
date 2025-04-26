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
    const shipments = data.shipments;

    // Process freightMethod to extract method and POD
    shipments.forEach(shipment => {
      if (shipment.freightMethod) {
        const parts = shipment.freightMethod.split(' - ');
        shipment.freightMethodOnly = parts[0] ? parts[0].substring(0, 3) : 'N/A';
        shipment.pod = parts[1] || 'N/A';
      } else {
        shipment.freightMethodOnly = 'N/A';
        shipment.pod = 'N/A';
      }
    });

    // Get unique values for filters
    const uniqueWinners = [...new Set(shipments.map(s => s.firstId || 'N/A'))].sort();
    const uniqueVendors = [...new Set(shipments.map(s => s.vendorDivision || 'N/A'))].sort();
    const uniqueMethods = [...new Set(shipments.map(s => s.freightMethodOnly))].sort();
    const uniquePods = [...new Set(shipments.map(s => s.pod))].sort();

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

    // Add event listeners to filters
    winnerSelect.addEventListener('change', () => updateTable(shipments));
    vendorSelect.addEventListener('change', () => updateTable(shipments));
    methodSelect.addEventListener('change', () => updateTable(shipments));
    podSelect.addEventListener('change', () => updateTable(shipments));

    // Initial table rendering
    updateTable(shipments);
  })
  .catch(error => {
    console.error('Error fetching closed shipments:', error);
    alert('Failed to load closed shipments. Please try again later.');
  });

  function updateTable(shipments) {
    const winnerSelect = document.getElementById('winner-filter');
    const vendorSelect = document.getElementById('vendor-filter');
    const methodSelect = document.getElementById('method-filter');
    const podSelect = document.getElementById('pod-filter');

    const selectedWinner = winnerSelect.value;
    const selectedVendor = vendorSelect.value;
    const selectedMethod = methodSelect.value;
    const selectedPod = podSelect.value;

    const filteredShipments = shipments.filter(shipment => {
      return (selectedWinner === '' || shipment.firstId === selectedWinner) &&
             (selectedVendor === '' || shipment.vendorDivision === selectedVendor) &&
             (selectedMethod === '' || shipment.freightMethodOnly === selectedMethod) &&
             (selectedPod === '' || shipment.pod === selectedPod);
    });

    const tbody = document.querySelector('#closed-bid-table tbody');
    tbody.innerHTML = '';

    const promises = filteredShipments.map(shipment => {
      const winner = maskId(shipment.firstId);
      const jobCode = shipment.shipmentCode;
      return calculateSpread(bidderId, jobCode, shipment.firstId, shipment.winningBid).then(spread => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${shipment.closingDate || 'N/A'}</td>
          <td>${winner}</td>
          <td>${spread}</td>
          <td>${shipment.vendorDivision || 'N/A'}</td>
          <td>${shipment.freightMethod || 'N/A'}</td>
          <td>${shipment.incoterm || 'N/A'}</td>
          <td>${shipment.pol || 'N/A'}</td>
          <td>${shipment.gwKg || 'N/A'}</td>
          <td>${shipment.volCbm || 'N/A'}</td>
          <td class="wrapped-text">${shipment.shipperAddress || 'N/A'}</td>
          <td>${jobCode}</td>
        `;
        tbody.appendChild(row);
      });
    });

    Promise.all(promises).catch(error => {
      console.error('Error rendering table:', error);
    });
  }

  async function calculateSpread(bidderId, jobCode, winnerId, winningBid) {
    try {
      const sheetId = '175En4kZ7OoR52jmg_AABZB0h7ag7n48kS-dkxuMCWxo';
      const apiKey = 'YOUR_API_KEY'; // Replace with your Google Sheets API key
      const sheets = ['IDJIRST_Flow', 'IDPIPCI_Flow'];
      let allBids = [];

      for (const sheet of sheets) {
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${sheet}!B2:D?key=${apiKey}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch ${sheet}`);
        const data = await response.json();
        const bids = (data.values || []).map(row => ({
          bidderId: row[0],
          jobCode: row[1],
          bidValue: parseFloat(row[2])
        }));
        allBids = allBids.concat(bids);
      }

      const bidderBids = allBids.filter(bid => bid.bidderId === bidderId && bid.jobCode === jobCode);
      if (bidderBids.length === 0) return 'No Bid';

      if (bidderId === winnerId) return 'Won';

      const bidderLowestBid = Math.min(...bidderBids.map(bid => bid.bidValue));
      const winningBidValue = parseFloat(winningBid) || Math.min(...allBids.filter(bid => bid.jobCode === jobCode).map(bid => bid.bidValue));

      if (bidderLowestBid === winningBidValue) return '-';

      const spreadPercentage = ((bidderLowestBid - winningBidValue) / winningBidValue * 100).toFixed(2);
      return `${spreadPercentage}%`;
    } catch (error) {
      console.error('Error calculating spread:', error);
      return 'Error';
    }
  }

  function maskId(id) {
    if (id && id.length === 12) {
      return id.slice(0, 4) + '****' + id.slice(8);
    }
    return id || 'N/A';
  }
});