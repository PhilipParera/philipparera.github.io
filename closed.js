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
        console.error(`Invalid month abbreviation: ${cleanedMonthAbbr}`);
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

    // Process shipments: trim data and parse closing date
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
        const datePart = shipment.closingDate.split(' ')[0]; // Extract "MMM/DD/YYYY"
        shipment.closingDateObj = parseDate(datePart);
      } else {
        shipment.closingDateObj = null;
      }
    });

    console.log('Closed shipments:', shipmentsData);

    // Populate filters with unique values
    const uniqueWinners = [...new Set(shipmentsData.map(s => s.firstId || 'N/A'))].sort();
    const uniqueVendors = [...new Set(shipmentsData.map(s => s.vendorDivision || 'N/A'))].sort();
    const uniqueMethods = [...new Set(shipmentsData.map(s => s.freightMethodOnly))].sort();
    const uniquePods = [...new Set(shipmentsData.map(s => s.pod))].sort();

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

    // Add event listeners to all filters
    winnerSelect.addEventListener('change', updateTable);
    vendorSelect.addEventListener('change', updateTable);
    methodSelect.addEventListener('change', updateTable);
    podSelect.addEventListener('change', updateTable);
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
      console.log('All bids:', allBidsData);
      updateTable(); // Initial table rendering
    })
    .catch(error => {
      console.error('Error fetching bid data:', error);
      alert('Failed to load bid data. Please try again later.');
    });
  })
  .catch(error => {
    console.error('Error fetching closed shipments:', error);
    alert('Failed to load closed shipments. Please try again later.');
  });

  // Update table based on filter selections
  function updateTable() {
    const winnerSelect = document.getElementById('winner-filter');
    const vendorSelect = document.getElementById('vendor-filter');
    const methodSelect = document.getElementById('method-filter');
    const podSelect = document.getElementById('pod-filter');
    const startDateInput = document.getElementById('start-date');
    const endDateInput = document.getElementById('end-date');

    const selectedWinner = winnerSelect.value;
    const selectedVendor = vendorSelect.value;
    const selectedMethod = methodSelect.value;
    const selectedPod = podSelect.value;
    const startDateStr = startDateInput.value;
    const endDateStr = endDateInput.value;

    let startDate, endDate;
    if (startDateStr) {
      startDate = new Date(startDateStr);
    }
    if (endDateStr) {
      endDate = new Date(endDateStr);
    }

    const filteredShipments = shipmentsData.filter(shipment => {
      const dateCondition = (!startDate || (shipment.closingDateObj && shipment.closingDateObj >= startDate)) &&
                            (!endDate || (shipment.closingDateObj && shipment.closingDateObj <= endDate));
      return (selectedWinner === '' || shipment.firstId === selectedWinner) &&
             (selectedVendor === '' || shipment.vendorDivision === selectedVendor) &&
             (selectedMethod === '' || shipment.freightMethodOnly === selectedMethod) &&
             (selectedPod === '' || shipment.pod === selectedPod) &&
             dateCondition;
    });

    const tbody = document.querySelector('#closed-bid-table tbody');
    tbody.innerHTML = '';

    filteredShipments.forEach(shipment => {
      const winner = maskId(shipment.firstId);
      const jobCode = shipment.shipmentCode;
      const spread = calculateSpread(bidderId, jobCode, shipment.firstId);
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
  }

  // Calculate spread using full IDs
  function calculateSpread(bidderId, jobCode, winnerId) {
    try {
      const bidderBids = allBidsData.filter(bid => bid.bidderId === bidderId && bid.jobCode === jobCode);
      if (bidderBids.length === 0) return 'No Bid';
      if (bidderId === winnerId) return 'Won';
      const bidderLowestBid = Math.min(...bidderBids.map(bid => bid.bidValue));
      const winningBids = allBidsData.filter(bid => bid.bidderId === winnerId && bid.jobCode === jobCode);
      if (winningBids.length === 0) return 'No Winning Bid';
      const winningBidValue = Math.min(...winningBids.map(bid => bid.bidValue));
      if (bidderLowestBid === winningBidValue) return '-';
      const spreadPercentage = ((bidderLowestBid - winningBidValue) / winningBidValue * 100).toFixed(2);
      return `${spreadPercentage}%`;
    } catch (error) {
      console.error('Error calculating spread:', error);
      return 'Error';
    }
  }
});