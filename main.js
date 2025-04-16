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
              // Google Form prefilled URL with actual entry IDs (replace with your form's entry IDs)
              const formUrl = `https://docs.google.com/forms/d/e/1GzWuubJxl422BU9O3efVXSIKqf4g0ng2P6P8zgNuTuk/viewform?entry.632683554=${bidderId}&entry.366859423=${encodeURIComponent(shipmentCode)}&entry.1991820702=${bidValue}`;
              window.open(formUrl, '_blank');
          }
      });
  }
});